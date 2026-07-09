const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// extension/editor.js는 document/chrome.* 브라우저 API에 의존해 node:test 환경에서 직접 실행할 수
// 없으므로, tests/editor-shell.test.cjs와 동일하게 소스 코드를 정적으로 읽어 필요한 코드 패턴이
// 존재하는지 검사하는 방식을 사용한다.
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

// anchorText 바로 다음에 나오는 첫 `{` 이후의 블록 본문을 추출한다(익명 콜백 등 이름이 없는 블록용).
function extractAfterAnchor(text, anchorText) {
  const anchorIndex = text.indexOf(anchorText);
  assert.ok(anchorIndex !== -1, `"${anchorText}"가 editor.js에 있어야 한다`);
  const openBraceIndex = text.indexOf('{', anchorIndex);
  assert.ok(openBraceIndex !== -1, `"${anchorText}" 다음에 여는 중괄호가 있어야 한다`);
  return findBraceBlock(text, openBraceIndex);
}

// 함수 본문 문자열 안에서 catch(...) { ... } 블록만 추출한다.
function extractCatchBlock(functionBody) {
  const catchHeaderMatch = functionBody.match(/catch\s*\([^)]*\)\s*{/);
  assert.ok(catchHeaderMatch, 'catch 블록이 있어야 한다');
  const openBraceIndex = functionBody.indexOf('{', catchHeaderMatch.index);
  return findBraceBlock(functionBody, openBraceIndex);
}

// Task 14.4: Drag_And_Drop_Mapping과 Alternative_Mapping_Control이 동일한 도메인 함수를 호출하는지 검증
// _Requirements: 3.6_
test('Drag_And_Drop_Mapping과 Alternative_Mapping_Control은 동일한 도메인 함수(mapEvidenceIds → CaptureITDomain.mapEvidenceBatch)를 호출한다', () => {
  const mapEvidenceIdsBody = extractFunctionBody(source, 'mapEvidenceIds');
  assert.match(
    mapEvidenceIdsBody,
    /CaptureITDomain\.mapEvidenceBatch\(/,
    'mapEvidenceIds는 CaptureITDomain.mapEvidenceBatch를 호출해야 한다',
  );

  const dropBody = extractFunctionBody(source, 'dropEvidenceIdsOnFeature');
  assert.match(
    dropBody,
    /\bmapEvidenceIds\(/,
    'Drag_And_Drop_Mapping 핸들러(dropEvidenceIdsOnFeature)는 mapEvidenceIds를 호출해야 한다',
  );

  const mapToFeatureButtonBody = extractFunctionBody(source, 'mapToFeatureButton');
  assert.match(
    mapToFeatureButtonBody,
    /\bmapEvidenceIds\(/,
    'Alternative_Mapping_Control 버튼 핸들러(mapToFeatureButton)는 mapEvidenceIds를 호출해야 한다',
  );
});

// Task 15.3: Quick_Mapping_Dialog 제출/검증 에러 테스트
// _Requirements: 3.8, 3.9, 3.10, 3.11_
test('submitQuickMapping은 applyQuickMapping을 호출하고, 검증 에러 시 입력란에 포커스하며, 성공 시 다이얼로그를 닫는다', () => {
  const body = extractFunctionBody(source, 'submitQuickMapping');

  assert.match(
    body,
    /CaptureITDomain\.applyQuickMapping\(/,
    'submitQuickMapping은 CaptureITDomain.applyQuickMapping을 호출해야 한다',
  );

  const catchBlock = extractCatchBlock(body);
  assert.match(
    catchBlock,
    /elements\.quickMappingVerification\.focus\(\)/,
    '검증 에러를 캐치하면 quickMappingVerification 입력란에 포커스해야 한다',
  );

  assert.match(
    body,
    /elements\.quickMappingDialog\.close\(\)/,
    '성공 시 quickMappingDialog를 닫아야 한다',
  );
});

// 판정 확인(Verdict_Confirmation) 단계 폐지: 판정 pill을 클릭하면 즉시
// feature.result.status가 PASS -> FAIL -> N/A(null) 순으로 순환하며 확정된다.
// 별도 확인 버튼이나 pending 상태 없이, 클릭 = 확정이다.
test('cycleVerdict는 클릭 즉시 feature.result.status를 PASS -> FAIL -> N/A 순으로 순환시킨다', () => {
  const body = extractFunctionBody(source, 'cycleVerdict');
  assert.match(
    body,
    /feature\.result\.status\s*=\s*nextValue/,
    'cycleVerdict는 다음 순환값을 feature.result.status에 즉시 대입해야 한다',
  );
  assert.match(source, /const VERDICT_CYCLE\s*=\s*\['PASS',\s*'FAIL',\s*null\]/, 'VERDICT_CYCLE은 PASS/FAIL/N/A 순서를 정의해야 한다');
});

test('판정 pill은 verdictPill()로 생성되며 클릭 시 cycleVerdict를 호출한다', () => {
  const body = extractFunctionBody(source, 'verdictPill');
  assert.match(body, /feature-status-pill/, 'verdictPill은 feature-status-pill 클래스를 사용해야 한다');
  assert.match(body, /cycleVerdict\(feature\)/, 'pill 클릭은 cycleVerdict를 호출해야 한다');
});

test('별도의 Verdict_Confirmation 확인 버튼/대기 상태 없이 pill 클릭이 곧 확정이다', () => {
  assert.doesNotMatch(source, /pendingVerdictByFeatureId/, 'pendingVerdictByFeatureId 개념은 더 이상 존재하지 않아야 한다');
  assert.doesNotMatch(source, /function\s+confirmVerdict/, 'confirmVerdict 확인 단계 함수는 제거되어야 한다');
  assert.doesNotMatch(source, /elements\.verdictConfirm/, '#verdict-confirm 버튼 참조는 제거되어야 한다');
});

// Task 17.3: Report_Draft_Suggestion 검토 흐름 테스트
// _Requirements: 10.3, 10.4, 10.5_
test('approveDraftSuggestion은 draft-suggestion 입력값을 report.title/report.configurationOverview에 대입한다(즉시 승인/수정 후 승인 공통 경로)', () => {
  const body = extractFunctionBody(source, 'approveDraftSuggestion');
  assert.match(
    body,
    /report\.title\s*=\s*elements\.draftSuggestionTitle\.value/,
    'approveDraftSuggestion은 report.title에 draftSuggestionTitle 입력값을 대입해야 한다',
  );
  assert.match(
    body,
    /report\.configurationOverview\s*=\s*elements\.draftSuggestionOverview\.value/,
    'approveDraftSuggestion은 report.configurationOverview에 draftSuggestionOverview 입력값을 대입해야 한다',
  );
});

test('무시(dismiss-draft-suggestion) 핸들러는 다이얼로그만 닫고 report 필드는 전혀 건드리지 않는다', () => {
  const dismissBlock = extractAfterAnchor(
    source,
    "elements.dismissDraftSuggestion.addEventListener('click', () => {",
  );
  assert.match(
    dismissBlock,
    /elements\.reportDraftSuggestionDialog\.close\(\)/,
    '무시 핸들러는 reportDraftSuggestionDialog를 닫아야 한다',
  );
  assert.doesNotMatch(dismissBlock, /report\.title/, '무시 핸들러는 report.title을 건드리지 않아야 한다');
  assert.doesNotMatch(
    dismissBlock,
    /report\.configurationOverview/,
    '무시 핸들러는 report.configurationOverview를 건드리지 않아야 한다',
  );
});

test('ensureLlmImage/ensureDocImage는 screenshot-cropper wrapper에 위임하고 저장한다', () => {
  const ensureLlmBody = extractFunctionBody(source, 'ensureLlmImage');
  const ensureDocBody = extractFunctionBody(source, 'ensureDocImage');

  assert.match(ensureLlmBody, /CaptureITScreenshotCropper\.ensureLlmImage\(evidence,\s*cropOptionsForEvidence\(evidence\)\)/);
  assert.match(ensureDocBody, /CaptureITScreenshotCropper\.ensureDocImage\(evidence,\s*cropOptionsForEvidence\(evidence\)\)/);
  assert.match(ensureLlmBody, /CaptureITStorage\.putEvidence\(evidence\)/);
  assert.match(ensureDocBody, /CaptureITStorage\.putEvidence\(evidence\)/);
});

test('requestTestCaseDescription은 EvidenceStep/LLM packet을 구성하고 검증된 응답만 반영한다', () => {
  const body = extractFunctionBody(source, 'requestTestCaseDescription');

  assert.match(body, /CaptureITEvidenceStepBuilder\.buildEvidenceSteps\(/);
  assert.match(body, /hydrateEvidenceSteps\(/);
  assert.match(body, /CaptureITLlm\.buildLlmEvidencePacket\(/);
  assert.match(body, /CaptureITLlm\.buildTestCaseDescriptionRequest\(/);
  assert.match(body, /CaptureITLlm\.validateTestCaseDescriptionResponse\(/);
  assert.match(body, /applyTestCaseDescription\(feature,\s*validated\)/);
});

test('applyTestCaseDescription은 네 가지 finalStatus를 verdict에 매핑한다', () => {
  const script = source;
  const body = extractFunctionBody(source, 'applyTestCaseDescription');

  for (const status of ['PASS', 'FAIL', 'INCOMPLETE', 'NOT_JUDGED']) {
    assert.match(script, new RegExp(`${status}:\\s*${status === 'PASS' || status === 'FAIL' ? `'${status}'` : 'null'}`));
  }
  assert.match(body, /feature\.description\s*=/);
  assert.match(body, /feature\.result\.expectedResult\s*=/);
  assert.match(body, /feature\.result\.actualResult\s*=/);
  assert.match(body, /feature\.result\.verification\s*=/);
  assert.match(body, /feature\.result\.status\s*=\s*TEST_CASE_STATUS_TO_VERDICT\[validated\.finalStatus\]/);
});

// Bug_Fullscreen_Thumbnail: 모든 증적 썸네일이 항상 전체 화면 스크린샷(evidence.imageDataUrl)만
// 보여주던 문제 대응. evidenceCard/captureNode/renderRecentEvidence/renderEvidenceDetail은 이미
// 캐시된 evidence.docImageDataUrl이 있으면 그것을 우선 사용하고, 없으면 즉시 렌더링을 막지 않도록
// 전체 이미지를 먼저 보여준 뒤 백그라운드에서 크롭을 요청해 완료되면 그 이미지 엘리먼트만 교체한다.
test('evidenceCard, captureNode, renderRecentEvidence, renderEvidenceDetail은 docImageDataUrl을 우선하고 imageDataUrl로 폴백한다', () => {
  const evidenceCardBody = extractFunctionBody(source, 'evidenceCard');
  assert.match(
    evidenceCardBody,
    /image\.src\s*=\s*evidence\.docImageDataUrl\s*\|\|\s*evidence\.imageDataUrl/,
    'evidenceCard는 docImageDataUrl이 있으면 우선 사용하고 없으면 imageDataUrl로 폴백해야 한다',
  );
  assert.match(
    evidenceCardBody,
    /swapToCroppedThumbnailWhenReady\(evidence,\s*image\)/,
    'evidenceCard는 크롭이 준비되면 이미지를 교체하는 헬퍼를 호출해야 한다',
  );

  const captureNodeBody = extractFunctionBody(source, 'captureNode');
  assert.match(
    captureNodeBody,
    /image\.src\s*=\s*evidence\.docImageDataUrl\s*\|\|\s*evidence\.imageDataUrl/,
    'captureNode는 docImageDataUrl이 있으면 우선 사용하고 없으면 imageDataUrl로 폴백해야 한다',
  );
  assert.match(
    captureNodeBody,
    /swapToCroppedThumbnailWhenReady\(evidence,\s*image\)/,
    'captureNode는 크롭이 준비되면 이미지를 교체하는 헬퍼를 호출해야 한다',
  );

  const renderRecentEvidenceBody = extractFunctionBody(source, 'renderRecentEvidence');
  assert.match(
    renderRecentEvidenceBody,
    /image\.src\s*=\s*evidence\.docImageDataUrl\s*\|\|\s*evidence\.imageDataUrl/,
    'renderRecentEvidence는 docImageDataUrl이 있으면 우선 사용하고 없으면 imageDataUrl로 폴백해야 한다',
  );
  assert.match(
    renderRecentEvidenceBody,
    /swapToCroppedThumbnailWhenReady\(evidence,\s*image\)/,
    'renderRecentEvidence는 크롭이 준비되면 이미지를 교체하는 헬퍼를 호출해야 한다',
  );

  const renderEvidenceDetailBody = extractFunctionBody(source, 'renderEvidenceDetail');
  assert.match(
    renderEvidenceDetailBody,
    /elements\.evidenceDetailImage\.src\s*=\s*evidence\.docImageDataUrl\s*\|\|\s*evidence\.imageDataUrl/,
    'renderEvidenceDetail은 docImageDataUrl이 있으면 우선 사용하고 없으면 imageDataUrl로 폴백해야 한다',
  );
  assert.match(
    renderEvidenceDetailBody,
    /ensureDocImage\(evidence\)/,
    'renderEvidenceDetail은 크롭이 준비되면 이미지를 교체하기 위해 ensureDocImage를 호출해야 한다',
  );
});

test('swapToCroppedThumbnailWhenReady는 이미 크롭된 이미지가 있으면 스킵하고, 실패해도 조용히 무시한다', () => {
  const body = extractFunctionBody(source, 'swapToCroppedThumbnailWhenReady');
  assert.match(body, /if\s*\(evidence\.docImageDataUrl\)\s*return;/, '이미 docImageDataUrl이 있으면 크롭을 다시 요청하지 않아야 한다');
  assert.match(body, /ensureDocImage\(evidence\)/, '기존 ensureDocImage 헬퍼를 재사용해야 한다');
  assert.match(body, /\.catch\(\(\)\s*=>\s*{}\)/, '크롭 실패는 사용자에게 노출하지 않고 조용히 무시해야 한다');
});

// Feature_Group_Actions: capture-graph(세션) 헤더에 세트 단위 연결 해제/삭제 버튼을 추가한다.
test('captureGraphCard는 세트 연결 해제/삭제 버튼을 헤더 액션 컨테이너에 렌더링한다', () => {
  assert.match(source, /async function removeEvidenceGroup\(evidenceIds\)/, 'removeEvidenceGroup 함수가 있어야 한다');
  assert.match(source, /async function unmapEvidenceGroup\(evidenceIds\)/, 'unmapEvidenceGroup 함수가 있어야 한다');

  const removeEvidenceGroupBody = extractFunctionBody(source, 'removeEvidenceGroup');
  assert.match(removeEvidenceGroupBody, /confirm\(`이 증적 세트\(\$\{evidenceIds\.length\}개\)를 삭제하시겠습니까/, '세트 개수를 포함한 확인 문구를 사용해야 한다');
  assert.match(removeEvidenceGroupBody, /CaptureITStorage\.deleteEvidence\(id\)/, '그룹의 모든 evidence를 스토리지에서 삭제해야 한다');
  assert.match(removeEvidenceGroupBody, /await saveReport\(\)/);

  const unmapEvidenceGroupBody = extractFunctionBody(source, 'unmapEvidenceGroup');
  assert.match(unmapEvidenceGroupBody, /CaptureITDomain\.unmapEvidence\(editorState,\s*evidence\.id\)/, '개별 unmapEvidence와 동일한 도메인 함수를 재사용해야 한다');
  assert.match(unmapEvidenceGroupBody, /await saveReport\(\)/);

  const captureGraphCardBody = extractFunctionBody(source, 'captureGraphCard');
  assert.match(
    captureGraphCardBody,
    /iconButton\('세트 연결 해제',\s*'link-off',\s*\(\)\s*=>\s*unmapEvidenceGroup\(group\.evidenceIds\),\s*mappedFeatureIds\.length\s*===\s*0\)/,
    'captureGraphCard는 매핑된 것이 없을 때 비활성화되는 세트 연결 해제 버튼을 렌더링해야 한다',
  );
  assert.match(
    captureGraphCardBody,
    /iconButton\('세트 삭제',\s*'trash',\s*\(\)\s*=>\s*removeEvidenceGroup\(group\.evidenceIds\),\s*false,\s*'danger'\)/,
    'captureGraphCard는 danger 스타일의 세트 삭제 버튼을 렌더링해야 한다',
  );
  assert.match(
    captureGraphCardBody,
    /headerActions\.className\s*=\s*'capture-graph-header-actions'/,
    '헤더 액션 버튼들은 capture-graph-header-actions 컨테이너로 감싸야 한다',
  );
  assert.match(
    captureGraphCardBody,
    /headerActions\.append\(\s*mapToFeatureButton\(group\.evidenceIds\),/,
    '매핑 버튼도 같은 헤더 액션 컨테이너 안에 있어야 한다',
  );
  assert.match(
    captureGraphCardBody,
    /headerActions\.append\(toggle\)/,
    '펼치기/접기 토글도 같은 헤더 액션 컨테이너 안에 추가되어야 한다',
  );
});

// Feature_Group_Title: 세션(세트) 이름을 정적 텍스트가 아니라 편집 가능한 입력란으로 렌더링한다.
test('captureGraphCard는 정적 요약 텍스트 대신 편집 가능한 세트 제목 입력란을 렌더링한다', () => {
  const captureGraphCardBody = extractFunctionBody(source, 'captureGraphCard');
  assert.doesNotMatch(
    captureGraphCardBody,
    /document\.createElement\('p'\)/,
    'captureGraphCard는 더 이상 정적 <p> 요약 엘리먼트를 만들지 않아야 한다',
  );
  assert.match(
    captureGraphCardBody,
    /titleInput\.className\s*=\s*'capture-graph-title-input'/,
    '세트 제목은 capture-graph-title-input 클래스의 입력란으로 렌더링해야 한다',
  );
  assert.match(
    captureGraphCardBody,
    /titleInput\.value\s*=\s*group\.sessionLabel\s*\|\|\s*group\.llmSessionLabel\s*\|\|\s*''/,
    '입력란의 값은 group.sessionLabel을 우선하고, 없으면 group.llmSessionLabel에서 읽어와야 한다(LLM 추천 세트 제목 기능)',
  );
  assert.match(
    captureGraphCardBody,
    /titleInput\.placeholder\s*=\s*defaultTitle/,
    '입력란의 placeholder는 기존에 보이던 파생 텍스트(페이지 제목 · 세션 캡처 N개)를 사용해야 한다',
  );
  assert.match(
    captureGraphCardBody,
    /titleInput\.addEventListener\('click',\s*\(event\)\s*=>\s*event\.stopPropagation\(\)\)/,
    '제목 입력란 클릭은 카드의 dragstart/dblclick 핸들러로 전파되지 않아야 한다',
  );
  assert.match(
    captureGraphCardBody,
    /titleInput\.addEventListener\('change',\s*\(\)\s*=>\s*{\s*saveEvidenceGroupLabel\(group,\s*titleInput\.value\);\s*}\)/,
    '입력란 변경 시 saveEvidenceGroupLabel을 호출해야 한다',
  );
});

test('saveEvidenceGroupLabel은 그룹의 모든 evidence에 sessionLabel을 반영하고 저장한다', () => {
  const body = extractFunctionBody(source, 'saveEvidenceGroupLabel');
  assert.match(body, /evidence\.sessionLabel\s*=\s*label/, '그룹에 속한 모든 evidence에 sessionLabel을 설정해야 한다');
  assert.match(body, /CaptureITStorage\.putEvidence\(evidence\)/, '변경된 evidence를 저장소에 반영해야 한다');
  assert.match(body, /renderEvidence\(\)/, '가벼운 갱신을 위해 renderEvidence를 호출해야 한다');
});

// LLM 추천 세트 제목: 수동 입력(sessionLabel)이 최우선, 그다음 LLM 추천(llmSessionLabel), 마지막이
// 파생 텍스트(placeholder)다. 이 기능은 다른 모든 LLM 기능처럼 명시적 버튼 클릭으로만 호출된다.
test('captureGraphCard의 제목 입력란은 sessionLabel을 우선하고 없으면 llmSessionLabel을 사용한다', () => {
  const captureGraphCardBody = extractFunctionBody(source, 'captureGraphCard');
  assert.match(
    captureGraphCardBody,
    /titleInput\.value\s*=\s*group\.sessionLabel\s*\|\|\s*group\.llmSessionLabel\s*\|\|\s*''/,
    '입력란 값은 수동 sessionLabel을 우선하고, 없으면 llmSessionLabel을, 둘 다 없으면 빈 문자열을 사용해야 한다',
  );
});

test('saveEvidenceGroupLlmLabel은 그룹의 모든 evidence에 llmSessionLabel을 반영하고 저장한다', () => {
  assert.match(source, /async function saveEvidenceGroupLlmLabel\(group,\s*title\)/, 'saveEvidenceGroupLlmLabel 함수가 있어야 한다');
  const body = extractFunctionBody(source, 'saveEvidenceGroupLlmLabel');
  assert.match(body, /evidence\.llmSessionLabel\s*=\s*title/, '그룹에 속한 모든 evidence에 llmSessionLabel을 설정해야 한다');
  assert.match(body, /CaptureITStorage\.putEvidence\(evidence\)/, '변경된 evidence를 저장소에 반영해야 한다');
  assert.match(body, /renderEvidence\(\)/, '가벼운 갱신을 위해 renderEvidence를 호출해야 한다');
});

test('requestEvidenceGroupTitleSuggestion은 evidence가 없으면 에러를 던지고, 성공 시 LLM 응답을 검증 후 저장한다', () => {
  assert.match(source, /async function requestEvidenceGroupTitleSuggestion\(group,\s*\{\s*silent\s*=\s*false\s*\}\s*=\s*\{\}\)/, 'requestEvidenceGroupTitleSuggestion 함수가 있어야 한다(silent 옵션 포함)');
  const body = extractFunctionBody(source, 'requestEvidenceGroupTitleSuggestion');
  assert.match(body, /if\s*\(group\.evidenceIds\.length === 0\)\s*throw new Error\(/, 'evidence가 없는 그룹은 에러를 던져야 한다');
  assert.match(body, /CaptureITLlm\.buildSessionTitleRequest\(group,\s*evidenceItems,\s*report\s*&&\s*report\.changePurpose\s*\|\|\s*''\)/, 'buildSessionTitleRequest를 호출해야 한다');
  assert.match(body, /await postLlm\(/, '기존 postLlm 헬퍼를 재사용해야 한다');
  assert.match(body, /CaptureITLlm\.validateSessionTitleSuggestion\(/, 'LLM 응답을 검증해야 한다');
  assert.match(body, /saveEvidenceGroupLlmLabel\(group,\s*result\.title\)/, '검증된 제목을 저장해야 한다');
  assert.match(body, /setMessage\('세트 제목을 추천받았습니다\.'\)/, '성공 메시지를 표시해야 한다');
});

test('captureGraphCard는 헤더 액션에 currentFeature()와 무관한 제목 추천 버튼을 렌더링한다', () => {
  const captureGraphCardBody = extractFunctionBody(source, 'captureGraphCard');
  assert.match(
    captureGraphCardBody,
    /iconButton\('제목 추천받기',\s*'sparkle',\s*\(\)\s*=>\s*\{[\s\S]*?requestEvidenceGroupTitleSuggestion\(group\)\.catch\(\(error\)\s*=>\s*setMessage\(`제목 추천 실패: \$\{error\.message\}`,\s*true\)\)/,
    '제목 추천 버튼은 requestEvidenceGroupTitleSuggestion을 호출하고 실패 시 setMessage로 에러를 표시해야 한다',
  );
  assert.doesNotMatch(
    captureGraphCardBody.slice(
      captureGraphCardBody.indexOf("iconButton('제목 추천받기'"),
      captureGraphCardBody.indexOf("iconButton('제목 추천받기'") + 400,
    ),
    /disabled\s*=\s*!currentFeature\(\)/,
    '제목 추천 버튼은 currentFeature() 상태로 비활성화되면 안 된다',
  );
});

// AI_Buttons_To_Top: "증적 설명 생성"/"테스트케이스 설명 자동 생성" 버튼을 드로어 최상단(선택된
// 증적 그리드보다 위)으로 이동한다.
test('feature-mapping-target 드로어에서 AI 버튼(request-recommendations/request-test-case-description)이 mapped-evidence보다 앞에 위치한다', () => {
  const editorHtmlPath = path.resolve(__dirname, '../extension/editor.html');
  const html = fs.readFileSync(editorHtmlPath, 'utf8');
  const sectionMatch = html.match(/<aside id=["']feature-mapping-target["'][\s\S]*?<\/aside>/);
  assert.ok(sectionMatch, 'feature-mapping-target markup block should be found');
  const sectionHtml = sectionMatch[0];

  const requestRecoIndex = sectionHtml.indexOf('id="request-recommendations"');
  const requestTestCaseIndex = sectionHtml.indexOf('id="request-test-case-description"');
  const mappedEvidenceIndex = sectionHtml.indexOf('id="mapped-evidence"');
  const recommendationListIndex = sectionHtml.indexOf('id="recommendation-list"');

  assert.notEqual(requestRecoIndex, -1);
  assert.notEqual(requestTestCaseIndex, -1);
  assert.notEqual(mappedEvidenceIndex, -1);
  assert.notEqual(recommendationListIndex, -1);
  assert.ok(requestRecoIndex < mappedEvidenceIndex, '증적 설명 생성 버튼은 mapped-evidence보다 앞에 있어야 한다');
  assert.ok(requestTestCaseIndex < mappedEvidenceIndex, '테스트케이스 설명 자동 생성 버튼은 mapped-evidence보다 앞에 있어야 한다');
  assert.ok(recommendationListIndex < mappedEvidenceIndex, 'recommendation-list는 mapped-evidence보다 앞에 있어야 한다');

  const aiActionsMatch = sectionHtml.match(/<div class=["']feature-ai-actions["']>[\s\S]*?<\/div>/);
  assert.ok(aiActionsMatch, '두 AI 버튼은 .feature-ai-actions 컨테이너로 묶여야 한다');
  assert.match(aiActionsMatch[0], /id=["']request-recommendations["']/);
  assert.match(aiActionsMatch[0], /id=["']request-test-case-description["']/);
});

// Auto_AI_Pipeline: Capture_Graph가 테스트케이스에 매핑되는 순간(mapEvidenceIds/Quick_Mapping_Dialog
// 공유 경로) "증적 설명 생성" → "테스트케이스 설명 자동 생성"을 순서대로 자동 호출한다.
test('requestRecommendations는 targetFeature 파라미터를 받아 currentFeature()와 무관하게 특정 feature를 대상으로 추천을 요청할 수 있다', () => {
  const signatureMatch = source.match(/async function requestRecommendations\(targetFeature\s*=\s*currentFeature\(\)\)\s*{/);
  assert.ok(signatureMatch, 'requestRecommendations는 targetFeature를 기본값 currentFeature()로 받아야 한다');
  // extractFunctionBody의 매개변수 정규식(\([^)]*\))은 기본값 안에 괄호가 있는 시그니처를 못 찾으므로,
  // 여기서 여는 중괄호 위치를 직접 찾아 findBraceBlock으로 본문을 추출한다.
  const openBraceIndex = signatureMatch.index + signatureMatch[0].length - 1;
  const body = findBraceBlock(source, openBraceIndex);
  assert.match(body, /const feature = targetFeature;/);
});

test('mapEvidenceIds는 매핑 저장/렌더링이 끝난 뒤 autoRunAiPipelineForFeature로 AI 파이프라인을 트리거한다', () => {
  const body = extractFunctionBody(source, 'mapEvidenceIds');
  assert.match(body, /CaptureITDomain\.mapEvidenceBatch\(/, '기존 매핑 로직은 유지되어야 한다');
  assert.match(body, /autoRunAiPipelineForFeature\(feature\)/, '매핑 후 자동 AI 파이프라인을 트리거해야 한다');
  // 자동 트리거는 저장/렌더링이 모두 끝난 뒤에 호출되어야 한다(매핑 결과에 영향을 주면 안 됨).
  const saveIndex = body.indexOf('await saveReport()');
  const triggerIndex = body.indexOf('autoRunAiPipelineForFeature(feature)');
  assert.ok(saveIndex !== -1 && triggerIndex !== -1 && saveIndex < triggerIndex);
});

test('submitQuickMapping도 매핑 완료 후 매핑된 feature를 대상으로 AI 파이프라인을 트리거한다', () => {
  const body = extractFunctionBody(source, 'submitQuickMapping');
  assert.match(
    body,
    /autoRunAiPipelineForFeature\(mappedFeature\)/,
    'Quick_Mapping_Dialog 제출도 mapEvidenceIds와 동일하게 자동 AI 파이프라인을 트리거해야 한다',
  );
});

test('runAutoAiPipeline은 증적 설명 생성 후 테스트케이스 설명 자동 생성을 순서대로 실행하고, 1단계 실패도 2단계 진행을 막지 않는다', () => {
  const body = extractFunctionBody(source, 'runAutoAiPipeline');
  const recoIndex = body.indexOf('await requestRecommendations(feature)');
  const descriptionIndex = body.indexOf('await requestTestCaseDescription(feature)');
  assert.ok(recoIndex !== -1 && descriptionIndex !== -1 && recoIndex < descriptionIndex, '증적 설명 생성이 테스트케이스 설명 자동 생성보다 먼저 실행되어야 한다');
  assert.match(body, /startAiPipeline\(feature\.id\)/, '파이프라인 시작 시 진행 상태를 초기화해야 한다');
  assert.match(body, /setAiPipelineStepStatus\('recommendations',\s*'done'\)/);
  assert.match(body, /setAiPipelineStepStatus\('recommendations',\s*'error'\)/, '1단계 실패도 잡아서 에러 상태로 표시해야 한다');
  assert.match(body, /setAiPipelineStepStatus\('description',\s*'active'\)/, '1단계 실패 여부와 무관하게 2단계는 시도해야 한다');
  assert.match(body, /finishAiPipeline\(\)/);
});

test('autoRunAiPipelineForFeature는 실패해도 매핑 흐름을 막지 않는다', () => {
  const body = extractFunctionBody(source, 'autoRunAiPipelineForFeature');
  assert.match(body, /runAutoAiPipeline\(feature\)\.catch\(/, 'runAutoAiPipeline 호출은 await되지 않고 catch로만 처리되어야 한다');
});

test('featureCard는 aiPipelineStatus가 해당 feature를 가리킬 때 ai-generating 클래스와 진행 체크리스트를 렌더링한다', () => {
  const body = extractFunctionBody(source, 'featureCard');
  assert.match(body, /aiPipelineStatus\s*&&\s*aiPipelineStatus\.featureId === feature\.id/, '이 feature에 대한 파이프라인 상태만 골라내야 한다');
  assert.match(body, /ai-generating/, '진행 중일 때 카드에 ai-generating 클래스를 붙여야 한다');
  assert.match(body, /ai-pipeline-checklist/, '진행 체크리스트 목록을 렌더링해야 한다');
});

// Auto_Title_On_Session_Stop: 세션 종료 시점 단 1회, 그 세션에 해당하는 증적 그룹에 한해서만
// 제목 추천을 자동으로 호출한다(captureGraphCard 재렌더링과는 무관해야 한다).
test('stopRecordingSession은 세션 종료 직후 autoRequestSessionTitleForSession을 세션이 끝나기 전 sessionId로 호출한다', () => {
  const body = extractFunctionBody(source, 'stopRecordingSession');
  assert.match(body, /const stoppedSessionId = session && session\.id;/, '세션이 갈아치워지기 전에 id를 미리 기억해야 한다');
  assert.match(body, /autoRequestSessionTitleForSession\(stoppedSessionId\)/);
});

test('autoRequestSessionTitleForSession은 groupIntoCaptureSessionSets로 해당 sessionId의 그룹만 찾아 silent 모드로 제목 추천을 호출한다', () => {
  const body = extractFunctionBody(source, 'autoRequestSessionTitleForSession');
  assert.match(body, /CaptureITDomain\.groupIntoCaptureSessionSets\(editorState\.evidence\)/);
  assert.match(body, /\.find\(\(item\)\s*=>\s*item\.sessionId === sessionId\)/, '정확히 그 세션에 해당하는 그룹만 대상으로 해야 한다');
  assert.match(body, /requestEvidenceGroupTitleSuggestion\(group,\s*\{\s*silent:\s*true\s*\}\)/, '자동 트리거는 silent 모드로 호출해 세션 종료 메시지를 가리지 않아야 한다');
});

test('requestEvidenceGroupTitleSuggestion의 silent 옵션은 자동 트리거일 때 성공 메시지를 표시하지 않는다', () => {
  const body = extractFunctionBody(source, 'requestEvidenceGroupTitleSuggestion');
  assert.match(body, /if\s*\(!silent\)\s*setMessage\('세트 제목을 추천받았습니다\.'\);/, 'silent가 아닐 때만(수동 버튼 클릭) 성공 메시지를 표시해야 한다');
});

// Evidence_Image_Lightbox: mapped-evidence 카드의 이미지를 클릭하면 원본 크기 확대 뷰어
// (기존 Evidence_Detail_Dialog)가 열려야 한다.
test('evidenceCard의 이미지는 클릭 시 showEvidenceDetail로 원본 확대 뷰어를 연다', () => {
  const body = extractFunctionBody(source, 'evidenceCard');
  assert.match(body, /image\.classList\.add\('evidence-card-image'\)/, '클릭 가능함을 드러내는 클래스가 있어야 한다');
  assert.match(
    body,
    /image\.addEventListener\('click',\s*\(event\)\s*=>\s*\{[\s\S]*?showEvidenceDetail\(evidence\.id,\s*evidenceGroupIdsFor\(evidence\.id\)\)/,
    '이미지 클릭은 showEvidenceDetail을 호출해 원본 확대 뷰어를 열어야 한다',
  );
});

// Unclear_Unlink_Button_Removed: "연결 해제" 버튼은 역할이 모호해서 mapped-evidence 카드에서
// 제거되었다(순서 이동/삭제만 남김).
test('mapped-evidence 카드에는 더 이상 연결 해제 버튼이 없다', () => {
  const body = extractFunctionBody(source, 'evidenceCard');
  assert.doesNotMatch(body, /button\('연결 해제'/, '연결 해제 버튼은 제거되어야 한다');
  assert.doesNotMatch(body, /unmapEvidence\(evidence\)/, 'evidenceCard는 더 이상 unmapEvidence를 호출하지 않아야 한다');
});
