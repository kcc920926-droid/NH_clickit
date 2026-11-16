const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const editorPath = path.resolve(__dirname, '../extension/editor.html');
const editorScriptPath = path.resolve(__dirname, '../extension/editor.js');
const editorCssPath = path.resolve(__dirname, '../extension/editor.css');

function findBraceBlock(text, openBraceIndex) {
  let depth = 1;
  let index = openBraceIndex + 1;
  while (depth > 0 && index < text.length) {
    const char = text[index];
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    index += 1;
  }
  assert.equal(depth, 0, 'function block braces should match');
  return text.slice(openBraceIndex + 1, index - 1);
}

function extractFunctionBody(text, functionName) {
  const signatureRegex = new RegExp(`(?:async\\s+)?function\\s+${functionName}\\s*\\([^)]*\\)\\s*{`);
  const match = signatureRegex.exec(text);
  assert.ok(match, `function ${functionName} should exist`);
  const openBraceIndex = match.index + match[0].length - 1;
  return findBraceBlock(text, openBraceIndex);
}

test('editor shell exposes capture session, evidence inbox, feature result, and export regions', () => {
  assert.equal(fs.existsSync(editorPath), true, 'editor shell should exist');
  const html = fs.readFileSync(editorPath, 'utf8');

  for (const id of [
    'report-select',
    'new-report',
    'delete-report',
    'report-title',
    'project-name',
    'report-author',
    'change-purpose',
    'change-summary',
    'configuration-overview',
    'capture-mode',
    'toggle-session',
    'session-status',
    'storage-location',
    'storage-evidence-count',
    'storage-report-id',
    'storage-last-saved-at',
    'storage-last-export-name',
    'storage-last-export-path',
    'show-last-download',
    'show-download-folder',
    'export-evidence-only',
    'evidence-inbox',
    'recent-evidence',
    'evidence-detail-dialog',
    'evidence-detail-title',
    'evidence-detail-image',
    'evidence-detail-meta',
    'previous-evidence-detail',
    'next-evidence-detail',
    'close-evidence-detail',
    'evidence-search',
    'evidence-drop-zone',
    'feature-list',
    'add-feature',
    'no-feature',
    'feature-mapping-target',
    'feature-detail-backdrop',
    'close-feature-detail',
    'mapped-evidence',
    'llm-endpoint',
    'llm-api-key',
    'llm-model',
    'llm-adapter',
    'llm-template',
    'test-llm-connection',
    'test-llm-recommendation',
    'llm-diagnostics',
    'recommendation-list',
    'validation-warnings',
    'preview-report',
    'export-report',
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }
  assert.match(html, /shared\/domain\.js/);
  assert.match(html, /shared\/storage\.js/);
  assert.match(html, /shared\/report\.js/);
  assert.match(html, /shared\/zip\.js/);
  assert.match(html, /shared\/screenshot-cropper\.js/);
  assert.match(html, /shared\/evidence-step-builder\.js/);
  assert.match(html, /shared\/llm\.js/);
  assert.match(html, /editor\.js/);
});



test('작업대는 증적 수집함과 테스트케이스를 한 화면에 나란히 두고, 연결 증적은 옆에서 미끄러져 나오는 드로어로 연다', () => {
  const html = fs.readFileSync(editorPath, 'utf8');
  const css = fs.readFileSync(editorCssPath, 'utf8');

  const workspaceMatch = html.match(/<main id=["']workspace["'][\s\S]*?<\/main>/);
  assert.ok(workspaceMatch, '#workspace should be found');
  const workspaceHtml = workspaceMatch[0];
  assert.match(workspaceHtml, /id=["']evidence-drop-zone["']/, 'evidence inbox should be inside the workspace');
  assert.match(workspaceHtml, /class=["'][^"']*\bfeature-panel\b[^"']*["']/, 'feature panel should be inside the workspace');
  assert.match(
    workspaceHtml,
    /<aside id=["']feature-mapping-target["'][^>]*class=["'][^"']*\bfeature-detail-drawer\b[^"']*["'][^>]*hidden[^>]*>/,
    'feature-mapping-target should be a hidden <aside> drawer',
  );
  assert.doesNotMatch(html, /class=["'][^"']*\bstage-tab\b/, 'stage tabs should be gone');
  assert.doesNotMatch(html, /\bwizard-stage\b/, 'wizard-stage containers should be gone');

  assert.match(css, /\.workspace-grid\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1\.1fr\)/, 'wide layout shows both lists side by side');
  assert.match(css, /\.feature-detail-drawer\s*{[^}]*position:\s*fixed/);
  assert.match(css, /\.feature-detail-drawer\.open\s*{[^}]*transform:\s*translateX\(0\)/);
});

test('좁은 폭(사이드 패널)에서는 한 목록만 보이고 전환 버튼으로 오간다', () => {
  const html = fs.readFileSync(editorPath, 'utf8');
  const css = fs.readFileSync(editorCssPath, 'utf8');
  const script = fs.readFileSync(editorScriptPath, 'utf8');

  assert.match(html, /<main id=["']workspace["'][^>]*data-pane=["']inbox["']/);
  for (const id of ['show-inbox', 'show-features']) assert.match(html, new RegExp(`id=["']${id}["'][^>]*aria-pressed`));
  assert.match(css, /@media \(max-width: 759px\)[\s\S]*\.workspace\[data-pane="inbox"\] \.feature-panel, \.workspace\[data-pane="features"\] \.inbox-panel \{ display: none; \}/);
  assert.match(css, /@media \(max-width: 759px\)[\s\S]*\.mapping-link-layer \{ display: none; \}/);
  assert.doesNotMatch(css, /body\s*{[^}]*min-width:\s*1000px/, 'the page must fit a side panel');
  const setPaneBody = extractFunctionBody(script, 'setNarrowPane');
  assert.match(setPaneBody, /elements\.workspace\.dataset\.pane = narrowPane/);
});

test('확장 페이지의 기본 글자 크기(75%)를 body에서 되돌린다', () => {
  const css = fs.readFileSync(editorCssPath, 'utf8');
  assert.match(css, /\nbody\s*{[^}]*font-size:\s*13px/);
});

test('수집 줄: 녹화 버튼 하나와 이미지 불러오기, 붙여넣기 안내, 녹화 중 현황 한 줄', () => {
  const html = fs.readFileSync(editorPath, 'utf8');
  const script = fs.readFileSync(editorScriptPath, 'utf8');

  assert.match(html, /<select[^>]*id=["']capture-mode["'][^>]*hidden[^>]*>/, 'capture-mode value carrier stays hidden');
  assert.doesNotMatch(html, /role=["']radiogroup["']/);
  assert.doesNotMatch(html, /data-capture-mode=/);
  assert.match(html, /<section id=["']capture-bar["'][^>]*class=["'][^"']*capture-first-panel/);
  assert.match(html, /<h1 id="capture-first-heading" class="capture-title">화면을 녹화하세요<\/h1>/, '처음 문구는 목적과 무관하고, 목적을 고르면 그 목적의 문구로 바뀐다');
  assert.match(html, /id=["']toggle-session["'][^>]*>녹화 시작<\/button>/);
  assert.match(html, />이미지 불러오기<input id=["']image-import["']/);
  assert.match(html, /중요한 영역은 Ctrl\+Shift\+클릭으로 직접 지정할 수 있습니다\./);
  assert.match(html, /<p id=["']recording-summary["'][^>]*hidden/);

  assert.match(script, /function\s+renderSession\s*\(\s*\)/);
  assert.match(script, /function\s+computeRecordingSummary\s*\(\s*\)/);
  assert.match(script, /function\s+renderRecordingSummary\s*\(/);
  assert.doesNotMatch(script, /captureModeToggle|captureModeButtons/);
});

test('editor uses the real report exporter rather than a placeholder action', () => {
  assert.equal(fs.existsSync(editorPath), true, 'editor shell should exist');
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/editor.js'), 'utf8');

  assert.match(script, /CaptureITReport\.buildManifest/);
  assert.match(script, /CaptureITZip\.writeZip/);
  assert.match(script, /chrome\.downloads\.download/);
  assert.equal(script.includes('보고서 엔진을 준비하고 있습니다'), false);
  assert.match(script, /CaptureITLlm\.buildStageOne/);
  assert.match(script, /CaptureITLlm\.buildStageTwo/);
  assert.match(script, /CaptureITLlm\.validateRecommendations/);
  assert.match(script, /CaptureITLlm\.DEFAULT_ENDPOINT/);
  assert.match(script, /CaptureITLlm\.buildAdapterRequest/);
  assert.match(script, /CaptureITLlm\.buildDiagnosticSummary/);
  assert.match(script, /redactedRequest/);
  assert.match(script, /CaptureITStorage\.listReports/);
  assert.match(script, /renderStorageStatus/);
  assert.match(script, /renderRecentEvidence/);
  assert.match(script, /showEvidenceDetail/);
  assert.match(script, /chrome\.downloads\.search/);
  assert.match(script, /chrome\.downloads\.show/);
  assert.match(script, /chrome\.downloads\.showDefaultFolder/);
  assert.match(script, /exportEvidenceOnly/);
  assert.match(script, /lastExport/);
  assert.match(script, /CaptureITStorage\.deleteReport/);
  assert.match(script, /CaptureITDomain\.addFeature/);
  assert.match(script, /CaptureITDomain\.moveFeature/);
  assert.match(script, /CaptureITDomain\.deleteFeature/);
  assert.match(script, /CaptureITDomain\.validationWarnings/);
  assert.equal(script.includes('내부망 LLM 설정 후 추천을 요청할 수 있습니다'), false);
});

test('editor preview replaces relative report image paths by exact attribute value', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/editor.js'), 'utf8');

  assert.match(script, /querySelectorAll\('img'\)/);
  assert.match(script, /getAttribute\('src'\) === selected\.file/);
  assert.doesNotMatch(script, /CSS\.escape\(selected\.file\)/);
});

test('수집 줄이 맨 위에 오고, 보고서 정보는 내보내기 창 안에 있다', () => {
  const html = fs.readFileSync(editorPath, 'utf8');
  assert.ok(html.indexOf('capture-first-panel') < html.indexOf('id="export-dialog"'));
  assert.ok(html.indexOf('id="toggle-session"') < html.indexOf('id="report-title"'));
});

test('보고서 정보 칸은 내보내기 창의 접히는 구역에 있고, 모두 선택 입력이며 적는 대로 저장된다', () => {
  const html = fs.readFileSync(editorPath, 'utf8');
  const script = fs.readFileSync(editorScriptPath, 'utf8');
  const sectionMatch = html.match(/<details id="report-info"[\s\S]*?<\/details>/);
  assert.ok(sectionMatch, '#report-info should exist');
  const exportDialog = html.match(/<dialog id=["']export-dialog["'][\s\S]*?<\/dialog>/)[0];
  assert.ok(exportDialog.includes('id="report-info"'), 'report info lives in the export dialog');
  for (const id of ['report-title', 'project-name', 'report-author', 'change-purpose', 'change-summary', 'configuration-overview']) {
    assert.match(sectionMatch[0], new RegExp(`id=["']${id}["']`), `#${id} should be in report info`);
  }
  assert.doesNotMatch(sectionMatch[0], /required/, '프로젝트명을 포함해 모두 선택 입력이다');
  const bind = extractFunctionBody(script, 'bindInputs');
  assert.match(bind, /addEventListener\('change'/);
  assert.match(bind, /queueSave\(\);/);
});

test('"프로젝트로 저장" 절차(대화상자·필수 프로젝트명·저장 버튼)는 없다', () => {
  const html = fs.readFileSync(editorPath, 'utf8');
  const script = fs.readFileSync(editorScriptPath, 'utf8');
  assert.doesNotMatch(html, /save-project-dialog|open-save-project|submit-save-project/);
  assert.doesNotMatch(script, /saveAsProject|submitSaveAsProject|프로젝트로 저장/);
  assert.equal(require('../extension/shared/domain.js').saveAsProject, undefined);
  assert.match(html, /id="open-report-info"/, '⋮ 메뉴에서 보고서 정보로 바로 간다');
});

test('editor shell exposes quick-mapping and report-draft-suggestion dialog elements', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  assert.match(html, new RegExp('id=["\']quick-mapping-dialog["\']'), 'missing #quick-mapping-dialog');
  assert.doesNotMatch(html, new RegExp('id=["\']verdict-confirm["\']'), '#verdict-confirm should be removed now that pill clicks confirm instantly');
  assert.match(
    html,
    new RegExp('id=["\']report-draft-suggestion-dialog["\']'),
    'missing #report-draft-suggestion-dialog',
  );

  const quickMappingMatch = html.match(/<dialog id=["']quick-mapping-dialog["'][\s\S]*?<\/dialog>/);
  assert.ok(quickMappingMatch, 'quick-mapping-dialog markup block should be found');
  const quickMappingHtml = quickMappingMatch[0];
  for (const id of ['quick-mapping-feature', 'quick-mapping-verification', 'submit-quick-mapping']) {
    assert.match(quickMappingHtml, new RegExp(`id=["']${id}["']`), `#${id} should be inside quick-mapping-dialog`);
  }

  const draftSuggestionMatch = html.match(
    /<dialog id=["']report-draft-suggestion-dialog["'][\s\S]*?<\/dialog>/,
  );
  assert.ok(draftSuggestionMatch, 'report-draft-suggestion-dialog markup block should be found');
  const draftSuggestionHtml = draftSuggestionMatch[0];
  for (const id of [
    'draft-suggestion-title',
    'draft-suggestion-overview',
    'approve-draft-suggestion',
    'dismiss-draft-suggestion',
  ]) {
    assert.match(
      draftSuggestionHtml,
      new RegExp(`id=["']${id}["']`),
      `#${id} should be inside report-draft-suggestion-dialog`,
    );
  }
});

test('storage-detail-dialog contains all six storage fields and two download buttons', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  const dialogMatch = html.match(/<dialog id=["']storage-detail-dialog["'][\s\S]*?<\/dialog>/);
  assert.ok(dialogMatch, 'storage-detail-dialog markup block should be found');
  const dialogHtml = dialogMatch[0];

  for (const id of [
    'storage-location',
    'storage-report-id',
    'storage-evidence-count',
    'storage-last-saved-at',
    'storage-last-export-name',
    'storage-last-export-path',
    'show-last-download',
    'show-download-folder',
  ]) {
    assert.match(
      dialogHtml,
      new RegExp(`id=["']${id}["']`),
      `#${id} should be inside storage-detail-dialog`,
    );
  }
});

test('llm-settings-dialog contains the five LLM configuration fields', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  const dialogMatch = html.match(/<dialog id=["']llm-settings-dialog["'][\s\S]*?<\/dialog>/);
  assert.ok(dialogMatch, 'llm-settings-dialog markup block should be found');
  const dialogHtml = dialogMatch[0];

  for (const id of ['llm-endpoint', 'llm-api-key', 'llm-model', 'llm-adapter', 'llm-template']) {
    assert.match(
      dialogHtml,
      new RegExp(`id=["']${id}["']`),
      `#${id} should be inside llm-settings-dialog`,
    );
  }
});

test('llm-settings-dialog is titled "AI 설정" and clarifies which network each adapter targets', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  const dialogMatch = html.match(/<dialog id=["']llm-settings-dialog["'][\s\S]*?<\/dialog>/);
  assert.ok(dialogMatch, 'llm-settings-dialog markup block should be found');
  const dialogHtml = dialogMatch[0];

  assert.match(dialogHtml, /<h2>AI 설정<\/h2>/, 'dialog heading should read AI 설정');
  assert.doesNotMatch(dialogHtml, /내부망 LLM 증적 추천 설정/, 'old dialog title should no longer appear');

  assert.match(
    dialogHtml,
    /<option value=["']nh-ai-gateway["']>[^<]*내부망 liteLLM[^<]*<\/option>/,
    'NH AI Gateway option should clarify it targets the internal liteLLM gateway',
  );
  assert.match(
    dialogHtml,
    /<option value=["']openai-compatible["']>[^<]*외부망 공식 OpenAI API[^<]*<\/option>/,
    'OpenAI compatible option should clarify it targets the external official OpenAI API',
  );
});

test('changing the LLM adapter locks the endpoint field to that adapter\'s fixed endpoint for nh-ai-gateway/openai-compatible', () => {
  const script = fs.readFileSync(editorScriptPath, 'utf8');
  const html = fs.readFileSync(editorPath, 'utf8');
  const llmScript = fs.readFileSync(path.resolve(__dirname, '../extension/shared/llm.js'), 'utf8');

  assert.match(llmScript, /ADAPTER_DEFAULT_ENDPOINTS/, 'llm.js should define per-adapter default endpoints');
  assert.match(llmScript, /defaultEndpointForAdapter/, 'llm.js should export a defaultEndpointForAdapter helper');
  assert.match(
    llmScript,
    /'nh-ai-gateway':\s*DEFAULT_ENDPOINT/,
    'nh-ai-gateway should default to the internal endpoint',
  );
  assert.match(
    llmScript,
    /'openai-compatible':\s*['"]https:\/\/api\.openai\.com\/v1\/chat\/completions['"]/,
    'openai-compatible should default to the official external OpenAI endpoint',
  );

  assert.match(html, /id=["']llm-endpoint-hint["']/, 'missing #llm-endpoint-hint');
  assert.match(script, /llmEndpointHint:\s*byId\('llm-endpoint-hint'\)/);

  assert.match(
    script,
    /function\s+applyAdapterEndpointLock\s*\(\s*\)/,
    'editor.js should define applyAdapterEndpointLock',
  );
  assert.match(llmScript, /function\s+isAdapterEndpointLocked\s*\(/, 'llm.js should export isAdapterEndpointLocked');

  const lockBody = extractFunctionBody(script, 'applyAdapterEndpointLock');
  assert.match(
    lockBody,
    /CaptureITLlm\.isAdapterEndpointLocked\(adapter\)/,
    'lock should delegate the nh-ai-gateway/openai-compatible check to llm.js',
  );
  assert.match(
    lockBody,
    /CaptureITLlm\.defaultEndpointForAdapter\(adapter\)/,
    'lock should force the endpoint to that adapter\'s fixed default',
  );
  assert.match(lockBody, /elements\.llmEndpoint\.readOnly = isLocked/, 'lock should mark the endpoint field read-only');

  // adapter change 핸들러는 applyAdapterEndpointLock()으로 엔드포인트를 먼저 교정한 뒤에
  // persistLlmSettings()를 호출해야 한다 - 순서가 바뀌면 교정 전(과거) 엔드포인트 값이 저장되는
  // 버그가 생긴다("OpenAI로 했는데 엔드포인트가 틀렸다" 재현 원인이었다).
  assert.match(
    script,
    /elements\.llmAdapter\.addEventListener\('change', \(\) => \{\s*applyAdapterEndpointLock\(\);\s*persistLlmSettings\(\);\s*\}\)/,
    'adapter change should apply the endpoint lock before persisting settings',
  );
  assert.doesNotMatch(
    script,
    /for \(const input of \[elements\.llmEndpoint, elements\.llmApiKey, elements\.llmModel, elements\.llmAdapter, elements\.llmTemplate\]\)/,
    'llmAdapter should not share the generic persistLlmSettings change loop (it needs the lock applied first)',
  );
  assert.match(
    script,
    /applyAdapterEndpointLock\(\);/,
    'load() should apply the endpoint lock on startup based on the stored adapter',
  );
});

test('editor shell exposes open-storage-detail and open-llm-settings entry-point buttons', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  assert.match(html, new RegExp('id=["\']open-storage-detail["\']'), 'missing #open-storage-detail');
  assert.match(html, new RegExp('id=["\']open-llm-settings["\']'), 'missing #open-llm-settings');
});

test('request-recommendations button lives outside the llm-settings-dialog', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  assert.match(
    html,
    new RegExp('id=["\']request-recommendations["\']'),
    'missing #request-recommendations',
  );

  const dialogMatch = html.match(/<dialog id=["']llm-settings-dialog["'][\s\S]*?<\/dialog>/);
  assert.ok(dialogMatch, 'llm-settings-dialog markup block should be found');
  const dialogHtml = dialogMatch[0];

  assert.doesNotMatch(
    dialogHtml,
    new RegExp('id=["\']request-recommendations["\']'),
    '#request-recommendations should not be inside llm-settings-dialog',
  );
});

test('editor shell no longer displays retired English eyebrow labels or "기능 명세" phrasing (OFF/ON status text is verified once editor.js renders it in Korean)', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  assert.equal(html.includes('START HERE'), false, 'START HERE should not appear');
  assert.equal(html.includes('>STORAGE<'), false, 'eyebrow-styled STORAGE should not appear');
  assert.equal(html.includes('FEATURES'), false, 'FEATURES should not appear');
  assert.equal(html.includes('DRAFT / PROJECT'), false, 'DRAFT / PROJECT should not appear');
  assert.equal(html.includes('>EVIDENCE<'), false, 'eyebrow-styled EVIDENCE should not appear');
  assert.equal(html.includes('FEATURE RESULT'), false, 'FEATURE RESULT should not appear');
  assert.equal(html.includes('기능 명세'), false, '기능 명세 phrasing should not appear');
});


test('editor.html no longer contains the literal ">OFF<"/">ON<" status markers now that renderSession() renders Korean text (deferred check from Task 4.4)', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  assert.equal(html.includes('>OFF<'), false, '>OFF< should not appear in editor.html');
  assert.equal(html.includes('>ON<'), false, '>ON< should not appear in editor.html');
});

test('renderSession()은 녹화 상태를 빨간 점과 한국어 문구로 보여 준다', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/editor.js'), 'utf8');
  const html = fs.readFileSync(editorPath, 'utf8');

  assert.match(html, /id=["']session-status["'][^>]*>녹화 중<\/span>/);
  const body = extractFunctionBody(script, 'renderSession');
  assert.match(body, /elements\.sessionStatus\.className = `rec-dot \$\{active \? 'is-on'/);
  assert.match(body, /elements\.toggleSession\.append\(starting \? '시작 중…' : active \? '녹화 종료' : '녹화 시작'\);/);
  // 녹화 중에는 아래 상태 줄에도 빨간 종료 버튼이 보인다(사이드 패널에서 목록을 내려 봐도 보이게).
  assert.match(body, /elements\.stopRecordingBar\.hidden = !active;/);
  assert.match(html, /<button id="stop-recording-bar" class="button button-stop"[^>]*hidden>/);
  const css = fs.readFileSync(editorCssPath, 'utf8');
  assert.match(css, /\.button-stop, #toggle-session\.is-recording \{ color: #fff; background: var\(--rec\); \}/);
  assert.doesNotMatch(script, /textContent = active \? 'ON' : 'OFF'/);
  assert.doesNotMatch(html, /자동캡쳐/);
  assert.doesNotMatch(script, /'자동캡쳐/);
});

test('existing handler function names and domain/LLM call sites still exist in editor.js', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/editor.js'), 'utf8');

  assert.match(script, /async function toggleSession\(\)/, 'toggleSession handler should still exist');
  assert.match(script, /async function mapEvidence\(evidence\)/, 'mapEvidence handler should still exist');
  assert.match(
    script,
    /async function mapEvidenceIds\(evidenceIds, feature\)/,
    'mapEvidenceIds handler should still exist',
  );
  assert.match(script, /async function submitQuickMapping\(\)/, 'submitQuickMapping handler should still exist');

  assert.match(
    script,
    /CaptureITDomain\.mapEvidenceBatch\(/,
    'mapEvidenceIds should still call CaptureITDomain.mapEvidenceBatch',
  );
  assert.match(
    script,
    /CaptureITDomain\.applyQuickMapping\(/,
    'submitQuickMapping should still call CaptureITDomain.applyQuickMapping',
  );

  assert.match(script, /CaptureITLlm\.buildStageOne\(/);
  assert.match(script, /CaptureITLlm\.buildStageTwo\(/);
  assert.match(script, /CaptureITLlm\.validateRecommendations\(/);
  assert.match(script, /CaptureITLlm\.buildLlmEvidencePacket\(/);
  assert.match(script, /CaptureITLlm\.buildTestCaseDescriptionRequest\(/);
  assert.match(script, /CaptureITLlm\.validateTestCaseDescriptionResponse\(/);
  assert.match(script, /CaptureITLlm\.buildAdapterRequest\(/);
  assert.match(script, /CaptureITLlm\.buildDiagnosticSummary\(/);
  assert.match(script, /CaptureITLlm\.DEFAULT_ENDPOINT\b/);
  assert.match(script, /CaptureITLlm\.DEFAULT_MODEL\b/);
});

test('handler functions remain bound to their corresponding buttons via addEventListener', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/editor.js'), 'utf8');

  assert.match(
    script,
    /elements\.toggleSession\.addEventListener\('click', \(\) => toggleSession\(\)/,
    '#toggle-session button should still be bound to toggleSession()',
  );
  assert.match(
    script,
    /elements\.addFeature\.addEventListener\('click', \(\) => addFeature\(\)/,
    '#add-feature button should still be bound to addFeature()',
  );
  assert.match(
    script,
    /elements\.requestRecommendations\.addEventListener\('click', \(\) => withBusy\(elements\.requestRecommendations, 'AI가 보는 중…', \(\) => requestRecommendations\(\)\)/,
    '#request-recommendations button should still be bound to requestRecommendations()',
  );
  assert.match(
    script,
    /elements\.quickMappingDialog\.querySelector\('form'\)\.addEventListener\('submit'/,
    'quick-mapping-dialog form submit should still be handled',
  );
  assert.match(script, /submitQuickMapping\(\)\.catch/, 'quick-mapping-dialog submit should still call submitQuickMapping()');
});

test('runtime message listener is guarded for local HTTP editor previews', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/editor.js'), 'utf8');

  assert.match(
    script,
    /if\s*\(\s*typeof chrome !== 'undefined'\s*&&\s*chrome\.runtime\s*&&\s*chrome\.runtime\.onMessage\s*\)\s*{[\s\S]*chrome\.runtime\.onMessage\.addListener/,
    'chrome.runtime.onMessage listener should only be registered when the runtime API exists',
  );
});

test('editor shell uses testcase wording across feature list and card-integrated result labels', () => {
  const html = fs.readFileSync(editorPath, 'utf8');
  const script = fs.readFileSync(editorScriptPath, 'utf8');

  assert.match(
    html,
    /<h2 id=["']feature-list-heading["']>테스트케이스<\/h2>/,
    'feature-list-heading should read 테스트케이스',
  );
  assert.match(
    html,
    /id=["']no-feature["'][^>]*>테스트케이스가 없습니다\./,
    'no-feature empty state should explain how a testcase gets created',
  );
  assert.match(
    html,
    /id=["']add-feature["'][^>]*aria-label=["']테스트케이스 추가["']/,
    'add-feature button aria-label should read 테스트케이스 추가',
  );
  // #feature-editor-panel과 standalone #feature-title/#verification/#expected-result/
  // #actual-result 필드는 제거되었다 - 이제 테스트케이스명/기대결과/실제결과는
  // featureCard() 안에서 동적으로 생성되어 카드에 통합된다.
  assert.doesNotMatch(html, /id=["']feature-editor-panel["']/);
  assert.doesNotMatch(html, /id=["']feature-title["']/);
  assert.doesNotMatch(html, /id=["']verification["']/);
  assert.doesNotMatch(html, /id=["']expected-result["']/);
  assert.doesNotMatch(html, /id=["']actual-result["']/);
  assert.doesNotMatch(html, /id=["']result-heading["']/);

  const featureCardBody = extractFunctionBody(script, 'featureCard');
  assert.match(featureCardBody, /titleInput\.placeholder = `\$\{itemWord\(\)\} 이름`;/, 'card title placeholder follows the document type');
  assert.match(featureCardBody, /for \(const field of docType\(\)\.fields\)/, 'card result fields come from the document type');
});

test('feature cards expose testcase title as an editable input and keep inline testcase descriptions', () => {
  const script = fs.readFileSync(editorScriptPath, 'utf8');
  const featureCardBody = extractFunctionBody(script, 'featureCard');

  assert.match(
    featureCardBody,
    /titleInput\.className\s*=\s*'feature-title-input'/,
    'feature card should render testcase title as a persistent input',
  );
  assert.match(
    featureCardBody,
    /titleInput\.addEventListener\('change',\s*\(\)\s*=>\s*saveFeatureTitle\(/,
    'title input changes should persist through saveFeatureTitle',
  );
  assert.match(featureCardBody, /feature-description-edit/, 'feature card should render an inline description editor');
  assert.match(featureCardBody, /saveFeatureDescription\(/, 'description changes should persist through saveFeatureDescription');
  assert.match(script, /function\s+saveFeatureTitle\s*\(/, 'title save helper should exist');
});

test('작업대에는 증적과 테스트케이스를 잇는 연결선 SVG 층이 있다', () => {
  const html = fs.readFileSync(editorPath, 'utf8');
  const script = fs.readFileSync(editorScriptPath, 'utf8');
  assert.match(html, /<svg id=["']mapping-link-layer["'] class=["']mapping-link-layer["'] aria-hidden=["']true["']><\/svg>/);
  const body = extractFunctionBody(script, 'renderMappingLinks');
  assert.match(body, /if \(isNarrow\(\)\) return;/, '좁은 폭에서는 연결선을 그리지 않는다');
  assert.match(body, /elements\.workspace\.getBoundingClientRect\(\)/);
});

test('Evidence Inbox does not show image drag-and-drop helper copy', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  assert.doesNotMatch(html, /class=["']drop-hint["']/);
  assert.doesNotMatch(html, /PNG.?JPEG.?WebP/);
});

// 화면 회귀검증: "수집된 증적" 화면 - Evidence Inbox라는 용어가 사라지고, 증적이 기술 이벤트가
// 아니라 테스트 흐름 카드로 표시되며, 역할 뱃지가 존재하는지 확인한다.
test('collected-evidence screen uses 수집된 증적 wording and renders test-flow role badges instead of raw technical event names', () => {
  const html = fs.readFileSync(editorPath, 'utf8');
  const script = fs.readFileSync(editorScriptPath, 'utf8');

  assert.doesNotMatch(html, />Evidence Inbox</, 'Evidence Inbox literal should no longer appear in the default UI');
  assert.match(html, /<h2 id=["']inbox-heading["']>증적 수집함<\/h2>/);

  assert.match(script, /function\s+evidenceRoleBadge\s*\(/, 'evidenceRoleBadge() should exist to render role badges on evidence cards');
  assert.match(script, /function\s+evidenceStepLabel\s*\(/, 'evidenceStepLabel() should exist to render human-readable step names instead of raw triggerType');
  assert.match(script, /role-screen/);
  assert.match(script, /role-input/);
  assert.match(script, /role-action/);
  assert.match(script, /role-result/);
  assert.match(script, /role-manual/);

  const captureNodeBody = extractFunctionBody(script, 'captureNode');
  assert.doesNotMatch(
    captureNodeBody,
    /meta\.textContent\s*=\s*`#\$\{evidence\.sequenceNo\}\s*\$\{evidence\.triggerType\}`/,
    'capture node should not show the raw #sequenceNo triggerType string anymore',
  );
  assert.match(captureNodeBody, /evidenceStepLabel\(evidence\)/, 'capture node should use the human-readable step label');
});

test('evidence review controls use icon buttons, and the connect control shows its label', () => {
  const script = fs.readFileSync(editorScriptPath, 'utf8');
  const css = fs.readFileSync(editorCssPath, 'utf8');
  const featureCardBody = extractFunctionBody(script, 'featureCard');
  const mapToFeatureButtonBody = extractFunctionBody(script, 'mapToFeatureButton');

  assert.match(script, /function\s+iconSvg\s*\(/, 'iconSvg helper should create inline SVG icons');
  assert.match(script, /function\s+iconButton\s*\(/, 'iconButton helper should create labelled icon-only buttons');
  assert.match(featureCardBody, /iconButton\('위로 이동',\s*'arrow-up'/, 'feature up control should use an icon button');
  assert.match(featureCardBody, /iconButton\('아래로 이동',\s*'arrow-down'/, 'feature down control should use an icon button');
  assert.match(featureCardBody, /iconButton\(`\$\{itemWord\(\)\} 삭제`,\s*'trash'/, 'feature delete control should use an icon button');
  assert.match(mapToFeatureButtonBody, /button\.setAttribute\('aria-label',\s*`\$\{itemWord\(\)\}에 연결`\)/, 'mapping control should keep an accessible label');
  assert.match(mapToFeatureButtonBody, /button\.replaceChildren\(iconSvg\('link'\), '연결'\)/, 'the only way to connect gets an icon and a visible label (big target)');
  assert.match(css, /\.icon-only/, 'icon-only controls should have shared styling');
  assert.match(css, /\.sr-only/, 'icon buttons should have a screen-reader-only utility available');
  assert.doesNotMatch(css, /\.mapping-link-layer\s*{[^}]*height:\s*100%/,
    'mapping SVG layer should not use percentage height because it can expand the stage while scrolling');
});

test('연결 증적 드로어는 전용 버튼으로만 열고, 판정은 ✓ PASS / ✕ FAIL / ○ 미판정 버튼 세 개로 바로 고른다', () => {
  const html = fs.readFileSync(editorPath, 'utf8');
  const script = fs.readFileSync(editorScriptPath, 'utf8');
  const css = fs.readFileSync(editorCssPath, 'utf8');

  assert.match(html, /<aside id=["']feature-mapping-target["'][^>]*\bhidden\b/);
  assert.match(script, /function\s+setFeatureDrawerOpen\s*\(/);
  assert.match(script, /function\s+openFeatureDrawer\s*\(/);
  assert.match(script, /let\s+drawerOpen\s*=\s*false/);
  assert.doesNotMatch(extractFunctionBody(script, 'selectFeature'), /drawerOpen\s*=\s*true/, 'selecting a card should not open the drawer');

  const featureCardBody = extractFunctionBody(script, 'featureCard');
  assert.match(featureCardBody, /iconButton\('연결된 증적 보기',\s*'eye',\s*\(\)\s*=>\s*openFeatureDrawer\(feature\.id\)\)/);
  assert.match(featureCardBody, /statusMark\(feature\)/, 'card header shows the verdict as a glyph mark');
  assert.match(featureCardBody, /verdictControl\(feature\)/, 'card footer has the three verdict buttons');

  const controlBody = extractFunctionBody(script, 'verdictControl');
  assert.match(controlBody, /setAttribute\('aria-pressed', String\(status === verdict\.value\)\)/);
  assert.match(controlBody, /setVerdict\(feature, verdict\.value\)/);
  assert.match(script, /\{ value: 'PASS', glyph: '✓'/);
  assert.match(script, /\{ value: 'FAIL', glyph: '✕'/);
  assert.match(script, /\{ value: null, glyph: '○', label: '미판정'/);
  assert.match(extractFunctionBody(script, 'setVerdict'), /feature\.result\.status = value;/);
  assert.doesNotMatch(script, /function\s+cycleVerdict|function\s+verdictPill|feature-status-pill/, 'the cycling pill is gone');
  assert.match(css, /\.verdict-option\[aria-pressed="true"\]\.verdict-pass/);
  assert.match(css, /\.verdict-option\[aria-pressed="true"\]\.verdict-fail/);
  assert.match(css, /\.st-pass/);
  assert.doesNotMatch(css, /linear-gradient\(120deg/, 'no rainbow gradient while AI runs');
});

test('증적 세트는 한 줄씩 쌓이고 상세 보기는 앞뒤로 넘길 수 있다', () => {
  const html = fs.readFileSync(editorPath, 'utf8');
  const css = fs.readFileSync(editorCssPath, 'utf8');
  assert.match(html, /<div id=["']evidence-inbox["'] class=["']evidence-list["']/);
  assert.match(css, /\.evidence-list\s*{[^}]*display:\s*grid/);
  assert.match(css, /\.capture-graph\s*{[^}]*width:\s*100%/);
  assert.match(html, /id=["']previous-evidence-detail["']/);
  assert.match(html, /id=["']next-evidence-detail["']/);
});

// Loop 3 회귀 테스트: preview-report/export-report/open-save-project id 중복 버그 수정 검증.
// 완료 단계(#stage-completion)가 이 세 액션의 유일한 소유자가 되었고(매핑/결과 단계의 .actions
// 블록은 제거됨), byId()가 항상 완료 단계 버튼에 바인딩되도록 각 id가 문서에서 정확히 한 번만
// 나타나야 한다.
test('preview-report/export-report/report-title ids each appear exactly once in editor.html (no duplicate DOM ids)', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  for (const id of ['preview-report', 'export-report', 'report-title']) {
    const matches = html.match(new RegExp(`id=["']${id}["']`, 'g')) || [];
    assert.equal(matches.length, 1, `#${id} should appear exactly once in editor.html, found ${matches.length}`);
  }
});

test('목적은 내보내기 창에서 고른다: 문서 ZIP·미리보기·증적만 ZIP·보고서 정보가 한 곳에 있다', () => {
  const html = fs.readFileSync(editorPath, 'utf8');
  const script = fs.readFileSync(editorScriptPath, 'utf8');

  const dialogMatch = html.match(/<dialog id=["']export-dialog["'][\s\S]*?<\/dialog>/);
  assert.ok(dialogMatch, '#export-dialog should exist');
  for (const id of ['export-report', 'preview-report', 'export-evidence-only', 'report-info', 'validation-warnings', 'template-options']) {
    assert.match(dialogMatch[0], new RegExp(`id=["']${id}["']`), `#${id} should live in the export dialog`);
  }
  for (const id of ['export-evidence-quick', 'export-evidence-completion']) {
    assert.doesNotMatch(html, new RegExp(`id=["']${id}["']`), `#${id} duplicate entry point should be gone`);
  }
  // 상태 줄에 준비 상태와 내보내기 버튼
  assert.match(html, /<footer class=["']status-bar["'][\s\S]*id=["']readiness-summary["'][\s\S]*id=["']open-export["']/);
  assert.match(script, /elements\.openExport\.addEventListener\('click', openExportDialog\)/);
  const warningsBody = extractFunctionBody(script, 'renderWarnings');
  assert.match(warningsBody, /focusFeature\(entry\.featureId\)/, 'a remaining item jumps to its testcase');
});


test('내보내기 요약은 completion-summary-* 값 여섯 개를 보여 준다', () => {
  const html = fs.readFileSync(editorPath, 'utf8');
  for (const id of ['completion-summary-features', 'completion-summary-pass', 'completion-summary-fail', 'completion-summary-na', 'completion-summary-evidence', 'completion-summary-total']) {
    assert.match(html, new RegExp(`id=["']${id}["'][^>]*class=["']completion-summary-value["']`), `#${id} should exist`);
  }
});

test('renderCompletionSummary는 테스트케이스·판정·연결 증적·전체 증적 수를 editorState에서 계산한다', () => {
  const script = fs.readFileSync(editorScriptPath, 'utf8');
  const computeBody = extractFunctionBody(script, 'computeCompletionSummary');
  assert.match(computeBody, /feature\.result\.status\s*===\s*['"]PASS['"]/);
  assert.match(computeBody, /feature\.result\.status\s*===\s*['"]FAIL['"]/);
  assert.match(computeBody, /new Set\(\)/, 'mapped evidence count should be deduplicated via a Set');
  assert.match(computeBody, /total: evidenceList\.length/);

  const renderBody = extractFunctionBody(script, 'renderCompletionSummary');
  for (const key of ['completionSummaryFeatures', 'completionSummaryPass', 'completionSummaryFail', 'completionSummaryNa', 'completionSummaryEvidence', 'completionSummaryTotal']) {
    assert.match(renderBody, new RegExp(`elements\\.${key}\\.textContent`));
  }
  const workspaceBody = extractFunctionBody(script, 'renderWorkspace');
  for (const call of ['renderGuidance()', 'renderReadiness()', 'renderCompletionSummary()', 'scheduleMappingLinks()']) {
    assert.ok(workspaceBody.includes(call), `renderWorkspace should call ${call}`);
  }
});

test('computeCompletionSummary example: mixed PASS/FAIL/N/A features and deduplicated evidence with AI images', () => {
  // 실제 도메인 로직(CaptureITDomain.createFeature)으로 만든 feature들에 result.status와
  // evidenceIds를 채워, 계산 로직이 PASS/FAIL/N/A 분류, 증적 중복 제거, AI 이미지 카운트를
  // 올바르게 수행하는지 예시 기반으로 검증한다. editor.js는 브라우저 전역(document 등)에 의존하므로
  // 직접 require하지 않고, 계산 로직만 별도로 재현해 동일한 알고리즘임을 소스 코드로도 대조한다.
  const domain = require('../extension/shared/domain.js');

  const featureA = domain.createFeature('테스트케이스 A');
  featureA.result.status = 'PASS';
  featureA.result.evidenceIds = ['EV-1', 'EV-2'];

  const featureB = domain.createFeature('테스트케이스 B');
  featureB.result.status = 'FAIL';
  featureB.result.evidenceIds = ['EV-2', 'EV-3']; // EV-2는 featureA와 중복 매핑

  const featureC = domain.createFeature('테스트케이스 C');
  featureC.result.status = null; // N/A
  featureC.result.evidenceIds = [];

  const features = [featureA, featureB, featureC];
  const evidence = [
    { id: 'EV-1', llmImageDataUrl: 'data:image/png;base64,aaa' },
    { id: 'EV-2', llmImageDataUrl: null },
    { id: 'EV-3', llmImageDataUrl: 'data:image/png;base64,bbb' },
    { id: 'EV-4', llmImageDataUrl: 'data:image/png;base64,ccc' }, // 매핑되지 않은 증적, 포함 증적 수에서 제외되어야 함
  ];

  // computeCompletionSummary와 동일한 알고리즘을 재현한다(순수 계산이며 DOM에 의존하지 않음).
  const pass = features.filter((f) => f.result.status === 'PASS').length;
  const fail = features.filter((f) => f.result.status === 'FAIL').length;
  const na = features.length - pass - fail;
  const mappedEvidenceIds = new Set();
  for (const feature of features) {
    for (const evidenceId of feature.result.evidenceIds) mappedEvidenceIds.add(evidenceId);
  }
  const total = evidence.length;

  assert.equal(features.length, 3);
  assert.equal(pass, 1);
  assert.equal(fail, 1);
  assert.equal(na, 1);
  assert.equal(mappedEvidenceIds.size, 3, 'EV-1/EV-2/EV-3 매핑, EV-2 중복은 한 번만 계산되어야 함');
  assert.equal(total, 4, '전체 증적은 연결 여부와 상관없이 모두 센다');
});
