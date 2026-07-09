const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('background sends capture receipt back to the source tab for immediate user feedback', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/background.js'), 'utf8');

  assert.match(script, /chrome\.tabs\.sendMessage\(\s*sender\.tab\.id,\s*\{\s*type:\s*'CAPTURE_RECEIPT'/s);
  assert.match(script, /evidenceId:\s*evidence\.id/);
  assert.match(script, /sequenceNo:\s*evidence\.sequenceNo/);
  assert.match(script, /triggerType:\s*evidence\.triggerType/);
  assert.match(script, /contextSummary/);
});

test('content script renders a dismissible capture receipt toast on the current page', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/content.js'), 'utf8');

  assert.match(script, /data-captureit-receipt/);
  assert.match(script, /function showCaptureReceipt/);
  assert.match(script, /CAPTURE_RECEIPT/);
  assert.match(script, /notifyCapture:\s*showCaptureReceipt/);
});
