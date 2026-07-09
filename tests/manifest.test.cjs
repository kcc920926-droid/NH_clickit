const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const manifestPath = path.resolve(__dirname, '../extension/manifest.json');

test('manifest declares the Edge MV3 capture package', () => {
  assert.equal(fs.existsSync(manifestPath), true, 'manifest should exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.background.service_worker, 'background.js');
  assert.equal(manifest.background.type, 'module');
  assert.equal(manifest.action.default_title, 'CaptureIT');
  for (const permission of ['activeTab', 'contextMenus', 'storage', 'unlimitedStorage', 'downloads']) {
    assert.ok(manifest.permissions.includes(permission), `missing ${permission}`);
  }
  assert.ok(manifest.host_permissions.includes('<all_urls>'), 'event capture requires persistent visible-tab access');
  assert.ok(manifest.content_scripts[0].js.includes('content.js'));
  for (const scriptName of ['shared/interaction-settler.js', 'shared/dom-diff.js', 'shared/content-controller.js', 'content.js']) {
    assert.ok(manifest.content_scripts[0].js.includes(scriptName), `missing ${scriptName}`);
  }
  assert.ok(
    manifest.content_scripts[0].js.indexOf('shared/dom-diff.js') < manifest.content_scripts[0].js.indexOf('content.js'),
    'dom diff must load before content.js',
  );
  assert.equal(
    manifest.commands === undefined || !Object.hasOwn(manifest.commands, 'select-context'),
    true,
    'select-context command should be removed (Requirement 9.5)'
  );
});

test('manifest icon files exist at every declared size', () => {
  assert.equal(fs.existsSync(manifestPath), true, 'manifest should exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  for (const relativePath of Object.values(manifest.icons)) {
    assert.equal(fs.existsSync(path.resolve(path.dirname(manifestPath), relativePath)), true, `${relativePath} should exist`);
  }
});
