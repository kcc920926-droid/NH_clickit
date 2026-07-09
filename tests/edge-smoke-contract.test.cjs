const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Edge smoke workflow loads the real extension and emits report artifacts', () => {
  const script = fs.readFileSync(path.resolve(__dirname, 'edge-smoke.mjs'), 'utf8');
  assert.match(script, /--load-extension=/);
  assert.match(script, /CAPTUREIT_FIXTURE_PORT/);
  assert.match(script, /CAPTUREIT_BROWSER_PATH/);
  assert.match(script, /CAPTUREIT_BROWSER_LABEL/);
  assert.match(script, /CAPTUREIT_ARTIFACT_DIR/);
  assert.match(script, /listen\(0, ['"]127\.0\.0\.1['"]/);
  assert.match(script, /getManifest\(\)\.name === ['"]CaptureIT['"]/);
  assert.match(script, /const edgeLaunchOptions = \{ stdio: ['"]ignore['"], windowsHide: false \}/);
  assert.doesNotMatch(script, /--window-position=-32000/);
  assert.match(script, /waitUntil\(['"]CaptureIT extension page['"]/);
  assert.match(script, /createExtensionPage/);
  assert.match(script, /chrome-extension:\/\/\$\{extensionId\}\/editor\.html/);
  assert.match(script, /extensionIdsFromTargets/);
  assert.ok(script.includes("const match = /^chrome-extension:\\/\\/([^/]+)\\//.exec(target.url || '');"));
  assert.match(script, /captureVisibleTab|CAPTURE_REQUEST|CaptureITStorage\.listEvidence/);
  assert.match(script, /Input\.dispatchMouseEvent/);
  assert.match(script, /FS-001-004\.png/);
  assert.match(script, /Page\.navigate/);
  assert.match(script, /CAPTURE_CONTEXT_MENU/);
  assert.match(script, /clickCenter\(page, ['"]#order-status['"], ['"]right['"]\)/);
  assert.match(script, /verifyPersistentStorageAfterRelaunch/);
  assert.match(script, /storage restored/);
  assert.match(script, /waitForEvidenceIdle/);
  assert.match(script, /ensureNavigationEvidence/);
  assert.match(script, /storage-location/);
  assert.match(script, /llm-diagnostics/);
  assert.match(script, /secret-key/);
  assert.match(script, /does not leak LLM API keys/);
  assert.match(script, /report\.html/);
  assert.match(script, /report\.md/);
  assert.match(script, /manifest\.json/);
  assert.match(script, /qa-result\.zip/);
  assert.doesNotMatch(script, /placeholder screenshot|synthetic screenshot/i);
});

test('package exposes Edge smoke and Chrome fallback smoke commands', () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
  assert.equal(pkg.scripts['smoke:edge'], 'node tests/edge-smoke.mjs');
  assert.equal(pkg.scripts['smoke:chrome'], 'node tests/chrome-smoke.mjs');
});

test('Edge smoke has configurable startup and CDP command timeouts for slow managed browsers', () => {
  const script = fs.readFileSync(path.resolve(__dirname, 'edge-smoke.mjs'), 'utf8');

  assert.match(script, /CAPTUREIT_BROWSER_START_TIMEOUT_MS/);
  assert.match(script, /CAPTUREIT_CDP_COMMAND_TIMEOUT_MS/);
  assert.match(script, /browserStartTimeoutMs/);
  assert.match(script, /cdpCommandTimeoutMs/);
});
