const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const editorPath = path.resolve(__dirname, '../extension/editor.html');

test('editor shell exposes three stage-tab buttons with merged mapping/result stage and correct indexes', () => {
  assert.equal(fs.existsSync(editorPath), true, 'editor shell should exist');
  const html = fs.readFileSync(editorPath, 'utf8');

  const expectedTabs = [
    { id: 'stage-tab-capture', index: '0' },
    { id: 'stage-tab-mapping-result', index: '1' },
    { id: 'stage-tab-completion', index: '2' },
  ];

  for (const { id, index } of expectedTabs) {
    const tagMatch = html.match(new RegExp(`<button[^>]*id=["']${id}["'][^>]*>`));
    assert.ok(tagMatch, `<button id="${id}"> should be found`);
    const openTag = tagMatch[0];

    assert.match(openTag, /class=["'][^"']*stage-tab[^"']*["']/, `${id} should have stage-tab class`);
    assert.match(
      openTag,
      new RegExp(`data-stage-index=["']${index}["']`),
      `${id} should have data-stage-index="${index}"`,
    );
  }

  assert.doesNotMatch(html, new RegExp('id=["\']stage-tab-evidence-review["\']'), 'standalone evidence-review tab should be merged');
  assert.doesNotMatch(html, new RegExp('id=["\']stage-tab-result["\']'), 'standalone result tab should be merged');
  assert.match(html, />3 · 완료<\/button>/, 'completion tab should be renumbered to 3');
});

test('editor shell no longer exposes standalone advance-to-mapping/advance-to-result buttons', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  assert.doesNotMatch(html, new RegExp('id=["\']advance-to-mapping["\']'), '#advance-to-mapping should be removed once mapping and result share one stage');
  assert.doesNotMatch(html, new RegExp('id=["\']advance-to-result["\']'), '#advance-to-result should be removed with the standalone result stage');
});

test('feature-mapping-target drawer contains mapped-evidence and feature-mapping-guidance', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  // feature-mapping-target은 #feature-editor-panel 제거 이후 독립 슬라이드 드로어(<aside>)로 바뀌었다.
  const sectionMatch = html.match(/<aside id=["']feature-mapping-target["'][\s\S]*?<\/aside>/);
  assert.ok(sectionMatch, 'feature-mapping-target markup block should be found');
  const sectionHtml = sectionMatch[0];

  assert.match(
    sectionHtml,
    new RegExp('id=["\']mapped-evidence["\']'),
    '#mapped-evidence should be inside feature-mapping-target',
  );
  assert.match(
    sectionHtml,
    new RegExp('id=["\']feature-mapping-guidance["\']'),
    '#feature-mapping-guidance should be inside feature-mapping-target',
  );
});
