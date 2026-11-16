const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const report = require('../extension/shared/report.js');

function sampleManifest() {
  return report.buildManifest({
    id: 'R1', title: '주문 승인 QA', projectName: 'OrderOps', author: '개발', changePurpose: '중복 승인 수정',
    features: [
      { id: 'F1', title: '승인', description: '', result: { id: 'F1-R', verification: 'v', expectedResult: 'e', actualResult: 'a', status: 'PASS', evidenceIds: ['E1'] } },
      { id: 'F2', title: '중복 클릭', description: '', result: { id: 'F2-R', verification: '', expectedResult: '', actualResult: '', status: 'FAIL', evidenceIds: [] } },
      { id: 'F3', title: '권한', description: '', result: { id: 'F3-R', verification: '', expectedResult: '', actualResult: '', status: null, evidenceIds: [] } },
    ],
  }, [{ id: 'E1', sessionId: 'S1', sequenceNo: 1, triggerType: 'click', capturedAt: '', imageDataUrl: 'data:image/png;base64,AAAA', context: { pageTitle: '목록' } }]);
}

test('보고서 양식은 기본 에디토리얼을 포함해 5종이고 id가 겹치지 않는다', () => {
  const ids = report.REPORT_TEMPLATES.map((item) => item.id);
  assert.equal(ids.length, 5);
  assert.equal(new Set(ids).size, 5);
  assert.equal(report.DEFAULT_TEMPLATE, 'editorial');
  assert.ok(ids.includes(report.DEFAULT_TEMPLATE));
  for (const item of report.REPORT_TEMPLATES) assert.ok(item.name && item.description, item.id);
});

test('양식을 지정하지 않거나 모르는 양식이면 에디토리얼로 그린다', () => {
  const manifest = sampleManifest();
  assert.match(report.renderHtml(manifest), /<body class="tpl-editorial">/);
  assert.match(report.renderHtml(manifest, { template: 'nope' }), /<body class="tpl-editorial">/);
});

test('양식마다 지면 CSS만 다르고 내용과 manifest는 같다', () => {
  const manifest = sampleManifest();
  const snapshot = JSON.stringify(manifest);
  const bodies = new Set();
  const styles = new Set();
  for (const { id } of report.REPORT_TEMPLATES) {
    const html = report.renderHtml(manifest, { template: id });
    assert.match(html, new RegExp(`<body class="tpl-${id}">`));
    assert.equal(html.includes('<script'), false, id);
    styles.add(/<style>([\s\S]*?)<\/style>/.exec(html)[1]);
    bodies.add(html.replace(/<style>[\s\S]*?<\/style>/, '').replace(/tpl-[a-z]+/, 'tpl-X'));
  }
  assert.equal(styles.size, 5, '양식마다 CSS가 달라야 한다');
  assert.equal(bodies.size, 1, '본문 마크업은 양식과 무관하게 같아야 한다');
  assert.equal(JSON.stringify(manifest), snapshot);
});

test('판정은 칩이 아니라 기호와 글자로 표기한다', () => {
  const html = report.renderHtml(sampleManifest());
  assert.equal(html.includes('class="badge'), false);
  assert.match(html, /<span class="st st-pass">PASS<\/span>/);
  assert.match(html, /<span class="st st-fail">FAIL<\/span>/);
  assert.match(html, /<span class="st st-none">미판정<\/span>/);
  assert.match(html, /\.st-pass::before\{content:"✓"\}/);
  assert.match(html, /<b>그림 \d+\.1-1<\/b>클릭 후 화면 · 목록/, '그림 캡션은 번호와 한국어 트리거 이름을 쓴다');
});

test('편집기는 완료 단계에서 양식을 고르고 미리보기·ZIP 생성에 적용한다', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/editor.js'), 'utf8');
  const html = fs.readFileSync(path.resolve(__dirname, '../extension/editor.html'), 'utf8');
  assert.match(html, /id="template-options"/);
  assert.match(script, /CaptureITReport\.REPORT_TEMPLATES\.map\(/);
  assert.match(script, /report\.documentTemplate = templateId/);
  assert.match(script, /preferredReportTemplate/);
  assert.equal((script.match(/CaptureITReport\.renderHtml\(manifest, \{ template: currentTemplateId\(\) \}\)/g) || []).length, 2);
});
