const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('background sends capture receipt back to the source tab for immediate user feedback', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/background.js'), 'utf8');

  assert.match(script, /chrome\.tabs\.sendMessage\(\s*sender\.tab\.id,\s*\{\s*type:\s*'CAPTURE_RECEIPT'/s);
  assert.match(script, /evidenceId:\s*evidence\.id/);
  assert.match(script, /sequenceNo:\s*evidence\.sequenceNo/);
  // 중복 화면으로 합쳐진 경우 evidence는 직전 증적이므로, 이번 동작의 트리거를 우선 보낸다.
  assert.match(script, /triggerType:\s*message\.triggerType \|\| evidence\.triggerType/);
  assert.match(script, /merged:\s*Boolean\(evidence\.merged\)/);
  assert.match(script, /contextSummary/);
});

test('content script renders a dismissible capture receipt toast on the current page', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/content.js'), 'utf8');

  assert.match(script, /data-captureit-receipt/);
  assert.match(script, /function showCaptureReceipt/);
  assert.match(script, /CAPTURE_RECEIPT/);
  assert.match(script, /notifyCapture:\s*showCaptureReceipt/);
});
