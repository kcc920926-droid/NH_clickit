const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '../extension/shared/evidence-step-builder.js');

function loadBuilder() {
  assert.equal(fs.existsSync(modulePath), true, 'evidence-step-builder module should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

test('buildEvidenceSteps creates standalone result-check step for result-only evidence', () => {
  const builder = loadBuilder();

  const steps = builder.buildEvidenceSteps([
    {
      id: 'CAP-1',
      sequenceNo: 1,
      triggerType: 'result-check',
      domDiff: { resultMessages: [{ text: '저장되었습니다' }] },
    },
  ]);

  assert.equal(steps.length, 1);
  assert.equal(steps[0].stepType, 'result-check');
  assert.deepEqual(steps[0].evidenceIds, ['CAP-1']);
  assert.deepEqual(steps[0].llmSummary.resultMessages, ['저장되었습니다']);
});

test('buildEvidenceSteps absorbs immediately following result evidence into previous action step', () => {
  const builder = loadBuilder();

  const steps = builder.buildEvidenceSteps([
    { id: 'CAP-1', sequenceNo: 1, triggerType: 'click', context: { target: { visibleText: '저장' } } },
    {
      id: 'CAP-2',
      sequenceNo: 2,
      triggerType: 'result-check',
      domDiff: { resultMessages: [{ text: '저장되었습니다' }] },
    },
  ]);

  assert.equal(steps.length, 1);
  assert.equal(steps[0].stepType, 'click');
  assert.deepEqual(steps[0].evidenceIds, ['CAP-1', 'CAP-2']);
  assert.equal(steps[0].primaryEvidenceId, 'CAP-1');
  assert.deepEqual(steps[0].llmSummary.resultMessages, ['저장되었습니다']);
});

test('buildLlmSummary marks malformed apiEvents and serverEvents as summary-failed', () => {
  const builder = loadBuilder();
  const circular = {};
  circular.self = circular;

  const summary = builder.buildLlmSummary([
    {
      id: 'CAP-1',
      apiEvents: circular,
      serverEvents: circular,
      context: {
        visibleText: '원본 body 전체 텍스트',
        target: { visibleText: '저장' },
      },
    },
  ]);

  assert.equal(summary.status, 'summary-failed');
  assert.deepEqual(summary.apiSummary, { status: 'summary-failed' });
  assert.deepEqual(summary.serverSummary, { status: 'summary-failed' });
  assert.equal(JSON.stringify(summary).includes('원본 body 전체 텍스트'), false);
});
