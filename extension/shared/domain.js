(function attachDomain(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CaptureITDomain = api;
})(globalThis, function createDomainApi() {
  const DEFAULT_RECORDING_POLICY = Object.freeze({
    captureBaselineOnStart: true,
    captureFullViewportPerStep: true,
    createLlmCrop: true,
    inputDebounceMs: 800,
    mutationQuietMs: 300,
    maxSettleMs: 2000,
    maxLlmImagesPerFeature: 5,
  });

  function createSession(mode, now = new Date().toISOString(), id = crypto.randomUUID()) {
    return {
      id,
      mode,
      startedAt: now,
      endedAt: null,
      lastSequenceNo: 0,
    };
  }

  function defaultRecordingPolicy(overrides = {}) {
    const policy = { ...overrides };
    for (const [key, value] of Object.entries(DEFAULT_RECORDING_POLICY)) {
      if (policy[key] === undefined) {
        policy[key] = value;
      }
    }
    return policy;
  }

  function createRecordingSession(recordingPolicy = {}, now = new Date().toISOString(), id = crypto.randomUUID()) {
    const normalizedPolicy = defaultRecordingPolicy(recordingPolicy);
    const mode = normalizedPolicy.mode ?? 'event';
    return {
      ...createSession(mode, now, id),
      recordingPolicy: normalizedPolicy,
      lastEvidenceId: null,
      baselineEvidenceId: null,
    };
  }

  function createEvidenceStep(step, id = crypto.randomUUID()) {
    const evidenceIds = Array.isArray(step.evidenceIds) ? [...step.evidenceIds] : [];
    return {
      stepId: id,
      sessionId: step.sessionId ?? null,
      stepNo: step.stepNo,
      stepType: step.stepType,
      title: step.title ?? '',
      userAction: step.userAction ?? '',
      evidenceIds,
      primaryEvidenceId: step.primaryEvidenceId ?? evidenceIds[0] ?? null,
      llmSummary: step.llmSummary ?? {
        visibleText: '',
        targetText: '',
        resultMessages: [],
        apiSummary: '',
        serverSummary: '',
      },
      createdAt: step.createdAt ?? new Date().toISOString(),
    };
  }

  function nextSequence(session) {
    session.lastSequenceNo += 1;
    return session.lastSequenceNo;
  }

  function overallStatus(results) {
    if (results.some((result) => result.status === 'FAIL')) {
      return 'FAIL';
    }
    if (results.length === 0 || results.some((result) => result.status !== 'PASS')) {
      return 'INCOMPLETE';
    }
    return 'PASS';
  }

  function createFeature(title, id = crypto.randomUUID()) {
    return {
      id,
      title,
      description: '',
      result: {
        id: `${id}-RESULT`,
        verification: '',
        expectedResult: '',
        actualResult: '',
        status: null,
        evidenceIds: [],
      },
    };
  }

  function createReport(title = '새 QA 보고서', id = crypto.randomUUID(), now = new Date().toISOString()) {
    return {
      id,
      title,
      projectName: '',
      author: '',
      changePurpose: '',
      changeSummary: '',
      configurationOverview: '',
      features: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  function ensureDraftReport(existingReport, title = '') {
    if (existingReport) return existingReport;
    const draft = createReport(title);
    draft.isDraft = true;
    return draft;
  }

  function groupIntoCaptureSessionSets(evidenceList) {
    const bySession = new Map();
    for (const evidence of evidenceList) {
      if (!bySession.has(evidence.sessionId)) {
        bySession.set(evidence.sessionId, []);
      }
      bySession.get(evidence.sessionId).push(evidence);
    }

    const sets = [];
    for (const [sessionId, items] of bySession) {
      const sorted = [...items].sort((left, right) => left.sequenceNo - right.sequenceNo);
      sets.push({
        sessionId,
        evidenceIds: sorted.map((item) => item.id),
        count: sorted.length,
        minSequenceNo: sorted[0].sequenceNo,
        // Feature_Group_Title: 세트(세션) 이름은 별도 스토리지 없이 evidence 레코드에 저장되므로,
        // 그 세션의 첫(가장 낮은 sequenceNo) evidence 항목에서 읽어온다. 아직 이름을 붙이지 않았으면
        // 빈 문자열을 반환해 UI가 placeholder(파생 텍스트)를 보여주도록 한다.
        sessionLabel: sorted[0].sessionLabel || '',
        // LLM 추천 세트 제목: 사용자가 직접 입력한 sessionLabel과 별도로, LLM이 추천한 제목을
        // 같은 방식(세션의 첫 evidence)으로 읽어온다. 값 우선순위(수동 > LLM 추천 > 파생 텍스트)는
        // UI(editor.js의 captureGraphCard)에서 결정한다.
        llmSessionLabel: sorted[0].llmSessionLabel || '',
      });
    }

    sets.sort((left, right) => left.minSequenceNo - right.minSequenceNo);
    return sets.map(({ sessionId, evidenceIds, count, sessionLabel, llmSessionLabel }) => (
      { sessionId, evidenceIds, count, sessionLabel, llmSessionLabel }
    ));
  }

  function refreshInbox(state) {
    state.inbox = state.evidence
      .filter((item) => !item.featureSpecId)
      .sort((left, right) => left.sequenceNo - right.sequenceNo);
  }

  function createEditorState(evidence = [], features = []) {
    const state = { evidence, features, inbox: [] };
    refreshInbox(state);
    return state;
  }

  function findEvidence(state, evidenceId) {
    const evidence = state.evidence.find((item) => item.id === evidenceId);
    if (!evidence) throw new Error(`Unknown evidence: ${evidenceId}`);
    return evidence;
  }

  function removeFromFeatures(state, evidenceId) {
    for (const feature of state.features) {
      feature.result.evidenceIds = feature.result.evidenceIds.filter((id) => id !== evidenceId);
    }
  }

  function mapEvidence(state, evidenceId, featureId) {
    const evidence = findEvidence(state, evidenceId);
    const feature = state.features.find((item) => item.id === featureId);
    if (!feature) throw new Error(`Unknown feature: ${featureId}`);
    removeFromFeatures(state, evidenceId);
    evidence.featureSpecId = featureId;
    feature.result.evidenceIds.push(evidenceId);
    refreshInbox(state);
  }

  function mapEvidenceBatch(state, evidenceIds, featureId) {
    for (const evidenceId of evidenceIds) {
      mapEvidence(state, evidenceId, featureId);
    }
  }

  function applyQuickMapping(state, evidenceIds, featureId, fields) {
    const verification = fields && fields.verification;
    if (!verification || !verification.trim()) {
      throw new Error('검증 내용을 입력하십시오.');
    }
    mapEvidenceBatch(state, evidenceIds, featureId);
    const feature = state.features.find((item) => item.id === featureId);
    feature.result.verification = verification;
    feature.result.expectedResult = fields.expectedResult === undefined ? '' : fields.expectedResult;
    feature.result.actualResult = fields.actualResult === undefined ? '' : fields.actualResult;
  }

  function saveAsProject(draftReport, projectDetails) {
    const projectName = projectDetails && projectDetails.projectName;
    if (!projectName || !projectName.trim()) {
      throw new Error('프로젝트명을 입력하십시오.');
    }
    return {
      ...draftReport,
      projectName,
      title: projectDetails.title ?? '',
      author: projectDetails.author ?? '',
      changePurpose: projectDetails.changePurpose ?? '',
      changeSummary: projectDetails.changeSummary ?? '',
      configurationOverview: projectDetails.configurationOverview ?? '',
      isDraft: false,
    };
  }

  function unmapEvidence(state, evidenceId) {
    const evidence = findEvidence(state, evidenceId);
    removeFromFeatures(state, evidenceId);
    evidence.featureSpecId = null;
    refreshInbox(state);
  }

  function addFeature(state, title = '새 기능', id = crypto.randomUUID()) {
    const feature = createFeature(title, id);
    state.features.push(feature);
    return feature;
  }

  function moveFeature(state, featureId, offset) {
    const index = state.features.findIndex((item) => item.id === featureId);
    if (index < 0) throw new Error(`Unknown feature: ${featureId}`);
    const target = Math.max(0, Math.min(state.features.length - 1, index + offset));
    if (target === index) return false;
    const [feature] = state.features.splice(index, 1);
    state.features.splice(target, 0, feature);
    return true;
  }

  function deleteFeature(state, featureId) {
    const index = state.features.findIndex((item) => item.id === featureId);
    if (index < 0) throw new Error(`Unknown feature: ${featureId}`);
    for (const evidence of state.evidence) {
      if (evidence.featureSpecId === featureId) evidence.featureSpecId = null;
    }
    state.features.splice(index, 1);
    refreshInbox(state);
  }

  function validationWarnings(report) {
    const warnings = [];
    if (!report.features.length) warnings.push({ code: 'NO_FEATURES', message: '기능 명세가 없습니다.' });
    for (const feature of report.features) {
      const { result } = feature;
      const add = (code, message) => warnings.push({ code, featureId: feature.id, message });
      if (!result.status) add('UNSET_VERDICT', '판정이 선택되지 않았습니다.');
      if (!result.evidenceIds.length) add('NO_EVIDENCE', '연결된 증적이 없습니다.');
      if (!result.verification.trim()) add('MISSING_VERIFICATION', '검증 내용이 비어 있습니다.');
      if (!result.expectedResult.trim()) add('MISSING_EXPECTED_RESULT', '기대 결과가 비어 있습니다.');
      if (!result.actualResult.trim()) add('MISSING_ACTUAL_RESULT', '실제 결과가 비어 있습니다.');
      if (result.status === 'FAIL' && !result.actualResult.trim()) {
        add('FAIL_WITHOUT_ACTUAL_RESULT', 'FAIL 판정의 실제 결과가 비어 있습니다.');
      }
    }
    return warnings;
  }

  return {
    addFeature,
    applyQuickMapping,
    createEditorState,
    createEvidenceStep,
    createFeature,
    createRecordingSession,
    createReport,
    createSession,
    deleteFeature,
    defaultRecordingPolicy,
    ensureDraftReport,
    groupIntoCaptureSessionSets,
    mapEvidence,
    mapEvidenceBatch,
    moveFeature,
    nextSequence,
    overallStatus,
    saveAsProject,
    unmapEvidence,
    validationWarnings,
  };
});
