const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const types = require('../extension/shared/document-types.js');
const domain = require('../extension/shared/domain.js');
const report = require('../extension/shared/report.js');

function sampleReport(documentType) {
  const created = domain.createReport('주문 승인 확인', 'R-1');
  created.documentType = documentType;
  const feature = domain.createFeature('승인 버튼', 'F-1');
  feature.description = '승인 버튼으로 주문을 승인한다';
  feature.result.status = 'FAIL';
  feature.result.actualResult = '권한 오류';
  feature.result.expectedResult = '담당자 권한 확인 필요';
  created.features.push(feature);
  return created;
}

test('문서 유형은 네 가지이고 기본은 QA 결과 보고다', () => {
  assert.deepEqual(types.DOCUMENT_TYPES.map((type) => type.id), ['qa', 'test', 'poc', 'proposal']);
  assert.equal(types.documentType(undefined).id, 'qa');
  assert.equal(types.documentType('없는 유형').id, 'qa');
  assert.equal(types.documentType('poc').item, '확인 포인트');
  assert.equal(types.documentType('proposal').verdict, null, '제안 설명서에는 판정이 없다');
});

test('조사는 받침에 맞춘다', () => {
  assert.equal(types.josa('테스트케이스', '이/가'), '테스트케이스가');
  assert.equal(types.josa('장면', '이/가'), '장면이');
  assert.equal(types.josa('확인 포인트', '을/를'), '확인 포인트를');
  assert.equal(types.josa('테스트 항목', '을/를'), '테스트 항목을');
  assert.equal(types.josa('테스트 항목', '으로/로'), '테스트 항목으로');
});

test('상태 이름은 유형을 따른다', () => {
  const poc = types.documentType('poc');
  assert.equal(types.verdictLabel(poc, 'PASS'), '확인됨');
  assert.equal(types.verdictLabel(poc, 'FAIL'), '안 됨');
  assert.equal(types.verdictLabel(poc, null), '미정');
  assert.equal(types.verdictLabel(types.documentType('qa'), null), '미판정');
});

test('남은 것 검사는 그 유형에 있는 칸과 상태만 본다', () => {
  const poc = domain.validationWarnings(sampleReport('poc'), types.documentType('poc')).map((item) => item.code);
  assert.ok(!poc.includes('MISSING_VERIFICATION'), 'PoC에는 검증 내용 칸이 없다');
  const scene = domain.validationWarnings({ features: [domain.createFeature('첫 화면', 'S-1')] }, types.documentType('proposal')).map((item) => item.code);
  assert.deepEqual(scene, ['NO_EVIDENCE'], '장면은 판정·결과 칸을 묻지 않는다');
  // 유형을 주지 않으면 예전처럼 QA 기준
  const qa = domain.validationWarnings({ features: [domain.createFeature('x', 'F')] }).map((item) => item.code);
  assert.ok(qa.includes('MISSING_VERIFICATION') && qa.includes('UNSET_VERDICT'));
});

test('manifest에 문서 유형을 담되 schemaVersion은 그대로다(예전 뷰어도 연다)', () => {
  const manifest = report.buildManifest(sampleReport('poc'), []);
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.documentType, 'poc');
  assert.equal(report.buildManifest({ ...sampleReport('qa'), documentType: undefined }, []).documentType, 'qa');
});

test('PoC 문서는 확인 포인트와 확인 상태 이름으로 나온다', () => {
  const manifest = report.buildManifest(sampleReport('poc'), []);
  const html = report.renderHtml(manifest);
  assert.match(html, /<div class="kicker">PoC 확인 기록<\/div>/);
  assert.match(html, /<th>확인 포인트<\/th><th>확인<\/th>/);
  assert.match(html, /확인 포인트별 상세/);
  assert.match(html, /<span class="st st-fail">안 됨<\/span>/);
  assert.match(html, /<dt>확인 결과<\/dt><dd>권한 오류<\/dd><dt>질문·후속<\/dt>/);
  assert.doesNotMatch(html, /<dt>검증 내용<\/dt>/);
  const markdown = report.renderMarkdown(manifest);
  assert.match(markdown, /\| ID \| 확인 포인트 \| 확인 \| 증적 \|/);
  assert.match(markdown, /- 확인: \*\*안 됨\*\*/);
});

test('제안 설명서는 판정 칸과 결과 칸 없이 장면과 설명만 나온다', () => {
  const manifest = report.buildManifest(sampleReport('proposal'), []);
  const html = report.renderHtml(manifest);
  assert.match(html, /<th>번호<\/th><th>장면<\/th><th class="num">증적<\/th>/);
  assert.doesNotMatch(html, /class="st /, '판정 표시가 없다');
  assert.doesNotMatch(html, /class="verdict-line"/);
  assert.doesNotMatch(html, /<dl class="fields">/);
  assert.match(html, /승인 버튼으로 주문을 승인한다/);
  assert.doesNotMatch(report.renderMarkdown(manifest), /판정|PASS|FAIL/);
});

test('QA 문서는 예전과 같은 이름을 쓴다', () => {
  const html = report.renderHtml(report.buildManifest(sampleReport('qa'), []));
  assert.match(html, /<div class="kicker">QA 결과 보고<\/div>/);
  assert.match(html, /<th>테스트케이스<\/th><th>판정<\/th>/);
  assert.match(html, /테스트케이스별 상세/);
});

test('편집기는 보고서마다 문서 유형을 고르고, 이름·칸·상태를 그 유형으로 그린다', () => {
  const editor = fs.readFileSync(path.resolve(__dirname, '../extension/editor.js'), 'utf8');
  const html = fs.readFileSync(path.resolve(__dirname, '../extension/editor.html'), 'utf8');
  assert.ok(html.indexOf('shared/document-types.js') < html.indexOf('shared/report.js'), 'report.js가 쓰므로 먼저 불러온다');
  assert.match(html, /id="document-type-options"/);
  assert.match(html, /id="report-type"/);
  assert.match(editor, /report\.documentType = typeId;/);
  assert.match(editor, /CaptureITDomain\.validationWarnings\(\{ \.\.\.report, features: editorState\.features \}, type\)/);
  assert.match(editor, /if \(!docType\(\)\.verdict\) return null;/, '판정 없는 유형은 판정 버튼을 그리지 않는다');
  // AI 초안은 그 유형에서 뜻이 맞는 칸만 채운다(PoC의 expectedResult 자리는 '질문·후속')
  const apply = editor.slice(editor.indexOf('function applyTestCaseDescription'), editor.indexOf('feature.aiOpinion = {'));
  assert.match(apply, /type\.id === 'poc'/);
  const pocBranch = apply.slice(apply.indexOf("type.id === 'poc'"), apply.indexOf('} else {'));
  assert.doesNotMatch(pocBranch, /expectedResult/);
});
