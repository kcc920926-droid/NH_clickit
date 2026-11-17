const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const tooltip = require('../extension/shared/tooltip.js');
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

const viewport = { width: 400, height: 800 };
const anchor = { left: 100, top: 100, right: 128, bottom: 128, width: 28, height: 28 };
const size = { width: 80, height: 24 };

test('설명은 다른 버튼을 가리지 않는 쪽에 뜬다', () => {
  // 위에 버튼 줄이 있으면 아래로
  assert.equal(tooltip.choosePlacement(anchor, size, [{ left: 60, top: 70, width: 120, height: 28 }], viewport).side, 'bottom');
  // 아래에 버튼 줄이 있으면 위로
  assert.equal(tooltip.choosePlacement(anchor, size, [{ left: 60, top: 134, width: 120, height: 28 }], viewport).side, 'top');
  // 위·아래 다 막히면 옆으로
  const side = tooltip.choosePlacement(anchor, size, [{ left: 40, top: 66, width: 160, height: 32 }, { left: 40, top: 130, width: 160, height: 32 }], viewport).side;
  assert.ok(side === 'right' || side === 'left', side);
});

test('설명은 화면 밖으로 나가지 않는다', () => {
  const corner = { left: 380, top: 2, right: 398, bottom: 20, width: 18, height: 18 };
  const placed = tooltip.choosePlacement(corner, size, [], viewport);
  assert.ok(placed.left >= 0 && placed.left + size.width <= viewport.width, JSON.stringify(placed));
  assert.ok(placed.top >= 0 && placed.top + size.height <= viewport.height, JSON.stringify(placed));
});

test('설명은 기다리지 않고 바로 뜨고, 열린 대화상자 위에도 보인다', () => {
  const source = read('extension/shared/tooltip.js');
  assert.match(source, /addEventListener\('pointerover'/);
  assert.doesNotMatch(source, /setTimeout/, '지연 없이 바로 띄운다');
  assert.match(source, /element\.removeAttribute\('title'\)/, '브라우저 기본 말풍선(늦게 뜨는)과 겹치지 않게 title을 옮긴다');
  assert.match(source, /tip\.popover = 'manual'/);
  assert.match(source, /if \(element && element\.matches\(':focus-visible'\)\) show\(element\);/, '키보드로 가도 뜬다');
  assert.ok(html.indexOf('shared/tooltip.js') < html.indexOf('src="editor.js"'));
  assert.match(editor, /CaptureITTooltip\.install\(document\);/);
});

test("Hick: 증적 세트 머리줄에는 ⋯ 메뉴와 접기만 두고, 연결은 끊는 자리만 누른다", () => {
  const body = functionBody(editor, 'captureGraphCard');
  assert.match(body, /headerActions\.append\(\s*overflowMenu\('세트 메뉴'/);
  assert.doesNotMatch(body, /linkTargetMenu\(/, '세트 전체를 한 곳에 붙이는 "연결 ▾"는 머리줄에서 뺐다');
  assert.match(body, /\{ label: '사진 골라서 옮기기·삭제', run: \(\) => \{ pickMode = true; renderEvidence\(\); \} \}/, '고르기 상자는 필요할 때만 켠다');
  assert.doesNotMatch(body, /iconButton\('세트 삭제'/);
});

test("Fitts: 연결 버튼은 글자를 붙여 크게, 사진에는 붙일 곳 고르기 대신 '여기부터' 하나", () => {
  assert.match(functionBody(editor, 'linkTargetMenu'), /trigger\.replaceChildren\(iconSvg\('link'\), options\.label \|\| '연결',/);
  const node = functionBody(editor, 'captureNode');
  assert.doesNotMatch(node, /linkTargetMenu|mapToFeatureButton/);
  assert.match(node, /cut\.replaceChildren\(iconSvg\('scissors'\), '여기부터'\);/);
  assert.match(node, /if \(split && !pickMode\) \{/, '구획의 첫 사진처럼 나눌 것이 없으면 버튼이 없다');
  assert.match(node, /if \(pickMode\) \{/, '고르기 상자는 켰을 때만');
});

test('Tesler: 테스트케이스가 하나뿐이면 고르라고 하지 않고 그리로 연결', () => {
  assert.match(functionBody(editor, 'featureForMapping'), /if \(editorState\.features\.length === 1\) \{/);
});

test('Von Restorff: 파란 주 버튼은 하나(목적 고르는 중이면 목적 카드, 그다음 녹화 시작, 증적이 모이면 내보내기)', () => {
  const body = functionBody(editor, 'renderPrimaryAction');
  assert.match(body, /const choosing = needsPurpose\(\);/);
  assert.match(body, /elements\.toggleSession\.classList\.toggle\('button-primary', !active && !hasWork && !choosing\);/);
  assert.match(body, /elements\.openExport\.classList\.toggle\('button-primary', !active && hasWork\);/);
});

test('Doherty: 오래 걸리는 버튼은 누르자마자 "…중"으로 바뀐다', () => {
  const body = functionBody(editor, 'withBusy');
  assert.match(body, /button\.disabled = true;/);
  assert.match(body, /button\.textContent = busyLabel;/);
  for (const id of ['exportReport', 'exportEvidenceOnly', 'previewReport', 'requestRecommendations', 'requestTestCaseDescriptionButton']) {
    assert.match(editor, new RegExp(`withBusy\\(elements\\.${id},`), id);
  }
});

test('Peak-End: ZIP을 저장하면 창을 닫고 "폴더에서 보기"를 바로 건넨다', () => {
  for (const name of ['exportReport', 'exportEvidenceOnly']) {
    const body = functionBody(editor, name);
    assert.match(body, /elements\.exportDialog\.close\(\);/);
    assert.match(body, /\{ label: '폴더에서 보기', run: showLastDownloadFile \}/);
  }
});

test('Postel: PNG·JPEG·WebP 말고 다른 이미지도 받아 PNG로 바꾼다', () => {
  const body = functionBody(editor, 'importImages');
  assert.match(body, /if \(!String\(file\.type \|\| ''\)\.startsWith\('image\/'\)\) \{/);
  assert.match(body, /imageDataUrl = canvas\.toDataURL\('image\/png'\);/);
  assert.match(html, /id="image-import" type="file" accept="image\/\*"/);
});
