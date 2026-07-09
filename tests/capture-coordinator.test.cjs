const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '../extension/shared/capture-coordinator.js');

function loadCoordinator() {
  assert.equal(fs.existsSync(modulePath), true, 'capture coordinator module should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

test('capture coordinator assigns ordered evidence and persists the screenshot', async () => {
  const capture = loadCoordinator();
  const session = { id: 'SESSION-1', active: true, lastSequenceNo: 4 };
  const saved = [];
  const coordinator = capture.createCaptureCoordinator({
    loadSession: async () => session,
    saveSession: async () => {},
    captureVisible: async () => 'data:image/png;base64,AAAA',
    persistEvidence: async (record) => saved.push(record),
    createId: () => 'CAP-5',
    now: () => '2026-07-06T00:00:00.000Z',
  });

  const result = await coordinator.capture({ triggerType: 'click', context: { pageTitle: '주문' } });

  assert.equal(result.id, 'CAP-5');
  assert.equal(result.sequenceNo, 5);
  assert.equal(result.imageDataUrl, 'data:image/png;base64,AAAA');
  assert.equal(saved.length, 1);
  assert.equal(session.lastSequenceNo, 5);
});

test('capture coordinator rejects capture while session is inactive', async () => {
  const capture = loadCoordinator();
  const coordinator = capture.createCaptureCoordinator({
    loadSession: async () => ({ id: 'SESSION-1', active: false, lastSequenceNo: 0 }),
    saveSession: async () => {},
    captureVisible: async () => { throw new Error('must not capture'); },
    persistEvidence: async () => {},
  });

  await assert.rejects(() => coordinator.capture({ triggerType: 'click', context: {} }), /not active/);
});

test('capture coordinator persists form evidence metadata for step grouping', async () => {
  const capture = loadCoordinator();
  const session = { id: 'SESSION-1', active: true, lastSequenceNo: 0, lastEvidenceId: null };
  const saved = [];
  const coordinator = capture.createCaptureCoordinator({
    loadSession: async () => session,
    saveSession: async () => {},
    captureVisible: async () => 'data:image/png;base64,AAAA',
    persistEvidence: async (record) => saved.push(record),
    createId: () => 'CAP-FORM',
    now: () => '2026-07-08T00:00:00.000Z',
  });

  const evidence = await coordinator.capture({
    triggerType: 'form-input',
    formSelector: '#order-form',
    dirtyFields: [{ selector: '#amount', maskedValue: '••••' }],
    context: { formSelector: '#fallback' },
  });

  assert.equal(evidence.formSelector, '#order-form');
  assert.deepEqual(evidence.dirtyFields, [{ selector: '#amount', maskedValue: '••••' }]);
  assert.equal(saved[0].formSelector, '#order-form');
});

test('startRecordingSession returns existing session when recording lock is already held', async () => {
  const capture = loadCoordinator();
  const existing = { id: 'SESSION-EXISTING', active: true, tabId: 7, lastSequenceNo: 1 };
  const persisted = [];
  const coordinator = capture.createCaptureCoordinator({
    ensureRecordingLock: async () => false,
    loadActiveRecordingSession: async () => existing,
    loadSession: async () => existing,
    saveSession: async (session) => persisted.push(session),
    captureVisible: async () => 'data:image/png;base64,AAAA',
    persistEvidence: async () => {
      throw new Error('must not create baseline evidence');
    },
  });

  const result = await coordinator.startRecordingSession({ tabId: 7, recordingPolicy: {}, captureBaselineContext: {} });

  assert.equal(result, existing);
  assert.equal(persisted.length, 0);
});

test('stopRecordingSession deactivates the session without deleting evidence', async () => {
  const capture = loadCoordinator();
  const deleted = [];
  const saved = [];
  const coordinator = capture.createCaptureCoordinator({
    loadSession: async () => null,
    saveSession: async (session) => saved.push({ ...session }),
    captureVisible: async () => '',
    persistEvidence: async () => {},
    deleteEvidence: async (id) => deleted.push(id),
    now: () => '2026-07-08T00:00:00.000Z',
  });
  const session = { id: 'SESSION-1', active: true, lastSequenceNo: 3 };

  const stopped = await coordinator.stopRecordingSession(session);

  assert.equal(stopped.active, false);
  assert.equal(stopped.endedAt, '2026-07-08T00:00:00.000Z');
  assert.deepEqual(deleted, []);
  assert.equal(saved.length, 1);
});
