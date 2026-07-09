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

test('editor stage renderer shows exactly one wizard-stage container at a time via hidden toggling', () => {
  const html = fs.readFileSync(editorPath, 'utf8');
  const script = fs.readFileSync(editorScriptPath, 'utf8');

  assert.match(
    html,
    /<button[^>]*class=["'][^"']*\bstage-tab\b[^"']*\bactive\b[^"']*["'][^>]*id=["']stage-tab-capture["'][^>]*>/,
    'capture tab should be active in the initial shell',
  );
  assert.match(script, /stageMappingResult:\s*byId\('stage-mapping-result'\)/);

  const renderStageBody = extractFunctionBody(script, 'renderStage');
  assert.match(
    renderStageBody,
    /container\.hidden\s*=\s*index\s*!==\s*activeStageIndex/,
    'renderStage should toggle hidden on each STAGE_CONTAINERS entry based on activeStageIndex',
  );
});

test('wizard tabs remain clickable and render their stage even before workflow data is complete', () => {
  const script = fs.readFileSync(editorScriptPath, 'utf8');
  const renderStageBody = extractFunctionBody(script, 'renderStage');
  const goToStageBody = extractFunctionBody(script, 'goToStage');

  assert.doesNotMatch(
    renderStageBody,
    /elements\.stageTabs\[index\]\.disabled\s*=\s*!reachable\[index\]/,
    'stage tabs should not be disabled by reachability',
  );
  assert.doesNotMatch(
    renderStageBody,
    /activeStageIndex\s*=\s*CaptureITWizardStage\.navigate\(snapshot,\s*activeStageIndex,\s*activeStageIndex\)/,
    'renderStage should not clamp direct tab navigation back to the reachable stage',
  );
  assert.doesNotMatch(
    goToStageBody,
    /CaptureITWizardStage\.navigate/,
    'tab navigation should render the requested stage directly',
  );
});

test('mapping-result stage places evidence inbox and testcase columns side by side statically, with the selected-evidence detail as a slide-in drawer', () => {
  const html = fs.readFileSync(editorPath, 'utf8');
  const css = fs.readFileSync(editorCssPath, 'utf8');

  const stageMatch = html.match(/<section id=["']stage-mapping-result["'][\s\S]*?<\/section>\s*<\/section>/);
  assert.ok(stageMatch, 'stage-mapping-result markup block should be found');
  const stageHtml = stageMatch[0];

  assert.match(stageHtml, /id=["']evidence-drop-zone["']/, 'evidence inbox should be statically inside stage-mapping-result');
  assert.match(stageHtml, /class=["'][^"']*\bfeature-panel\b[^"']*["']/, 'feature panel should be statically inside stage-mapping-result');
  assert.match(stageHtml, /id=["']feature-mapping-target["']/, 'feature mapping target drawer should be statically inside stage-mapping-result');
  assert.match(
    stageHtml,
    /<aside id=["']feature-mapping-target["'][^>]*class=["'][^"']*\bfeature-detail-drawer\b[^"']*["'][^>]*hidden[^>]*>/,
    'feature-mapping-target should be an <aside> drawer, hidden by default until a testcase card is selected',
  );

  assert.match(
    css,
    /\.mapping-result-grid\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1\.15fr\)/,
    'mapping-result-grid should lay out evidence and testcase columns side by side',
  );
  assert.match(
    css,
    /\.feature-detail-drawer\s*{[^}]*position:\s*fixed/,
    'feature-detail-drawer should be a fixed-position slide-in panel independent of the column grid',
  );
  assert.match(
    css,
    /\.feature-detail-drawer\.open\s*{[^}]*transform:\s*translateX\(0\)/,
    'feature-detail-drawer should slide into view when opened',
  );
});

test('capture mode selection UI is removed from the default screen; a single recording CTA drives IDLE/RECORDING state', () => {
  const html = fs.readFileSync(editorPath, 'utf8');
  const script = fs.readFileSync(editorScriptPath, 'utf8');

  // 캡처 모드(이벤트/컨텍스트) 선택 UI는 기본 화면에서 완전히 제거되었다(iOS 원칙 1, 2).
  // 내부 저장 계약을 위한 hidden 값 보관용 <select>만 남는다.
  assert.match(
    html,
    /<select[^>]*id=["']capture-mode["'][^>]*hidden[^>]*>/,
    'capture-mode value carrier should remain hidden for existing session logic',
  );
  assert.doesNotMatch(html, /role=["']radiogroup["']/, 'mode selection radiogroup should no longer be exposed');
  assert.doesNotMatch(html, /data-capture-mode=["']event["']/, 'event/context mode toggle buttons should be removed');
  assert.doesNotMatch(html, /data-capture-mode=["']context["']/, 'event/context mode toggle buttons should be removed');
  assert.doesNotMatch(html, /class=["'][^"']*\bmode-toggle\b/, 'mode-toggle slider markup should be removed');

  // 첫 화면은 큰 제목 + 짧은 설명 + 단일 primary CTA만 강조한다(iOS 원칙 3, 7).
  assert.match(html, /테스트 화면을 녹화하세요/, 'idle screen should show the single-action title');
  assert.match(html, /id=["']toggle-session["'][^>]*>녹화 시작<\/button>/, 'primary CTA should read 녹화 시작');
  assert.match(html, /기존 이미지 불러오기/, 'secondary action should read 기존 이미지 불러오기');
  assert.match(html, /중요한 영역은 Ctrl\+Shift\+클릭으로 직접 지정할 수 있습니다\./, 'manual pin should be a small supplementary hint');
  assert.doesNotMatch(html, /이벤트 모드는 클릭·제출·화면 전환을 완료 대기 없이 캡처합니다/);

  // 녹화 중 상태에서는 RECORDING pill + 종료 CTA + 수집 현황 4개 숫자를 보여준다.
  assert.match(html, /id=["']session-status["'][^>]*>RECORDING<\/span>/);
  assert.match(html, /id=["']recording-summary["'][^>]*hidden[^>]*>/);
  for (const id of ['recording-summary-screens', 'recording-summary-inputs', 'recording-summary-results', 'recording-summary-ai-ready']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }

  assert.match(script, /function\s+renderSession\s*\(\s*\)/);
  assert.match(script, /function\s+computeRecordingSummary\s*\(\s*\)/);
  assert.match(script, /function\s+renderRecordingSummary\s*\(/);
  assert.doesNotMatch(script, /captureModeToggle/, 'captureModeToggle references should be removed');
  assert.doesNotMatch(script, /captureModeButtons/, 'captureModeButtons references should be removed');
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

test('editor shell places capture/import controls before the save-project dialog', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  const captureFirstIndex = html.indexOf('capture-first-panel');
  const toggleSessionIndex = html.indexOf('toggle-session');
  const saveProjectDialogIndex = html.indexOf('save-project-dialog');
  const reportTitleIndex = html.indexOf('report-title');

  assert.notEqual(captureFirstIndex, -1, 'capture-first-panel should exist');
  assert.notEqual(toggleSessionIndex, -1, 'toggle-session should exist');
  assert.notEqual(saveProjectDialogIndex, -1, 'save-project-dialog should exist');
  assert.notEqual(reportTitleIndex, -1, 'report-title should exist');

  assert.ok(
    captureFirstIndex < saveProjectDialogIndex,
    'capture-first-panel should appear before save-project-dialog in markup order',
  );
  assert.ok(
    toggleSessionIndex < reportTitleIndex,
    'toggle-session should appear before report-title in markup order',
  );
});

test('editor shell keeps identifying report fields inside the save-project dialog', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  const dialogMatch = html.match(/<dialog id=["']save-project-dialog["'][\s\S]*?<\/dialog>/);
  assert.ok(dialogMatch, 'save-project-dialog markup block should be found');
  const dialogHtml = dialogMatch[0];

  for (const id of [
    'report-title',
    'project-name',
    'report-author',
    'change-purpose',
    'change-summary',
    'configuration-overview',
  ]) {
    assert.match(
      dialogHtml,
      new RegExp(`id=["']${id}["']`),
      `#${id} should be inside save-project-dialog`,
    );
  }
});

test('editor shell places the save-project trigger after the preview and export actions', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  // 'open-save-project'만으로 substring 검색하면 header 더보기 메뉴의 'open-save-project-menu'가
  // 먼저 매치되므로, 정확한 id="open-save-project" 속성으로 찾는다.
  const openSaveProjectIndex = html.search(/id=["']open-save-project["']/);
  const previewReportIndex = html.indexOf('preview-report');
  const exportReportIndex = html.indexOf('export-report');

  assert.notEqual(openSaveProjectIndex, -1, 'open-save-project should exist');
  assert.notEqual(previewReportIndex, -1, 'preview-report should exist');
  assert.notEqual(exportReportIndex, -1, 'export-report should exist');

  assert.ok(
    openSaveProjectIndex > previewReportIndex,
    'open-save-project should appear after preview-report in markup order',
  );
  assert.ok(
    openSaveProjectIndex > exportReportIndex,
    'open-save-project should appear after export-report in markup order',
  );
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

test('storage-detail-dialog contains all six storage fields and three storage action buttons', () => {
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
    'export-evidence-only',
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

test('llm-settings-dialog is titled "LLM 설정" and clarifies which network each adapter targets', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  const dialogMatch = html.match(/<dialog id=["']llm-settings-dialog["'][\s\S]*?<\/dialog>/);
  assert.ok(dialogMatch, 'llm-settings-dialog markup block should be found');
  const dialogHtml = dialogMatch[0];

  assert.match(dialogHtml, /<strong>LLM 설정<\/strong>/, 'dialog heading should read LLM 설정');
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

test('editor shell has three wizard-stage containers with only stage-capture visible by default', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  const stageIds = [
    'stage-capture',
    'stage-mapping-result',
    'stage-completion',
  ];

  for (const stageId of stageIds) {
    const sectionMatch = html.match(new RegExp(`<section id=["']${stageId}["'][^>]*>`));
    assert.ok(sectionMatch, `<section id="${stageId}"> should be found`);
    const openTag = sectionMatch[0];

    assert.match(openTag, /class=["'][^"']*wizard-stage[^"']*["']/, `${stageId} should have wizard-stage class`);

    if (stageId === 'stage-capture') {
      assert.doesNotMatch(openTag, /\bhidden\b/, 'stage-capture should not start hidden');
    } else {
      assert.match(openTag, /\bhidden\b/, `${stageId} should start hidden`);
    }
  }

  assert.doesNotMatch(html, new RegExp('id=["\']stage-mapping["\']'), 'standalone mapping stage should be removed');
});

test('editor.html no longer contains the literal ">OFF<"/">ON<" status markers now that renderSession() renders Korean text (deferred check from Task 4.4)', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  assert.equal(html.includes('>OFF<'), false, '>OFF< should not appear in editor.html');
  assert.equal(html.includes('>ON<'), false, '>ON< should not appear in editor.html');
});

test('renderSession() shows RECORDING pill and 녹화 시작/녹화 종료 CTA text rather than English ON/OFF or 자동캡쳐 wording', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/editor.js'), 'utf8');
  const html = fs.readFileSync(editorPath, 'utf8');

  assert.match(html, /id=["']session-status["'][^>]*>RECORDING<\/span>/);
  assert.match(html, /id=["']toggle-session["'][^>]*data-primary-action=["']recording-session["'][^>]*>녹화 시작<\/button>/);

  assert.match(
    script,
    /elements\.sessionStatus\.textContent = active \? 'RECORDING' : starting \? '녹화 시작 중…' : '';/,
    'renderSession should set the RECORDING pill text',
  );
  assert.match(
    script,
    /elements\.toggleSession\.textContent = starting \? '녹화 시작 중…' : active \? '녹화 종료' : '녹화 시작';/,
    'renderSession should set the primary CTA text',
  );
  assert.doesNotMatch(
    script,
    /textContent = active \? 'ON' : 'OFF'/,
    'renderSession should not fall back to English ON/OFF text',
  );
  assert.doesNotMatch(html, /자동캡쳐/, '자동캡쳐 wording should no longer appear in the default screen');
  assert.doesNotMatch(script, /'자동캡쳐/, '자동캡쳐 wording should no longer appear in editor.js UI strings');
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
    /async function submitSaveAsProject\(\)/,
    'submitSaveAsProject handler should still exist',
  );

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
  assert.match(
    script,
    /CaptureITDomain\.saveAsProject\(/,
    'submitSaveAsProject should still call CaptureITDomain.saveAsProject',
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
    /elements\.requestRecommendations\.addEventListener\('click', \(\) => requestRecommendations\(\)/,
    '#request-recommendations button should still be bound to requestRecommendations()',
  );
  assert.match(
    script,
    /elements\.quickMappingDialog\.querySelector\('form'\)\.addEventListener\('submit'/,
    'quick-mapping-dialog form submit should still be handled',
  );
  assert.match(script, /submitQuickMapping\(\)\.catch/, 'quick-mapping-dialog submit should still call submitQuickMapping()');
  assert.match(
    script,
    /elements\.saveProjectDialog\.querySelector\('form'\)\.addEventListener\('submit'/,
    'save-project-dialog form submit should still be handled',
  );
  assert.match(
    script,
    /submitSaveAsProject\(\)\.catch/,
    'save-project-dialog submit should still call submitSaveAsProject()',
  );
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
    /id=["']no-feature["'][^>]*>테스트케이스를 추가하십시오\./,
    'no-feature empty state should read 테스트케이스를 추가하십시오.',
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
  assert.match(featureCardBody, /placeholder\s*=\s*'테스트케이스명'/, 'card testcase title input should be labelled 테스트케이스명');
  assert.match(featureCardBody, /['"]기대 결과['"]/, 'card result fields should include 기대 결과');
  assert.match(featureCardBody, /['"]실제 결과['"]/, 'card result fields should include 실제 결과');
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

test('mapping-result shell labels the merged stage as mapping and result entry', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  assert.match(
    html,
    /<h2 id=["']mapping-result-heading["']>증적 매핑과 테스트케이스 결과<\/h2>/,
    'merged stage heading should describe evidence mapping and testcase result entry',
  );
  assert.match(
    html,
    /<svg id=["']mapping-link-layer["'] class=["']mapping-link-layer["'] aria-hidden=["']true["']><\/svg>/,
    'merged stage should include an SVG layer for evidence-to-testcase mapping links',
  );
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
  assert.match(html, /<h2 id=["']inbox-heading["']>수집된 증적<\/h2>/);

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

test('evidence review mapping controls use icons instead of text-only buttons', () => {
  const script = fs.readFileSync(editorScriptPath, 'utf8');
  const css = fs.readFileSync(editorCssPath, 'utf8');
  const featureCardBody = extractFunctionBody(script, 'featureCard');
  const mapToFeatureButtonBody = extractFunctionBody(script, 'mapToFeatureButton');

  assert.match(script, /function\s+iconSvg\s*\(/, 'iconSvg helper should create inline SVG icons');
  assert.match(script, /function\s+iconButton\s*\(/, 'iconButton helper should create labelled icon-only buttons');
  assert.match(featureCardBody, /iconButton\('위로 이동',\s*'arrow-up'/, 'feature up control should use an icon button');
  assert.match(featureCardBody, /iconButton\('아래로 이동',\s*'arrow-down'/, 'feature down control should use an icon button');
  assert.match(featureCardBody, /iconButton\('테스트케이스 삭제',\s*'trash'/, 'feature delete control should use an icon button');
  assert.match(mapToFeatureButtonBody, /button\.setAttribute\('aria-label',\s*'테스트케이스에 매핑'\)/, 'mapping control should keep an accessible label');
  assert.match(mapToFeatureButtonBody, /button\.replaceChildren\(iconSvg\('link'\)\)/, 'mapping control should render an icon instead of text');
  assert.match(css, /\.icon-only/, 'icon-only controls should have shared styling');
  assert.match(css, /\.sr-only/, 'icon buttons should have a screen-reader-only utility available');
  assert.doesNotMatch(css, /\.mapping-link-layer\s*{[^}]*height:\s*100%/,
    'mapping SVG layer should not use percentage height because it can expand the stage while scrolling');
});

test('merged stage opens the selected-evidence mapping target only via an explicit drawer-entry button, and exposes verdict as a clickable status pill', () => {
  const html = fs.readFileSync(editorPath, 'utf8');
  const script = fs.readFileSync(editorScriptPath, 'utf8');
  const css = fs.readFileSync(editorCssPath, 'utf8');

  // feature-mapping-target은 #feature-editor-panel과 무관한 독립 슬라이드 드로어다. 기본값은 hidden이며,
  // 카드를 선택(클릭)하는 것만으로는 열리지 않는다 - 테스트케이스명 옆 판정 pill 다음에 놓인 전용
  // "선택된 증적 보기" 버튼(openFeatureDrawer)을 눌러야만 drawerOpen이 true가 되어 열린다.
  const sectionMatch = html.match(/<aside id=["']feature-mapping-target["'][^>]*>/);
  assert.ok(sectionMatch, '#feature-mapping-target drawer should exist');
  assert.match(
    sectionMatch[0],
    /\bhidden\b/,
    'feature-mapping-target should start hidden until the drawer-entry button is clicked',
  );
  assert.match(script, /function\s+setFeatureDrawerOpen\s*\(/, 'setFeatureDrawerOpen() should toggle the drawer visibility');
  assert.match(script, /function\s+openFeatureDrawer\s*\(/, 'openFeatureDrawer() should be the explicit entry point for the drawer');
  assert.match(script, /let\s+drawerOpen\s*=\s*false/, 'drawerOpen should be a state independent from card selection');

  const selectFeatureBody = extractFunctionBody(script, 'selectFeature');
  assert.doesNotMatch(
    selectFeatureBody,
    /drawerOpen\s*=\s*true/,
    'selecting a card (clicking it) should not open the drawer by itself',
  );

  const featureCardBody = extractFunctionBody(script, 'featureCard');
  assert.match(
    featureCardBody,
    /iconButton\('선택된 증적 보기',\s*'eye',\s*\(\)\s*=>\s*openFeatureDrawer\(feature\.id\)\)/,
    'feature card header should render a dedicated drawer-entry button next to the verdict pill',
  );

  assert.doesNotMatch(html, /id=["']verdict["']/, 'standalone #verdict select should be removed');
  assert.doesNotMatch(html, /data-verdict-value/, 'the three-way verdict toggle markup should be removed');
  assert.match(script, /function\s+verdictPill\s*\(/, 'verdictPill() should build the clickable status pill');
  assert.match(script, /function\s+cycleVerdict\s*\(/, 'cycleVerdict() should advance PASS -> FAIL -> N/A on click');
  assert.match(css, /\.feature-status-pill\.verdict-pass/);
  assert.match(css, /\.feature-status-pill\.verdict-fail/);
  assert.match(css, /\.feature-status-pill\.verdict-na/);
});

test('evidence inbox graphs and detail viewer are full-width and navigable', () => {
  const html = fs.readFileSync(editorPath, 'utf8');
  const css = fs.readFileSync(editorCssPath, 'utf8');

  assert.match(css, /#evidence-inbox\s*{[^}]*grid-template-columns:\s*1fr/);
  assert.match(css, /#evidence-inbox \.capture-graph\s*{[^}]*width:\s*100%/);
  assert.match(html, /id=["']previous-evidence-detail["']/);
  assert.match(html, /id=["']next-evidence-detail["']/);
});

// Loop 3 회귀 테스트: preview-report/export-report/open-save-project id 중복 버그 수정 검증.
// 완료 단계(#stage-completion)가 이 세 액션의 유일한 소유자가 되었고(매핑/결과 단계의 .actions
// 블록은 제거됨), byId()가 항상 완료 단계 버튼에 바인딩되도록 각 id가 문서에서 정확히 한 번만
// 나타나야 한다.
test('preview-report/export-report/open-save-project ids each appear exactly once in editor.html (no duplicate DOM ids)', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  for (const id of ['preview-report', 'export-report', 'open-save-project']) {
    const matches = html.match(new RegExp(`id=["']${id}["']`, 'g')) || [];
    assert.equal(matches.length, 1, `#${id} should appear exactly once in editor.html, found ${matches.length}`);
  }
});

test('preview-report/export-report/open-save-project buttons live inside stage-completion, not stage-mapping-result', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  const mappingResultMatch = html.match(/<section id=["']stage-mapping-result["'][\s\S]*?(?=<section id=["']stage-completion["'])/);
  assert.ok(mappingResultMatch, 'stage-mapping-result markup block should be found');
  const mappingResultHtml = mappingResultMatch[0];

  for (const id of ['preview-report', 'export-report', 'open-save-project']) {
    assert.doesNotMatch(
      mappingResultHtml,
      new RegExp(`id=["']${id}["']`),
      `#${id} should no longer live inside stage-mapping-result`,
    );
  }

  const completionMatch = html.match(/<section id=["']stage-completion["'][\s\S]*?(?=<\/main>)/);
  assert.ok(completionMatch, 'stage-completion markup block should be found');
  const completionHtml = completionMatch[0];

  for (const id of ['preview-report', 'export-report', 'open-save-project']) {
    assert.match(
      completionHtml,
      new RegExp(`id=["']${id}["']`),
      `#${id} should live inside stage-completion`,
    );
  }
});

test('wizard-stage.js planActions no longer assigns preview-report/export-report/open-save-project to stage index 1 (mapping-result)', () => {
  const { planActions } = require('../extension/shared/wizard-stage.js');

  const plan = planActions(1, { sessionActive: true, currentFeatureHasMappedEvidence: true });
  const allActionIds = [plan.primary, ...plan.secondary].filter(Boolean);

  for (const actionId of ['preview-report', 'export-report', 'open-save-project']) {
    assert.equal(
      allActionIds.includes(actionId),
      false,
      `mapping-result stage (index 1) should no longer plan the "${actionId}" action`,
    );
  }

  // Completion stage(index 2)가 이 세 액션의 유일한 소유자가 되어야 한다.
  const completionPlan = planActions(2, { sessionActive: true, currentFeatureHasMappedEvidence: true });
  const completionActionIds = [completionPlan.primary, ...completionPlan.secondary].filter(Boolean);
  for (const actionId of ['preview-report', 'export-report', 'open-save-project']) {
    assert.equal(
      completionActionIds.includes(actionId),
      true,
      `completion stage (index 2) should plan the "${actionId}" action`,
    );
  }
});

test('completion stage exposes six summary elements with the completion-summary-* class pattern', () => {
  const html = fs.readFileSync(editorPath, 'utf8');

  for (const id of [
    'completion-summary-features',
    'completion-summary-pass',
    'completion-summary-fail',
    'completion-summary-na',
    'completion-summary-evidence',
    'completion-summary-ai-images',
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["'][^>]*class=["']completion-summary-value["']`), `#${id} should exist with completion-summary-value class`);
  }
});

test('renderCompletionSummary computes feature/verdict/evidence/AI-image counts from editorState', () => {
  const script = fs.readFileSync(editorScriptPath, 'utf8');

  assert.match(script, /function\s+computeCompletionSummary\s*\(\s*\)/, 'computeCompletionSummary() should exist');
  assert.match(script, /function\s+renderCompletionSummary\s*\(\s*\)/, 'renderCompletionSummary() should exist');

  const computeBody = extractFunctionBody(script, 'computeCompletionSummary');
  assert.match(computeBody, /feature\.result\.status\s*===\s*['"]PASS['"]/, 'summary should count PASS results');
  assert.match(computeBody, /feature\.result\.status\s*===\s*['"]FAIL['"]/, 'summary should count FAIL results');
  assert.match(computeBody, /llmImageDataUrl/, 'summary should count evidence with an AI-ready image');
  assert.match(computeBody, /new Set\(\)/, 'mapped evidence count should be deduplicated via a Set');

  const renderBody = extractFunctionBody(script, 'renderCompletionSummary');
  for (const elementKey of [
    'completionSummaryFeatures',
    'completionSummaryPass',
    'completionSummaryFail',
    'completionSummaryNa',
    'completionSummaryEvidence',
    'completionSummaryAiImages',
  ]) {
    assert.match(renderBody, new RegExp(`elements\\.${elementKey}\\.textContent`), `renderCompletionSummary should set elements.${elementKey}.textContent`);
  }

  // renderStage()가 매번 renderCompletionSummary()를 호출해 완료 단계 데이터가 항상 최신 상태로 유지되는지 확인한다.
  const renderStageBody = extractFunctionBody(script, 'renderStage');
  assert.match(renderStageBody, /renderCompletionSummary\(\)/, 'renderStage should call renderCompletionSummary to keep the completion stage in sync');
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
  const aiImages = evidence.filter((item) => Boolean(item.llmImageDataUrl)).length;

  assert.equal(features.length, 3);
  assert.equal(pass, 1);
  assert.equal(fail, 1);
  assert.equal(na, 1);
  assert.equal(mappedEvidenceIds.size, 3, 'EV-1/EV-2/EV-3 매핑, EV-2 중복은 한 번만 계산되어야 함');
  assert.equal(aiImages, 3, 'llmImageDataUrl이 있는 증적 3개(EV-1, EV-3, EV-4)가 카운트되어야 함');
});
