const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// extension/editor.js는 document/chrome.* 브라우저 API에 의존해 node:test 환경에서 직접 실행할 수
// 없으므로, tests/editor-shell.test.cjs, tests/editor-interactions.test.cjs와 동일하게 소스 코드를
// 정적으로 읽어 필요한 코드 패턴이 존재하는지 검사하는 방식을 사용한다.
const editorScriptPath = path.resolve(__dirname, '../extension/editor.js');
const source = fs.readFileSync(editorScriptPath, 'utf8');

// index(여는 중괄호 위치)부터 중괄호 짝을 맞춰 블록 본문을 추출한다.
function findBraceBlock(text, openBraceIndex) {
  let depth = 1;
  let index = openBraceIndex + 1;
  while (depth > 0 && index < text.length) {
    const char = text[index];
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    index += 1;
  }
  assert.ok(depth === 0, '중괄호 짝이 맞아야 한다');
  return text.slice(openBraceIndex + 1, index - 1);
}

// `function name(...) { ... }` 형태(async 포함)의 함수 본문을 추출한다.
function extractFunctionBody(text, functionName) {
  const signatureRegex = new RegExp(`(?:async\\s+)?function\\s+${functionName}\\s*\\([^)]*\\)\\s*{`);
  const match = signatureRegex.exec(text);
  assert.ok(match, `function ${functionName}가 editor.js에 있어야 한다`);
  const openBraceIndex = match.index + match[0].length - 1;
  return findBraceBlock(text, openBraceIndex);
}

const renderGuidanceBody = extractFunctionBody(source, 'renderGuidance');
const renderFeatureBody = extractFunctionBody(source, 'renderFeature');

// Task 18.2 - 8.6/8.1: 캡처 세션 활성 여부에 따른 안내 문구
// _Requirements: 8.1, 8.6_
test('renderGuidance는 session.active 여부에 따라 서로 다른 안내 문구를 if/else로 push한다', () => {
  const ifElseMatch = renderGuidanceBody.match(
    /if\s*\(\s*session\s*&&\s*session\.active\s*\)\s*{([\s\S]*?)}\s*else\s*{([\s\S]*?)}/,
  );
  assert.ok(ifElseMatch, "session && session.active 조건의 if/else 블록이 있어야 한다");

  assert.match(
    ifElseMatch[1],
    /messages\.push\('캡처 세션이 진행 중입니다\.'\)/,
    '세션이 활성 상태면 "캡처 세션이 진행 중입니다." 문구를 push해야 한다',
  );
  assert.match(
    ifElseMatch[2],
    /messages\.push\('캡처를 시작하거나 이미지를 불러오세요\.'\)/,
    '세션이 비활성 상태면 "캡처를 시작하거나 이미지를 불러오세요." 문구를 push해야 한다',
  );
});

// Task 18.2 - 8.5: Feature_Spec이 하나도 없을 때 안내
// _Requirements: 8.5_
test('renderGuidance는 editorState.features.length === 0일 때 기능 명세 추가 안내를 push한다', () => {
  const match = renderGuidanceBody.match(
    /if\s*\(\s*editorState\.features\.length\s*===\s*0\s*\)\s*{([\s\S]*?)}/,
  );
  assert.ok(match, 'editorState.features.length === 0 조건 블록이 있어야 한다');
  assert.match(
    match[1],
    /messages\.push\('테스트케이스를 추가한 뒤 증적을 연결하세요\.'\)/,
    '테스트케이스가 없으면 "테스트케이스를 추가한 뒤 증적을 연결하세요." 문구를 push해야 한다',
  );
});

// Task 18.2 - 8.4: Draft_Report 상태일 때 저장 선택사항 안내
// _Requirements: 8.4_
test('renderGuidance는 report && report.isDraft일 때 저장 선택사항 안내를 push한다', () => {
  const match = renderGuidanceBody.match(
    /if\s*\(\s*report\s*&&\s*report\.isDraft\s*\)\s*{([\s\S]*?)}/,
  );
  assert.ok(match, 'report && report.isDraft 조건 블록이 있어야 한다');
  assert.match(
    match[1],
    /messages\.push\('저장은 선택사항입니다/,
    'Draft_Report 상태면 "저장은 선택사항입니다"로 시작하는 문구를 push해야 한다',
  );
});

// Task 18.2 - 8.7: Report_Draft_Suggestion 다이얼로그가 열려 있을 때 승인/수정 안내
// _Requirements: 8.7_
test('renderGuidance는 reportDraftSuggestionDialog.open일 때 승인/수정 안내를 push한다', () => {
  const match = renderGuidanceBody.match(
    /if\s*\(\s*elements\.reportDraftSuggestionDialog\.open\s*\)\s*{([\s\S]*?)}/,
  );
  assert.ok(match, 'elements.reportDraftSuggestionDialog.open 조건 블록이 있어야 한다');
  assert.match(
    match[1],
    /messages\.push\('제안된 보고서명과 형상·체크아웃 개요는 승인 또는 수정 후 저장됩니다\.'\)/,
    'Report_Draft_Suggestion 다이얼로그가 열려 있으면 승인/수정 안내 문구를 push해야 한다',
  );
});

// Task 18.2 - 표시/숨김 로직
// _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
test('renderGuidance는 메시지가 없으면 guidanceBanner를 숨기고 return하며, 있으면 표시한다', () => {
  const hideMatch = renderGuidanceBody.match(
    /if\s*\(\s*messages\.length\s*===\s*0\s*\)\s*{([\s\S]*?)}/,
  );
  assert.ok(hideMatch, 'messages.length === 0 조건 블록이 있어야 한다');
  assert.match(
    hideMatch[1],
    /elements\.guidanceBanner\.hidden\s*=\s*true/,
    '메시지가 없으면 elements.guidanceBanner.hidden = true로 설정해야 한다',
  );
  assert.match(
    hideMatch[1],
    /return;/,
    '메시지가 없으면 return으로 배너 렌더링을 중단해야 한다',
  );

  assert.match(
    renderGuidanceBody,
    /elements\.guidanceBanner\.hidden\s*=\s*false/,
    '메시지가 있으면 elements.guidanceBanner.hidden = false로 설정해야 한다',
  );
});

// Task 18.2 - 8.2/8.3: Feature_Spec별 매핑 안내 (renderFeature 함수 본문)
// _Requirements: 8.2, 8.3_
test('renderFeature는 evidenceIds 매핑 여부에 따라 서로 다른 featureMappingGuidance 문구를 설정한다', () => {
  const ifElseMatch = renderFeatureBody.match(
    /if\s*\(\s*feature\.result\.evidenceIds\.length\s*===\s*0\s*\)\s*{([\s\S]*?)}\s*else\s*{([\s\S]*?)}/,
  );
  assert.ok(ifElseMatch, 'feature.result.evidenceIds.length === 0 조건의 if/else 블록이 있어야 한다');

  assert.match(
    ifElseMatch[1],
    /elements\.featureMappingGuidance\.textContent\s*=\s*'이 테스트케이스에 Capture_Graph나 Evidence를 드래그하거나 매핑 버튼을 누르세요\.'/,
    '매핑된 증적이 없으면 매핑 유도 문구를 textContent에 설정해야 한다',
  );
  assert.match(
    ifElseMatch[2],
    /elements\.featureMappingGuidance\.textContent\s*=\s*'기대 결과\/실제 결과를 입력하거나 판정을 확인하세요\.'/,
    '매핑된 증적이 있으면 기대 결과/실제 결과/판정 입력 유도 문구를 textContent에 설정해야 한다',
  );

  assert.notStrictEqual(
    ifElseMatch[1].trim(),
    ifElseMatch[2].trim(),
    'if/else 두 분기의 안내 문구는 서로 달라야 한다',
  );
});

test('renderFeature는 feature가 없을 때 featureMappingGuidance를 숨긴다', () => {
  const noFeatureMatch = renderFeatureBody.match(
    /if\s*\(\s*!feature\s*\)\s*{([\s\S]*?)}/,
  );
  assert.ok(noFeatureMatch, '!feature 조건 블록이 있어야 한다');
  assert.match(
    noFeatureMatch[1],
    /elements\.featureMappingGuidance\.hidden\s*=\s*true/,
    'feature가 없으면 elements.featureMappingGuidance.hidden = true로 설정해야 한다',
  );
});

test('renderFeature는 feature가 있을 때 featureMappingGuidance를 다시 표시한다', () => {
  assert.match(
    renderFeatureBody,
    /elements\.featureMappingGuidance\.hidden\s*=\s*false/,
    'feature가 있으면 elements.featureMappingGuidance.hidden = false로 설정해야 한다',
  );
});
