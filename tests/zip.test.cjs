const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '../extension/shared/zip.js');

function loadZip() {
  assert.equal(fs.existsSync(modulePath), true, 'zip module should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

test('ZIP writer and reader preserve report entries', async () => {
  const zip = loadZip();
  const archive = await zip.writeZip([
    { name: 'report.html', data: '<h1>QA</h1>' },
    { name: 'assets/FS-001-001.png', data: new Uint8Array([1, 2, 3, 4]) },
  ]);
  const entries = await zip.readZip(archive);

  assert.equal(new TextDecoder().decode(entries.get('report.html')), '<h1>QA</h1>');
  assert.deepEqual([...entries.get('assets/FS-001-001.png')], [1, 2, 3, 4]);
});

test('ZIP writer rejects traversal paths', async () => {
  const zip = loadZip();

  await assert.rejects(() => zip.writeZip([{ name: '../secret.txt', data: 'secret' }]), /Unsafe ZIP path/);
});

test('ZIP reader rejects duplicate names and individual files over the limit', async () => {
  const zip = loadZip();
  const duplicate = await zip.writeZip([
    { name: 'report.md', data: 'first' },
    { name: 'report.md', data: 'second' },
  ]);
  await assert.rejects(() => zip.readZip(duplicate), /Duplicate ZIP path/);

  const oversized = await zip.writeZip([{ name: 'large.bin', data: new Uint8Array(12) }]);
  await assert.rejects(
    () => zip.readZip(oversized, { maxFileBytes: 10 }),
    /ZIP file size limit exceeded/,
  );
});
