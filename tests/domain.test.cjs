const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '../extension/shared/domain.js');

function loadDomain() {
  assert.equal(fs.existsSync(modulePath), true, 'domain module should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

test('capture session sequence numbers are monotonic', () => {
  const domain = loadDomain();
  const session = domain.createSession('event', '2026-07-06T00:00:00.000Z', 'SESSION-1');

  assert.equal(domain.nextSequence(session), 1);
  assert.equal(domain.nextSequence(session), 2);
  assert.equal(domain.nextSequence(session), 3);
  assert.equal(session.lastSequenceNo, 3);
});

test('overall status prioritizes FAIL and reports incomplete results', () => {
  const domain = loadDomain();

  assert.equal(domain.overallStatus([]), 'INCOMPLETE');
  assert.equal(domain.overallStatus([{ status: 'PASS' }, { status: null }]), 'INCOMPLETE');
  assert.equal(domain.overallStatus([{ status: 'PASS' }, { status: 'FAIL' }]), 'FAIL');
  assert.equal(domain.overallStatus([{ status: 'PASS' }]), 'PASS');
});

test('evidence stays in the inbox until explicitly mapped to a feature', () => {
  const domain = loadDomain();
  const evidence = { id: 'CAP-1', featureSpecId: null, sequenceNo: 1 };
  const feature = domain.createFeature('주문 승인', 'FS-001');
  const state = domain.createEditorState([evidence], [feature]);

  assert.deepEqual(state.inbox.map((item) => item.id), ['CAP-1']);

  domain.mapEvidence(state, 'CAP-1', 'FS-001');

  assert.equal(state.inbox.length, 0);
  assert.deepEqual(state.features[0].result.evidenceIds, ['CAP-1']);
  assert.equal(state.evidence[0].featureSpecId, 'FS-001');
});

test('mapped evidence can return to the inbox after a verdict is selected', () => {
  const domain = loadDomain();
  const evidence = { id: 'CAP-1', featureSpecId: null, sequenceNo: 1 };
  const feature = domain.createFeature('주문 승인', 'FS-001');
  feature.result.status = 'PASS';
  const state = domain.createEditorState([evidence], [feature]);

  domain.mapEvidence(state, 'CAP-1', 'FS-001');
  domain.unmapEvidence(state, 'CAP-1');

  assert.equal(feature.result.status, 'PASS');
  assert.deepEqual(feature.result.evidenceIds, []);
  assert.deepEqual(state.inbox.map((item) => item.id), ['CAP-1']);
});

test('reports and multiple features support create, reorder, and delete without duplicating result sets', () => {
  const domain = loadDomain();
  const report = domain.createReport('회귀 QA', 'REPORT-1', '2026-07-06T00:00:00.000Z');
  const state = domain.createEditorState([], report.features);

  const first = domain.addFeature(state, '로그인', 'FS-001');
  const second = domain.addFeature(state, '주문 승인', 'FS-002');

  assert.equal(report.features.length, 2);
  assert.equal(first.result.id, 'FS-001-RESULT');
  assert.equal(second.result.id, 'FS-002-RESULT');
  assert.equal(Array.isArray(second.results), false, 'a feature must not own multiple result sets');

  domain.moveFeature(state, 'FS-002', -1);
  assert.deepEqual(state.features.map((feature) => feature.id), ['FS-002', 'FS-001']);
  domain.deleteFeature(state, 'FS-001');
  assert.deepEqual(state.features.map((feature) => feature.id), ['FS-002']);
});

test('deleting a feature returns its evidence to the inbox', () => {
  const domain = loadDomain();
  const evidence = { id: 'CAP-1', featureSpecId: null, sequenceNo: 1 };
  const state = domain.createEditorState([evidence], []);
  domain.addFeature(state, '주문 승인', 'FS-001');
  domain.mapEvidence(state, 'CAP-1', 'FS-001');

  domain.deleteFeature(state, 'FS-001');

  assert.equal(evidence.featureSpecId, null);
  assert.deepEqual(state.inbox.map((item) => item.id), ['CAP-1']);
});

test('missing result fields produce warnings without changing report state', () => {
  const domain = loadDomain();
  const report = domain.createReport('QA', 'REPORT-1');
  const feature = domain.createFeature('주문 승인', 'FS-001');
  report.features.push(feature);

  const warnings = domain.validationWarnings(report);

  assert.ok(warnings.some((warning) => warning.code === 'UNSET_VERDICT'));
  assert.ok(warnings.some((warning) => warning.code === 'NO_EVIDENCE'));
  assert.ok(warnings.some((warning) => warning.code === 'MISSING_VERIFICATION'));
  assert.equal(feature.result.status, null);
});

test('ensureDraftReport creates a draft when no report exists and returns the existing report unchanged otherwise', () => {
  const domain = loadDomain();

  const created = domain.ensureDraftReport(null);
  assert.equal(created.isDraft, true);

  const existingReport = domain.createReport('QA', 'REPORT-1');
  const returned = domain.ensureDraftReport(existingReport);
  assert.equal(returned, existingReport);
});

test('saveAsProject throws when projectName is missing or blank', () => {
  const domain = loadDomain();
  const draftReport = domain.createReport('', 'REPORT-1');

  assert.throws(() => domain.saveAsProject(draftReport, {}));
  assert.throws(() => domain.saveAsProject(draftReport, { projectName: '   ' }));
});

test('applyQuickMapping throws and leaves state unchanged when verification is missing or blank', () => {
  const domain = loadDomain();
  const evidence = { id: 'CAP-1', featureSpecId: null, sequenceNo: 1 };
  const feature = domain.createFeature('주문 승인', 'FS-001');
  const state = domain.createEditorState([evidence], [feature]);

  assert.throws(() => domain.applyQuickMapping(state, ['CAP-1'], 'FS-001', {}));
  assert.equal(evidence.featureSpecId, null);
  assert.equal(feature.result.verification, '');

  assert.throws(() => domain.applyQuickMapping(state, ['CAP-1'], 'FS-001', { verification: '   ' }));
  assert.equal(evidence.featureSpecId, null);
  assert.equal(feature.result.verification, '');
});

test('defaultRecordingPolicy fills only missing recording policy fields', () => {
  const domain = loadDomain();

  const policy = domain.defaultRecordingPolicy({
    captureBaselineOnStart: false,
    inputDebounceMs: 0,
    mode: 'manual',
  });

  assert.equal(policy.captureBaselineOnStart, false);
  assert.equal(policy.inputDebounceMs, 0);
  assert.equal(policy.captureFullViewportPerStep, true);
  assert.equal(policy.createLlmCrop, true);
  assert.equal(policy.mutationQuietMs, 300);
  assert.equal(policy.maxSettleMs, 2000);
  assert.equal(policy.maxLlmImagesPerFeature, 5);
  assert.equal(policy.mode, 'manual');
});

test('createEvidenceStep preserves primary evidence id and step fields', () => {
  const domain = loadDomain();

  const step = domain.createEvidenceStep(
    {
      stepNo: 3,
      stepType: 'click',
      evidenceIds: ['CAP-1', 'CAP-2'],
      primaryEvidenceId: 'CAP-2',
    },
    'STEP-3',
  );

  assert.equal(step.stepId, 'STEP-3');
  assert.equal(step.stepNo, 3);
  assert.equal(step.stepType, 'click');
  assert.deepEqual(step.evidenceIds, ['CAP-1', 'CAP-2']);
  assert.equal(step.primaryEvidenceId, 'CAP-2');
  assert.equal(step.title, '');
  assert.equal(step.userAction, '');
  assert.deepEqual(step.llmSummary, {
    visibleText: '',
    targetText: '',
    resultMessages: [],
    apiSummary: '',
    serverSummary: '',
  });
  assert.equal(typeof step.createdAt, 'string');
});

// Feature_Group_Title: 세션(세트) 이름은 별도 저장소 없이 evidence 레코드의 sessionLabel에서 읽어온다.
test('groupIntoCaptureSessionSets는 세션의 첫 evidence에서 sessionLabel을 읽고, 없으면 빈 문자열을 반환한다', () => {
  const domain = loadDomain();
  const evidenceList = [
    { id: 'CAP-2', sessionId: 'SESSION-A', sequenceNo: 2, sessionLabel: '' },
    { id: 'CAP-1', sessionId: 'SESSION-A', sequenceNo: 1, sessionLabel: '로그인 흐름' },
    { id: 'CAP-3', sessionId: 'SESSION-B', sequenceNo: 3 },
  ];

  const groups = domain.groupIntoCaptureSessionSets(evidenceList);
  const groupA = groups.find((group) => group.sessionId === 'SESSION-A');
  const groupB = groups.find((group) => group.sessionId === 'SESSION-B');

  assert.equal(groupA.sessionLabel, '로그인 흐름', '가장 낮은 sequenceNo(CAP-1)의 sessionLabel을 사용해야 한다');
  assert.equal(groupB.sessionLabel, '', 'sessionLabel이 없는 evidence만 있으면 빈 문자열을 반환해야 한다');
});

// LLM 추천 세트 제목: sessionLabel과 동일한 방식(세션의 첫 evidence)으로 llmSessionLabel을 읽어오고,
// 설정되지 않았으면 빈 문자열을 기본값으로 반환한다.
test('groupIntoCaptureSessionSets는 세션의 첫 evidence에서 llmSessionLabel을 읽고, 없으면 빈 문자열을 반환한다', () => {
  const domain = loadDomain();
  const evidenceList = [
    { id: 'CAP-2', sessionId: 'SESSION-A', sequenceNo: 2, llmSessionLabel: '' },
    { id: 'CAP-1', sessionId: 'SESSION-A', sequenceNo: 1, llmSessionLabel: 'LLM이 추천한 제목' },
    { id: 'CAP-3', sessionId: 'SESSION-B', sequenceNo: 3 },
  ];

  const groups = domain.groupIntoCaptureSessionSets(evidenceList);
  const groupA = groups.find((group) => group.sessionId === 'SESSION-A');
  const groupB = groups.find((group) => group.sessionId === 'SESSION-B');

  assert.equal(groupA.llmSessionLabel, 'LLM이 추천한 제목', '가장 낮은 sequenceNo(CAP-1)의 llmSessionLabel을 사용해야 한다');
  assert.equal(groupB.llmSessionLabel, '', 'llmSessionLabel이 없는 evidence만 있으면 빈 문자열을 반환해야 한다');
});
