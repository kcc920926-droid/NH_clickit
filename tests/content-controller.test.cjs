const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '../extension/shared/content-controller.js');

function loadController() {
  assert.equal(fs.existsSync(modulePath), true, 'content controller module should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

test('event mode captures a click after the render scheduler without waiting for business state', async () => {
  const content = loadController();
  const calls = [];
  const controller = content.createContentController({
    getState: async () => ({ active: true, mode: 'event' }),
    collectContext: (target) => ({ target: { visibleText: target.text } }),
    scheduleAfterPaint: async () => calls.push('paint'),
    requestCapture: async (request) => calls.push(request),
  });

  await controller.captureEvent('click', { text: '승인' });

  assert.equal(calls[0], 'paint');
  assert.equal(calls[1].triggerType, 'click');
  assert.equal(calls[1].context.target.visibleText, '승인');
});

test('capture is ignored while the session is off', async () => {
  const content = loadController();
  let captureCount = 0;
  const controller = content.createContentController({
    getState: async () => ({ active: false, mode: 'event' }),
    collectContext: () => ({}),
    scheduleAfterPaint: async () => {},
    requestCapture: async () => { captureCount += 1; },
  });

  assert.equal(await controller.captureEvent('click', {}), false);
  assert.equal(captureCount, 0);
});

test('captureHighlightShortcut does not capture and returns false when the session is inactive', async () => {
  const content = loadController();
  let captureCount = 0;
  const controller = content.createContentController({
    getState: async () => ({ active: false }),
    collectContext: () => ({}),
    scheduleAfterPaint: async () => {},
    requestCapture: async () => { captureCount += 1; },
  });

  const result = await controller.captureHighlightShortcut({ isConnected: true });

  assert.equal(result, false);
  assert.equal(captureCount, 0);
});

test('captureHighlightShortcut shows/hides the overlay and succeeds for a valid target', async () => {
  const content = loadController();
  const calls = [];
  const overlayCalls = [];
  const controller = content.createContentController({
    getState: async () => ({ active: true }),
    collectContext: () => ({ target: { visibleText: '승인 완료' } }),
    scheduleAfterPaint: async () => {},
    requestCapture: async (request) => { calls.push(request); return { ok: true, evidenceId: 'ev-1', sequenceNo: 1 }; },
    notifyCapture: () => {},
    showOverlay: () => overlayCalls.push('show'),
    hideOverlay: () => overlayCalls.push('hide'),
  });
  const target = { isConnected: true };

  const result = await controller.captureHighlightShortcut(target);

  assert.equal(result, true);
  assert.equal(overlayCalls.filter((call) => call === 'show').length, 1);
  assert.equal(overlayCalls.filter((call) => call === 'hide').length, 1);
  assert.equal(calls[0].triggerType, 'shortcut-context');
});

test('captureHighlightShortcut returns false immediately and skips capture when the target starts disconnected', async () => {
  const content = loadController();
  let captureCount = 0;
  const controller = content.createContentController({
    getState: async () => ({ active: true }),
    collectContext: () => ({}),
    scheduleAfterPaint: async () => {},
    requestCapture: async () => { captureCount += 1; },
  });
  const target = { isConnected: false };

  const result = await controller.captureHighlightShortcut(target);

  assert.equal(result, false);
  assert.equal(captureCount, 0);
});

test('legacy selection-mode methods no longer exist on the controller', async () => {
  const content = loadController();
  const controller = content.createContentController({
    getState: async () => ({ active: true, mode: 'event' }),
    collectContext: () => ({}),
    scheduleAfterPaint: async () => {},
    requestCapture: async () => {},
  });

  assert.equal(controller.enterSelectionMode, undefined);
  assert.equal(controller.isSelecting, undefined);
  assert.equal(controller.captureSelection, undefined);
});

test('successful capture emits a receipt with sequence and captured context', async () => {
  const content = loadController();
  const receipts = [];
  const controller = content.createContentController({
    getState: async () => ({ active: true, mode: 'event' }),
    collectContext: (target) => ({ pageTitle: '테스트 페이지', target: { visibleText: target.text } }),
    scheduleAfterPaint: async () => {},
    requestCapture: async () => ({ ok: true, evidenceId: 'ev-7', sequenceNo: 7 }),
    notifyCapture: (receipt) => receipts.push(receipt),
  });

  await controller.captureEvent('click', { text: '저장' });

  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].evidenceId, 'ev-7');
  assert.equal(receipts[0].sequenceNo, 7);
  assert.equal(receipts[0].triggerType, 'click');
  assert.equal(receipts[0].context.pageTitle, '테스트 페이지');
  assert.equal(receipts[0].context.target.visibleText, '저장');
});

test('manual pin click path does nothing while session is inactive', async () => {
  const content = loadController();
  const calls = [];
  const controller = content.createContentController({
    getState: async () => ({ active: false }),
    collectContext: () => ({}),
    scheduleAfterPaint: async () => {},
    requestCapture: async (request) => calls.push(request),
  });

  assert.equal(await controller.captureManualPin({ isConnected: true }), false);
  assert.deepEqual(calls, []);
});

test('captureBaseline creates exactly one baseline request per invocation', async () => {
  const content = loadController();
  const calls = [];
  const controller = content.createContentController({
    getState: async () => ({ active: true }),
    collectContext: () => ({}),
    scheduleAfterPaint: async () => {},
    requestCapture: async (request) => { calls.push(request); return { ok: true }; },
  });

  await controller.captureBaseline({ pageTitle: '시작 화면' });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].triggerType, 'baseline');
  assert.equal(calls[0].context.pageTitle, '시작 화면');
});
