const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '../extension/shared/viewer.js');

function loadViewer() {
  assert.equal(fs.existsSync(modulePath), true, 'viewer module should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

test('viewer prefers HTML and falls back to Markdown', () => {
  const viewer = loadViewer();

  assert.equal(viewer.chooseEntry(new Set(['report.html', 'report.md'])), 'report.html');
  assert.equal(viewer.chooseEntry(new Set(['report.md'])), 'report.md');
  assert.equal(viewer.chooseEntry(new Set()), null);
});

test('viewer sanitizer removes scripts, event handlers, and javascript URLs', () => {
  const viewer = loadViewer();
  const dirty = '<h1 onclick="alert(1)">QA</h1><script>alert(2)</script><a href="javascript:alert(3)">bad</a>';
  const clean = viewer.sanitizeHtmlString(dirty);

  assert.equal(clean.includes('<script'), false);
  assert.equal(clean.includes('onclick'), false);
  assert.equal(clean.toLowerCase().includes('javascript:'), false);
  assert.match(clean, /<h1>QA<\/h1>/);
});

test('viewer validates the CaptureIT manifest and every referenced asset', () => {
  const viewer = loadViewer();
  const manifest = {
    schemaVersion: 1,
    report: { id: 'REPORT-1', title: 'QA' },
    features: [{ id: 'FS-001', result: { evidence: [{ file: 'assets/FS-001-001.png' }] } }],
  };
  const names = new Set(['manifest.json', 'report.html', 'assets/FS-001-001.png']);

  assert.equal(viewer.validatePackage(manifest, names), true);
  assert.throws(
    () => viewer.validatePackage(manifest, new Set(['manifest.json', 'report.html'])),
    /누락된 증적 파일/,
  );
  assert.throws(
    () => viewer.validatePackage({ ...manifest, schemaVersion: 99 }, names),
    /지원하지 않는 manifest/,
  );
  const traversal = structuredClone(manifest);
  traversal.features[0].result.evidence[0].file = '../secret.png';
  assert.throws(() => viewer.validatePackage(traversal, names), /위험한 증적 경로/);
});
