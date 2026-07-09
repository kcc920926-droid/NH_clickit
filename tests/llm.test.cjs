const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '../extension/shared/llm.js');

function loadLlm() {
  assert.equal(fs.existsSync(modulePath), true, 'LLM adapter should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

const feature = {
  id: 'FS-001',
  title: '주문 승인',
  description: '주문 상태 변경',
  result: { verification: '승인 버튼', expectedResult: '승인 완료' },
};
const evidence = [
  { id: 'CAP-1', sequenceNo: 1, triggerType: 'click', imageDataUrl: 'full-1', thumbnailDataUrl: 'thumb-1', context: { pageTitle: '주문 목록' } },
  { id: 'CAP-2', sequenceNo: 2, triggerType: 'route-change', imageDataUrl: 'full-2', thumbnailDataUrl: 'thumb-2', context: { pageTitle: '주문 상세' } },
  { id: 'CAP-3', sequenceNo: 3, triggerType: 'click', imageDataUrl: 'full-3', thumbnailDataUrl: 'thumb-3', context: { pageTitle: '주문 완료' } },
];

test('stage one contains ordered context but excludes image data', () => {
  const llm = loadLlm();
  const payload = llm.buildStageOne(feature, evidence, '승인 기능 검증');

  assert.equal(payload.stage, 1);
  assert.deepEqual(payload.evidence.map((item) => item.captureId), ['CAP-1', 'CAP-2', 'CAP-3']);
  assert.equal(Object.hasOwn(payload.evidence[0], 'image'), false);
  assert.equal(JSON.stringify(payload).includes('full-1'), false);
  assert.equal(JSON.stringify(payload).includes('thumb-1'), false);
});

test('stage two includes thumbnails for candidates and their adjacent captures', () => {
  const llm = loadLlm();
  const payload = llm.buildStageTwo(feature, evidence, ['CAP-2']);

  assert.equal(payload.stage, 2);
  assert.deepEqual(payload.evidence.map((item) => item.captureId), ['CAP-1', 'CAP-2', 'CAP-3']);
  assert.deepEqual(payload.evidence.map((item) => item.image), ['thumb-1', 'thumb-2', 'thumb-3']);
});

test('stage two caps the number of embedded images regardless of how many candidates are included, using text descriptors for the rest', () => {
  const llm = loadLlm();
  // 20개 evidence 전부를 후보로 지정해도(=인접 evidence까지 포함하면 evidence 20개 전부가 대상),
  // 실제로 image 필드가 채워지는 evidence 수는 maxImages(기본 5)를 넘지 않아야 한다.
  const manyEvidence = Array.from({ length: 20 }, (_, index) => ({
    id: `CAP-${index + 1}`,
    sequenceNo: index + 1,
    triggerType: 'click',
    thumbnailDataUrl: `thumb-${index + 1}`,
    context: { pageTitle: `페이지 ${index + 1}` },
  }));
  const allIds = manyEvidence.map((item) => item.id);

  const payload = llm.buildStageTwo(feature, manyEvidence, allIds, '', { maxImages: 5 });

  const withImage = payload.evidence.filter((item) => item.image);
  assert.equal(withImage.length, 5, 'no more than maxImages evidence entries should carry an embedded image');
  assert.ok(Array.isArray(payload.excludedEvidence), 'excluded evidence should be listed as text-only descriptors');
  assert.equal(payload.excludedEvidence.length, manyEvidence.length - 5);
  assert.equal(
    payload.excludedEvidence.every((item) => !Object.hasOwn(item, 'image')),
    true,
    'excluded descriptors should never carry image data',
  );
});

test('recommendation validation rejects unknown evidence and invalid roles', () => {
  const llm = loadLlm();
  assert.throws(() => llm.validateRecommendations({
    featureSpecId: 'FS-001',
    suggestions: [{ captureId: 'CAP-X', rank: 1, role: 'after', reason: 'unknown' }],
  }, new Set(['CAP-1'])), /Unknown evidence/);
  assert.throws(() => llm.validateRecommendations({
    featureSpecId: 'FS-001',
    suggestions: [{ captureId: 'CAP-1', rank: 1, role: 'result', reason: 'invalid' }],
  }, new Set(['CAP-1'])), /Invalid recommendation role/);
});

// NH AI Gateway(내부망 liteLLM, /v1/messages)는 실제로는 Anthropic Messages API 문법을 따른다
// (사용자가 공유한 실제 연동 스니펫으로 확인됨): Authorization: Bearer 헤더로 인증하고,
// system 프롬프트는 messages 배열이 아니라 요청 바디 최상위 system 필드로 보내며, max_tokens가
// 필수다. 이전에는 OpenAI 스타일(payload.api_key, system을 messages[0]에 넣는 방식)을 잘못
// 가정하고 있었다.
test('NH AI Gateway adapter follows the Anthropic Messages API contract (Authorization header, top-level system field, max_tokens)', () => {
  const llm = loadLlm();
  assert.equal(llm.DEFAULT_ENDPOINT, 'http://ai-driven-gw.aihb.kube.test.nhbank/v1/messages');

  const request = llm.buildAdapterRequest({
    adapter: 'nh-ai-gateway',
    endpoint: llm.DEFAULT_ENDPOINT,
    apiKey: 'secret-key',
    model: 'capture-model',
    payload: { stage: 1, evidence: [{ captureId: 'CAP-1' }] },
  });

  assert.equal(request.url, llm.DEFAULT_ENDPOINT);
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers['Content-Type'], 'application/json');
  assert.equal(request.options.headers.Authorization, 'Bearer secret-key', 'authentication should use the Authorization header, not a payload api_key field');

  const body = JSON.parse(request.options.body);
  assert.equal(Object.hasOwn(body, 'api_key'), false, 'api_key field should no longer be used for this adapter');
  assert.equal(body.model, 'capture-model');
  assert.equal(typeof body.max_tokens, 'number', 'max_tokens is required by the Anthropic Messages API contract');
  assert.equal(body.system, 'CaptureIT QA evidence recommendation assistant. Always respond with a single valid JSON object matching the requested responseSchema, with no extra prose.');
  assert.equal(body.messages.length, 1, 'only a user message should be in the messages array (system is a top-level field)');
  assert.equal(body.messages[0].role, 'user');
  assert.ok(Array.isArray(body.messages[0].content), 'user message content should be a content-parts array');
  const textPart = body.messages[0].content.find((part) => part.type === 'text');
  assert.ok(textPart, 'a text content part should exist');
  assert.match(textPart.text, /CAP-1/);
});

test('openai-compatible adapter requests JSON mode and mentions "json" in the system prompt so OpenAI accepts response_format', () => {
  const llm = loadLlm();
  const request = llm.buildAdapterRequest({
    adapter: 'openai-compatible',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: 'secret-key',
    model: 'gpt-4o-mini',
    payload: { task: 'Summarize evidence order.' },
  });

  const body = JSON.parse(request.options.body);
  assert.deepEqual(body.response_format, { type: 'json_object' });
  // OpenAI JSON 모드는 system/user 메시지 중 최소 하나에 "json"이 리터럴로 포함되어 있지 않으면
  // 400을 반환한다 - 개별 payload.task 문구가 "json"을 언급하지 않아도 안전해야 한다.
  assert.match(body.messages[0].content.toLowerCase(), /json/);
});

test('openai-compatible adapter extracts payload images into separate image_url content parts instead of embedding base64 as text', () => {
  const llm = loadLlm();
  const imageA = 'data:image/jpeg;base64,AAAABBBB';
  const imageB = 'data:image/jpeg;base64,CCCCDDDD';
  const payload = {
    stage: 2,
    evidence: [
      { captureId: 'CAP-1', image: imageA },
      { captureId: 'CAP-2', image: imageB },
    ],
    responseSchema: { featureSpecId: 'FS-1' },
  };

  const request = llm.buildAdapterRequest({
    adapter: 'openai-compatible',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: 'secret-key',
    model: 'gpt-4o-mini',
    payload,
  });

  const body = JSON.parse(request.options.body);
  assert.equal(body.messages[0].role, 'system');
  assert.equal(body.messages[1].role, 'user');
  assert.ok(Array.isArray(body.messages[1].content), 'user message content should be a content-parts array, not a plain string');

  const textPart = body.messages[1].content.find((part) => part.type === 'text');
  const imageParts = body.messages[1].content.filter((part) => part.type === 'image_url');

  assert.ok(textPart, 'a text content part should exist');
  // base64 이미지 데이터는 텍스트 파트 안에 그대로 남아있으면 안 된다(토큰 폭증의 원인이었다).
  assert.equal(textPart.text.includes(imageA), false, 'raw base64 image data should not remain embedded in the text part');
  assert.equal(textPart.text.includes(imageB), false);
  assert.match(textPart.text, /attached separately/, 'text part should reference that images were attached separately');

  assert.equal(imageParts.length, 2, 'each payload image should become its own image_url content part');
  assert.deepEqual(imageParts.map((part) => part.image_url.url).sort(), [imageA, imageB].sort());
});

test('openai-compatible adapter leaves text-only payloads (no images) as a plain content-parts array with just a text part', () => {
  const llm = loadLlm();
  const request = llm.buildAdapterRequest({
    adapter: 'openai-compatible',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: 'secret-key',
    model: 'gpt-4o-mini',
    payload: { task: 'no images here', responseSchema: { title: 'string' } },
  });

  const body = JSON.parse(request.options.body);
  assert.ok(Array.isArray(body.messages[1].content));
  assert.equal(body.messages[1].content.length, 1);
  assert.equal(body.messages[1].content[0].type, 'text');
});

test('nh-ai-gateway adapter does not set response_format (liteLLM payload shape may differ)', () => {
  const llm = loadLlm();
  const request = llm.buildAdapterRequest({
    adapter: 'nh-ai-gateway',
    endpoint: llm.DEFAULT_ENDPOINT,
    apiKey: 'secret-key',
    model: 'gemma4',
    payload: { task: 'Summarize evidence order.' },
  });

  const body = JSON.parse(request.options.body);
  assert.equal(Object.hasOwn(body, 'response_format'), false);
});

test('nh-ai-gateway adapter also extracts payload images into separate image_url content parts within the single Anthropic-style user message', () => {
  const llm = loadLlm();
  const image = 'data:image/jpeg;base64,EEEEFFFF';
  const request = llm.buildAdapterRequest({
    adapter: 'nh-ai-gateway',
    endpoint: llm.DEFAULT_ENDPOINT,
    apiKey: 'secret-key',
    model: 'gemma4',
    payload: { stage: 2, evidence: [{ captureId: 'CAP-1', image }], responseSchema: { featureSpecId: 'FS-1' } },
  });

  const body = JSON.parse(request.options.body);
  assert.equal(Object.hasOwn(body, 'api_key'), false, 'api_key field should no longer be used for this adapter');
  assert.equal(request.options.headers.Authorization, 'Bearer secret-key');
  assert.equal(body.messages.length, 1);
  assert.ok(Array.isArray(body.messages[0].content));
  const imageParts = body.messages[0].content.filter((part) => part.type === 'image_url');
  const textPart = body.messages[0].content.find((part) => part.type === 'text');
  assert.equal(imageParts.length, 1);
  assert.equal(imageParts[0].image_url.url, image);
  assert.equal(textPart.text.includes(image), false, 'raw base64 should not remain embedded in the text part');
});

test('defaultEndpointForAdapter returns the internal liteLLM gateway for nh-ai-gateway and the official OpenAI endpoint for openai-compatible', () => {
  const llm = loadLlm();

  assert.equal(llm.defaultEndpointForAdapter('nh-ai-gateway'), llm.DEFAULT_ENDPOINT);
  assert.equal(llm.defaultEndpointForAdapter('openai-compatible'), 'https://api.openai.com/v1/chat/completions');
  // 매핑에 없는 adapter(raw-json-template 등)는 endpoint를 사용자가 직접 입력하는 방식이므로
  // 안전한 기본값(DEFAULT_ENDPOINT)으로 되돌린다.
  assert.equal(llm.defaultEndpointForAdapter('raw-json-template'), llm.DEFAULT_ENDPOINT);
  assert.equal(llm.defaultEndpointForAdapter(undefined), llm.DEFAULT_ENDPOINT);
});

test('LLM diagnostics redact API keys from request and response previews', () => {
  const llm = loadLlm();
  const summary = llm.buildDiagnosticSummary({
    adapter: 'nh-ai-gateway',
    endpoint: llm.DEFAULT_ENDPOINT,
    apiKey: 'secret-key',
    startedAt: 100,
    endedAt: 145,
    requestBody: { api_key: 'secret-key', messages: [{ content: 'hello secret-key' }] },
    responseBody: { content: 'ok secret-key' },
    status: 200,
  });

  assert.equal(summary.ok, true);
  assert.equal(summary.latencyMs, 45);
  assert.equal(JSON.stringify(summary).includes('secret-key'), false);
  assert.match(summary.redactedRequest, /\*\*\*redacted\*\*\*/);
  assert.match(summary.redactedResponse, /\*\*\*redacted\*\*\*/);
});

test('LLM adapter parses direct JSON and OpenAI content JSON', () => {
  const llm = loadLlm();
  const direct = { candidateCaptureIds: ['CAP-1'] };
  assert.deepEqual(llm.parseAdapterResponse(direct), direct);

  const openAiStyle = {
    choices: [{
      message: {
        content: JSON.stringify({ featureSpecId: 'FS-001', suggestions: [{ captureId: 'CAP-1', rank: 1, role: 'action', reason: 'button click' }] }),
      },
    }],
  };
  assert.equal(llm.parseAdapterResponse(openAiStyle).featureSpecId, 'FS-001');
});

// NH AI Gateway(Anthropic Messages API 문법) 실제 응답 형태: { content: [{ type: 'text', text }] }.
test('LLM adapter parses the Anthropic Messages API response shape used by NH AI Gateway', () => {
  const llm = loadLlm();
  const anthropicStyle = {
    content: [
      { type: 'text', text: JSON.stringify({ featureSpecId: 'FS-002', suggestions: [] }) },
    ],
  };
  assert.equal(llm.parseAdapterResponse(anthropicStyle).featureSpecId, 'FS-002');
});

test('LLM diagnostic errors are classified for user guidance', () => {
  const llm = loadLlm();
  assert.match(llm.classifyDiagnosticError({ status: 401 }), /API key/);
  assert.match(llm.classifyDiagnosticError({ status: 404 }), /endpoint path/);
  assert.match(llm.classifyDiagnosticError({ message: 'Failed to fetch' }), /gateway access|host permission/);
  assert.match(llm.classifyDiagnosticError({ message: 'Unexpected token' }), /adapter|template|parse/);
});

test('buildReportDraftRequest returns task/features/responseSchema with mapped thumbnails and throws on missing thumbnail', () => {
  const llm = loadLlm();

  const report = { title: '', configurationOverview: '' };
  const mappedEvidenceByFeature = [
    { feature: { featureSpecId: 'FS-001', title: '주문 승인' }, evidence },
  ];

  const payload = llm.buildReportDraftRequest(report, mappedEvidenceByFeature);

  assert.equal(typeof payload.task, 'string');
  assert.ok(Array.isArray(payload.features));
  assert.deepEqual(payload.responseSchema, { title: 'string', configurationOverview: 'string' });

  const featureEvidence = payload.features[0].evidence;
  assert.equal(featureEvidence.length, evidence.length);
  featureEvidence.forEach((item, index) => {
    assert.equal(item.image, evidence[index].thumbnailDataUrl);
  });

  const evidenceMissingThumbnail = [
    { ...evidence[0], thumbnailDataUrl: undefined },
  ];
  const mappedWithMissingThumbnail = [
    { feature: { featureSpecId: 'FS-001', title: '주문 승인' }, evidence: evidenceMissingThumbnail },
  ];

  assert.throws(
    () => llm.buildReportDraftRequest(report, mappedWithMissingThumbnail),
    /Missing thumbnail: CAP-1/
  );
});

test('computeImageSelectionScore handles additive and penalty factors together', () => {
  const llm = loadLlm();
  const richEvidence = {
    id: 'CAP-RICH',
    sequenceNo: 1,
    triggerType: 'manual-pin',
    domDiff: { resultMessages: [{ text: '완료' }], changedText: ['완료'] },
    apiEvents: [{ method: 'POST', url: '/orders', status: 200 }],
    context: {
      pageTitle: '주문 승인',
      route: '/orders/approve',
      target: { visibleText: '승인' },
      visibleText: '주문 승인 결과 화면의 충분한 설명 텍스트',
    },
    formSelector: '#approve',
  };
  const weakEvidence = {
    id: 'CAP-WEAK',
    sequenceNo: 2,
    triggerType: 'click',
    context: {
      pageTitle: 'debug storage config',
      route: '/debug/storage',
      target: { visibleText: '' },
      visibleText: '{"api_key":"secret"}',
    },
  };

  assert.equal(llm.computeImageSelectionScore(richEvidence, [richEvidence, weakEvidence]) > llm.computeImageSelectionScore(weakEvidence, [richEvidence, weakEvidence]), true);
});

// Highlighted_Evidence_Priority: 사용자가 강조 오버레이(빨간 테두리)를 남긴 증적(수동 지정 pin,
// 강조 캡처 컨텍스트 메뉴)은 5장 선별 시 다른 이벤트보다 우선해야 한다.
test('manual-pin/shortcut-context/context-menu triggerType은 동일한 강조 우선순위 보너스를 받는다', () => {
  const llm = loadLlm();
  const base = {
    sequenceNo: 1,
    context: { pageTitle: '주문', route: '/orders', target: { visibleText: '버튼' }, visibleText: '충분한 화면 설명 텍스트' },
  };
  const clickScore = llm.computeImageSelectionScore({ ...base, id: 'CAP-CLICK', triggerType: 'click' }, []);
  const manualPinScore = llm.computeImageSelectionScore({ ...base, id: 'CAP-PIN', triggerType: 'manual-pin' }, []);
  const shortcutScore = llm.computeImageSelectionScore({ ...base, id: 'CAP-SHORTCUT', triggerType: 'shortcut-context' }, []);
  const contextMenuScore = llm.computeImageSelectionScore({ ...base, id: 'CAP-MENU', triggerType: 'context-menu' }, []);

  assert.equal(manualPinScore - clickScore, llm.MANUAL_PIN_IMAGE_BONUS);
  assert.equal(shortcutScore - clickScore, llm.MANUAL_PIN_IMAGE_BONUS, 'shortcut-context(강조 단축키)도 동일한 보너스를 받아야 한다');
  assert.equal(contextMenuScore - clickScore, llm.MANUAL_PIN_IMAGE_BONUS, 'context-menu(강조 캡처)도 동일한 보너스를 받아야 한다');
});

test('selectTopImages는 하이라이트된 증적을 일반 클릭 증적보다 먼저 5장 안에 포함시킨다', () => {
  const llm = loadLlm();
  const highlighted = { id: 'CAP-HIGHLIGHT', sequenceNo: 1, triggerType: 'manual-pin', context: { pageTitle: '강조', target: { visibleText: '강조 영역' } } };
  const plainClicks = Array.from({ length: 5 }, (_, index) => ({
    id: `CAP-CLICK-${index}`,
    sequenceNo: index + 2,
    triggerType: 'click',
    context: { pageTitle: `일반 화면 ${index}`, target: { visibleText: `버튼 ${index}` } },
  }));

  const { selected, excluded } = llm.selectTopImages([highlighted, ...plainClicks], 5);
  assert.equal(selected.some((item) => item.id === 'CAP-HIGHLIGHT'), true, '강조된 증적은 5장 캡에서도 항상 선택되어야 한다');
  assert.equal(excluded.some((item) => item.captureId === 'CAP-HIGHLIGHT'), false);
});

test('buildLlmEvidencePacket supports empty evidence steps and never uses imageDataUrl', () => {
  const llm = loadLlm();

  const emptyPacket = llm.buildLlmEvidencePacket({ id: 'FS-EMPTY', title: '빈 기능', result: {} }, [], { mode: 'text-only' });
  assert.equal(emptyPacket.mode, 'text-only');
  assert.equal(Object.hasOwn(emptyPacket, 'images'), false);
  assert.deepEqual(emptyPacket.steps, []);

  const packet = llm.buildLlmEvidencePacket(feature, [{
    stepNo: 1,
    stepType: 'click',
    userAction: '저장 클릭',
    evidenceIds: ['CAP-1'],
    llmSummary: { targetText: '저장', apiSummary: { status: 'summary-failed' }, serverSummary: { status: 'summary-failed' } },
    evidence: [{ id: 'CAP-1', sequenceNo: 1, llmImageDataUrl: 'llm-image', imageDataUrl: 'raw-image', context: { visibleText: 'raw body text' } }],
  }], { mode: 'json-data-url' });

  const serialized = JSON.stringify(packet);
  assert.match(serialized, /llm-image/);
  assert.equal(serialized.includes('raw-image'), false);
  assert.equal(serialized.includes('apiSummary'), false);
  assert.equal(serialized.includes('serverSummary'), false);
});

test('buildSessionTitleRequest builds a text-only request scoped to the group evidence and includes changePurpose', () => {
  const llm = loadLlm();
  const group = { evidenceIds: ['CAP-3', 'CAP-1'] };
  const payload = llm.buildSessionTitleRequest(group, evidence, '승인 기능 검증');

  assert.equal(typeof payload.task, 'string');
  assert.equal(payload.changePurpose, '승인 기능 검증');
  assert.deepEqual(payload.responseSchema, { title: 'string' });
  // 순서는 sequenceNo 오름차순이어야 하고, group.evidenceIds에 없는 CAP-2는 포함되지 않아야 한다.
  assert.deepEqual(payload.evidence.map((item) => item.captureId), ['CAP-1', 'CAP-3']);
  assert.equal(JSON.stringify(payload).includes('thumb-'), false, '이미지 데이터는 포함하지 않아야 한다(텍스트 전용)');
});

test('validateSessionTitleSuggestion trims a valid title and rejects missing/empty/non-string titles', () => {
  const llm = loadLlm();
  assert.deepEqual(llm.validateSessionTitleSuggestion({ title: '  로그인 후 주문 승인 흐름  ' }), { title: '로그인 후 주문 승인 흐름' });

  assert.throws(() => llm.validateSessionTitleSuggestion({}), /Invalid session title suggestion response/);
  assert.throws(() => llm.validateSessionTitleSuggestion({ title: '' }), /Invalid session title suggestion response/);
  assert.throws(() => llm.validateSessionTitleSuggestion({ title: '   ' }), /Invalid session title suggestion response/);
  assert.throws(() => llm.validateSessionTitleSuggestion({ title: 123 }), /Invalid session title suggestion response/);
  assert.throws(() => llm.validateSessionTitleSuggestion(null), /Invalid session title suggestion response/);
});

test('validateTestCaseDescriptionResponse accepts each finalStatus value', () => {
  const llm = loadLlm();
  for (const finalStatus of ['PASS', 'FAIL', 'INCOMPLETE', 'NOT_JUDGED']) {
    const result = llm.validateTestCaseDescriptionResponse({
      testPurpose: '목적',
      preconditions: '조건',
      testProcedure: '절차',
      expectedResult: '기대',
      actualResult: '실제',
      judgementBasis: '근거',
      finalStatus,
    });
    assert.equal(result.finalStatus, finalStatus);
  }

  assert.throws(() => llm.validateTestCaseDescriptionResponse({
    testPurpose: '목적',
    preconditions: '조건',
    testProcedure: '절차',
    expectedResult: '기대',
    actualResult: '실제',
    judgementBasis: '근거',
    finalStatus: 'PENDING',
  }), /Invalid finalStatus/);
});
