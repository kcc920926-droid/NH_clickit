(function attachLlm(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CaptureITLlm = api;
})(globalThis, function createLlmApi() {
  const DEFAULT_ENDPOINT = 'http://ai-driven-gw.aihb.kube.test.nhbank/v1/messages';
  const DEFAULT_MODEL = 'captureit-evidence-recommender';
  // Adapter별 기본 엔드포인트. NH AI Gateway는 내부망 liteLLM 게이트웨이를 가정한 커스텀 경로이고,
  // OpenAI compatible은 실제로 외부망 공식 OpenAI API를 가리킨다 - 두 adapter는 서로 다른 네트워크
  // 대상을 향하므로 Adapter를 바꾸면 엔드포인트도 그에 맞는 기본값으로 전환되어야 한다.
  const ADAPTER_DEFAULT_ENDPOINTS = {
    'nh-ai-gateway': DEFAULT_ENDPOINT,
    'openai-compatible': 'https://api.openai.com/v1/chat/completions',
  };
  const VALID_ROLES = new Set(['before', 'action', 'after']);
  const MANUAL_PIN_IMAGE_BONUS = 10;
  const ALLOWED_TEST_CASE_STATUSES = new Set(['PASS', 'FAIL', 'INCOMPLETE', 'NOT_JUDGED']);
  // NH AI Gateway(Anthropic Messages API 문법)는 max_tokens가 필수 필드다. 사용자가 공유한
  // 내부 연동 스니펫의 기본값(1024)을 그대로 따른다.
  const DEFAULT_MAX_TOKENS = 1024;

  function featureContext(feature, changePurpose = '') {
    return {
      featureSpecId: feature.id,
      title: feature.title,
      description: feature.description || '',
      verification: feature.result.verification || '',
      expectedResult: feature.result.expectedResult || '',
      changePurpose,
    };
  }

  function evidenceContext(item) {
    return {
      captureId: item.id,
      sequenceNo: item.sequenceNo,
      triggerType: item.triggerType,
      capturedAt: item.capturedAt || '',
      pageTitle: item.context && item.context.pageTitle || '',
      pageUrl: item.context && item.context.pageUrl || '',
      route: item.context && item.context.route || '',
      target: item.context && item.context.target || {},
      surroundingContext: item.context && item.context.surroundingContext || {},
    };
  }

  function orderedEvidence(evidence) {
    return [...evidence].sort((left, right) => left.sequenceNo - right.sequenceNo);
  }

  function buildStageOne(feature, evidence, changePurpose = '') {
    return {
      stage: 1,
      task: 'Rank evidence candidates for the feature using text context and capture order only.',
      feature: featureContext(feature, changePurpose),
      evidence: orderedEvidence(evidence).map(evidenceContext),
      responseSchema: {
        candidateCaptureIds: ['CAPTURE_ID'],
      },
    };
  }

  // Bug_Context_Length_Exceeded: 이전에는 후보 + 인접 evidence 전부의 thumbnailDataUrl(base64
  // 이미지)을 개수 제한 없이 payload에 실어 보냈다. 후보가 많은(=evidence가 많은) 세션에서는
  // 이미지 수십 장이 그대로 JSON에 통째로 들어가 gpt-4o-mini의 128K 토큰 한도를 넘겨 HTTP 400
  // (context_length_exceeded)이 발생했다. buildLlmEvidencePacket이 이미 쓰고 있는 것과 동일한
  // 정책(이미지는 최대 maxImages장만 실제로 포함하고, 나머지는 텍스트 descriptor로 대체)을
  // 여기에도 적용해 이미지 개수와 무관하게 payload 크기가 항상 유한하게 유지되도록 한다.
  function buildStageTwo(feature, evidence, candidateIds, changePurpose = '', options = {}) {
    const maxImages = options.maxImages ?? 5;
    const ordered = orderedEvidence(evidence);
    const candidateSet = new Set(candidateIds);
    const included = new Set();
    ordered.forEach((item, index) => {
      if (!candidateSet.has(item.id)) return;
      if (index > 0) included.add(ordered[index - 1].id);
      included.add(item.id);
      if (index + 1 < ordered.length) included.add(ordered[index + 1].id);
    });
    const includedEvidence = ordered.filter((item) => included.has(item.id));
    for (const item of includedEvidence) {
      if (!item.thumbnailDataUrl) throw new Error(`Missing thumbnail: ${item.id}`);
    }
    const { selected, excluded } = selectTopImages(includedEvidence, maxImages);
    const selectedIds = new Set(selected.map((item) => item.id));
    const withImages = includedEvidence
      .filter((item) => selectedIds.has(item.id))
      .map((item) => ({ ...evidenceContext(item), image: item.thumbnailDataUrl }));
    return {
      stage: 2,
      task: 'Recommend ordered before, action, and after evidence for the feature. Do not judge PASS or FAIL.',
      feature: featureContext(feature, changePurpose),
      evidence: withImages,
      excludedEvidence: excluded,
      responseSchema: {
        featureSpecId: feature.id,
        suggestions: [{ captureId: 'CAPTURE_ID', rank: 1, role: 'before|action|after', reason: 'Korean explanation' }],
      },
    };
  }

  function buildReportDraftRequest(report, mappedEvidenceByFeature) {
    return {
      task: 'Draft a report title and a configuration/checkout overview in Korean from the mapped evidence image sequence and context. Do not judge PASS or FAIL.',
      features: mappedEvidenceByFeature.map(({ feature, evidence }) => ({
        feature,
        evidence: orderedEvidence(evidence).map((item) => {
          if (!item.thumbnailDataUrl) throw new Error(`Missing thumbnail: ${item.id}`);
          return { ...evidenceContext(item), image: item.thumbnailDataUrl };
        }),
      })),
      responseSchema: { title: 'string', configurationOverview: 'string' },
    };
  }

  // LLM 추천 세트 제목: 텍스트 전용(이미지 없음)으로 가볍게 요청한다 - PASS/FAIL 판정이 아니라
  // 페이지 제목/경로/타겟 텍스트/트리거 종류만으로 세션 순서를 요약하는 짧은 한국어 제목만 필요하다.
  function buildSessionTitleRequest(group, evidenceList, changePurpose = '') {
    const evidenceById = new Map(evidenceList.map((item) => [item.id, item]));
    const items = group.evidenceIds.map((id) => evidenceById.get(id)).filter(Boolean);
    return {
      task: 'Suggest a concise Korean title (under ~40 characters) summarizing this test session\'s evidence sequence, based only on page titles/routes/target text/trigger types provided. Do not judge PASS or FAIL.',
      changePurpose,
      evidence: orderedEvidence(items).map(evidenceContext),
      responseSchema: { title: 'string' },
    };
  }

  function validateSessionTitleSuggestion(response) {
    if (!response || typeof response.title !== 'string' || !response.title.trim()) {
      throw new Error('Invalid session title suggestion response');
    }
    return { title: response.title.trim() };
  }

  function validateReportDraftSuggestion(response) {
    if (!response || typeof response.title !== 'string' || typeof response.configurationOverview !== 'string') {
      throw new Error('Invalid report draft suggestion response');
    }
    return {
      title: response.title,
      configurationOverview: response.configurationOverview,
    };
  }

  function validateRecommendations(response, knownEvidenceIds) {
    if (!response || typeof response.featureSpecId !== 'string' || !Array.isArray(response.suggestions)) {
      throw new Error('Invalid recommendation response');
    }
    const seen = new Set();
    const suggestions = response.suggestions.map((item) => {
      if (!knownEvidenceIds.has(item.captureId)) throw new Error(`Unknown evidence: ${item.captureId}`);
      if (seen.has(item.captureId)) throw new Error(`Duplicate evidence: ${item.captureId}`);
      if (!Number.isInteger(item.rank) || item.rank < 1) throw new Error(`Invalid recommendation rank: ${item.rank}`);
      if (!VALID_ROLES.has(item.role)) throw new Error(`Invalid recommendation role: ${item.role}`);
      if (typeof item.reason !== 'string' || !item.reason.trim()) throw new Error('Recommendation reason is required');
      seen.add(item.captureId);
      return {
        captureId: item.captureId,
        rank: item.rank,
        role: item.role,
        reason: item.reason.trim(),
      };
    }).sort((left, right) => left.rank - right.rank);
    return { featureSpecId: response.featureSpecId, suggestions };
  }

  function contextText(evidence) {
    const context = evidence.context || {};
    return [
      context.pageTitle,
      context.route,
      context.visibleText,
      context.target && context.target.visibleText,
      evidence.pageTitle,
      evidence.route,
      evidence.targetText,
    ].filter(Boolean).join(' ');
  }

  function hasMessages(evidence) {
    const domDiff = evidence.domDiff || {};
    return Boolean(
      domDiff.resultMessages && domDiff.resultMessages.length
      || domDiff.validationMessages && domDiff.validationMessages.length
      || evidence.resultMessages && evidence.resultMessages.length
      || evidence.validationMessages && evidence.validationMessages.length
    );
  }

  function hasApiEvents(evidence) {
    return Array.isArray(evidence.apiEvents) && evidence.apiEvents.length > 0;
  }

  function duplicateSignature(evidence) {
    const context = evidence.context || {};
    return [
      context.pageTitle || evidence.pageTitle || '',
      context.route || evidence.route || '',
      context.target && context.target.visibleText || evidence.targetText || '',
    ].join('\u0000');
  }

  function computeImageSelectionScore(evidence, featureEvidenceList = []) {
    let score = 0;
    const text = contextText(evidence);
    const normalizedText = text.toLowerCase();
    const context = evidence.context || {};

    if (hasMessages(evidence)) score += 8;
    if (hasApiEvents(evidence)) score += 4;
    if (['click', 'submit'].includes(evidence.triggerType) && evidence.domDiff && evidence.domDiff.changedText && evidence.domDiff.changedText.length) {
      score += 3;
    }
    if (context.target && context.target.visibleText || evidence.targetText) score += 2;
    if (evidence.formSelector || evidence.triggerType === 'form-input') score += 2;
    if (evidence.triggerType === 'route-change') score += 2;
    // Highlighted_Evidence_Priority: 사용자가 직접 강조 표시(Ctrl+Shift+클릭 수동 지정, 강조
    // 캡처 컨텍스트 메뉴)한 증적은 화면에 빨간 테두리/하이라이트 오버레이가 실제로 남아 있어
    // LLM이 어떤 영역을 봐야 하는지 명확하다 - 5장 선별 시 다른 이벤트보다 우선한다.
    if (['manual-pin', 'shortcut-context', 'context-menu'].includes(evidence.triggerType)) score += MANUAL_PIN_IMAGE_BONUS;

    if (/(storage|config|debug|설정|저장소)/i.test(normalizedText)) score -= 5;
    if (/\{\s*"|api[_-]?key|authorization|bearer/i.test(text)) score -= 6;
    if (String(context.visibleText || '').replace(/\s+/g, '').length < 10) score -= 2;

    const signature = duplicateSignature(evidence);
    if (signature !== '\u0000\u0000') {
      const duplicateCount = featureEvidenceList.filter((item) => duplicateSignature(item) === signature).length;
      if (duplicateCount > 1) score -= 3;
    }

    return score;
  }

  function buildTextOnlyDescriptor(evidence) {
    const context = evidence.context || {};
    return {
      captureId: evidence.id,
      sequenceNo: evidence.sequenceNo,
      triggerType: evidence.triggerType,
      pageTitle: context.pageTitle || evidence.pageTitle || '',
      route: context.route || evidence.route || '',
      targetText: context.target && context.target.visibleText || evidence.targetText || '',
      score: computeImageSelectionScore(evidence, []),
    };
  }

  function selectTopImages(candidateEvidenceList = [], maxImages = 5) {
    const scored = candidateEvidenceList.map((evidence) => ({
      evidence,
      score: computeImageSelectionScore(evidence, candidateEvidenceList),
    })).sort((left, right) => right.score - left.score || left.evidence.sequenceNo - right.evidence.sequenceNo);
    const selected = scored.slice(0, Math.max(0, maxImages)).map((item) => item.evidence);
    const selectedIds = new Set(selected.map((item) => item.id));
    const excluded = candidateEvidenceList
      .filter((item) => !selectedIds.has(item.id))
      .sort((left, right) => left.sequenceNo - right.sequenceNo)
      .map(buildTextOnlyDescriptor);
    return { selected, excluded };
  }

  function summarizeApiEvents(apiEvents) {
    try {
      if (!Array.isArray(apiEvents)) throw new Error('apiEvents must be an array');
      return apiEvents.slice(0, 20).map((event) => ({
        method: String(event.method || event.type || '').slice(0, 12),
        path: String(event.url || event.path || '').split(/[?#]/)[0].slice(0, 160),
        status: event.status ?? event.statusCode ?? null,
      }));
    } catch (_error) {
      return { status: 'summary-failed' };
    }
  }

  function summarizeServerEvents(serverEvents) {
    try {
      if (!Array.isArray(serverEvents)) throw new Error('serverEvents must be an array');
      return serverEvents.slice(0, 20).map((event) => ({
        level: String(event.level || '').slice(0, 20),
        code: event.code || event.eventId || event.status || null,
        status: event.status || null,
      }));
    } catch (_error) {
      return { status: 'summary-failed' };
    }
  }

  function cleanSummary(summary = {}) {
    const output = {};
    for (const [key, value] of Object.entries(summary)) {
      if ((key === 'apiSummary' || key === 'serverSummary') && value && value.status === 'summary-failed') continue;
      if (key === 'status' && value === 'summary-failed') continue;
      output[key] = value;
    }
    return output;
  }

  function evidenceFromSteps(evidenceSteps) {
    return evidenceSteps.flatMap((step) => step.evidence || step.evidenceItems || []);
  }

  function stepDescriptor(step) {
    return {
      stepNo: step.stepNo,
      stepType: step.stepType,
      userAction: step.userAction || '',
      evidenceIds: step.evidenceIds || [],
      summary: cleanSummary(step.llmSummary || {}),
      assertions: step.assertions || [],
    };
  }

  function buildLlmEvidencePacket(featureSpec, evidenceSteps = [], options = {}) {
    const mode = options.mode || 'json-data-url';
    const maxImages = options.maxImages ?? 5;
    const imageCandidates = evidenceFromSteps(evidenceSteps).filter((item) => item.llmImageDataUrl);
    const { selected, excluded } = selectTopImages(imageCandidates, maxImages);
    const basePacket = {
      mode,
      feature: featureContext({
        id: featureSpec.id || featureSpec.featureSpecId || '',
        title: featureSpec.title || '',
        description: featureSpec.description || '',
        result: featureSpec.result || {},
      }, options.changePurpose || ''),
      steps: evidenceSteps.map(stepDescriptor),
      excludedEvidence: excluded,
    };

    if (mode === 'text-only') {
      return basePacket;
    }

    if (mode === 'content-parts') {
      return {
        ...basePacket,
        content: [
          { type: 'text', text: JSON.stringify(basePacket) },
          ...selected.map((item) => ({
            type: 'image_url',
            captureId: item.id,
            image_url: { url: item.llmImageDataUrl },
          })),
        ],
      };
    }

    if (mode === 'images-array') {
      return {
        ...basePacket,
        images: selected.map((item) => item.llmImageDataUrl),
      };
    }

    return {
      ...basePacket,
      images: selected.map((item) => ({
        captureId: item.id,
        image: item.llmImageDataUrl,
      })),
    };
  }

  function buildTestCaseDescriptionRequest(featureSpec, evidenceSteps = [], options = {}) {
    return {
      task: 'Generate a concise Korean QA test case description from the provided evidence only.',
      outputLanguage: options.outputLanguage || 'ko',
      writingStyle: options.writingStyle || 'concise',
      feature: featureContext({
        id: featureSpec.id || featureSpec.featureSpecId || '',
        title: featureSpec.title || '',
        description: featureSpec.description || '',
        result: featureSpec.result || {},
      }, options.changePurpose || ''),
      evidenceSteps: evidenceSteps.map(stepDescriptor),
      constraints: [
        '제공된 증적만 사용한다.',
        '증적 밖의 사실은 추론하지 않는다.',
        '판정은 assertions와 증적 기반으로만 작성한다.',
        '마스킹된 값은 해제하거나 복원하지 않는다.',
      ],
      responseSchema: {
        testPurpose: 'string',
        preconditions: 'string',
        testProcedure: 'string',
        expectedResult: 'string',
        actualResult: 'string',
        judgementBasis: 'string',
        finalStatus: 'PASS|FAIL|INCOMPLETE|NOT_JUDGED',
      },
    };
  }

  function validateTestCaseDescriptionResponse(response) {
    const required = ['testPurpose', 'preconditions', 'testProcedure', 'expectedResult', 'actualResult', 'judgementBasis', 'finalStatus'];
    if (!response || typeof response !== 'object') throw new Error('Invalid test case description response');
    for (const key of required) {
      if (response[key] === undefined || response[key] === null) {
        throw new Error(`Missing test case field: ${key}`);
      }
    }
    if (!ALLOWED_TEST_CASE_STATUSES.has(response.finalStatus)) {
      throw new Error(`Invalid finalStatus: ${response.finalStatus}`);
    }
    return {
      testPurpose: response.testPurpose,
      preconditions: response.preconditions,
      testProcedure: response.testProcedure,
      expectedResult: response.expectedResult,
      actualResult: response.actualResult,
      judgementBasis: response.judgementBasis,
      finalStatus: response.finalStatus,
    };
  }

  function safeJson(value) {
    return JSON.stringify(value, null, 2);
  }

  function redactSecrets(value, secrets = []) {
    let text = typeof value === 'string' ? value : safeJson(value);
    const filtered = secrets.filter((item) => typeof item === 'string' && item.length > 0);
    for (const secret of filtered) {
      text = text.split(secret).join('***redacted***');
    }
    text = text.replace(/("api_key"\s*:\s*")([^"]+)(")/gi, '$1***redacted***$3');
    text = text.replace(/("authorization"\s*:\s*")([^"]+)(")/gi, '$1***redacted***$3');
    return text;
  }

  function normalizeAdapter(adapter) {
    return adapter || 'nh-ai-gateway';
  }

  // Adapter 선택에 따른 기본 엔드포인트. raw-json-template처럼 매핑에 없는 adapter는 endpoint
  // 필드 자체를 사용자가 직접 입력하는 방식이므로 DEFAULT_ENDPOINT로 되돌린다.
  function defaultEndpointForAdapter(adapter) {
    return ADAPTER_DEFAULT_ENDPOINTS[normalizeAdapter(adapter)] || DEFAULT_ENDPOINT;
  }

  // nh-ai-gateway/openai-compatible은 각각 내부망 liteLLM/외부망 OpenAI라는 고정된 네트워크
  // 대상을 가리키므로, 엔드포인트를 사용자가 임의로 편집해 adapter와 실제 전송 대상이 어긋나는
  // 사고(예: adapter는 OpenAI인데 엔드포인트는 내부망 게이트웨이로 남아있는 경우)를 막기 위해
  // 엔드포인트 입력란을 잠그고 항상 defaultEndpointForAdapter 값을 그대로 쓴다. raw-json-template은
  // 정의상 임의의 커스텀 대상을 향할 수 있어야 하므로 이 잠금에서 제외한다.
  function isAdapterEndpointLocked(adapter) {
    return Object.hasOwn(ADAPTER_DEFAULT_ENDPOINTS, normalizeAdapter(adapter));
  }

  // OpenAI 계열 Chat Completions API의 JSON 모드(response_format: json_object)는 system/user
  // 메시지 중 하나에 "json"이라는 단어가 리터럴로 포함되어 있지 않으면 요청 자체를 400으로
  // 거부한다. 이 모듈이 만드는 개별 payload.task 문구들이 전부 "json"을 언급하지는 않으므로
  // (예: buildStageOne), system 메시지 자체에 항상 명시해 어떤 payload가 오든 안전하게 만족시킨다.
  const SYSTEM_PROMPT = 'CaptureIT QA evidence recommendation assistant. Always respond with a single valid JSON object matching the requested responseSchema, with no extra prose.';

  // Bug_Context_Length_Exceeded 근본 원인: 이전에는 payload 전체(이미지 data URL 포함)를
  // JSON.stringify해서 하나의 텍스트로 보냈다. base64로 인코딩된 실제 JPEG 스크린샷은 무작위성이
  // 높아 텍스트 토큰화 시 극단적으로 비효율적이다(실측: 50KB 썸네일 하나가 텍스트로 들어가면 약
  // 3만4천 토큰을 먹는다 - 이미지 5장이면 128K 한도를 그냥 넘어간다). OpenAI Chat Completions
  // API(및 liteLLM - 공식 문서 기준 동일한 chat completions 문법을 그대로 따른다)는 이미지를
  // 별도의 image_url content part로 보내면 타일 기반으로 토큰을 매겨(보통 이미지 한 장당 수백
  // 토큰) 훨씬 저렴하다. 그래서 openai-compatible/nh-ai-gateway 두 adapter 모두 이 함수를 통해
  // payload.evidence[].image(그리고 payload.images 배열) 필드를 찾아 별도 image_url part로
  // 분리하고, 텍스트 파트에는 그 자리에 이미지 개수만 남긴 placeholder를 넣는다. raw-json-template은
  // 사용자가 완전히 커스텀한 템플릿을 쓰므로 이 최적화 대상이 아니다(payload를 그대로 텍스트로
  // 넘긴다 - 사용자가 필요하면 직접 템플릿에서 이미지 파트를 구성해야 한다).
  function extractImageDataUrls(value, images) {
    if (Array.isArray(value)) {
      return value.map((item) => extractImageDataUrls(item, images));
    }
    if (value && typeof value === 'object') {
      const output = {};
      for (const [key, entryValue] of Object.entries(value)) {
        if ((key === 'image' || key === 'images') && typeof entryValue === 'string' && entryValue.startsWith('data:image/')) {
          images.push(entryValue);
          output[key] = `[image ${images.length} attached separately]`;
        } else if (key === 'images' && Array.isArray(entryValue)) {
          output[key] = entryValue.map((item) => {
            if (typeof item === 'string' && item.startsWith('data:image/')) {
              images.push(item);
              return `[image ${images.length} attached separately]`;
            }
            return extractImageDataUrls(item, images);
          });
        } else {
          output[key] = extractImageDataUrls(entryValue, images);
        }
      }
      return output;
    }
    return value;
  }

  // OpenAI 계열(openai-compatible)은 system 메시지를 messages 배열 안에 role:'system'으로 넣는
  // 문법을 쓴다.
  function buildMultimodalMessages(payload) {
    const images = [];
    const textOnlyPayload = extractImageDataUrls(payload, images);
    const userContent = [{ type: 'text', text: safeJson(textOnlyPayload) }];
    for (const image of images) {
      userContent.push({ type: 'image_url', image_url: { url: image } });
    }
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ];
  }

  // NH AI Gateway(내부망 liteLLM, /v1/messages)는 Anthropic Messages API 문법을 따른다 - system
  // 프롬프트는 messages 배열 안이 아니라 요청 바디의 최상위 system 필드로 전달하고, messages에는
  // user(및 assistant) role만 올 수 있다. 이미지 분리 로직(extractImageDataUrls)은 동일하게
  // 재사용한다.
  function buildAnthropicMessages(payload) {
    const images = [];
    const textOnlyPayload = extractImageDataUrls(payload, images);
    const userContent = [{ type: 'text', text: safeJson(textOnlyPayload) }];
    for (const image of images) {
      userContent.push({ type: 'image_url', image_url: { url: image } });
    }
    return {
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    };
  }

  function fillTemplate(template, variables) {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => (
      Object.hasOwn(variables, key) ? String(variables[key]) : match
    ));
  }

  function buildAdapterRequest({
    adapter = 'nh-ai-gateway',
    apiKey = '',
    endpoint = DEFAULT_ENDPOINT,
    model = DEFAULT_MODEL,
    payload,
    rawTemplate = '',
    temperature = 0.1,
  }) {
    const selectedAdapter = normalizeAdapter(adapter);
    const headers = { 'Content-Type': 'application/json' };
    let body;

    if (selectedAdapter === 'raw-json-template') {
      if (!rawTemplate.trim()) throw new Error('Raw JSON template is required');
      body = JSON.parse(fillTemplate(rawTemplate, {
        apiKey,
        model,
        payload: safeJson(payload),
      }));
    } else if (selectedAdapter === 'openai-compatible') {
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      body = {
        model,
        // 이미지(evidence[].image, images[])는 텍스트로 JSON.stringify하지 않고 별도
        // image_url content part로 분리한다(buildMultimodalMessages 주석 참고) - 그래야
        // 토큰 사용량이 이미지 개수에 비례해서 폭증하지 않는다.
        messages: buildMultimodalMessages(payload),
        temperature,
        // 이 adapter를 거치는 모든 요청(추천/세션 제목/테스트케이스 설명/진단 등)은 항상 JSON
        // 응답을 기대하므로(parseAdapterResponse가 JSON을 못 찾으면 실패), OpenAI 계열
        // Chat Completions API의 JSON 모드를 강제해 모델이 순수 자연어 문장으로 답하는 경우를
        // 방지한다. 이 모드는 프롬프트 안에 "json"이라는 단어가 포함되어야 하는데, SYSTEM_PROMPT가
        // 항상 이를 명시하므로 어떤 payload가 오든 문제 없다.
        response_format: { type: 'json_object' },
      };
    } else {
      // NH AI Gateway는 내부망 liteLLM 게이트웨이(/v1/messages 경로)를 가리킨다. 실제 사용자가
      // 전달한 내부 연동 스니펫을 확인한 결과, 이 게이트웨이는 OpenAI Chat Completions 문법이
      // 아니라 Anthropic Messages API 문법을 따른다:
      //   - 인증: Authorization: Bearer {apiKey} 헤더 (payload의 api_key 필드가 아니다)
      //   - 요청 바디: { model, max_tokens, messages }  (max_tokens 필수, temperature는 스니펫에 없음)
      //   - 응답: { content: [{ type: 'text', text: '...' }] }  (choices[0].message.content 아님)
      // 이전에는 OpenAI 스타일(payload.api_key, choices[0].message.content)을 잘못 가정하고 있었다.
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      // Anthropic Messages API 문법: system은 messages 배열이 아니라 요청 바디 최상위 필드다.
      // 이미지는 텍스트로 JSON에 박아넣지 않고 별도 content part로 분리한다
      // (Bug_Context_Length_Exceeded 대응) - buildAnthropicMessages가 { system, messages }를
      // 함께 만들어 반환한다.
      const { system, messages } = buildAnthropicMessages(payload);
      body = {
        model,
        max_tokens: DEFAULT_MAX_TOKENS,
        system,
        messages,
      };
    }

    return {
      adapter: selectedAdapter,
      url: endpoint,
      requestBody: body,
      options: {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      },
    };
  }

  function extractContentText(response) {
    if (!response) return '';
    // OpenAI 계열: { choices: [{ message: { content } }] }
    const choice = Array.isArray(response.choices) && response.choices[0];
    const message = choice && choice.message;
    const messageContent = message && message.content;
    if (typeof messageContent === 'string') return messageContent;
    if (Array.isArray(messageContent)) {
      return messageContent.map((item) => (
        typeof item === 'string' ? item : item && (item.text || item.content || '')
      )).filter(Boolean).join('\n');
    }
    // NH AI Gateway(Anthropic Messages API 문법): { content: [{ type: 'text', text }] }
    if (Array.isArray(response.content)) {
      return response.content.map((item) => (
        typeof item === 'string' ? item : item && item.text || ''
      )).filter(Boolean).join('\n');
    }
    if (typeof response.content === 'string') return response.content;
    return '';
  }

  function parseAdapterResponse(response) {
    if (!response || typeof response !== 'object') throw new Error('Invalid LLM response');
    if (Array.isArray(response.candidateCaptureIds) || Array.isArray(response.suggestions)) return response;
    const content = extractContentText(response).trim();
    if (!content) throw new Error('LLM response content is empty');
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : content);
  }

  function classifyDiagnosticError(error = {}) {
    const status = Number(error.status || error.httpStatus || 0);
    const message = String(error.message || '');
    if (status === 401 || status === 403) return 'API key 확인 필요';
    if (status === 404) return 'endpoint path 확인 필요';
    if (/Failed to fetch|NetworkError|CORS|fetch failed/i.test(message)) return 'gateway access 또는 host permission 확인 필요';
    if (/JSON|Unexpected token|parse|adapter|template/i.test(message)) return 'adapter/template/parse 확인 필요';
    if (status >= 500) return 'LLM gateway 서버 오류 확인 필요';
    return '요청 설정과 응답 형식을 확인하십시오';
  }

  function buildDiagnosticSummary({
    adapter,
    endpoint,
    apiKey = '',
    contentType = '',
    endedAt = Date.now(),
    error = null,
    requestBody = null,
    responseBody = null,
    startedAt = Date.now(),
    status = 0,
  }) {
    const redactionSecrets = [apiKey];
    const ok = !error && status >= 200 && status < 300;
    return {
      ok,
      adapter: normalizeAdapter(adapter),
      endpoint,
      status,
      contentType,
      latencyMs: Math.max(0, endedAt - startedAt),
      guidance: ok ? 'LLM gateway 응답 수신 완료' : classifyDiagnosticError(error || { status }),
      redactedRequest: redactSecrets(requestBody || {}, redactionSecrets),
      redactedResponse: redactSecrets(responseBody || error || {}, redactionSecrets),
      checkedAt: new Date(endedAt).toISOString(),
    };
  }

  return {
    DEFAULT_ENDPOINT,
    DEFAULT_MODEL,
    ADAPTER_DEFAULT_ENDPOINTS,
    MANUAL_PIN_IMAGE_BONUS,
    defaultEndpointForAdapter,
    isAdapterEndpointLocked,
    buildLlmEvidencePacket,
    buildSessionTitleRequest,
    buildStageOne,
    buildStageTwo,
    buildTestCaseDescriptionRequest,
    buildTextOnlyDescriptor,
    buildReportDraftRequest,
    buildAdapterRequest,
    buildDiagnosticSummary,
    classifyDiagnosticError,
    computeImageSelectionScore,
    parseAdapterResponse,
    redactSecrets,
    selectTopImages,
    summarizeApiEvents,
    summarizeServerEvents,
    validateSessionTitleSuggestion,
    validateTestCaseDescriptionResponse,
    validateRecommendations,
    validateReportDraftSuggestion,
  };
});
