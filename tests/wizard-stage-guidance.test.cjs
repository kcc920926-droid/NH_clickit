const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// extension/editor.js는 document/chrome.* 브라우저 API에 의존해 node:test 환경에서 직접 실행할 수
// 없으므로, tests/editor-guidance.test.cjs와 동일하게 소스 코드를 정적으로 읽어 필요한 코드 패턴이
// 존재하는지 검사하는 방식을 사용한다. 이 파일은 capture-wizard-ux-redesign 요구사항 1.5/1.6/3.5에
// 초점을 맞춘 editor-guidance.test.cjs의 확장이다.
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

// Requirement 1.5: 빈 Evidence Inbox + 비활성 세션 조합에서 Capture_Stage의 Primary_Action 안내
// 문구("캡처를 시작하거나 이미지를 불러오세요.")가 나타나야 한다.
test('Requirement 1.5 - session이 비활성 상태면 renderGuidance는 Capture_Stage 시작 안내 문구를 push한다', () => {
  const ifElseMatch = renderGuidanceBody.match(
    /if\s*\(\s*session\s*&&\s*session\.active\s*\)\s*{([\s\S]*?)}\s*else\s*{([\s\S]*?)}/,
  );
  assert.ok(ifElseMatch, 'session && session.active 조건의 if/else 블록이 있어야 한다');

  // 비활성 세션 분기(빈 Evidence Inbox 상태를 포함)에서 Capture_Stage 시작 안내가 나와야 한다.
  assert.match(
    ifElseMatch[2],
    /messages\.push\('캡처를 시작하거나 이미지를 불러오세요\.'\)/,
    '세션이 비활성 상태면 "캡처를 시작하거나 이미지를 불러오세요." 문구를 push해야 한다(Requirement 1.5)',
  );

  // 이 안내는 messages 배열에 담겨 guidanceBanner를 통해 실제로 표시된다(hidden=false 경로로 이어짐).
  assert.match(
    renderGuidanceBody,
    /elements\.guidanceBanner\.hidden\s*=\s*false/,
    'push된 안내 문구는 guidanceBanner를 통해 표시되어야 한다',
  );
});

// Requirement 1.6: 매핑되지 않은 Test_Result_Set(evidenceIds.length === 0)이 있는 Feature_Spec을
// 선택했을 때, 매핑을 유도하는 안내 문구가 나타나야 한다.
test('Requirement 1.6 - 매핑되지 않은 Test_Result_Set을 가진 검증 항목은 매핑 유도 안내 문구를 표시한다', () => {
  const ifElseMatch = renderFeatureBody.match(
    /if\s*\(\s*feature\.result\.evidenceIds\.length\s*===\s*0\s*\)\s*{([\s\S]*?)}\s*else\s*{([\s\S]*?)}/,
  );
  assert.ok(ifElseMatch, 'feature.result.evidenceIds.length === 0 조건의 if/else 블록이 있어야 한다');

  assert.match(
    ifElseMatch[1],
    /elements\.featureMappingGuidance\.textContent\s*=\s*'이 테스트케이스에 Capture_Graph나 Evidence를 드래그하거나 매핑 버튼을 누르세요\.'/,
    '매핑된 증적(Test_Result_Set)이 없으면 매핑 유도 문구를 textContent에 설정해야 한다(Requirement 1.6)',
  );

  // 이 안내는 feature가 존재할 때만 표시된다(hidden=false 경로로 이어짐).
  assert.match(
    renderFeatureBody,
    /elements\.featureMappingGuidance\.hidden\s*=\s*false/,
    '검증 항목이 선택되어 있으면 featureMappingGuidance를 표시해야 한다',
  );
});

// Requirement 3.5: 첫 매핑 직후(evidenceIds가 0에서 1 이상으로 바뀐 직후) 안내 문구가
// 매핑 유도 문구에서 다음 입력 행동 안내 문구로 바뀌어야 한다.
test('Requirement 3.5 - 첫 매핑 전/후로 featureMappingGuidance 문구가 서로 달라진다', () => {
  const ifElseMatch = renderFeatureBody.match(
    /if\s*\(\s*feature\.result\.evidenceIds\.length\s*===\s*0\s*\)\s*{([\s\S]*?)}\s*else\s*{([\s\S]*?)}/,
  );
  assert.ok(ifElseMatch, 'feature.result.evidenceIds.length === 0 조건의 if/else 블록이 있어야 한다');

  // 매핑 전(evidenceIds.length === 0) 분기
  assert.match(
    ifElseMatch[1],
    /elements\.featureMappingGuidance\.textContent\s*=\s*'이 테스트케이스에 Capture_Graph나 Evidence를 드래그하거나 매핑 버튼을 누르세요\.'/,
    '매핑 전에는 매핑 유도 문구를 설정해야 한다',
  );
  // 매핑 후(evidenceIds.length > 0, 즉 첫 매핑 직후) 분기
  assert.match(
    ifElseMatch[2],
    /elements\.featureMappingGuidance\.textContent\s*=\s*'기대 결과\/실제 결과를 입력하거나 판정을 확인하세요\.'/,
    '첫 매핑 직후에는 다음 입력 행동(기대 결과/실제 결과/판정) 안내 문구로 바뀌어야 한다',
  );

  assert.notStrictEqual(
    ifElseMatch[1].trim(),
    ifElseMatch[2].trim(),
    '매핑 전/후 안내 문구는 서로 달라야 한다(Requirement 3.5)',
  );
});

// 회귀 방지(Task 6.4 연동 확인): 매핑/세션/검증 항목 추가와 같이 stage 도달 가능성에 영향을 주는
// 동작을 수행하는 함수들은 반드시 renderStage()를 호출해 안내/탭/버튼 상태를 다시 계산해야 한다.
// 이 호출이 빠지면 Requirement 1.5/1.6/3.5가 요구하는 "안내 문구가 바뀐다"는 동작이 깨진다.
test('회귀 방지 - toggleSession/addFeature/mapEvidenceIds/submitQuickMapping은 renderStage()를 호출한다', () => {
  const functionsThatMustRenderStage = ['toggleSession', 'addFeature', 'mapEvidenceIds', 'submitQuickMapping'];

  for (const functionName of functionsThatMustRenderStage) {
    const body = extractFunctionBody(source, functionName);
    assert.match(
      body,
      /renderStage\(\);/,
      `${functionName}은 renderStage();를 호출해 stage 안내/도달 가능성을 갱신해야 한다`,
    );
  }
});
