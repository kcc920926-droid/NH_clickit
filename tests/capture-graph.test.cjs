const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const editorScriptPath = path.resolve(__dirname, '../extension/editor.js');

// editor.js는 document/chrome.* 브라우저 API에 의존하므로 node:test 환경에서 직접 실행할 수 없다.
// editor-shell.test.cjs와 동일하게, 소스 코드를 정적으로 읽어 요구된 코드 패턴이 존재하는지 검사한다.
function readEditorScript() {
  return fs.readFileSync(editorScriptPath, 'utf8');
}

// `function name(params) { ... }` 형태의 함수 본문을 추출한다.
// 함수 선언과 같은 들여쓰기 수준(2칸)의 `}`를 닫는 중괄호로 간주해서,
// 함수 내부에 있는 콜백/블록의 중괄호(4칸 이상 들여쓰기)에는 매칭되지 않도록 한다.
function extractFunctionBody(script, functionName) {
  const pattern = new RegExp(`function ${functionName}\\([^)]*\\) \\{([\\s\\S]*?)\\n  \\}`);
  const match = script.match(pattern);
  assert.ok(match, `함수 ${functionName}의 본문을 찾을 수 없습니다`);
  return match[1];
}

test('Stage 2 renders graph-level curved SVG links from mapped capture graphs to testcase cards', () => {
  const script = readEditorScript();
  const captureGraphCardBody = extractFunctionBody(script, 'captureGraphCard');
  const renderMappingLinksBody = extractFunctionBody(script, 'renderMappingLinks');

  assert.match(captureGraphCardBody, /const mappedFeatureIds = \[\.\.\.new Set\(/,
    'captureGraphCard should collect unique mapped testcase ids for the whole graph');
  assert.match(captureGraphCardBody, /card\.dataset\.featureIds\s*=\s*JSON\.stringify\(mappedFeatureIds\)/,
    'captureGraphCard should expose graph-level mapped testcase ids for SVG mapping links');
  assert.match(renderMappingLinksBody, /elements\.evidenceInbox\.querySelectorAll\('\.capture-graph\[data-feature-ids\]'\)/,
    'renderMappingLinks should anchor links from capture graphs, not individual nodes');
  assert.match(renderMappingLinksBody, /graphLinkSources\(graph,\s*featureId\)/,
    'renderMappingLinks should ask each graph for the correct collapsed or expanded anchors');
  assert.doesNotMatch(renderMappingLinksBody, /setAttribute\('height'/,
    'mapping SVG should not write a height attribute that can expand the stage while scrolling');
  assert.doesNotMatch(script, /window\.addEventListener\('scroll',\s*scheduleMappingLinks/,
    'mapping SVG should not rerender on scroll because relative anchors move with the stage');
  assert.match(renderMappingLinksBody, /for \(const featureId of featureIds\)/,
    'renderMappingLinks should render one link for each testcase mapped to a graph');
  assert.match(renderMappingLinksBody, /document\.createElementNS\('http:\/\/www\.w3\.org\/2000\/svg',\s*'path'\)/,
    'renderMappingLinks should create SVG path elements');
  assert.match(renderMappingLinksBody, /C \$\{/,
    'mapping link path should use cubic Bezier curve commands');
  assert.match(script, /function\s+scheduleMappingLinks\s*\(/,
    'mapping links should be scheduled after layout-affecting renders');
});

test('Capture_Graph expand redraws links but keeps graph-level anchors only', () => {
  const script = readEditorScript();
  const captureGraphCardBody = extractFunctionBody(script, 'captureGraphCard');
  const graphLinkSourcesBody = extractFunctionBody(script, 'graphLinkSources');

  assert.match(
    captureGraphCardBody,
    /toggle\.addEventListener\('click',\s*\(\)\s*=>\s*{[\s\S]*scheduleMappingLinks\(\)/,
    'expanding or collapsing a graph should redraw mapping links after node layout changes',
  );
  assert.doesNotMatch(
    graphLinkSourcesBody,
    /\.capture-node\[data-feature-id\]/,
    'expanded graphs should not create one mapping link per visible node',
  );
  assert.doesNotMatch(
    graphLinkSourcesBody,
    /!body\.hidden/,
    'expanded state should not change the mapping anchor strategy',
  );
  assert.match(
    graphLinkSourcesBody,
    /graph\.querySelector\('\.capture-graph-header'\) \|\| graph/,
    'all graphs should keep a single graph-level anchor',
  );
});

test('capture-node hover 시 Node_Context_Preview를 표시한다', () => {
  const script = readEditorScript();
  const captureNodeBody = extractFunctionBody(script, 'captureNode');

  assert.match(captureNodeBody, /addEventListener\('mouseenter',\s*\(\)\s*=>\s*showNodeContextPreview\(/,
    'captureNode 안에서 mouseenter 리스너가 showNodeContextPreview를 호출해야 합니다');
});

test('mouseleave 시 Node_Context_Preview를 지연 없이 즉시 숨긴다', () => {
  const script = readEditorScript();
  const captureNodeBody = extractFunctionBody(script, 'captureNode');

  assert.match(captureNodeBody, /addEventListener\('mouseleave',\s*\(\)\s*=>\s*hideNodeContextPreview\(\)\)/,
    'captureNode 안에서 mouseleave 리스너가 hideNodeContextPreview를 호출해야 합니다');

  const hideNodeContextPreviewBody = extractFunctionBody(script, 'hideNodeContextPreview');
  assert.match(hideNodeContextPreviewBody, /hidden\s*=\s*true/,
    'hideNodeContextPreview는 즉시 hidden = true를 설정해야 합니다');
  assert.doesNotMatch(hideNodeContextPreviewBody, /setTimeout|setInterval|debounce/,
    'hideNodeContextPreview는 지연 호출(setTimeout/setInterval/debounce) 없이 즉시 숨겨야 합니다');
});

test('Capture_Graph 카드는 세트별 evidence count를 표시한다', () => {
  const script = readEditorScript();
  const captureGraphCardBody = extractFunctionBody(script, 'captureGraphCard');

  assert.match(captureGraphCardBody, /group\.count/,
    'captureGraphCard는 group.count를 사용해야 합니다');
  assert.match(captureGraphCardBody, /\$\{group\.count\}개/,
    'captureGraphCard는 "N개" 형태로 세트별 count를 표시해야 합니다');
});

test('Capture_Node는 매핑 상태를 시각화하고 이미지 클릭 시 세트 뷰어를 연다', () => {
  const script = readEditorScript();
  const captureNodeBody = extractFunctionBody(script, 'captureNode');

  assert.match(
    script,
    /function\s+captureNode\(evidence,\s*sequenceEvidenceIds\s*=\s*\[evidence\.id\]\)/,
    'captureNode는 세트 이미지 이동을 위한 sequenceEvidenceIds 기본값을 가져야 합니다',
  );
  assert.match(
    captureNodeBody,
    /node\.classList\.add\('mapped'\)/,
    '매핑된 evidence는 capture-node.mapped로 표시해야 합니다',
  );
  assert.match(
    captureNodeBody,
    /capture-node-mapping-badge/,
    '매핑된 evidence에는 테스트케이스 매핑 배지가 있어야 합니다',
  );
  assert.match(
    captureNodeBody,
    /image\.addEventListener\('click',\s*\(event\)\s*=>\s*{[\s\S]*showEvidenceDetail\(evidence\.id,\s*sequenceEvidenceIds\)/,
    '이미지 클릭은 같은 Capture_Graph 세트 안에서 상세 뷰어를 열어야 합니다',
  );
});

test('renderEvidence는 매핑된 증적도 포함해 Capture_Graph 노드를 렌더링한다', () => {
  const script = readEditorScript();
  const renderEvidenceBody = extractFunctionBody(script, 'renderEvidence');

  assert.match(
    renderEvidenceBody,
    /const evidenceItems = editorState\.evidence\.filter/,
    '증적 확인 화면은 inbox만이 아니라 전체 evidence에서 그래프를 구성해야 합니다',
  );
  assert.doesNotMatch(
    renderEvidenceBody,
    /const inbox = editorState\.inbox\.filter/,
    '매핑된 노드를 시각화하려면 inbox 필터만 사용하면 안 됩니다',
  );
});

test('Evidence 상세 뷰어는 이전/다음 이미지 이동 상태를 관리한다', () => {
  const script = readEditorScript();

  assert.match(script, /let evidenceDetailIds = \[\]/, '상세 뷰어는 현재 이미지 세트 id 목록을 보관해야 합니다');
  assert.match(script, /let evidenceDetailIndex = 0/, '상세 뷰어는 현재 이미지 인덱스를 보관해야 합니다');
  assert.match(script, /function renderEvidenceDetail\(\)/, '상세 뷰어 렌더 함수가 있어야 합니다');
  assert.match(script, /function moveEvidenceDetail\(/, '이전/다음 이동 함수가 있어야 합니다');
  assert.match(script, /previousEvidenceDetail\.addEventListener\('click'/);
  assert.match(script, /nextEvidenceDetail\.addEventListener\('click'/);
});

test('Evidence 상세 뷰어에서 현재 증적을 바로 삭제할 수 있다', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../extension/editor.html'), 'utf8');
  const script = readEditorScript();

  assert.match(
    html,
    /<button id=["']delete-evidence-detail["'][^>]*class=["']icon-only danger["'][^>]*>/,
    '상세 뷰어 툴바에 삭제 버튼이 있어야 합니다',
  );

  assert.match(script, /deleteEvidenceDetail:\s*byId\('delete-evidence-detail'\)/, 'elements에 delete-evidence-detail 참조가 있어야 합니다');
  assert.match(script, /async function removeEvidenceFromDetail\s*\(\s*\)/, 'removeEvidenceFromDetail 함수가 있어야 합니다');
  assert.match(
    script,
    /deleteEvidenceDetail\.addEventListener\('click', \(\) => removeEvidenceFromDetail\(\)/,
    '삭제 버튼은 removeEvidenceFromDetail에 바인딩되어야 합니다',
  );

  const removeFromDetailBody = extractFunctionBody(script, 'removeEvidenceFromDetail');
  assert.match(removeFromDetailBody, /await removeEvidence\(evidenceId\)/, '기존 removeEvidence의 확인/삭제/저장 로직을 재사용해야 합니다');
  assert.match(removeFromDetailBody, /elements\.evidenceDetailDialog\.close\(\)/, '남은 증적이 없으면 다이얼로그를 닫아야 합니다');
});

test('renderEvidence는 리렌더링 시작 시 hideNodeContextPreview를 호출해 고아 상태를 방지한다', () => {
  const script = readEditorScript();
  const renderEvidenceBody = extractFunctionBody(script, 'renderEvidence');

  assert.match(renderEvidenceBody, /^\s*hideNodeContextPreview\(\);/m,
    'renderEvidence는 재렌더링 시작 부분에서 hideNodeContextPreview를 호출해야 합니다');
});

// 드래그 아예 끄자: 세트 제목 입력란 안에서 텍스트를 드래그/선택하는 제스처가 조상 카드(draggable=true)의
// dragstart로 번져 카드 전체가 드래그되는 회귀를 막는다.
test('captureGraphCard의 제목 입력란은 드래그가 완전히 꺼져 있고, 카드 dragstart는 input/textarea 안에서 시작된 이벤트를 무시한다', () => {
  const script = readEditorScript();
  const captureGraphCardBody = extractFunctionBody(script, 'captureGraphCard');

  assert.match(
    captureGraphCardBody,
    /titleInput\.setAttribute\('draggable',\s*'false'\)/,
    '제목 입력란은 draggable을 false로 명시해야 한다',
  );
  assert.match(
    captureGraphCardBody,
    /titleInput\.addEventListener\('dragstart',\s*\(event\)\s*=>\s*event\.preventDefault\(\)\)/,
    '제목 입력란은 자신의 dragstart를 preventDefault로 막아야 한다',
  );
  assert.match(
    captureGraphCardBody,
    /titleInput\.addEventListener\('mousedown',\s*\(event\)\s*=>\s*event\.stopPropagation\(\)\)/,
    '제목 입력란의 mousedown은 카드로 전파되지 않아야 한다',
  );

  const dragstartIndex = captureGraphCardBody.indexOf("card.addEventListener('dragstart'");
  assert.ok(dragstartIndex !== -1, "카드의 dragstart 리스너가 있어야 한다");
  const guardIndex = captureGraphCardBody.indexOf("event.target.closest('input, textarea')");
  const setDataIndex = captureGraphCardBody.indexOf('event.dataTransfer.setData(');
  assert.ok(guardIndex !== -1, '카드 dragstart 핸들러는 input/textarea 가드를 가져야 한다');
  assert.ok(guardIndex > dragstartIndex, '가드는 dragstart 리스너 내부에 있어야 한다');
  assert.ok(guardIndex < setDataIndex, '가드는 setData 호출보다 먼저 실행되어야 한다');
});
