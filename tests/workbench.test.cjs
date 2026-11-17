const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// 편집기는 브라우저 API에 기대므로 다른 편집기 테스트처럼 소스를 읽어 동작 경로를 확인한다.
// 실제 동작은 실제 Chromium에 확장을 올린 시나리오로 따로 확인했다.
const read = (relative) => fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8');
const editor = read('extension/editor.js');
const html = read('extension/editor.html');
const background = read('extension/background.js');
const manifest = JSON.parse(read('extension/manifest.json'));

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

test('아이콘을 누르면 작업대가 테스트 화면 옆 사이드 패널로 열린다', () => {
  assert.ok(manifest.permissions.includes('sidePanel'));
  assert.equal(manifest.side_panel.default_path, 'editor.html');
  assert.match(background, /chrome\.sidePanel\.setPanelBehavior\(\{ openPanelOnActionClick: true \}\)/);
  // 사이드 패널이 없는 브라우저를 위한 탭 열기는 남긴다.
  assert.match(background, /chrome\.action\.onClicked\.addListener\(\(\) => \{\s*chrome\.tabs\.create\(\{ url: chrome\.runtime\.getURL\('editor\.html'\) \}\);/);
});

test('패널 ↔ 탭 전환은 새 쪽을 연 뒤 지금 쪽을 닫아 같은 보고서를 두 곳에서 고치지 않게 한다', () => {
  const body = functionBody(editor, 'switchView');
  assert.match(body, /await chrome\.sidePanel\.open\(\{ windowId: hostTab\.windowId \}\);\s*await chrome\.tabs\.remove\(hostTab\.id\);/);
  assert.match(body, /await chrome\.tabs\.create\(\{ url: chrome\.runtime\.getURL\('editor\.html'\) \}\);\s*window\.close\(\);/);
  const detect = functionBody(editor, 'detectHost');
  assert.match(detect, /hostTab = await chrome\.tabs\.getCurrent\(\)/, '탭인지 패널인지 getCurrent로 구분한다');
  assert.match(detect, /chrome\.tabs\.onActivated\.addListener/, '패널에서는 탭을 바꾸면 녹화 대상 안내를 갱신한다');
  assert.match(html, /id="toggle-view"/);
});

test('수집 대상으로 정한 테스트케이스에 새 증적(녹화·붙여넣기)이 바로 연결된다', () => {
  const attach = functionBody(editor, 'attachToCaptureTarget');
  assert.match(attach, /return item && !item\.featureSpecId;/, '이미 연결된 증적은 옮기지 않는다');
  assert.match(attach, /CaptureITDomain\.mapEvidenceBatch\(editorState, fresh, feature\.id\)/);
  assert.doesNotMatch(attach, /autoRunAiPipelineForFeature/, '수집마다 AI를 돌리지 않는다');
  assert.match(functionBody(editor, 'refreshEvidence'), /return serial\(refreshEvidenceNow\);/, '연결을 바꾸는 일과 겹치지 않게 한 줄로 세운다');
  const refresh = functionBody(editor, 'refreshEvidenceNow');
  assert.match(refresh, /const knownIds = new Set\(editorState\.evidence\.map\(\(item\) => item\.id\)\);/);
  assert.match(refresh, /attachToCaptureTarget\(evidence\.filter\(\(item\) => !knownIds\.has\(item\.id\)\)/);
  assert.match(functionBody(editor, 'importImages'), /await attachToCaptureTarget\(addedIds\)/);
  assert.match(functionBody(editor, 'setCaptureTarget'), /report\.captureTargetFeatureId = featureId \|\| null;/);
});

test('"연결 ▾"는 붙일 곳을 고른다: 기존 항목 / 새로 만들어 연결 / (세트면) 화면별로 나눠 만들기', () => {
  const menu = functionBody(editor, 'linkTargetMenu');
  assert.match(menu, /editorState\.features\.forEach\(\(feature, index\) => \{/, '모든 항목을 보여 준다');
  assert.match(menu, /entry\(`＋ 새 \$\{itemWord\(\)\}로 만들어 연결`, \(\) => linkToNewFeature\(ids\)/);
  assert.match(menu, /if \(parts\.length > 1\) \{/);
  assert.match(menu, /\(\) => splitIntoFeatures\(ids\)/);
  assert.doesNotMatch(editor, /pendingMapEvidenceIds|setPendingMapping|function mapToFeatureButton/, '말없이 지금 고른 항목에 붙던 방식은 없앤다');
  const split = functionBody(editor, 'splitIntoFeatures');
  assert.match(split, /const free = evidenceItems\(evidenceIds\)\.filter\(\(item\) => !item\.featureSpecId\)/, '이미 연결된 증적은 그대로 둔다');
  assert.match(split, /CaptureITSegments\.assignParts\(editorState, parts, \{ afterFeatureId: options\.afterFeatureId \|\| null \}\)/, '빈 항목부터 채우고 모자라면 새로 만든다');
  assert.doesNotMatch(split, /autoRunAiPipelineForFeature/, '나눠 만들 때 AI를 한꺼번에 돌리지 않는다(분당 한도)');
});

test('떨어져 있는 사진은 "고르기"로 여러 장 골라 "선택한 N장 → 연결 ▾"로 한 번에 옮긴다', () => {
  const bar = functionBody(editor, 'renderLinkTarget');
  assert.match(bar, /`선택한 \$\{selectedEvidenceIds\.size\}장`/);
  assert.match(bar, /linkTargetMenu\(\(\) => \[\.\.\.selectedEvidenceIds\], \{ label: '연결' \}\)/);
  const withUndo = functionBody(editor, 'mapEvidenceIdsWithUndo');
  assert.match(withUndo, /for \(const id of targetIds\) selectedEvidenceIds\.delete\(id\);/, '연결한 사진은 선택에서 뺀다');
  assert.match(withUndo, /if \(selectedEvidenceIds\.size === 0\) pickMode = false;/, '다 옮기면 고르기를 끝낸다');
  assert.match(bar, /if \(!pickMode && selectedEvidenceIds\.size === 0\) \{/);
});

test('검증 내용 등 항목의 칸은 카드에서 입력한다(보고서 표에 들어가는데 입력란이 없어 경고만 떴다)', () => {
  const card = functionBody(editor, 'featureCard');
  assert.match(card, /for \(const field of docType\(\)\.fields\) \{/);
  assert.match(card, /input\.dataset\.featureField = field\.key;/);
  assert.match(functionBody(editor, 'commitFeatureField'), /else if \(field === 'verification'\) feature\.result\.verification = value;/);
});

test('내보내기의 "남은 것"은 테스트케이스마다 한 줄로 묶는다', () => {
  const body = functionBody(editor, 'renderWarnings');
  assert.match(body, /빠짐: \$\{missing\.join\(', '\)\}/);
  assert.match(body, /FAIL_WITHOUT_ACTUAL_RESULT/);
});

test('녹화 중에만 방금 찍힌 화면을 수집 줄에 보여 준다', () => {
  assert.match(functionBody(editor, 'renderRecentEvidence'), /const evidence = session && session\.active \? latestEvidence\(\) : null;/);
});

test('증적 세트는 처음부터 펼쳐 어디서 나뉘었는지 바로 보여 준다(접은 세트는 기억)', () => {
  const body = functionBody(editor, 'captureGraphCard');
  assert.match(body, /const remembered = !collapsedSessions\.has\(group\.sessionId\);/);
});

test('화면 문구에 이모지 아이콘을 쓰지 않는다', () => {
  const strings = [...editor.matchAll(/'([^'\n]*)'/g)].map((match) => match[1]);
  for (const text of strings) assert.doesNotMatch(text, /🔗|✨|🚀/u, text);
  assert.doesNotMatch(html, /🔗|✨|🚀/u);
});

test('화면 안내는 끌어다 놓기 대신 붙여넣기·이미지 불러오기·연결 버튼만 말한다(사내 DRM)', () => {
  const userText = [...editor.matchAll(/(['`])((?:(?!\1)[^\n])*)\1/g)].map((match) => match[2]).filter((text) => /[가-힣]/.test(text));
  for (const text of userText) assert.doesNotMatch(text, /끌어다|드래그/, text);
  assert.doesNotMatch(html.replace(/<!--[\s\S]*?-->/g, ''), /끌어다|드래그/);
  const body = functionBody(editor, 'renderLinkTarget');
  assert.match(body, /사진의 "여기부터"를 누르면 그 사진부터 다음 \$\{itemWord\('으로\/로'\)\} 나뉩니다/);
});

test('방금 찍힌 화면의 긴 설명이 수집 줄을 넓혀 녹화 종료 버튼을 화면 밖으로 밀지 않는다(3.1.0 버그)', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../extension/editor.css'), 'utf8');
  assert.match(css, /\.capture-bar \{ display: grid; grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(css, /\.capture-bar > \* \{ min-width: 0; max-width: 100%; \}/);
  assert.match(css, /\.recent-evidence-card \{[^}]*min-width: 0; max-width: 100%; overflow: hidden;/);
});
