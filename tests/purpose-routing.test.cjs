const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const types = require('../extension/shared/document-types.js');
const llm = require('../extension/shared/llm.js');
const report = require('../extension/shared/report.js');
const domain = require('../extension/shared/domain.js');
const read = (relative) => fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8');
const editor = read('extension/editor.js');
const html = read('extension/editor.html');

function functionBody(source, name) {
  const match = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\([^)]*\\)\\s*{`).exec(source);
  assert.ok(match, `function ${name} should exist`);
  let depth = 1;
  let index = match.index + match[0].length;
  const start = index;
  while (depth > 0) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}') depth -= 1;
    index += 1;
  }
  return source.slice(start, index - 1);
}

test('유형마다 시작 문구·내보내기 이름·기본 양식·AI 할 일이 따로 있다', () => {
  for (const type of types.DOCUMENT_TYPES) {
    for (const key of ['when', 'output', 'defaultTitle', 'newItemTitle', 'defaultTemplate', 'exportLabel', 'zipSuffix', 'aiTask']) {
      assert.ok(type[key], `${type.id}.${key}`);
    }
    for (const key of ['title', 'idle', 'recording']) assert.ok(type.capture[key], `${type.id}.capture.${key}`);
  }
  const titles = new Set(types.DOCUMENT_TYPES.map((type) => type.capture.title));
  assert.equal(titles.size, 4, '녹화 안내가 목적마다 다르다');
  assert.equal(types.documentType('proposal').defaultTemplate, 'gallery', '설명서는 장면을 크게 보여 주는 양식');
  assert.equal(types.documentType('test').defaultTemplate, 'formal', '결과서는 제출용 양식');
  assert.doesNotMatch(types.documentType('proposal').aiTask, /QA/);
});

test('기본 제목인지 알아본다(유형을 바꿀 때 기본 제목만 바꾼다)', () => {
  assert.equal(types.isDefaultTitle('새 QA 보고서'), true, '예전 기본 제목');
  assert.equal(types.isDefaultTitle('새 PoC 확인 기록'), true);
  assert.equal(types.isDefaultTitle(''), true);
  assert.equal(types.isDefaultTitle('주문 승인 PoC'), false);
});

test('AI 설명 요청은 목적에 맞는 할 일과 칸 이름을 보낸다', () => {
  const feature = domain.createFeature('장면 1', 'S-1');
  const request = llm.buildTestCaseDescriptionRequest(feature, [], { documentType: types.documentType('proposal') });
  assert.equal(request.task, types.documentType('proposal').aiTask);
  assert.deepEqual(request.documentType, { id: 'proposal', name: '제안·화면 설명서', item: '장면', description: '설명 문구', fields: [], judged: false });
  const legacy = llm.buildTestCaseDescriptionRequest(feature, []);
  assert.equal(Object.hasOwn(legacy, 'documentType'), false, '유형을 주지 않으면 예전과 같다');
  assert.match(functionBody(editor, 'requestTestCaseDescription'), /documentType: docType\(\),/);
});

test('제목이 없는 문서는 유형의 기본 제목을 쓴다', () => {
  const created = domain.createReport('', 'R-1');
  created.documentType = 'poc';
  assert.equal(report.buildManifest(created, []).report.title, '새 PoC 확인 기록');
});

test('새 보고서는 목적을 고르지 않은 빈 보고서로 시작하고, 작업대가 "무엇을 만들까요?"를 먼저 보여 준다', () => {
  const create = functionBody(editor, 'createInitialReport');
  assert.doesNotMatch(create, /createFeature|documentType =/, 'QA로 정해 두거나 테스트케이스를 미리 넣지 않는다');
  assert.match(html, /<section id="purpose-start"[^>]*hidden>/);
  assert.match(html, />무엇을 만들까요\?</);
  const needs = functionBody(editor, 'needsPurpose');
  assert.match(needs, /if \(editorState\.evidence\.length > 0 \|\| editorState\.features\.length > 0\) return false;/, '바로 녹화하거나 붙여넣어도 된다');
  assert.match(needs, /return !report \|\| !report\.documentType;/);
  const render = functionBody(editor, 'renderPurposeStart');
  assert.match(render, /type\.when/);
  assert.match(render, /type\.output/);
  assert.match(render, /setDocumentType\(type\.id\)/);
});

test('녹화 안내·내보내기 버튼·ZIP 이름·기본 양식이 목적을 따른다', () => {
  const session = functionBody(editor, 'renderSession');
  assert.match(session, /const capture = needsPurpose\(\)\s*\?[\s\S]*?: docType\(\)\.capture;/, '목적을 고르기 전엔 중립 문구, 고른 뒤엔 그 목적의 문구');
  assert.match(functionBody(editor, 'renderTerms'), /elements\.exportReport\.textContent = type\.exportLabel;/);
  assert.match(functionBody(editor, 'currentTemplateId'), /report && report\.documentTemplate \|\| docType\(\)\.defaultTemplate/);
  assert.match(html, /<button id="report-type" class="report-type" type="button"/, '머리줄의 유형을 눌러 바꾼다');
});

test('QA 전용 이름이 화면·뷰어·확장 설명에 남지 않는다', () => {
  assert.doesNotMatch(html.replace(/<!--[\s\S]*?-->/g, ''), /새 QA 보고서|테스트를 평소처럼/);
  assert.doesNotMatch(editor, /'QA 증적'|exportFilename\('QA결과'\)|'테스트 화면을 녹화하세요'/);
  assert.doesNotMatch(read('extension/viewer.html'), /QA Viewer|QA 보고서/);
  assert.doesNotMatch(JSON.parse(read('extension/manifest.json')).description, /^사내 QA/);
});
