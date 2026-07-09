const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fc = require('fast-check');

const modulePath = path.resolve(__dirname, '../extension/shared/capture-coordinator.js');

function loadCoordinator() {
  assert.equal(fs.existsSync(modulePath), true, 'capture coordinator module should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

function makeCoordinator(overrides = {}) {
  const capture = loadCoordinator();
  const evidence = [];
  const savedSessions = [];
  const ids = ['SESSION-1', 'CAP-BASE', 'CAP-1', 'CAP-2', 'CAP-3', 'CAP-4', 'CAP-5'];
  const coordinator = capture.createCaptureCoordinator({
    ensureRecordingLock: async () => true,
    loadActiveRecordingSession: async () => null,
    loadSession: async () => savedSessions[savedSessions.length - 1],
    saveSession: async (session) => savedSessions.push(session),
    captureVisible: async () => 'data:image/png;base64,AAAA',
    persistEvidence: async (record) => evidence.push(record),
    createId: () => ids.shift() || `CAP-${ids.length}`,
    now: () => '2026-07-08T00:00:00.000Z',
    ...overrides,
  });
  return { coordinator, evidence, savedSessions };
}

test('Property 1: Baseline Evidence exists exactly once and is always first', async () => {
  await fc.assert(
    fc.asyncProperty(fc.integer({ min: 0, max: 5 }), async (eventCount) => {
      const { coordinator, evidence, savedSessions } = makeCoordinator();
      const session = await coordinator.startRecordingSession({
        tabId: 1,
        recordingPolicy: {},
        captureBaselineContext: { pageTitle: '시작 화면' },
      });

      for (let index = 0; index < eventCount; index += 1) {
        await coordinator.capture({ triggerType: 'click', context: { pageTitle: `화면 ${index}` } });
      }

      const baselines = evidence.filter((item) => item.triggerType === 'baseline');
      assert.equal(baselines.length, 1);
      assert.equal(baselines[0].sequenceNo, 1);
      assert.equal(session.baselineEvidenceId, baselines[0].id);
      assert.equal(evidence.every((item) => item.triggerType === 'baseline' || item.sequenceNo > baselines[0].sequenceNo), true);
      assert.equal(savedSessions[savedSessions.length - 1].baselineEvidenceId, baselines[0].id);
    }),
    { numRuns: 20 },
  );
});

test('Property 3: a tab can have at most one active RecordingSession', async () => {
  await fc.assert(
    fc.asyncProperty(fc.integer({ min: 1, max: 100 }), async (tabId) => {
      const existing = { id: 'SESSION-EXISTING', active: true, tabId, lastSequenceNo: 1 };
      let lockCalls = 0;
      const { coordinator, evidence } = makeCoordinator({
        ensureRecordingLock: async () => {
          lockCalls += 1;
          return lockCalls === 1;
        },
        loadActiveRecordingSession: async () => existing,
      });

      const first = await coordinator.startRecordingSession({ tabId, recordingPolicy: {}, captureBaselineContext: {} });
      const second = await coordinator.startRecordingSession({ tabId, recordingPolicy: {}, captureBaselineContext: {} });

      assert.notEqual(first.id, second.id);
      assert.equal(second, existing);
      assert.equal(evidence.filter((item) => item.triggerType === 'baseline').length, 1);
    }),
    { numRuns: 20 },
  );
});

test('Property 22: capture writes only imageDataUrl and clears derived image fields', async () => {
  await fc.assert(
    fc.asyncProperty(fc.constantFrom('click', 'submit', 'route-change'), async (triggerType) => {
      const capture = loadCoordinator();
      const session = { id: 'SESSION-1', active: true, lastSequenceNo: 0, lastEvidenceId: null };
      const coordinator = capture.createCaptureCoordinator({
        loadSession: async () => session,
        saveSession: async () => {},
        captureVisible: async () => 'data:image/png;base64,AAAA',
        persistEvidence: async () => {},
        createId: () => 'CAP-1',
        now: () => '2026-07-08T00:00:00.000Z',
      });

      const evidence = await coordinator.capture({ triggerType, context: {} });

      assert.equal(evidence.imageDataUrl, 'data:image/png;base64,AAAA');
      assert.equal(evidence.thumbnailDataUrl, null);
      assert.equal(evidence.llmImageDataUrl, null);
      assert.equal(evidence.docImageDataUrl, null);
      assert.equal(evidence.stepId, null);
    }),
    { numRuns: 20 },
  );
});
