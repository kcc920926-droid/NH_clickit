(function initializeEditor() {
  const byId = (id) => document.getElementById(id);
  const elements = {
    addFeature: byId('add-feature'),
    captureMode: byId('capture-mode'),
    captureModeHint: byId('capture-mode-hint'),
    captureFirstHeading: byId('capture-first-heading'),
    recordingSummary: byId('recording-summary'),
    changePurpose: byId('change-purpose'),
    changeSummary: byId('change-summary'),
    completionSummaryFeatures: byId('completion-summary-features'),
    completionSummaryPass: byId('completion-summary-pass'),
    completionSummaryFail: byId('completion-summary-fail'),
    completionSummaryNa: byId('completion-summary-na'),
    completionSummaryEvidence: byId('completion-summary-evidence'),
    completionSummaryTotal: byId('completion-summary-total'),
    closeStorageDetail: byId('close-storage-detail'),
    closeLlmSettings: byId('close-llm-settings'),
    configurationOverview: byId('configuration-overview'),
    deleteReport: byId('delete-report'),
    editorMessage: byId('editor-message'),
    closeEvidenceDetail: byId('close-evidence-detail'),
    evidenceDropZone: byId('evidence-drop-zone'),
    evidenceDetailDialog: byId('evidence-detail-dialog'),
    evidenceDetailImage: byId('evidence-detail-image'),
    evidenceDetailMeta: byId('evidence-detail-meta'),
    evidenceDetailTitle: byId('evidence-detail-title'),
    previousEvidenceDetail: byId('previous-evidence-detail'),
    nextEvidenceDetail: byId('next-evidence-detail'),
    deleteEvidenceDetail: byId('delete-evidence-detail'),
    evidenceInbox: byId('evidence-inbox'),
    evidenceSearch: byId('evidence-search'),
    exportEvidenceOnly: byId('export-evidence-only'),
    exportReport: byId('export-report'),
    featureList: byId('feature-list'),
    featureMappingGuidance: byId('feature-mapping-guidance'),
    featureMappingTarget: byId('feature-mapping-target'),
    featureDetailBackdrop: byId('feature-detail-backdrop'),
    closeFeatureDetail: byId('close-feature-detail'),
    featurePanel: document.querySelector('.feature-panel'),
    guidanceBanner: byId('guidance-banner'),
    imageImport: byId('image-import'),
    llmAdapter: byId('llm-adapter'),
    llmApiKey: byId('llm-api-key'),
    llmDiagnostics: byId('llm-diagnostics'),
    llmEndpoint: byId('llm-endpoint'),
    llmEndpointHint: byId('llm-endpoint-hint'),
    llmModel: byId('llm-model'),
    llmSettingsDialog: byId('llm-settings-dialog'),
    llmTemplate: byId('llm-template'),
    mappedEvidence: byId('mapped-evidence'),
    mappingLinkLayer: byId('mapping-link-layer'),
    newReport: byId('new-report'),
    noFeature: byId('no-feature'),
    featureDetailHeading: byId('feature-detail-heading'),
    openLlmSettings: byId('open-llm-settings'),
    openReportInfo: byId('open-report-info'),
    reportInfo: byId('report-info'),
    openMoreMenu: byId('open-more-menu'),
    moreMenu: byId('more-menu'),
    headerEvidenceCount: byId('header-evidence-count'),
    openStorageDetail: byId('open-storage-detail'),
    openViewer: byId('open-viewer'),
    previewReport: byId('preview-report'),
    projectName: byId('project-name'),
    quickMappingDialog: byId('quick-mapping-dialog'),
    reportSwitchDialog: byId('report-switch-dialog'),
    openReportSwitch: byId('open-report-switch'),
    closeReportSwitch: byId('close-report-switch'),
    quickMappingFeature: byId('quick-mapping-feature'),
    quickMappingVerification: byId('quick-mapping-verification'),
    quickMappingExpectedResult: byId('quick-mapping-expected-result'),
    quickMappingActualResult: byId('quick-mapping-actual-result'),
    cancelQuickMapping: byId('cancel-quick-mapping'),
    recommendationList: byId('recommendation-list'),
    recentEvidence: byId('recent-evidence'),
    reportAuthor: byId('report-author'),
    reportSelect: byId('report-select'),
    reportTitle: byId('report-title'),
    reportDraftSuggestionDialog: byId('report-draft-suggestion-dialog'),
    draftSuggestionTitle: byId('draft-suggestion-title'),
    draftSuggestionOverview: byId('draft-suggestion-overview'),
    dismissDraftSuggestion: byId('dismiss-draft-suggestion'),
    approveDraftSuggestion: byId('approve-draft-suggestion'),
    requestRecommendations: byId('request-recommendations'),
    requestTestCaseDescriptionButton: byId('request-test-case-description'),
    saveStatus: byId('save-status'),
    sessionStatus: byId('session-status'),
    showDownloadFolder: byId('show-download-folder'),
    showLastDownload: byId('show-last-download'),
    workspace: byId('workspace'),
    showInbox: byId('show-inbox'),
    showFeatures: byId('show-features'),
    paneCountInbox: byId('pane-count-inbox'),
    paneCountFeatures: byId('pane-count-features'),
    featureCount: byId('feature-count'),
    openExport: byId('open-export'),
    exportDialog: byId('export-dialog'),
    closeExport: byId('close-export'),
    readinessSummary: byId('readiness-summary'),
    reportName: byId('report-name'),
    toggleView: byId('toggle-view'),
    recordTarget: byId('record-target'),
    captureTarget: byId('capture-target'),
    linkTarget: byId('link-target'),
    stopRecordingBar: byId('stop-recording-bar'),
    statusBar: document.querySelector('.status-bar'),
    captureSettingsDialog: byId('capture-settings-dialog'),
    openCaptureSettings: byId('open-capture-settings'),
    closeCaptureSettings: byId('close-capture-settings'),
    pointerEnabled: byId('pointer-enabled'),
    pointerOptions: byId('pointer-options'),
    pointerShapes: byId('pointer-shapes'),
    pointerColors: byId('pointer-colors'),
    pointerSizes: byId('pointer-sizes'),
    pointerPreview: byId('pointer-preview'),
    reportType: byId('report-type'),
    documentTypeOptions: byId('document-type-options'),
    paneLabelFeatures: byId('pane-label-features'),
    featureListHeading: byId('feature-list-heading'),
    storageDetailDialog: byId('storage-detail-dialog'),
    storageEvidenceCount: byId('storage-evidence-count'),
    storageLastExportName: byId('storage-last-export-name'),
    storageLastExportPath: byId('storage-last-export-path'),
    storageLastSavedAt: byId('storage-last-saved-at'),
    storageLocation: byId('storage-location'),
    storageReportId: byId('storage-report-id'),
    testLlmConnection: byId('test-llm-connection'),
    testLlmRecommendation: byId('test-llm-recommendation'),
    toggleSession: byId('toggle-session'),
    validationWarnings: byId('validation-warnings'),
    cleanDuplicates: byId('clean-duplicates'),
    pasteZone: byId('paste-zone'),
    pasteZoneTitle: byId('paste-zone-title'),
    pasteZoneHint: byId('paste-zone-hint'),
    templateOptions: byId('template-options'),
  };

  // Node_Context_Preview: capture-node 하나를 hover할 때 보여주는 공유 툴팁 엘리먼트.
  // 모든 capture-node가 이 엘리먼트 하나를 재사용한다(매번 새로 만들지 않음).
  const nodeContextPreview = document.createElement('div');
  nodeContextPreview.className = 'capture-node-preview';
  nodeContextPreview.hidden = true;
  document.body.appendChild(nodeContextPreview);

  const iconPaths = {
    'arrow-up': 'M12 19V5M5 12l7-7 7 7',
    'arrow-down': 'M12 5v14M19 12l-7 7-7-7',
    chevronDown: 'M6 9l6 6 6-6',
    chevronUp: 'M18 15l-6-6-6 6',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    link: 'M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 13M14 11a5 5 0 0 1 0 7l-1.5 1.5a5 5 0 0 1-7-7L7 11',
    // Feature_Group_Actions: capture-graph 헤더의 "연결 해제" 아이콘. 기존 link 아이콘을 그대로 쓰되
    // 대각선을 하나 더 그어(link-off) "연결이 끊긴" 상태를 나타낸다.
    'link-off': 'M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 13M14 11a5 5 0 0 1 0 7l-1.5 1.5a5 5 0 0 1-7-7L7 11M4 4l16 16',
    plus: 'M12 5v14M5 12h14',
    target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z',
    trash: 'M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15',
    // LLM 추천 세트 제목 버튼용 4각 스파클 아이콘. 다른 아이콘들과 동일하게 단일 path, 최소한의
    // 선/곡선 세그먼트로 구성해 link/trash/eye 등 기존 아이콘과 뚜렷이 구분되는 모양만 갖춘다.
    sparkle: 'M12 3l1.5 5L19 9.5 13.5 11 12 16l-1.5-5L5 9.5 10.5 8z M5 17l0.8 2.2L8 20l-2.2 0.8L5 23l-0.8-2.2L2 20l2.2-0.8z',
  };

  function iconSvg(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', iconPaths[name] || iconPaths.link);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
    return svg;
  }

  function iconButton(label, iconName, handler, disabled = false, extraClass = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `icon-only ${extraClass}`.trim();
    button.title = label;
    button.setAttribute('aria-label', label);
    button.disabled = disabled;
    button.replaceChildren(iconSvg(iconName));
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      handler(event);
    });
    return button;
  }

  let editorState = CaptureITDomain.createEditorState([], []);
  let report = null;
  let reportSummaries = [];
  let session = null;
  let currentFeatureId = null;
  // 선택된 증적 슬라이드 드로어의 열림 여부. 카드를 선택(하이라이트/결과필드 확장)하는 것과는
  // 독립적인 상태다 - 드로어는 카드 헤더의 전용 "선택된 증적 보기" 버튼을 눌러야만 열린다.
  let drawerOpen = false;
  let llmAllowedOrigins = [];
  let llmDiagnostics = null;
  let lastExport = null;
  let saveQueue = Promise.resolve();
  // Quick_Mapping_Dialog가 열려 있는 동안 대상으로 지정된 evidenceIds를 기억한다(submit 시 CaptureITDomain.applyQuickMapping에 전달).
  let quickMappingEvidenceIds = [];
  let evidenceDetailIds = [];
  let evidenceDetailIndex = 0;
  let mappingLinksFrame = null;
  // 좁은 폭(사이드 패널)에서 작업대에 보여 줄 목록: 'inbox' | 'features'.
  let narrowPane = 'inbox';
  // 연결 버튼을 눌렀지만 테스트케이스를 고르지 않은 경우, 다음에 누르는 테스트케이스에 연결할 증적.
  let pendingMapEvidenceIds = null;
  // 이 페이지가 탭으로 열렸는지(넓게 보기) 사이드 패널로 열렸는지. 탭이면 탭 정보, 패널이면 null.
  let hostTab = null;
  let sessionButtonState = 'INACTIVE';
  // Auto_AI_Pipeline: 매핑 직후 "증적 설명 생성" → "테스트케이스 설명 자동 생성"이 자동으로
  // 순차 실행되는 동안의 진행 상태. { featureId, steps: [{ key, label, status }] } 형태이며
  // status는 'pending'|'active'|'done'|'error' 중 하나. 저장소에 저장하지 않는 순수 UI 상태로,
  // featureCard()가 이 값을 읽어 해당 feature 카드에만 진행 표시(체크리스트/그라데이션)를 그린다.
  // 테스트케이스별 AI 진행 상태(featureId → { steps }). 하나만 두면 두 매핑이 겹칠 때 진행 표시가 섞였다.
  const aiPipelines = new Map();
  const aiPipelineClearTimers = new Map();
  // 펼쳐 둔 증적 세트(sessionId). 다시 그려도 펼친 상태를 유지한다.
  const expandedSessions = new Set();
  const collapsedSessions = new Set();
  // 녹화 대상 탭에서 콘텐츠 스크립트가 응답했는지(IE 모드 탭 등은 응답하지 않는다).
  let autoCaptureAvailable = true;
  // AI 연결이 확인된 뒤에만(연결 테스트 성공 또는 실제 호출 성공) 자동 AI 기능을 돌린다.
  // 확인 전에 자동으로 부르면 사내망 밖이나 설정 전에는 매핑할 때마다 빨간 오류가 떴다.
  let llmReady = false;
  // 이미지를 보고 생각한 뒤 답하는 모델은 1분을 넘기기도 한다.
  const LLM_TIMEOUT_MS = 90000;
  // 붙여넣기·파일 불러오기 전용 수집 묶음. 녹화 세션과 순번이 섞이지 않도록 따로 관리하고,
  // 마지막 입력 후 IMPORT_SESSION_GAP_MS 안에 이어 넣으면 같은 묶음으로 잇는다.
  let importSession = null;
  let importSessionLastAt = 0;
  const IMPORT_SESSION_GAP_MS = 10 * 60 * 1000;
  // 문서 양식(지면 모양). 보고서마다 report.documentTemplate에 저장하고, 새 보고서는 마지막에 고른 양식을 따른다.
  // report.js의 buildManifest가 고르는 필드가 아니므로 manifest.json에는 들어가지 않는다.
  let preferredTemplate = null;

  const roleLabel = { before: '수행 전', action: '수행 시점', after: '수행 후' };
  // 캡처 모드는 항상 'event'다. 녹화 전/중 안내문.
  const captureHintText = {
    idle: '테스트를 평소처럼 진행하면 화면과 맥락이 자동으로 저장됩니다.',
    recording: '테스트 화면을 평소처럼 조작하세요. 끝나면 녹화 종료를 누르세요.',
  };

  const PREVIEW_STORAGE_KEY = 'captureit-preview-storage';

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  }

  function readPreviewStorage() {
    try {
      return JSON.parse(localStorage.getItem(PREVIEW_STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  const extensionStorage = {
    async get(keys) {
      if (hasChromeStorage()) return chrome.storage.local.get(keys);
      const stored = readPreviewStorage();
      if (Array.isArray(keys)) {
        return Object.fromEntries(keys.map((key) => [key, stored[key]]));
      }
      if (typeof keys === 'string') return { [keys]: stored[keys] };
      if (keys && typeof keys === 'object') return { ...keys, ...stored };
      return stored;
    },
    async set(values) {
      if (hasChromeStorage()) return chrome.storage.local.set(values);
      localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify({ ...readPreviewStorage(), ...values }));
      return undefined;
    },
  };

  // 문서 유형(목적)에 따른 이름. 보고서마다 report.documentType에 저장하고, 새 보고서는 마지막에 고른 유형을 따른다.
  let preferredDocumentType = null;
  function docType() {
    return CaptureITDocumentTypes.documentType(report && report.documentType || preferredDocumentType);
  }
  // itemWord() → '테스트케이스', itemWord('을/를') → '확인 포인트를', itemWord('이/가') → '장면이'
  function itemWord(pair) {
    const item = docType().item;
    return pair ? CaptureITDocumentTypes.josa(item, pair) : item;
  }
  function untitledItem() {
    return `제목 없는 ${docType().item}`;
  }

  function currentFeature() {
    return editorState.features.find((feature) => feature.id === currentFeatureId) || null;
  }

  function createInitialReport(title = `새 ${docType().name}`) {
    const created = CaptureITDomain.createReport(title);
    created.documentType = docType().id;
    created.features.push(CaptureITDomain.createFeature(`새 ${itemWord()}`));
    return created;
  }

  // action: { label, run } — 끝난 일 바로 다음에 할 만한 행동(예: 저장한 ZIP을 폴더에서 보기)을 같은 줄에 붙인다.
  function setMessage(message, error = false, action = null) {
    elements.editorMessage.replaceChildren(message);
    elements.editorMessage.classList.toggle('message-error', error);
    if (action) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'text-button message-action';
      button.textContent = action.label;
      button.addEventListener('click', () => Promise.resolve(action.run()).catch((runError) => setMessage(runError.message, true)));
      elements.editorMessage.append(' ', button);
    }
  }

  // 시간이 걸리는 버튼은 누르자마자 "…중"으로 바꾸고 끝날 때까지 다시 못 누르게 한다(0.4초 안에 반응).
  async function withBusy(button, busyLabel, task) {
    if (!button || button.dataset.busy) return undefined;
    const original = [...button.childNodes];
    button.dataset.busy = 'true';
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = busyLabel;
    try {
      return await task();
    } finally {
      delete button.dataset.busy;
      button.removeAttribute('aria-busy');
      button.replaceChildren(...original);
      button.disabled = false;
      renderExportEvidenceButtons();
    }
  }

  function renderReportSelector() {
    const options = reportSummaries.map((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.title || '제목 없는 보고서';
      option.selected = Boolean(report && item.id === report.id);
      return option;
    });
    elements.reportSelect.replaceChildren(...options);
    elements.reportName.textContent = report && report.title || '새 QA 보고서';
  }

  function renderReportFields() {
    if (!report) return;
    elements.reportTitle.value = report.title || '';
    elements.projectName.value = report.projectName || '';
    elements.reportAuthor.value = report.author || '';
    elements.changePurpose.value = report.changePurpose || '';
    elements.changeSummary.value = report.changeSummary || '';
    elements.configurationOverview.value = report.configurationOverview || '';
  }

  // 녹화 중 수집 현황: 이번 보고서에 쌓인 증적을 화면/입력/결과 메시지로 세어 한 줄로 보여준다.
  function computeRecordingSummary() {
    const evidenceList = editorState && Array.isArray(editorState.evidence) ? editorState.evidence : [];
    const screens = evidenceList.filter((item) => item.triggerType !== 'form-input').length;
    const inputs = evidenceList.filter((item) => item.triggerType === 'form-input').length;
    const results = evidenceList.filter((item) => (item.domAfter && (item.domAfter.resultMessages || []).length > 0)).length;
    return { screens, inputs, results };
  }

  function renderRecordingSummary(active) {
    elements.recordingSummary.hidden = !active;
    if (!active) return;
    const summary = computeRecordingSummary();
    const parts = [`화면 ${summary.screens}`];
    if (summary.inputs) parts.push(`입력 ${summary.inputs}`);
    if (summary.results) parts.push(`결과 메시지 ${summary.results}`);
    elements.recordingSummary.textContent = `지금까지 ${parts.join(' · ')}`;
  }

  // 녹화 전/녹화 시작 중/녹화 중을 수집 줄 하나에서 글자와 버튼만 바꿔 보여준다.
  function renderSession() {
    const active = Boolean(session && session.active);
    if (sessionButtonState !== 'STARTING') sessionButtonState = active ? 'ACTIVE' : 'INACTIVE';
    const starting = sessionButtonState === 'STARTING';
    elements.sessionStatus.textContent = active ? '녹화 중' : starting ? '녹화 시작 중' : '녹화 안 함';
    elements.sessionStatus.className = `rec-dot ${active ? 'is-on' : starting ? 'is-starting' : ''}`.trim();
    elements.captureFirstHeading.textContent = active ? '녹화 중' : starting ? '녹화를 시작하고 있습니다…' : '테스트 화면을 녹화하세요';
    elements.captureModeHint.textContent = active ? captureHintText.recording : captureHintText.idle;
    elements.toggleSession.replaceChildren();
    if (active) elements.toggleSession.append(Object.assign(document.createElement('span'), { className: 'stop-glyph' }));
    elements.toggleSession.append(starting ? '시작 중…' : active ? '녹화 종료' : '녹화 시작');
    elements.toggleSession.disabled = starting;
    elements.toggleSession.classList.toggle('is-recording', active);
    // 아래 상태 줄의 종료 버튼: 수집 줄이 스크롤로 가려져도 늘 보인다.
    elements.stopRecordingBar.hidden = !active;
    elements.statusBar.classList.toggle('is-recording', active);
    renderPrimaryAction();
    elements.captureMode.disabled = starting || active;
    if (active) elements.captureMode.value = session.mode;
    renderRecordingSummary(active);
    renderPasteZone();
    renderRecordTarget().catch(() => {});
  }

  // 사이드 패널에서는 지금 보이는 탭이 녹화 대상이다. 녹화 전에 어느 화면을 찍을지 미리 보여준다.
  async function renderRecordTarget() {
    const active = Boolean(session && session.active);
    if (active || hostTab || typeof chrome === 'undefined' || !chrome.tabs) {
      elements.recordTarget.hidden = true;
      return;
    }
    const tab = await activeTabForRecording().catch(() => null);
    const url = tab && tab.url || '';
    if (!tab || !/^https?:/i.test(url)) {
      elements.recordTarget.textContent = '녹화할 웹 화면 탭을 열어 두세요.';
    } else {
      elements.recordTarget.replaceChildren('녹화할 화면: ', Object.assign(document.createElement('strong'), { textContent: tab.title || url }));
    }
    elements.recordTarget.hidden = false;
  }

  function formatTimestamp(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('ko-KR');
  }

  function renderStorageStatus() {
    const evidenceCount = editorState && Array.isArray(editorState.evidence) ? editorState.evidence.length : 0;
    elements.storageLocation.textContent = '브라우저 내부 저장소(Edge 프로필 확장 저장소 / chrome.storage.local + IndexedDB)';
    elements.storageReportId.textContent = report && report.id || '-';
    elements.storageEvidenceCount.textContent = String(evidenceCount);
    elements.storageLastSavedAt.textContent = report && report.updatedAt ? formatTimestamp(report.updatedAt) : '-';
    elements.storageLastExportName.textContent = lastExport && lastExport.filename ? lastExport.filename : '-';
    elements.storageLastExportPath.textContent = lastExport && lastExport.fullPath ? lastExport.fullPath : 'ZIP 생성 전';
    elements.showLastDownload.disabled = !(lastExport && Number.isInteger(lastExport.downloadId));
  }

  function setMoreMenuOpen(open) {
    elements.moreMenu.hidden = !open;
    elements.openMoreMenu.setAttribute('aria-expanded', String(open));
  }

  function saveFeatureTitle(feature, value) {
    feature.title = value.trim() || untitledItem();
    renderFeatures();
    queueSave();
  }

  function saveFeatureDescription(feature, value) {
    feature.description = value.trim();
    queueSave();
  }

  function saveFeatureExpectedResult(feature, value) {
    feature.result.expectedResult = value;
    queueSave();
  }

  function saveFeatureActualResult(feature, value) {
    feature.result.actualResult = value;
    queueSave();
  }

  // 판정은 버튼 세 개(✓ PASS / ✕ FAIL / ○ 미판정)로 바로 고른다. 한 번 누르면 바로 저장된다.
  // AI는 판정을 기록하지 않는다. AI 의견이 있으면 버튼 제목에 참고로만 붙인다.
  const VERDICTS = [
    { value: 'PASS', glyph: '✓', label: 'PASS', className: 'verdict-pass' },
    { value: 'FAIL', glyph: '✕', label: 'FAIL', className: 'verdict-fail' },
    { value: null, glyph: '○', label: '미판정', className: 'verdict-na' },
  ];
  const TEST_CASE_STATUS_TO_VERDICT = { PASS: 'PASS', FAIL: 'FAIL', INCOMPLETE: null, NOT_JUDGED: null };

  async function setVerdict(feature, value) {
    if ((feature.result.status ?? null) === value) return;
    feature.result.status = value;
    await saveReport();
    renderFeatures();
    renderWarnings();
    renderWorkspace();
  }

  // 상태 이름은 문서 유형을 따른다(QA: PASS/FAIL/미판정, PoC: 확인됨/안 됨/미정). 장면처럼 상태가 없는 유형은 그리지 않는다.
  function verdictText(value) {
    return CaptureITDocumentTypes.verdictLabel(docType(), value);
  }

  function statusMark(feature) {
    if (!docType().verdict) return null;
    const status = feature.result.status ?? null;
    const verdict = VERDICTS.find((item) => item.value === status) || VERDICTS[2];
    const mark = document.createElement('span');
    mark.className = `st ${status === 'PASS' ? 'st-pass' : status === 'FAIL' ? 'st-fail' : 'st-none'}`;
    mark.textContent = `${verdict.glyph} ${verdictText(verdict.value)}`;
    return mark;
  }

  function verdictControl(feature) {
    if (!docType().verdict) return null;
    const status = feature.result.status ?? null;
    const opinion = feature.aiOpinion && feature.aiOpinion.status;
    const group = document.createElement('div');
    group.className = 'verdict';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', docType().verdict.label);
    for (const verdict of VERDICTS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `verdict-option ${verdict.className}`;
      button.textContent = `${verdict.glyph} ${verdictText(verdict.value)}`;
      button.setAttribute('aria-pressed', String(status === verdict.value));
      if (opinion && opinion === verdict.value) button.title = `AI 의견: ${verdictText(opinion)}${feature.aiOpinion.basis ? ` (${feature.aiOpinion.basis})` : ''} · 참고용`;
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        setVerdict(feature, verdict.value).catch((error) => setMessage(`판정 변경 실패: ${error.message}`, true));
      });
      group.append(button);
    }
    return group;
  }

  // 카드를 선택하면 결과 입력 필드(기대/실제 결과)가 확장되고 매핑 대상 테스트케이스로 지정된다.
  // 선택된 증적 슬라이드 드로어(#feature-mapping-target)는 여기서 자동으로 열리지 않는다 -
  // 드로어는 featureDrawerToggleButton()의 명시적 클릭으로만 연다(요청: "오버레이로 바로 진입하지
  // 않고, 오버레이 진입 버튼을 단다"). 같은 카드를 다시 클릭하면 선택을 해제한다(토글).
  function selectFeature(featureId) {
    if (pendingMapEvidenceIds) {
      const feature = editorState.features.find((item) => item.id === featureId);
      const evidenceIds = pendingMapEvidenceIds;
      setPendingMapping(null);
      currentFeatureId = featureId;
      if (feature) mapEvidenceIdsWithConfirm(evidenceIds, feature).catch((error) => setMessage(error.message, true));
      return;
    }
    currentFeatureId = currentFeatureId === featureId ? null : featureId;
    renderFeatures();
    renderFeature();
    renderEvidence();
  }

  // 테스트케이스명 옆 "선택된 증적 보기" 버튼의 클릭 핸들러: 해당 카드를 매핑 대상으로 지정하고
  // 슬라이드 드로어를 명시적으로 연다.
  function openFeatureDrawer(featureId) {
    currentFeatureId = featureId;
    drawerOpen = true;
    renderFeatures();
    renderFeature();
    renderEvidence();
  }

  // 드로어의 닫기 버튼/backdrop 클릭 핸들러: 드로어만 닫고 카드 선택(결과 필드 확장) 상태는 건드리지 않는다.
  function closeFeatureDrawer() {
    drawerOpen = false;
    renderFeature();
  }

  function featureCard(feature, index) {
    const selected = feature.id === currentFeatureId;
    const pipeline = aiPipelines.get(feature.id) || null;
    const generating = Boolean(pipeline && pipeline.steps.some((step) => step.status === 'active'));
    const card = document.createElement('article');
    card.className = `feature-item ${selected ? 'selected' : ''} ${generating ? 'ai-generating' : ''}`;
    card.dataset.featureId = feature.id;
    // 제목 줄을 누르면 선택/해제, 카드 안 다른 곳을 누르면 선택만 한다(입력하려다 카드가 접히지 않게).
    card.addEventListener('click', (event) => {
      if (event.target.closest('input, textarea, button')) return;
      if (event.target.closest('.feature-title-row')) selectFeature(feature.id);
      else if (currentFeatureId !== feature.id) selectFeature(feature.id);
    });
    const header = document.createElement('div');
    header.className = 'feature-title-row';
    const indexLabel = document.createElement('span');
    indexLabel.className = 'feature-index';
    indexLabel.textContent = `${index + 1}.`;
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'feature-title-input';
    titleInput.dataset.featureField = 'title';
    titleInput.value = feature.title || '';
    titleInput.placeholder = `${itemWord()} 이름`;
    titleInput.addEventListener('click', (event) => event.stopPropagation());
    titleInput.addEventListener('change', () => saveFeatureTitle(feature, titleInput.value));
    titleInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') titleInput.blur();
    });
    const evidenceCount = document.createElement('span');
    evidenceCount.className = 'feature-evidence-count';
    evidenceCount.textContent = feature.result.evidenceIds.length ? `증적 ${feature.result.evidenceIds.length}` : '증적 없음';
    const drawerToggle = iconButton('연결된 증적 보기', 'eye', () => openFeatureDrawer(feature.id));
    drawerToggle.classList.add('feature-drawer-toggle');
    header.append(indexLabel, titleInput);
    if (report && report.captureTargetFeatureId === feature.id) {
      const targetMark = document.createElement('span');
      targetMark.className = 'feature-target-mark';
      targetMark.textContent = '● 수집 대상';
      header.append(targetMark);
    }
    header.append(...[evidenceCount, statusMark(feature), drawerToggle].filter(Boolean));

    // Auto_AI_Pipeline 진행 체크리스트: 이 feature에 대해 파이프라인이 실행 중이거나 방금
    // 끝난 경우에만 렌더링한다(finishAiPipeline이 일정 시간 후 aiPipelineStatus를 지운다).
    let pipelineChecklist = null;
    if (pipeline) {
      pipelineChecklist = document.createElement('ul');
      pipelineChecklist.className = 'ai-pipeline-checklist';
      for (const step of pipeline.steps) {
        const item = document.createElement('li');
        item.className = `ai-pipeline-step ai-pipeline-step-${step.status}`;
        const icon = document.createElement('span');
        icon.className = 'ai-pipeline-step-icon';
        icon.textContent = step.status === 'done' ? '✓' : step.status === 'error' ? '!' : step.status === 'active' ? '' : '';
        const label = document.createElement('span');
        label.textContent = step.label;
        item.append(icon, label);
        pipelineChecklist.append(item);
      }
    }

    const controls = document.createElement('div');
    controls.className = 'feature-controls';
    const isTarget = Boolean(report && report.captureTargetFeatureId === feature.id);
    controls.append(
      iconButton(isTarget ? '수집 대상 해제' : '수집 대상으로 지정: 새로 수집하거나 붙여넣은 증적을 여기에 바로 연결', 'target', () => {
        setCaptureTarget(isTarget ? null : feature.id).catch((error) => setMessage(error.message, true));
      }, false, isTarget ? 'is-active' : ''),
      iconButton('위로 이동', 'arrow-up', () => moveFeature(feature.id, -1), index === 0),
      iconButton('아래로 이동', 'arrow-down', () => moveFeature(feature.id, 1), index === editorState.features.length - 1),
      iconButton(`${itemWord()} 삭제`, 'trash', () => removeFeature(feature.id), false, 'danger'),
    );
    const footer = document.createElement('div');
    footer.className = 'feature-footer';
    footer.append(...[verdictControl(feature), controls].filter(Boolean));
    // 설명 영역은 클릭하면(텍스트 입력 전이라도) 카드를 선택시켜 결과 입력 영역을 확장한다 -
    // 다만 이미 선택된 카드라면 선택을 건드리지 않아 텍스트 입력/커서 이동이 방해받지 않는다
    // (selectFeature()는 토글이라 이미 선택된 상태에서 호출하면 선택이 풀려버리므로 그 경우엔 호출하지 않는다).
    const descriptionField = document.createElement('div');
    descriptionField.className = 'feature-description-field';
    descriptionField.addEventListener('click', (event) => {
      event.stopPropagation();
      if (currentFeatureId !== feature.id) selectFeature(feature.id);
    });
    // 테스트케이스 설명은 필수 입력 항목이므로 라벨에 required 마커(*)를 표시한다.
    // 기대 결과/실제 결과는 필수 항목이 아니므로 이 마커를 붙이지 않는다.
    const descriptionLabel = document.createElement('span');
    descriptionLabel.className = 'feature-field-label required';
    descriptionLabel.textContent = docType().descriptionLabel;
    const description = document.createElement('textarea');
    description.className = 'feature-description-edit';
    description.dataset.featureField = 'description';
    description.rows = 2;
    description.placeholder = docType().descriptionLabel;
    description.value = feature.description || '';
    description.addEventListener('change', () => saveFeatureDescription(feature, description.value));
    descriptionField.append(descriptionLabel, description);

    // 카드가 선택됐을 때만 확장되어 보이는 결과 입력 영역(기대 결과/실제 결과).
    // 별도의 "테스트케이스 결과" 패널 없이 카드 자체에 통합되어 있다. 확장/축소는
    // max-height 트랜지션으로 아래로 부드럽게 펼쳐지는 느낌을 준다(grid-template-rows
    // 트랜지션은 브라우저 지원이 일정치 않아 애니메이션이 재생되지 않는 경우가 있어 사용하지 않는다).
    const resultFields = document.createElement('div');
    resultFields.className = 'feature-result-fields';
    // 칸은 문서 유형이 정한다(QA: 검증 내용·기대·실제 결과, PoC: 확인 결과·질문·후속, 장면: 없음).
    // 유형에 없는 칸의 값은 지우지 않고 화면에서만 숨긴다.
    for (const field of docType().fields) {
      const fieldLabel = document.createElement('label');
      fieldLabel.className = 'wide';
      fieldLabel.append(field.label);
      const input = document.createElement('textarea');
      input.dataset.featureField = field.key;
      input.rows = 2;
      input.placeholder = field.placeholder || '';
      input.value = feature.result[field.key] || '';
      input.addEventListener('click', (event) => event.stopPropagation());
      input.addEventListener('change', () => {
        feature.result[field.key] = input.value;
        queueSave();
      });
      fieldLabel.append(input);
      resultFields.append(fieldLabel);
    }

    card.append(header);
    if (docType().verdict && feature.aiOpinion && feature.aiOpinion.status) {
      const opinionHint = document.createElement('p');
      opinionHint.className = 'ai-opinion-hint';
      opinionHint.textContent = `AI 의견: ${verdictText(feature.aiOpinion.status)}${feature.aiOpinion.basis ? ` — ${feature.aiOpinion.basis}` : ''} (참고용, 판정은 직접 고릅니다)`;
      card.append(opinionHint);
    }
    if (pipelineChecklist) card.append(pipelineChecklist);
    card.append(descriptionField, resultFields, footer);
    return card;
  }

  // 입력 중인 칸의 값을 화면을 다시 그리기 전에 테스트케이스에 반영한다(change 이벤트를 기다리지 않는다).
  function commitFeatureField(feature, field, value) {
    if (field === 'title') feature.title = value;
    else if (field === 'description') feature.description = value;
    else if (field === 'verification') feature.result.verification = value;
    else if (field === 'expectedResult') feature.result.expectedResult = value;
    else if (field === 'actualResult') feature.result.actualResult = value;
    else return;
    queueSave();
  }

  // 카드를 다시 그려도 입력 중인 글자와 커서를 잃지 않게 한다. AI 진행 표시나 다른 동작이 화면을
  // 다시 그리면 입력하던 칸이 통째로 바뀌어 글자가 사라지던 문제를 막는다.
  function renderFeatures() {
    const active = document.activeElement;
    let restore = null;
    if (active && elements.featureList.contains(active) && active.dataset && active.dataset.featureField) {
      const card = active.closest('[data-feature-id]');
      const feature = card && editorState.features.find((item) => item.id === card.dataset.featureId);
      if (feature) {
        commitFeatureField(feature, active.dataset.featureField, active.value);
        restore = {
          featureId: feature.id,
          field: active.dataset.featureField,
          start: active.selectionStart,
          end: active.selectionEnd,
          scrollTop: active.scrollTop,
        };
      }
    }
    elements.featureList.replaceChildren(...editorState.features.map(featureCard));
    elements.noFeature.hidden = editorState.features.length > 0;
    if (restore) {
      const field = elements.featureList.querySelector(`[data-feature-id="${restore.featureId}"] [data-feature-field="${restore.field}"]`);
      if (field) {
        field.focus({ preventScroll: true });
        try { field.setSelectionRange(restore.start, restore.end); } catch { /* 선택 범위를 지원하지 않는 칸 */ }
        field.scrollTop = restore.scrollTop;
      }
    }
    scheduleMappingLinks();
  }

  // 선택된 증적 슬라이드 패널을 열고/닫는다. hidden 해제와 .open 클래스 추가를 같은 tick에
  // 하면 브라우저가 "닫힌 상태"를 한 번도 페인트하지 못해 transform 트랜지션이 재생되지 않고
  // 바로 열린 상태로 스냅되므로, hidden을 먼저 없앤 뒤 강제 리플로우 후 다음 프레임에 .open을
  // 추가해 트랜지션이 시작 상태부터 재생되도록 한다. 닫을 때는 반대로 .open을 먼저 떼어
  // 트랜지션이 끝난 뒤에 hidden을 건다(트랜지션 도중 display:none이 되면 애니메이션이 끊긴다).
  function setFeatureDrawerOpen(open) {
    const drawer = elements.featureMappingTarget;
    const backdrop = elements.featureDetailBackdrop;
    if (open) {
      drawer.hidden = false;
      backdrop.hidden = false;
      // eslint-disable-next-line no-unused-expressions
      drawer.offsetHeight; // 강제 리플로우: hidden 해제가 먼저 페인트되도록 보장한다.
      requestAnimationFrame(() => {
        drawer.classList.add('open');
        backdrop.classList.add('open');
      });
    } else {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      const finalizeClose = () => {
        drawer.hidden = true;
        backdrop.hidden = true;
      };
      let closed = false;
      const onTransitionEnd = (event) => {
        if (event.target !== drawer) return;
        closed = true;
        drawer.removeEventListener('transitionend', onTransitionEnd);
        finalizeClose();
      };
      drawer.addEventListener('transitionend', onTransitionEnd);
      // 트랜지션 이벤트가 어떤 이유로든 발생하지 않는 경우(테스트 환경, reduced-motion 등)를
      // 대비해 트랜지션 시간보다 넉넉한 시점에 한 번 더 안전하게 마무리한다.
      setTimeout(() => {
        if (closed) return;
        drawer.removeEventListener('transitionend', onTransitionEnd);
        finalizeClose();
      }, 300);
    }
  }

  function renderFeature() {
    const feature = currentFeature();
    elements.requestRecommendations.disabled = !feature;
    elements.requestTestCaseDescriptionButton.disabled = !feature || feature.result.evidenceIds.length === 0;
    if (!feature) {
      elements.mappedEvidence.replaceChildren();
      elements.recommendationList.replaceChildren();
      elements.featureMappingGuidance.hidden = true;
      drawerOpen = false;
      setFeatureDrawerOpen(false);
      return;
    }
    elements.featureDetailHeading.textContent = feature.title || untitledItem();
    renderRecommendations();
    // Feature_Spec 매핑 안내 (요구사항 8.2, 8.3): 매핑된 Evidence가 없으면 매핑 유도 문구를,
    // 있으면 다음 입력 행동(기대 결과/실제 결과/판정)을 안내한다.
    if (feature.result.evidenceIds.length === 0) {
      elements.featureMappingGuidance.textContent = `증적 수집함에서 증적이나 세트의 연결 버튼을 누르세요. 이 ${itemWord('이/가')} 골라져 있으면 바로 연결됩니다.`;
    } else {
      elements.featureMappingGuidance.textContent = '기대 결과/실제 결과를 입력하거나 판정을 확인하세요.';
    }
    elements.featureMappingGuidance.hidden = false;
    // 드로어는 카드 선택 자체로는 열리지 않는다 - openFeatureDrawer()로 명시적으로 열었을 때만
    // (drawerOpen === true) 보여준다. renderFeature()는 다른 렌더 경로(매핑/평가 변경 등)에서도
    // 호출되므로 매번 drawerOpen 상태를 그대로 반영한다.
    setFeatureDrawerOpen(drawerOpen);
  }

  function evidenceSearchText(evidence) {
    const context = evidence.context || {};
    return [
      evidence.description,
      evidence.triggerType,
      context.pageTitle,
      context.pageUrl,
      context.target && context.target.visibleText,
      context.surroundingContext && JSON.stringify(context.surroundingContext),
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function evidenceCard(evidence, mapped, mappedIndex = -1) {
    const card = document.createElement('article');
    card.className = 'evidence-card';
    const image = document.createElement('img');
    image.src = evidence.docImageDataUrl || evidence.imageDataUrl;
    image.alt = evidence.context && evidence.context.target
      ? evidence.context.target.visibleText || 'QA 증적'
      : 'QA 증적';
    image.classList.add('evidence-card-image');
    // 이미지를 클릭하면 원본 크기 이미지를 확대해서 보여주는 기존 상세 뷰어(Evidence_Detail_Dialog)를
    // 재사용한다(captureNode/renderRecentEvidence와 동일한 진입점).
    image.addEventListener('click', (event) => {
      event.stopPropagation();
      showEvidenceDetail(evidence.id, evidenceGroupIdsFor(evidence.id));
    });
    swapToCroppedThumbnailWhenReady(evidence, image);
    const body = document.createElement('div');
    body.className = 'evidence-body';
    const titleRow = document.createElement('div');
    titleRow.className = 'evidence-title-row';
    const title = document.createElement('p');
    title.className = 'evidence-title';
    title.textContent = evidenceStepLabel(evidence);
    titleRow.append(title, evidenceRoleBadge(evidence));
    const meta = document.createElement('p');
    meta.className = 'evidence-meta';
    const context = evidence.context || {};
    const targetText = context.target && context.target.visibleText ? ` · ${context.target.visibleText}` : '';
    meta.textContent = `${context.pageTitle || '로컬 이미지'}${targetText} · ${new Date(evidence.capturedAt).toLocaleString()}`;
    const description = document.createElement('input');
    description.type = 'text';
    description.className = 'evidence-description';
    description.placeholder = '증적 설명';
    description.value = evidence.description || '';
    description.addEventListener('change', async () => {
      evidence.description = description.value.trim();
      await CaptureITStorage.putEvidence(evidence);
      queueSave();
    });
    const controls = document.createElement('div');
    controls.className = 'evidence-controls';
    const button = (label, handler, disabled = false) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.textContent = label;
      item.disabled = disabled;
      item.addEventListener('click', handler);
      return item;
    };
    if (mapped) {
      const feature = currentFeature();
      // "연결 해제" 버튼은 역할이 모호해서 제거했다 - 매핑 해제는 recommendation-list의 카드
      // 컨텍스트(제외/재추천)에서 이미 제공되는 기능과 겹치므로, 여기서는 순서 이동/삭제만 남긴다.
      controls.append(
        button('↑', () => moveMappedEvidence(evidence.id, -1), mappedIndex === 0),
        button('↓', () => moveMappedEvidence(evidence.id, 1), mappedIndex === feature.result.evidenceIds.length - 1),
        button('연결 해제', () => unmapSingleEvidence(evidence.id).catch((error) => setMessage(error.message, true))),
      );
    } else {
      controls.append(button('연결', () => mapEvidence(evidence).catch((error) => setMessage(error.message, true))));
    }
    controls.append(button('사진 삭제', () => removeEvidence(evidence.id)));
    body.append(titleRow, meta, description, controls);
    card.append(image, body);
    return card;
  }

  function nodeContextTargetLine(target) {
    const parts = [
      target.tagName,
      target.role,
      target.ariaLabel,
      target.visibleText,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : '대상 정보 없음';
  }

  function nodeContextSurroundingLines(surroundingContext) {
    return [
      surroundingContext.nearestHeading && `제목: ${surroundingContext.nearestHeading}`,
      surroundingContext.formName && `폼: ${surroundingContext.formName}`,
      surroundingContext.rowText && `행: ${surroundingContext.rowText}`,
      surroundingContext.columnText && `열: ${surroundingContext.columnText}`,
    ].filter(Boolean);
  }

  function showNodeContextPreview(node, evidence) {
    const context = evidence.context || {};
    const target = context.target || {};
    const surroundingContext = context.surroundingContext || {};
    nodeContextPreview.replaceChildren();
    const targetLine = document.createElement('p');
    targetLine.className = 'capture-node-preview-target';
    targetLine.textContent = nodeContextTargetLine(target);
    nodeContextPreview.append(targetLine);
    const surroundingLines = nodeContextSurroundingLines(surroundingContext);
    if (surroundingLines.length === 0) {
      const contextLine = document.createElement('p');
      contextLine.className = 'capture-node-preview-context';
      contextLine.textContent = '주변 맥락 정보 없음';
      nodeContextPreview.append(contextLine);
    } else {
      for (const line of surroundingLines) {
        const contextLine = document.createElement('p');
        contextLine.className = 'capture-node-preview-context';
        contextLine.textContent = line;
        nodeContextPreview.append(contextLine);
      }
    }
    const rect = node.getBoundingClientRect();
    nodeContextPreview.style.left = `${Math.round(rect.right + 8)}px`;
    nodeContextPreview.style.top = `${Math.round(rect.top)}px`;
    nodeContextPreview.hidden = false;
  }

  function hideNodeContextPreview() {
    nodeContextPreview.hidden = true;
  }

  // Alternative_Mapping_Control: Drag_And_Drop_Mapping이 실패하면 안내를 보여주는 것과 마찬가지로,
  // 마우스 드래그를 쓸 수 없는 사용자를 위해 evidenceIds를 현재 선택된 Feature_Spec에 매핑하는 버튼을 만든다.
  // 드래그앤드롭과 동일한 mapEvidenceIds(→ CaptureITDomain.mapEvidenceBatch)를 호출해 "동일한 결과"를 보장한다(요구사항 3.5, 3.6).
  // HTML <button> 엘리먼트는 Tab으로 포커스되고 Enter/Space로 클릭되는 표준 접근성 동작을 기본 제공하므로
  // 별도의 keydown 핸들러 없이도 키보드 흐름을 만족한다.
  // ⋯ 버튼과 그 아래 펼쳐지는 작은 메뉴. 메뉴 밖을 누르거나 Esc를 누르면 닫힌다.
  function overflowMenu(label, items) {
    const wrap = document.createElement('div');
    wrap.className = 'mini-menu-wrap';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'icon-only';
    trigger.setAttribute('aria-label', label);
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.textContent = '⋯';
    const menu = document.createElement('div');
    menu.className = 'mini-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    const close = () => {
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', onOutside, true);
    };
    const onOutside = (event) => { if (!wrap.contains(event.target)) close(); };
    for (const item of items) {
      const entry = document.createElement('button');
      entry.type = 'button';
      entry.className = `more-menu-item${item.danger ? ' danger' : ''}`;
      entry.setAttribute('role', 'menuitem');
      entry.textContent = item.label;
      entry.disabled = Boolean(item.disabled);
      entry.addEventListener('click', (event) => {
        event.stopPropagation();
        close();
        item.run();
      });
      menu.append(entry);
    }
    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      const opening = menu.hidden;
      if (!opening) return close();
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      document.addEventListener('pointerdown', onOutside, true);
      return undefined;
    });
    menu.addEventListener('keydown', (event) => { if (event.key === 'Escape') { close(); trigger.focus(); } });
    wrap.append(trigger, menu);
    return wrap;
  }

  function mapToFeatureButton(evidenceIds) {
    const button = document.createElement('button');
    button.type = 'button';
    // 끌어다 놓기가 막힌 환경에서 연결은 이 버튼뿐이라, 아이콘만 두지 않고 "연결" 글자를 붙여 크게 둔다.
    button.className = 'button button-quiet map-to-feature-button';
    button.setAttribute('aria-label', `${itemWord()}에 연결`);
    button.replaceChildren(iconSvg('link'), '연결');
    button.title = currentFeature()
      ? `'${currentFeature().title}'에 연결합니다`
      : editorState.features.length > 1 ? `누른 뒤 연결할 ${itemWord('을/를')} 고릅니다` : `${itemWord()}에 연결합니다`;
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      try {
        // 고른 테스트케이스가 없고 여러 개 있으면, 다음에 누르는 테스트케이스에 연결한다.
        if (!currentFeature() && editorState.features.length > 1) {
          setPendingMapping(evidenceIds);
          return;
        }
        const feature = await featureForMapping();
        if (!feature) return;
        await mapEvidenceIdsWithConfirm(evidenceIds, feature);
      } catch (error) {
        setMessage(error.message, true);
      }
    });
    return button;
  }

  // Quick_Mapping_Dialog: Capture_Graph/Capture_Node를 더블클릭하면 대상 evidenceIds를 기억해 두고
  // 다이얼로그를 열어 기능 선택 + 검증/기대/실제 결과를 한 번에 입력받을 수 있게 한다(요구사항 3.7).
  // 제출 처리는 15.2에서 CaptureITDomain.applyQuickMapping과 연동한다.
  function openQuickMappingDialog(evidenceIds) {
    if (editorState.features.length === 0) {
      setMessage(`먼저 ${itemWord('을/를')} 추가하세요.`, true);
      return;
    }
    quickMappingEvidenceIds = evidenceIds;
    const feature = currentFeature();
    const options = editorState.features.map((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.title || untitledItem();
      option.selected = Boolean(feature && item.id === feature.id);
      return option;
    });
    elements.quickMappingFeature.replaceChildren(...options);
    fillQuickMappingFields();
    if (!elements.quickMappingDialog.open) elements.quickMappingDialog.showModal();
  }

  // 고른 테스트케이스에 이미 적힌 값을 미리 채운다. 빈칸으로 열면 제출 시 기존 결과가 지워졌다.
  function fillQuickMappingFields() {
    const feature = editorState.features.find((item) => item.id === elements.quickMappingFeature.value);
    const result = feature && feature.result || {};
    elements.quickMappingVerification.value = result.verification || '';
    elements.quickMappingExpectedResult.value = result.expectedResult || '';
    elements.quickMappingActualResult.value = result.actualResult || '';
  }

  // 더블클릭이 카드/노드 내부의 버튼(펼치기, 이 기능에 매핑)을 눌렀을 때도 발생하므로,
  // 버튼 클릭이었으면 Quick_Mapping_Dialog를 열지 않는다.
  function isButtonTarget(event) {
    return Boolean(event.target.closest('button'));
  }

  function mappedFeatureTitle(evidence) {
    if (!evidence.featureSpecId) return '';
    const feature = editorState.features.find((item) => item.id === evidence.featureSpecId);
    return feature ? feature.title || untitledItem() : `연결된 ${itemWord()}`;
  }

  // 증적을 기술 이벤트(triggerType 원문)가 아니라 사용자의 테스트 흐름 단계처럼 보여주기 위한
  // 역할 뱃지 매핑(iOS 원칙 5 - 기술 용어보다 사용자의 작업 언어를 쓴다).
  const EVIDENCE_ROLE_BADGE = {
    baseline: { label: '화면', className: 'role-screen' },
    navigation: { label: '화면', className: 'role-screen' },
    'route-change': { label: '화면', className: 'role-screen' },
    click: { label: '액션', className: 'role-action' },
    submit: { label: '액션', className: 'role-action' },
    'form-input': { label: '입력', className: 'role-input' },
    'manual-pin': { label: '수동지정', className: 'role-manual' },
    'shortcut-context': { label: '수동지정', className: 'role-manual' },
    'context-menu': { label: '수동지정', className: 'role-manual' },
    'file-import': { label: '화면', className: 'role-screen' },
  };

  function evidenceRoleBadgeInfo(evidence) {
    if (evidence.domAfter && (evidence.domAfter.resultMessages || []).length > 0) {
      return { label: '결과', className: 'role-result' };
    }
    return EVIDENCE_ROLE_BADGE[evidence.triggerType] || { label: '화면', className: 'role-screen' };
  }

  function evidenceRoleBadge(evidence) {
    const info = evidenceRoleBadgeInfo(evidence);
    const badge = document.createElement('span');
    badge.className = `evidence-role-badge ${info.className}`;
    badge.textContent = info.label;
    return badge;
  }

  // 증적이 실제로 나타내는 테스트 흐름 단계 이름. triggerType 원문(click/form-input 등) 대신
  // 사용자가 읽을 수 있는 한 줄 설명을 우선 사용한다(REQ의 "화면 진입/필수값 입력/신청하기 클릭"
  // 예시와 동일한 방향). 아직 사람이 읽을 만한 라벨이 없는 경우에만 대상 텍스트로 보완한다.
  function evidenceStepLabel(evidence) {
    const context = evidence.context || {};
    const target = context.target || {};
    if (evidence.event && evidence.event.userAction) return evidence.event.userAction;
    if (evidence.triggerType === 'baseline') return '화면 진입';
    if (evidence.triggerType === 'form-input') return '필수값 입력';
    if (target.visibleText) return `${target.visibleText} 클릭`;
    return context.pageTitle || '화면 확인';
  }

  function captureNode(evidence, sequenceEvidenceIds = [evidence.id]) {
    const node = document.createElement('article');
    node.className = 'capture-node';
    node.dataset.evidenceId = evidence.id;
    node.addEventListener('mouseenter', () => showNodeContextPreview(node, evidence));
    node.addEventListener('mouseleave', () => hideNodeContextPreview());
    node.addEventListener('dblclick', (event) => {
      if (isButtonTarget(event)) return;
      openQuickMappingDialog([evidence.id]);
    });
    const image = document.createElement('img');
    image.src = evidence.docImageDataUrl || evidence.imageDataUrl;
    image.alt = evidence.context && evidence.context.target
      ? evidence.context.target.visibleText || 'QA 증적'
      : 'QA 증적';
    swapToCroppedThumbnailWhenReady(evidence, image);
    image.addEventListener('click', (event) => {
      event.stopPropagation();
      showEvidenceDetail(evidence.id, sequenceEvidenceIds);
    });
    const metaRow = document.createElement('div');
    metaRow.className = 'capture-node-meta-row';
    const meta = document.createElement('p');
    meta.className = 'capture-node-meta';
    meta.textContent = evidenceStepLabel(evidence);
    metaRow.append(meta, evidenceRoleBadge(evidence));
    const mergedEvents = Array.isArray(evidence.mergedEvents) ? evidence.mergedEvents : [];
    if (mergedEvents.length > 0) {
      const mergedBadge = document.createElement('span');
      mergedBadge.className = 'evidence-merged-badge';
      mergedBadge.textContent = `+${mergedEvents.length}`;
      mergedBadge.title = `같은 화면 ${mergedEvents.length}번을 합쳤습니다: ${mergedEvents
        .map((item) => item.targetText || item.triggerType)
        .filter(Boolean)
        .slice(0, 5)
        .join(', ')}`;
      metaRow.append(mergedBadge);
    }
    node.append(image, metaRow);
    const mappedTitle = mappedFeatureTitle(evidence);
    if (mappedTitle) {
      node.classList.add('mapped');
      node.dataset.featureId = evidence.featureSpecId;
      // 현재 선택된 테스트케이스와 직접 연관된 노드만 진한 파란색(active)으로, 다른 테스트케이스에
      // 매핑된 노드는 옅은 파란색(inactive)으로 구분한다. 아무 테스트케이스도 선택되지 않았으면
      // "직접 연관"이 없으므로 전부 inactive로 표시한다.
      node.classList.add(currentFeatureId && evidence.featureSpecId === currentFeatureId ? 'active' : 'inactive');
      const badge = document.createElement('span');
      badge.className = 'capture-node-mapping-badge';
      badge.textContent = mappedTitle;
      node.append(badge);
    }
    const nodeFooter = document.createElement('div');
    nodeFooter.className = 'capture-node-footer';
    nodeFooter.append(
      mapToFeatureButton([evidence.id]),
      iconButton('증적 삭제', 'trash', () => removeEvidence(evidence.id), false, 'danger'),
    );
    node.append(nodeFooter);
    return node;
  }

  function captureGraphCard(group, { forceExpand = false } = {}) {
    const evidenceById = new Map(editorState.evidence.map((item) => [item.id, item]));
    const items = group.evidenceIds.map((id) => evidenceById.get(id)).filter(Boolean);
    const mappedFeatureIds = [...new Set(items.map((item) => item.featureSpecId).filter(Boolean))];
    const card = document.createElement('article');
    card.className = 'capture-graph';
    if (mappedFeatureIds.length > 0) {
      card.classList.add('mapped');
      card.dataset.featureIds = JSON.stringify(mappedFeatureIds);
      // 그래프(세션) 카드 헤더 색상도 현재 선택된 테스트케이스와의 연관 여부로 구분한다.
      card.classList.add(currentFeatureId && mappedFeatureIds.includes(currentFeatureId) ? 'active' : 'inactive');
    }
    card.addEventListener('dblclick', (event) => {
      if (isButtonTarget(event)) return;
      openQuickMappingDialog(group.evidenceIds);
    });

    const header = document.createElement('div');
    header.className = 'capture-graph-header';
    const first = items[0];
    const context = (first && first.context) || {};
    const defaultTitle = context.pageTitle
      ? `${context.pageTitle} · 세션 캡처 ${group.count}개`
      : `세션 캡처 ${group.count}개`;
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'capture-graph-title-input';
    titleInput.value = group.sessionLabel || group.llmSessionLabel || '';
    titleInput.placeholder = defaultTitle;
    titleInput.addEventListener('mousedown', (event) => event.stopPropagation());
    titleInput.addEventListener('click', (event) => event.stopPropagation());
    titleInput.addEventListener('dblclick', (event) => event.stopPropagation());
    titleInput.addEventListener('change', () => { saveEvidenceGroupLabel(group, titleInput.value); });

    const headerActions = document.createElement('div');
    headerActions.className = 'capture-graph-header-actions';
    // 자주 쓰는 "연결"만 밖에 두고, 가끔 쓰는 것(AI 제목, 연결 해제, 삭제)은 ⋯ 메뉴에 넣어 고를 것을 줄인다.
    headerActions.append(
      mapToFeatureButton(group.evidenceIds),
      overflowMenu('세트 메뉴', [
        { label: 'AI로 제목 짓기', run: () => requestEvidenceGroupTitleSuggestion(group).catch((error) => setMessage(`제목 추천 실패: ${error.message}`, true)) },
        { label: '세트 연결 해제', run: () => unmapEvidenceGroup(group.evidenceIds), disabled: mappedFeatureIds.length === 0 },
        { label: '세트 삭제', run: () => removeEvidenceGroup(group.evidenceIds), danger: true },
      ]),
    );
    header.append(titleInput, headerActions);

    const body = document.createElement('div');
    body.className = 'capture-graph-body capture-graph-nodes';
    body.append(...items.map((item) => captureNode(item, group.evidenceIds)));

    if (group.count > 1) {
      // 작은 세트는 처음부터 펼쳐 화면을 바로 보여 주고, 큰 세트(9장 이상)는 접어 둔다. 사용자가 바꾼 상태는 기억한다.
      const remembered = expandedSessions.has(group.sessionId) ? true : collapsedSessions.has(group.sessionId) ? false : group.count <= 8;
      let expanded = forceExpand || remembered;
      body.hidden = !expanded;
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'capture-graph-toggle';
      toggle.title = expanded ? '접기' : '펼치기';
      toggle.setAttribute('aria-label', expanded ? '접기' : '펼치기');
      toggle.replaceChildren(iconSvg(expanded ? 'chevronUp' : 'chevronDown'));
      toggle.addEventListener('click', () => {
        expanded = !expanded;
        if (expanded) {
          expandedSessions.add(group.sessionId);
          collapsedSessions.delete(group.sessionId);
        } else {
          expandedSessions.delete(group.sessionId);
          collapsedSessions.add(group.sessionId);
        }
        body.hidden = !expanded;
        toggle.title = expanded ? '접기' : '펼치기';
        toggle.setAttribute('aria-label', expanded ? '접기' : '펼치기');
        toggle.replaceChildren(iconSvg(expanded ? 'chevronUp' : 'chevronDown'));
        scheduleMappingLinks();
      });
      headerActions.append(toggle);
    }

    card.append(header, body);
    return card;
  }

  function latestEvidence() {
    return [...editorState.evidence].sort((left, right) => right.sequenceNo - left.sequenceNo)[0] || null;
  }

  function evidenceSummary(evidence) {
    const context = evidence.context || {};
    const target = context.target || {};
    return {
      captureId: evidence.id,
      sequenceNo: evidence.sequenceNo,
      triggerType: evidence.triggerType,
      capturedAt: evidence.capturedAt,
      pageTitle: context.pageTitle || '',
      pageUrl: context.pageUrl || '',
      targetText: target.visibleText || '',
      targetSelector: target.cssSelector || '',
      linkedFeatureSpecId: evidence.featureSpecId || null,
      previousCaptureId: evidence.previousCaptureId || null,
      nextCaptureId: evidence.nextCaptureId || null,
    };
  }

  function evidenceGroupIdsFor(evidenceId) {
    const groups = CaptureITDomain.groupIntoCaptureSessionSets(editorState.evidence);
    const group = groups.find((item) => item.evidenceIds.includes(evidenceId));
    return group ? group.evidenceIds : [evidenceId];
  }

  function renderEvidenceDetail() {
    const evidenceId = evidenceDetailIds[evidenceDetailIndex];
    const evidence = editorState.evidence.find((item) => item.id === evidenceId);
    if (!evidence) return;
    elements.evidenceDetailTitle.textContent = `증적 ${evidenceDetailIndex + 1}/${evidenceDetailIds.length} · #${evidence.sequenceNo} · ${evidenceStepLabel(evidence)}`;
    elements.evidenceDetailImage.dataset.evidenceId = evidence.id;
    elements.evidenceDetailImage.src = evidence.docImageDataUrl || evidence.imageDataUrl;
    // 상세 뷰어는 <img>가 하나뿐이라 크롭이 끝나기 전에 다른 증적으로 이동하면 이전 요청이 늦게
    // 도착해 잘못된 이미지로 덮어쓸 수 있다. 크롭이 끝난 시점에 여전히 같은 증적을 보고 있는지
    // dataset.evidenceId로 확인해 이런 경합을 막는다.
    ensureDocImage(evidence)
      .then((updated) => {
        if (updated.docImageDataUrl && elements.evidenceDetailImage.dataset.evidenceId === evidence.id) {
          elements.evidenceDetailImage.src = updated.docImageDataUrl;
        }
      })
      .catch(() => {});
    const summary = evidenceSummary(evidence);
    const mergedCount = Array.isArray(evidence.mergedEvents) ? evidence.mergedEvents.length : 0;
    elements.evidenceDetailMeta.textContent = [
      `화면: ${summary.pageTitle || '-'}`,
      `주소: ${summary.pageUrl || '-'}`,
      `동작: ${evidenceStepLabel(evidence)}${summary.targetText ? ` (${summary.targetText})` : ''}`,
      `수집 시각: ${formatTimestamp(summary.capturedAt)}`,
      `연결된 ${itemWord()}: ${mappedFeatureTitle(evidence) || '없음'}`,
      mergedCount ? `같은 화면 합침: ${mergedCount}번` : '',
    ].filter(Boolean).join('\n');
    elements.previousEvidenceDetail.disabled = evidenceDetailIds.length <= 1 || evidenceDetailIndex === 0;
    elements.nextEvidenceDetail.disabled = evidenceDetailIds.length <= 1 || evidenceDetailIndex === evidenceDetailIds.length - 1;
  }

  function showEvidenceDetail(evidenceId, sequenceEvidenceIds = evidenceGroupIdsFor(evidenceId)) {
    const existingIds = new Set(editorState.evidence.map((item) => item.id));
    evidenceDetailIds = sequenceEvidenceIds.filter((id) => existingIds.has(id));
    if (evidenceDetailIds.length === 0) evidenceDetailIds = [evidenceId].filter((id) => existingIds.has(id));
    evidenceDetailIndex = Math.max(0, evidenceDetailIds.indexOf(evidenceId));
    renderEvidenceDetail();
    // 이미 열려 있는 <dialog>에 showModal()을 다시 호출하면 InvalidStateError가 던져진다(같은 세션에서
    // 다른 증적을 연달아 클릭하는 경우 발생 가능). 이미 열려 있으면 내용만 갱신하고 다시 열지 않는다.
    if (!elements.evidenceDetailDialog.open) elements.evidenceDetailDialog.showModal();
  }

  function moveEvidenceDetail(offset) {
    if (evidenceDetailIds.length <= 1) return;
    evidenceDetailIndex = Math.min(Math.max(evidenceDetailIndex + offset, 0), evidenceDetailIds.length - 1);
    renderEvidenceDetail();
  }

  // 상세 뷰어(Evidence_Detail_Dialog)에서 지금 보고 있는 증적을 바로 삭제한다. 확인/삭제/저장/렌더링은
  // removeEvidence()의 기존 순서를 그대로 재사용하고, 여기서는 삭제 후 남은 시퀀스 안에서 뷰어 위치만
  // 다시 잡아준다 - 다음 증적이 있으면 그걸 계속 보여주고, 없으면(마지막 하나였으면) 다이얼로그를 닫는다.
  async function removeEvidenceFromDetail() {
    const evidenceId = evidenceDetailIds[evidenceDetailIndex];
    if (!evidenceId) return;
    const existingIds = new Set(editorState.evidence.map((item) => item.id));
    if (!existingIds.has(evidenceId)) return;
    if (!await removeEvidence(evidenceId)) return;
    const existingIdsAfter = new Set(editorState.evidence.map((item) => item.id));
    evidenceDetailIds = evidenceDetailIds.filter((id) => id !== evidenceId && existingIdsAfter.has(id));
    if (evidenceDetailIds.length === 0) {
      elements.evidenceDetailDialog.close();
      return;
    }
    evidenceDetailIndex = Math.min(evidenceDetailIndex, evidenceDetailIds.length - 1);
    renderEvidenceDetail();
  }

  function openViewerPage() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.runtime && chrome.runtime.getURL) {
      chrome.tabs.create({ url: chrome.runtime.getURL('viewer.html') });
      return;
    }
    window.open('viewer.html', '_blank', 'noopener');
  }

  // 녹화 중에만 수집 줄에 방금 찍힌 화면 하나를 보여준다(제대로 찍혔는지 바로 확인).
  function renderRecentEvidence() {
    const evidence = session && session.active ? latestEvidence() : null;
    if (!evidence) {
      elements.recentEvidence.replaceChildren();
      return;
    }
    const context = evidence.context || {};
    const target = context.target || {};
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'recent-evidence-card';
    const groupIds = evidenceGroupIdsFor(evidence.id);
    button.addEventListener('click', () => showEvidenceDetail(evidence.id, groupIds));
    const image = document.createElement('img');
    image.src = evidence.docImageDataUrl || evidence.imageDataUrl;
    image.alt = `최근 캡처 #${evidence.sequenceNo}`;
    swapToCroppedThumbnailWhenReady(evidence, image);
    const body = document.createElement('div');
    const title = document.createElement('p');
    title.className = 'recent-evidence-title';
    title.textContent = evidenceStepLabel(evidence);
    const meta = document.createElement('p');
    meta.className = 'recent-evidence-meta';
    meta.textContent = `${context.pageTitle || '로컬 이미지'} · ${target.visibleText || '화면 컨텍스트'} · ${formatTimestamp(evidence.capturedAt)}`;
    body.append(title, meta);
    const action = document.createElement('span');
    action.className = 'button button-secondary icon-action-button';
    action.title = '상세 보기';
    action.setAttribute('aria-label', '상세 보기');
    action.append(iconSvg('eye'));
    button.append(image, body, action);
    elements.recentEvidence.replaceChildren(button);
  }

  // 끌어다 놓기가 막힌 환경에서는 연결 버튼이 유일한 연결 방법이다. 누르면 어디로 연결되는지 미리 알려 준다.
  function renderLinkTarget() {
    const feature = currentFeature();
    elements.linkTarget.hidden = editorState.evidence.length === 0;
    if (feature) {
      const index = editorState.features.indexOf(feature) + 1;
      elements.linkTarget.replaceChildren('연결 버튼을 누르면 → ', Object.assign(document.createElement('strong'), { textContent: `${index}. ${feature.title || untitledItem()}` }));
    } else {
      elements.linkTarget.textContent = editorState.features.length === 0
        ? `연결 버튼을 누르면 ${itemWord('을/를')} 새로 만들어 연결합니다.`
        : `연결 버튼을 누른 뒤 연결할 ${itemWord('을/를')} 고르세요.`;
    }
  }

  function renderEvidence() {
    // 리렌더링으로 DOM이 교체되면 이전에 hover 상태였던 프리뷰가 고아 상태로 남을 수 있으므로 항상 숨긴다.
    hideNodeContextPreview();
    // 검색은 세트 단위로 거른다. 일부 사진만 남기면 세트 이름·개수·삭제·연결이 잘린 세트에만 적용됐다.
    const query = elements.evidenceSearch.value.trim().toLowerCase();
    const evidenceById = new Map(editorState.evidence.map((item) => [item.id, item]));
    const graphs = CaptureITDomain.groupIntoCaptureSessionSets(editorState.evidence)
      .filter((group) => !query || group.evidenceIds.some((id) => evidenceSearchText(evidenceById.get(id)).includes(query)));
    elements.evidenceInbox.replaceChildren(...graphs.map((group) => captureGraphCard(group, { forceExpand: Boolean(query) })));
    const feature = currentFeature();
    const mapped = feature ? feature.result.evidenceIds
      .map((id) => editorState.evidence.find((item) => item.id === id))
      .filter(Boolean) : [];
    elements.mappedEvidence.replaceChildren(...mapped.map((item, index) => evidenceCard(item, true, index)));
    renderRecentEvidence();
    renderLinkTarget();
    renderExportEvidenceButtons();
    scheduleMappingLinks();
  }

  function graphLinkSources(graph, featureId) {
    return [graph.querySelector('.capture-graph-header') || graph];
  }

  function renderMappingLinks() {
    const layer = elements.mappingLinkLayer;
    if (!layer) return;
    layer.replaceChildren();
    // 좁은 폭(사이드 패널)에서는 두 목록이 한 칸에 번갈아 보이므로 연결선을 그리지 않는다.
    if (isNarrow()) return;

    const stageRect = elements.workspace.getBoundingClientRect();
    if (stageRect.width <= 0) return;
    const contentHeight = [
      elements.evidenceDropZone,
      elements.featurePanel,
    ].reduce((height, region) => Math.max(height, region.getBoundingClientRect().bottom - stageRect.top), 1);
    layer.removeAttribute('width');
    layer.removeAttribute('height');
    layer.style.width = `${stageRect.width}px`;
    layer.style.height = `${contentHeight}px`;
    layer.setAttribute('viewBox', `0 0 ${stageRect.width} ${contentHeight}`);

    const featureCards = new Map(
      [...elements.featureList.querySelectorAll('.feature-item[data-feature-id]')]
        .map((card) => [card.dataset.featureId, card]),
    );
    const mappedGraphs = [...elements.evidenceInbox.querySelectorAll('.capture-graph[data-feature-ids]')];
    for (const graph of mappedGraphs) {
      const featureIds = JSON.parse(graph.dataset.featureIds || '[]');
      for (const featureId of featureIds) {
        const target = featureCards.get(featureId);
        if (!target) continue;
        const targetAnchor = target.querySelector('.feature-title-row') || target;
        const targetRect = targetAnchor.getBoundingClientRect();
        if (targetRect.width <= 0) continue;
        for (const source of graphLinkSources(graph, featureId)) {
          const sourceRect = source.getBoundingClientRect();
          if (sourceRect.width <= 0) continue;
          const startX = sourceRect.right - stageRect.left;
          const startY = sourceRect.top + sourceRect.height / 2 - stageRect.top;
          const endX = targetRect.left - stageRect.left;
          const endY = targetRect.top + targetRect.height / 2 - stageRect.top;
          const bend = Math.max(80, Math.abs(endX - startX) * 0.5);

          // 곡선 커넥터도 현재 선택된 테스트케이스와 직접 연관된 것만 진한 파란색(active)으로 강조하고,
          // 나머지는 옅은 파란색(inactive)으로 표시한다.
          const isActiveLink = Boolean(currentFeatureId) && featureId === currentFeatureId;
          const linkStateClass = isActiveLink ? 'active' : 'inactive';

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.classList.add('mapping-link-path', linkStateClass);
          path.dataset.featureId = featureId;
          path.setAttribute('d', `M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`);

          const startDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          startDot.classList.add('mapping-link-dot', linkStateClass);
          startDot.setAttribute('cx', `${startX}`);
          startDot.setAttribute('cy', `${startY}`);
          startDot.setAttribute('r', '4');
          const endDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          endDot.classList.add('mapping-link-dot', 'target', linkStateClass);
          endDot.setAttribute('cx', `${endX}`);
          endDot.setAttribute('cy', `${endY}`);
          endDot.setAttribute('r', '4');
          layer.append(path, startDot, endDot);
        }
      }
    }
  }

  function scheduleMappingLinks() {
    if (mappingLinksFrame !== null) cancelAnimationFrame(mappingLinksFrame);
    mappingLinksFrame = requestAnimationFrame(() => {
      mappingLinksFrame = null;
      renderMappingLinks();
    });
  }

  // 내보내기 창의 "남은 것" 목록. 테스트케이스마다 한 줄로 묶고, 누르면 창을 닫고 그 테스트케이스를 고른다.


  function renderWarnings() {
    if (!report) {
      elements.validationWarnings.replaceChildren();
      return;
    }
    const type = docType();
    const fieldLabels = Object.fromEntries(type.fields.map((field) => [field.key, field.label]));
    const shortLabel = {
      UNSET_VERDICT: type.verdict ? type.verdict.label : '',
      NO_EVIDENCE: '증적',
      MISSING_VERIFICATION: fieldLabels.verification,
      MISSING_EXPECTED_RESULT: fieldLabels.expectedResult,
      MISSING_ACTUAL_RESULT: fieldLabels.actualResult,
    };
    const warnings = CaptureITDomain.validationWarnings({ ...report, features: editorState.features }, type);
    const items = [];
    const byFeature = new Map();
    for (const warning of warnings) {
      if (!warning.featureId) {
        items.push({ featureId: null, text: warning.message });
        continue;
      }
      if (!byFeature.has(warning.featureId)) byFeature.set(warning.featureId, []);
      byFeature.get(warning.featureId).push(warning.code);
    }
    editorState.features.forEach((feature, index) => {
      const codes = byFeature.get(feature.id);
      if (!codes) return;
      const missing = codes.map((code) => shortLabel[code]).filter(Boolean);
      const failNote = codes.includes('FAIL_WITHOUT_ACTUAL_RESULT') ? ` (${type.verdict.FAIL}이면 ${fieldLabels.actualResult}${CaptureITDocumentTypes.josa(fieldLabels.actualResult, '이/가').slice(fieldLabels.actualResult.length)} 필요합니다)` : '';
      items.push({ featureId: feature.id, text: `${index + 1}. ${feature.title || untitledItem()} — 빠짐: ${missing.join(', ')}${failNote}` });
    });
    elements.validationWarnings.replaceChildren(...items.map((entry) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = entry.text;
      button.addEventListener('click', () => {
        elements.exportDialog.close();
        if (entry.featureId) focusFeature(entry.featureId);
      });
      item.append(button);
      return item;
    }));
  }

  // 테스트케이스 하나를 골라 화면에 보이게 한다(좁은 폭이면 테스트케이스 목록으로 바꾼다).
  function focusFeature(featureId) {
    currentFeatureId = featureId;
    setNarrowPane('features');
    renderFeatures();
    renderFeature();
    renderEvidence();
    const card = elements.featureList.querySelector(`[data-feature-id="${featureId}"]`);
    if (card) card.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // 내보내기 요약: 테스트케이스 수, 판정 분포, 문서에 들어가는(연결된) 증적 수(중복 제거), 전체 증적 수.
  function computeCompletionSummary() {
    const features = editorState && Array.isArray(editorState.features) ? editorState.features : [];
    const pass = features.filter((feature) => feature.result.status === 'PASS').length;
    const fail = features.filter((feature) => feature.result.status === 'FAIL').length;
    const na = features.length - pass - fail;

    const mappedEvidenceIds = new Set();
    for (const feature of features) {
      for (const evidenceId of feature.result.evidenceIds || []) {
        mappedEvidenceIds.add(evidenceId);
      }
    }

    const evidenceList = editorState && Array.isArray(editorState.evidence) ? editorState.evidence : [];

    return { features: features.length, pass, fail, na, evidence: mappedEvidenceIds.size, total: evidenceList.length };
  }

  function currentTemplateId() {
    return report && report.documentTemplate || preferredTemplate || CaptureITReport.DEFAULT_TEMPLATE;
  }

  // 완료 단계의 양식 선택. 양식마다 축소 지면(.tpl-thumb)을 그려 모양을 미리 보여준다.
  function renderTemplatePicker() {
    if (!elements.templateOptions) return;
    const selected = currentTemplateId();
    const options = CaptureITReport.REPORT_TEMPLATES.map((template) => {
      const option = document.createElement('label');
      option.className = 'template-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'report-template';
      input.value = template.id;
      input.checked = template.id === selected;
      input.addEventListener('change', () => {
        if (input.checked) setReportTemplate(template.id).catch((error) => setMessage(error.message, true));
      });
      const thumb = document.createElement('span');
      thumb.className = `tpl-thumb tpl-thumb-${template.id}`;
      thumb.setAttribute('aria-hidden', 'true');
      for (const part of ['title', 'rule', 'line', 'line', 'figure', 'line']) {
        const piece = document.createElement('i');
        piece.className = `tpl-${part}`;
        thumb.append(piece);
      }
      const name = document.createElement('span');
      name.className = 'template-option-name';
      name.textContent = template.id === CaptureITReport.DEFAULT_TEMPLATE ? `${template.name} (기본)` : template.name;
      const description = document.createElement('span');
      description.className = 'template-option-description';
      description.textContent = template.description;
      option.append(input, thumb, name, description);
      return option;
    });
    elements.templateOptions.replaceChildren(...options);
  }

  async function setReportTemplate(templateId) {
    preferredTemplate = templateId;
    await extensionStorage.set({ preferredReportTemplate: templateId });
    if (report) {
      report.documentTemplate = templateId;
      queueSave();
    }
    renderTemplatePicker();
    const template = CaptureITReport.REPORT_TEMPLATES.find((item) => item.id === templateId);
    setMessage(`문서 양식을 '${template ? template.name : templateId}'(으)로 바꿨습니다.`);
  }

  function renderCompletionSummary() {
    const summary = computeCompletionSummary();
    elements.completionSummaryFeatures.textContent = String(summary.features);
    elements.completionSummaryPass.textContent = String(summary.pass);
    elements.completionSummaryFail.textContent = String(summary.fail);
    elements.completionSummaryNa.textContent = String(summary.na);
    elements.completionSummaryEvidence.textContent = String(summary.evidence);
    elements.completionSummaryTotal.textContent = String(summary.total);
  }

  function renderRecommendations() {
    const feature = currentFeature();
    const recommendations = feature && feature.recommendations || [];
    const cards = recommendations.map((recommendation, index) => {
      const evidence = editorState.evidence.find((item) => item.id === recommendation.captureId);
      if (!evidence) return null;
      const card = document.createElement('article');
      card.className = 'recommendation';
      const image = document.createElement('img');
      image.src = evidence.thumbnailDataUrl || evidence.imageDataUrl;
      image.alt = `추천 증적 #${evidence.sequenceNo}`;
      const body = document.createElement('div');
      const rank = document.createElement('p');
      rank.className = 'recommendation-rank';
      rank.textContent = `${index + 1}순위 · ${roleLabel[recommendation.role] || recommendation.role} · #${evidence.sequenceNo}`;
      const reason = document.createElement('p');
      reason.className = 'recommendation-reason';
      reason.textContent = recommendation.reason;
      body.append(rank, reason);
      const controls = document.createElement('div');
      controls.className = 'recommendation-controls';
      const action = (label, handler, disabled = false) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'button button-secondary';
        button.textContent = label;
        button.disabled = disabled;
        button.addEventListener('click', handler);
        return button;
      };
      const mapped = evidence.featureSpecId === feature.id;
      controls.append(
        action('↑', () => moveRecommendation(index, -1), index === 0),
        action('↓', () => moveRecommendation(index, 1), index === recommendations.length - 1),
        action(mapped ? '연결됨' : '연결', () => mapEvidence(evidence), mapped),
        action('제외', () => excludeRecommendation(index)),
      );
      card.append(image, body, controls);
      return card;
    }).filter(Boolean);
    elements.recommendationList.replaceChildren(...cards);
  }

  // 지금 할 다음 행동 한 줄. 단계가 없으므로 녹화 상태와 작업 상태만 보고 고른다.
  function renderGuidance() {
    const messages = [];
    const evidenceCount = editorState.evidence.length;
    const featureCount = editorState.features.length;
    const unmappedFeatures = editorState.features.filter((feature) => feature.result.evidenceIds.length === 0).length;
    const verdict = docType().verdict;
    const unjudged = verdict ? editorState.features.filter((feature) => !feature.result.status).length : 0;
    const recording = Boolean(session && session.active);
    if (recording) messages.push('테스트 화면을 평소처럼 조작하세요. 주요 화면이 자동으로 수집됩니다.');
    else if (evidenceCount === 0) messages.push('녹화를 시작하거나, 스크린샷을 이 창에 붙여넣으세요(Ctrl+V).');
    else if (featureCount === 0) messages.push(`증적 세트의 연결 버튼을 누르면 ${itemWord('이/가')} 만들어지며 연결됩니다.`);
    else if (unmappedFeatures > 0) messages.push(`증적이 없는 ${itemWord('이/가')} ${unmappedFeatures}개 있습니다. ${itemWord('을/를')} 고른 뒤 증적의 연결 버튼을 누르세요.`);
    else if (unjudged > 0) messages.push(`${verdict.none} 상태인 ${itemWord('이/가')} ${unjudged}개 있습니다.`);
    else messages.push(verdict ? `모두 ${verdict.label}했습니다. 내보내기를 누르세요.` : '내보내기를 누르세요.');
    if (elements.reportDraftSuggestionDialog.open) {
      messages.push('제안된 보고서명과 형상·체크아웃 개요는 반영을 눌러야 저장됩니다.');
    }
    elements.guidanceBanner.replaceChildren();
    if (messages.length === 0) {
      elements.guidanceBanner.hidden = true;
      return;
    }
    const list = document.createElement('ul');
    for (const message of messages) {
      const item = document.createElement('li');
      item.textContent = message;
      list.append(item);
    }
    elements.guidanceBanner.append(list);
    elements.guidanceBanner.hidden = false;
  }

  // 상태 줄의 준비 상태: "테스트케이스 3 · ✓2 ✕0 ○1". 단계 대신 내가 만들려는 것에 무엇이 남았는지 보여준다.
  function renderReadiness() {
    const summary = computeCompletionSummary();
    elements.readinessSummary.replaceChildren();
    if (summary.features === 0) {
      elements.readinessSummary.textContent = summary.total ? `증적 ${summary.total}` : '';
    } else {
      const pass = Object.assign(document.createElement('span'), { className: 'st-pass', textContent: `✓${summary.pass}` });
      const fail = Object.assign(document.createElement('span'), { className: 'st-fail', textContent: `✕${summary.fail}` });
      if (docType().verdict) elements.readinessSummary.append(`${itemWord()} ${summary.features} · `, pass, ' ', fail, ` ○${summary.na}`);
      else elements.readinessSummary.textContent = `${itemWord()} ${summary.features} · 증적 ${summary.total}`;
    }
    elements.openExport.disabled = summary.total === 0 && summary.features === 0;
    renderPrimaryAction();
    elements.paneCountInbox.textContent = String(summary.total);
    elements.paneCountFeatures.textContent = String(summary.features);
    elements.headerEvidenceCount.textContent = summary.total ? String(summary.total) : '';
    elements.featureCount.textContent = summary.features ? String(summary.features) : '';
  }

  // 한 화면에 파란 주 버튼은 하나만: 증적이 없으면 "녹화 시작", 모였으면 "내보내기". 녹화 중에는 빨간 "녹화 종료".
  function renderPrimaryAction() {
    const active = Boolean(session && session.active);
    const hasWork = editorState.evidence.length > 0;
    elements.toggleSession.classList.toggle('button-primary', !active && !hasWork);
    elements.toggleSession.classList.toggle('button-quiet', !active && hasWork);
    elements.openExport.classList.toggle('button-primary', !active && hasWork);
    elements.openExport.classList.toggle('button-quiet', active || !hasWork);
  }

  function isNarrow() {
    return window.matchMedia('(max-width: 759px)').matches;
  }

  function setNarrowPane(pane) {
    narrowPane = pane === 'features' ? 'features' : 'inbox';
    elements.workspace.dataset.pane = narrowPane;
    elements.showInbox.setAttribute('aria-pressed', String(narrowPane === 'inbox'));
    elements.showFeatures.setAttribute('aria-pressed', String(narrowPane === 'features'));
  }

  // 작업대 공통 상태(안내, 준비 상태, 내보내기 요약, 연결선)를 다시 그린다.
  // 증적·테스트케이스·녹화 상태를 바꾸는 동작은 끝에 이 함수를 부른다.
  function renderWorkspace() {
    renderGuidance();
    renderReadiness();
    renderCompletionSummary();
    renderCaptureTarget();
    scheduleMappingLinks();
  }

  function setPendingMapping(evidenceIds) {
    pendingMapEvidenceIds = evidenceIds && evidenceIds.length ? evidenceIds : null;
    elements.featureList.classList.toggle('picking', Boolean(pendingMapEvidenceIds));
    if (pendingMapEvidenceIds) {
      setNarrowPane('features');
      setMessage(`증적 ${pendingMapEvidenceIds.length}장을 연결할 ${itemWord('을/를')} 누르세요. 취소하려면 Esc.`);
    }
  }

  function openExportDialog() {
    renderReportFields();
    renderWarnings();
    renderCompletionSummary();
    renderTemplatePicker();
    renderExportEvidenceButtons();
    elements.exportReport.disabled = editorState.features.length === 0;
    elements.exportReport.title = editorState.features.length === 0 ? `${itemWord('이/가')} 없으면 증적만 ZIP으로 받으세요` : '';
    if (!elements.exportDialog.open) elements.exportDialog.showModal();
  }

  // 수집 대상: 정해 두면 새로 수집하거나 붙여넣은 증적이 그 테스트케이스에 바로 연결된다.
  async function setCaptureTarget(featureId) {
    await ensureDraftReportForCapture();
    report.captureTargetFeatureId = featureId || null;
    await saveReport();
    renderFeatures();
    renderWorkspace();
    const feature = featureId && editorState.features.find((item) => item.id === featureId);
    setMessage(feature ? `이제 새 증적은 '${feature.title}'에 바로 연결됩니다.` : '수집 대상을 해제했습니다. 새 증적은 수집함에만 쌓입니다.');
  }

  function captureTargetFeature() {
    const targetId = report && report.captureTargetFeatureId;
    return targetId ? editorState.features.find((item) => item.id === targetId) || null : null;
  }

  function renderCaptureTarget() {
    const feature = captureTargetFeature();
    elements.captureTarget.hidden = !feature;
    if (!feature) return;
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'text-button';
    clear.textContent = '해제';
    clear.addEventListener('click', () => setCaptureTarget(null).catch((error) => setMessage(error.message, true)));
    elements.captureTarget.replaceChildren('새 증적 연결 대상: ', Object.assign(document.createElement('strong'), { textContent: feature.title || untitledItem() }), clear);
  }

  // 새로 들어온(연결 안 된) 증적을 수집 대상 테스트케이스에 붙인다. AI 자동 작성은 돌리지 않는다.
  async function attachToCaptureTarget(evidenceIds) {
    const feature = captureTargetFeature();
    if (!feature || evidenceIds.length === 0) return 0;
    const fresh = evidenceIds.filter((id) => {
      const item = editorState.evidence.find((entry) => entry.id === id);
      return item && !item.featureSpecId;
    });
    if (fresh.length === 0) return 0;
    CaptureITDomain.mapEvidenceBatch(editorState, fresh, feature.id);
    await persistMappedEvidence(fresh);
    await saveReport();
    return fresh.length;
  }

  // 사이드 패널 ↔ 탭 전환. 둘이 동시에 열려 같은 보고서를 고치지 않도록 전환한 뒤 지금 창은 닫는다.
  async function switchView() {
    if (hostTab) {
      if (!chrome.sidePanel || typeof chrome.sidePanel.open !== 'function') throw new Error('이 브라우저는 사이드 패널을 지원하지 않습니다.');
      await chrome.sidePanel.open({ windowId: hostTab.windowId });
      await chrome.tabs.remove(hostTab.id);
      return;
    }
    await chrome.tabs.create({ url: chrome.runtime.getURL('editor.html') });
    window.close();
  }

  async function detectHost() {
    if (typeof chrome === 'undefined' || !chrome.tabs || typeof chrome.tabs.getCurrent !== 'function') return;
    hostTab = await chrome.tabs.getCurrent().catch(() => null) || null;
    document.body.dataset.host = hostTab ? 'tab' : 'panel';
    const canUsePanel = Boolean(chrome.sidePanel && typeof chrome.sidePanel.open === 'function');
    elements.toggleView.hidden = hostTab ? !canUsePanel : false;
    elements.toggleView.textContent = hostTab ? '옆에 두기' : '넓게 보기';
    elements.toggleView.title = hostTab ? '테스트 화면 옆 사이드 패널로 옮깁니다' : '같은 작업을 탭으로 크게 엽니다';
    if (!hostTab && chrome.tabs.onActivated) {
      // 패널에서는 지금 보이는 탭이 녹화 대상이므로 탭을 바꾸면 안내를 갱신한다.
      chrome.tabs.onActivated.addListener(() => renderRecordTarget().catch(() => {}));
      chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (tab && tab.active && (changeInfo.title || changeInfo.url)) renderRecordTarget().catch(() => {});
      });
    }
  }

  // 문서 유형에 따라 바뀌는 화면 이름들.
  function renderTerms() {
    const type = docType();
    elements.reportType.textContent = type.name;
    elements.featureListHeading.textContent = type.item;
    elements.paneLabelFeatures.textContent = type.item;
    elements.addFeature.setAttribute('aria-label', `${type.item} 추가`);
    elements.noFeature.textContent = `${type.warningText.noItems} 증적의 연결 버튼을 누르면 새로 만들어 연결합니다.`;
    byId('summary-label-features').textContent = type.item;
    const summary = elements.completionSummaryFeatures.closest('dl');
    summary.classList.toggle('no-verdict', !type.verdict);
    if (type.verdict) {
      byId('summary-label-pass').textContent = `✓ ${type.verdict.PASS}`;
      byId('summary-label-fail').textContent = `✕ ${type.verdict.FAIL}`;
      byId('summary-label-na').textContent = `○ ${type.verdict.none}`;
    }
    renderDocumentTypePicker();
  }

  function renderDocumentTypePicker() {
    const selected = docType().id;
    elements.documentTypeOptions.replaceChildren(...CaptureITDocumentTypes.DOCUMENT_TYPES.map((type) => {
      const option = document.createElement('label');
      option.className = 'type-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'document-type';
      input.value = type.id;
      input.checked = type.id === selected;
      input.addEventListener('change', () => {
        if (input.checked) setDocumentType(type.id).catch((error) => setMessage(error.message, true));
      });
      const name = Object.assign(document.createElement('span'), { className: 'type-option-name', textContent: type.name });
      const summary = Object.assign(document.createElement('span'), { className: 'type-option-summary', textContent: type.summary });
      option.append(input, name, summary);
      return option;
    }));
  }

  async function setDocumentType(typeId) {
    preferredDocumentType = typeId;
    await extensionStorage.set({ preferredDocumentType: typeId });
    await ensureDraftReportForCapture();
    report.documentType = typeId;
    await saveReport();
    renderAll();
    setMessage(`문서 유형을 '${docType().name}'(으)로 바꿨습니다. 적어 둔 내용은 그대로입니다.`);
  }

  // 수집 설정: 클릭한 곳 표시. 실제로 그리는 쪽(background.js)과 같은 코드로 미리보기를 그린다.
  let pointerSettings = CaptureITPointerMarker.normalizeSettings(null);

  function choiceGroup(container, name, items, selected, renderExtra, onPick) {
    container.replaceChildren(...items.map((item) => {
      const label = document.createElement('label');
      label.className = 'choice';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = name;
      input.value = item.id;
      input.checked = item.id === selected;
      input.addEventListener('change', () => { if (input.checked) onPick(item.id); });
      label.append(input);
      const extra = renderExtra(item);
      if (extra) label.append(extra);
      label.append(item.name);
      return label;
    }));
  }

  function drawPointerPreview() {
    const canvas = elements.pointerPreview;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 흉내 낸 업무 화면: 머리줄, 표 두 줄, 버튼
    ctx.fillStyle = '#f5f6f7'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1f2a44'; ctx.fillRect(0, 0, canvas.width, 22);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(16, 36, 288, 64);
    ctx.fillStyle = '#e1e4e8'; ctx.fillRect(28, 52, 160, 8); ctx.fillRect(28, 76, 120, 8);
    ctx.fillStyle = '#1f5bd8'; ctx.fillRect(214, 66, 72, 24);
    if (pointerSettings.enabled) CaptureITPointerMarker.drawMarker(ctx, 250, 78, pointerSettings, 1);
  }

  function shapeIcon(shapeId) {
    const canvas = document.createElement('canvas');
    canvas.width = 44;
    canvas.height = 44;
    const ctx = canvas.getContext('2d');
    const x = shapeId === 'arrow' ? 12 : 22;
    const y = shapeId === 'arrow' ? 8 : 22;
    CaptureITPointerMarker.drawMarker(ctx, x, y, { ...pointerSettings, shape: shapeId, size: 'small' }, 2 * 0.75);
    return canvas;
  }

  function renderCaptureSettings() {
    elements.pointerEnabled.checked = pointerSettings.enabled;
    elements.pointerOptions.classList.toggle('is-off', !pointerSettings.enabled);
    const pick = (key) => (value) => savePointerSettings({ [key]: value });
    choiceGroup(elements.pointerShapes, 'pointer-shape', CaptureITPointerMarker.SHAPES, pointerSettings.shape, (item) => shapeIcon(item.id), pick('shape'));
    choiceGroup(elements.pointerColors, 'pointer-color', CaptureITPointerMarker.COLORS, pointerSettings.color, (item) => Object.assign(document.createElement('span'), { className: 'swatch', style: `background:${item.value}` }), pick('color'));
    choiceGroup(elements.pointerSizes, 'pointer-size', CaptureITPointerMarker.SIZES, pointerSettings.size, () => null, pick('size'));
    drawPointerPreview();
  }

  async function savePointerSettings(change) {
    pointerSettings = CaptureITPointerMarker.normalizeSettings({ ...pointerSettings, ...change });
    await extensionStorage.set({ pointerMarker: pointerSettings });
    renderCaptureSettings();
  }

  function renderAll() {
    renderTerms();
    renderReportSelector();
    renderReportFields();
    renderSession();
    renderFeatures();
    renderFeature();
    renderEvidence();
    renderWarnings();
    renderStorageStatus();
    renderGuidance();
    renderWorkspace();
  }

  async function refreshReportSummaries() {
    const reports = await CaptureITStorage.listReports();
    reportSummaries = reports.map((item) => ({ id: item.id, title: item.title, updatedAt: item.updatedAt }));
    await extensionStorage.set({ reportIndex: reportSummaries, activeReportId: report && report.id });
    renderReportSelector();
  }

  // 증적은 보고서별로 보여준다. 예전 증적(reportId 없음)은 처음 여는 보고서가 넘겨받는다.
  // 그전에는 모든 보고서에 모든 증적이 섞여 보였고, 다른 보고서의 사진이 '증적만 ZIP'에도 들어갔다.
  async function loadReportEvidence() {
    const all = await CaptureITStorage.listEvidence();
    if (!report) return all.filter((item) => !item.reportId);
    const claimed = all.filter((item) => !item.reportId);
    for (const item of claimed) {
      item.reportId = report.id;
      await CaptureITStorage.putEvidence(item);
    }
    return all.filter((item) => item.reportId === report.id);
  }

  // 보고서가 아직 없을 때 편집하면 작업 초안을 만들어 저장한다(전에는 저장 없이 사라졌다).
  async function saveReport() {
    if (!report) {
      report = CaptureITDomain.ensureDraftReport(null);
      for (const item of editorState.evidence) {
        if (item.reportId) continue;
        item.reportId = report.id;
        await CaptureITStorage.putEvidence(item);
      }
    }
    report.features = editorState.features;
    report.updatedAt = new Date().toISOString();
    elements.saveStatus.textContent = '저장 중…';
    try {
      await CaptureITStorage.putReport(report);
      await refreshReportSummaries();
    } catch (error) {
      elements.saveStatus.textContent = '저장 실패';
      throw error;
    }
    elements.saveStatus.textContent = '저장됨';
    renderWarnings();
    renderStorageStatus();
  }

  function queueSave() {
    saveQueue = saveQueue.then(saveReport).catch((error) => setMessage(`저장 실패: ${error.message}`, true));
    return saveQueue;
  }

  async function loadReport(reportId) {
    const loaded = await CaptureITStorage.getReport(reportId);
    if (!loaded) throw new Error('보고서를 찾을 수 없습니다.');
    report = loaded;
    const evidence = await loadReportEvidence();
    editorState = CaptureITDomain.createEditorState(evidence, report.features || []);
    currentFeatureId = editorState.features[0] && editorState.features[0].id || null;
    await extensionStorage.set({ activeReportId: report.id });
    renderAll();
  }

  async function createReport() {
    if (report) await saveReport();
    const created = createInitialReport();
    await CaptureITStorage.putReport(created);
    await refreshReportSummaries();
    await loadReport(created.id);
  }

  async function removeReport() {
    if (!report) return;
    const photoCount = editorState.evidence.length;
    if (!confirm(`'${report.title || '제목 없는 보고서'}' 보고서와 이 보고서의 사진 ${photoCount}장을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    for (const evidence of editorState.evidence) await CaptureITStorage.deleteEvidence(evidence.id);
    await CaptureITStorage.deleteReport(report.id);
    const remaining = await CaptureITStorage.listReports();
    if (remaining.length === 0) {
      const replacement = createInitialReport();
      await CaptureITStorage.putReport(replacement);
      remaining.push(replacement);
    }
    reportSummaries = remaining.map((item) => ({ id: item.id, title: item.title, updatedAt: item.updatedAt }));
    await loadReport(remaining[0].id);
    await refreshReportSummaries();
  }

  async function addFeature() {
    const feature = CaptureITDomain.addFeature(editorState, `새 ${itemWord()}`);
    currentFeatureId = feature.id;
    await saveReport();
    renderFeatures();
    renderFeature();
    renderEvidence();
    renderWorkspace();
  }

  async function moveFeature(featureId, offset) {
    CaptureITDomain.moveFeature(editorState, featureId, offset);
    await saveReport();
    renderFeatures();
  }

  async function removeFeature(featureId) {
    const feature = editorState.features.find((item) => item.id === featureId);
    if (!feature || !confirm(`'${feature.title}' ${itemWord('을/를')} 삭제할까요?`)) return;
    const evidenceIds = [...feature.result.evidenceIds];
    CaptureITDomain.deleteFeature(editorState, featureId);
    for (const evidenceId of evidenceIds) {
      const evidence = editorState.evidence.find((item) => item.id === evidenceId);
      if (evidence) await CaptureITStorage.putEvidence(evidence);
    }
    currentFeatureId = editorState.features[0] && editorState.features[0].id || null;
    await saveReport();
    renderFeatures();
    renderFeature();
    renderEvidence();
    renderWorkspace();
  }

  // 연결할 테스트케이스: 고른 것이 있으면 그것, 하나도 없으면 새로 만든다. 여러 개인데 고르지 않았으면 안내한다.
  async function featureForMapping() {
    const selected = currentFeature();
    if (selected) return selected;
    // 하나뿐이면 고르라고 하지 않고 그리로 연결한다.
    if (editorState.features.length === 1) {
      currentFeatureId = editorState.features[0].id;
      return editorState.features[0];
    }
    if (editorState.features.length === 0) {
      await addFeature();
      setMessage(`${itemWord('이/가')} 없어서 새로 만들어 연결했습니다. 이름을 바꿔 주세요.`);
      return currentFeature();
    }
    setPendingMapping(null);
    setMessage(`연결할 ${itemWord('을/를')} 먼저 고르세요.`, true);
    setNarrowPane('features');
    return null;
  }

  async function mapEvidence(evidence) {
    const feature = await featureForMapping();
    if (!feature) return;
    await mapEvidenceIdsWithConfirm([evidence.id], feature);
  }

  // 다른 테스트케이스에 이미 연결된 사진이 섞여 있으면 옮길지 묻는다. 취소하면 연결 안 된 사진만 연결한다.
  async function mapEvidenceIdsWithConfirm(evidenceIds, feature) {
    const elsewhere = evidenceIds
      .map((id) => editorState.evidence.find((item) => item.id === id))
      .filter((item) => item && item.featureSpecId && item.featureSpecId !== feature.id);
    let targetIds = evidenceIds;
    if (elsewhere.length > 0) {
      const other = editorState.features.find((item) => item.id === elsewhere[0].featureSpecId);
      const moveAll = confirm(`이 중 ${elsewhere.length}장은 다른 ${itemWord()}('${other ? other.title : '다른 항목'}')에 연결돼 있습니다.\n확인: '${feature.title}'(으)로 옮깁니다.\n취소: 연결되지 않은 사진만 연결합니다.`);
      if (!moveAll) {
        const elsewhereIds = new Set(elsewhere.map((item) => item.id));
        targetIds = evidenceIds.filter((id) => !elsewhereIds.has(id));
      }
    }
    if (targetIds.length === 0) {
      setMessage('새로 연결할 사진이 없습니다.');
      return;
    }
    await mapEvidenceIds(targetIds, feature);
    setMessage(`'${feature.title}'에 사진 ${targetIds.length}장을 연결했습니다.`);
  }

  async function unmapSingleEvidence(evidenceId) {
    const evidence = editorState.evidence.find((item) => item.id === evidenceId);
    if (!evidence) return;
    CaptureITDomain.unmapEvidence(editorState, evidenceId);
    await CaptureITStorage.putEvidence(evidence);
    await saveReport();
    renderEvidence();
    renderFeatures();
    renderFeature();
    renderWorkspace();
    setMessage('연결을 해제했습니다. 사진은 증적 수집함에 남아 있습니다.');
  }

  // Feature_Group_Actions: capture-graph(세션) 헤더의 "세트 연결 해제" 버튼. 그룹에 속한
  // evidenceIds 중 실제로 매핑되어 있는 것들만 unmapEvidence와 동일한 도메인 함수로 해제하고,
  // 저장/렌더링은 단일 evidence 버전처럼 한 번씩만 수행한다(evidenceCard의 개별 "연결 해제"와
  // 동일한 결과 상태에 도달해야 함).
  async function unmapEvidenceGroup(evidenceIds) {
    const mappedItems = evidenceIds
      .map((id) => editorState.evidence.find((item) => item.id === id))
      .filter((item) => item && item.featureSpecId);
    if (mappedItems.length === 0) return;
    for (const evidence of mappedItems) {
      CaptureITDomain.unmapEvidence(editorState, evidence.id);
    }
    for (const evidence of mappedItems) {
      await CaptureITStorage.putEvidence(evidence);
    }
    await saveReport();
    renderEvidence();
    renderRecommendations();
    renderWorkspace();
  }

  // evidenceIds에 해당하는 editorState.evidence 항목들을 저장소에 반영한다.
  // mapEvidenceIds(Drag_And_Drop_Mapping/Alternative_Mapping_Control)와 submitQuickMapping(Quick_Mapping_Dialog)이
  // 매핑 이후 공통으로 수행해야 하는 저장 단계를 공유하기 위한 헬퍼다(매핑 자체는 이미 CaptureITDomain 쪽에서 끝난 상태여야 한다).
  async function persistMappedEvidence(evidenceIds) {
    const mappedItems = evidenceIds
      .map((evidenceId) => editorState.evidence.find((item) => item.id === evidenceId))
      .filter(Boolean);
    for (const evidence of mappedItems) {
      await CaptureITStorage.putEvidence(evidence);
    }
  }

  // Drag_And_Drop_Mapping / Alternative_Mapping_Control이 공유하는 배치 매핑 경로.
  // evidenceIds에 해당하는 evidence를 feature.id의 Test_Result_Set으로 한 번에 이동시킨다(요구사항 3.1~3.4).
  async function mapEvidenceIds(evidenceIds, feature) {
    CaptureITDomain.mapEvidenceBatch(editorState, evidenceIds, feature.id);
    await persistMappedEvidence(evidenceIds);
    await saveReport();
    renderEvidence();
    renderFeatures();
    renderFeature();
    renderWorkspace();
    // Auto_AI_Pipeline: 매핑(🔗 매핑 버튼/드래그앤드롭 공용 경로)이 끝난 직후 자동으로
    // "증적 설명 생성" → "테스트케이스 설명 자동 생성"을 순서대로 호출한다. 매핑 자체는 이미
    // 저장/렌더링이 끝났으므로 이 호출의 실패가 매핑 결과에 영향을 주지 않는다.
    autoRunAiPipelineForFeature(feature);
  }

  // Quick_Mapping_Dialog 제출 처리: CaptureITDomain.applyQuickMapping으로 매핑과 Test_Result_Set 필드 적용을
  // 한 번에 수행한다(요구사항 3.8~3.11). verification 공백 에러는 여기서 캐치해 다이얼로그를 닫지 않고 안내한다.
  async function submitQuickMapping() {
    const featureId = elements.quickMappingFeature.value;
    try {
      CaptureITDomain.applyQuickMapping(editorState, quickMappingEvidenceIds, featureId, {
        verification: elements.quickMappingVerification.value,
        expectedResult: elements.quickMappingExpectedResult.value,
        actualResult: elements.quickMappingActualResult.value,
      });
    } catch (error) {
      setMessage(error.message, true);
      elements.quickMappingVerification.focus();
      return;
    }
    await persistMappedEvidence(quickMappingEvidenceIds);
    await saveReport();
    renderEvidence();
    renderFeature();
    renderFeatures();
    renderWarnings();
    renderRecommendations();
    renderWorkspace();
    elements.quickMappingDialog.close();
    setMessage('빠른 매핑을 완료했습니다.');
    // Auto_AI_Pipeline: Quick_Mapping_Dialog로 매핑을 마친 경우도 mapEvidenceIds 경로와
    // 동일하게 자동으로 "증적 설명 생성" → "테스트케이스 설명 자동 생성"을 순서대로 호출한다.
    const mappedFeature = editorState.features.find((item) => item.id === featureId);
    if (mappedFeature) autoRunAiPipelineForFeature(mappedFeature);
  }

  async function removeEvidence(evidenceId) {
    if (!confirm(`이 사진을 증적에서 완전히 삭제할까요? 되돌릴 수 없습니다.\n${itemWord()} 연결만 끊으려면 "연결 해제"를 누르세요.`)) return false;
    for (const feature of editorState.features) {
      feature.result.evidenceIds = feature.result.evidenceIds.filter((id) => id !== evidenceId);
    }
    editorState.evidence = editorState.evidence.filter((item) => item.id !== evidenceId);
    editorState = CaptureITDomain.createEditorState(editorState.evidence, editorState.features);
    await CaptureITStorage.deleteEvidence(evidenceId);
    await saveReport();
    renderEvidence();
    renderFeatures();
    renderFeature();
    renderWorkspace();
    return true;
  }

  // Feature_Group_Actions: capture-graph(세션) 헤더의 "세트 삭제" 버튼. removeEvidence의
  // 삭제/저장/렌더링 순서를 그대로 evidenceIds 배열 전체에 적용한다.
  async function removeEvidenceGroup(evidenceIds) {
    if (!confirm(`이 증적 세트의 사진 ${evidenceIds.length}장을 모두 삭제할까요? 되돌릴 수 없습니다.`)) return;
    const idSet = new Set(evidenceIds);
    for (const feature of editorState.features) {
      feature.result.evidenceIds = feature.result.evidenceIds.filter((id) => !idSet.has(id));
    }
    editorState.evidence = editorState.evidence.filter((item) => !idSet.has(item.id));
    editorState = CaptureITDomain.createEditorState(editorState.evidence, editorState.features);
    await Promise.all(evidenceIds.map((id) => CaptureITStorage.deleteEvidence(id)));
    await saveReport();
    renderEvidence();
    renderFeatures();
    renderRecommendations();
    renderWorkspace();
  }

  // Feature_Group_Title: capture-graph 헤더의 제목 입력란은 evidence.description 편집(evidenceCard)과
  // 동일하게 가벼운 메타데이터 편집으로 취급한다 - saveReport() 없이 evidence만 저장하고 화면을 갱신한다.
  // sessionLabel은 그룹에 속한 모든 evidence에 동일하게 반영해야 groupIntoCaptureSessionSets가
  // 다음 렌더링에서 같은 값을 읽어올 수 있다.
  async function saveEvidenceGroupLabel(group, value) {
    const label = value.trim();
    const items = group.evidenceIds
      .map((id) => editorState.evidence.find((item) => item.id === id))
      .filter(Boolean);
    for (const evidence of items) {
      evidence.sessionLabel = label;
      await CaptureITStorage.putEvidence(evidence);
    }
    queueSave();
    renderEvidence();
  }

  // LLM 추천 세트 제목: saveEvidenceGroupLabel(수동 입력)과 동일한 패턴으로, 그룹에 속한 모든
  // evidence에 llmSessionLabel을 반영하고 저장한다. saveReport() 없이 evidence만 저장한다.
  async function saveEvidenceGroupLlmLabel(group, title) {
    const items = group.evidenceIds
      .map((id) => editorState.evidence.find((item) => item.id === id))
      .filter(Boolean);
    for (const evidence of items) {
      evidence.llmSessionLabel = title;
      await CaptureITStorage.putEvidence(evidence);
    }
    renderEvidence();
  }

  // LLM 추천 세트 제목: "✨ 제목 추천받기" 버튼 클릭(수동)과 Auto_Title_On_Session_Stop(자동,
  // stopRecordingSession 참고) 두 경로에서 호출된다. silent가 true면(자동 트리거) 성공 메시지로
  // setMessage를 덮어쓰지 않는다 - 세션 종료 메시지("녹화를 종료했습니다")가 자동 제목 추천으로
  // 곧바로 가려지면 사용자가 녹화 종료 자체를 인지하기 어렵기 때문이다.
  async function requestEvidenceGroupTitleSuggestion(group, { silent = false } = {}) {
    if (group.evidenceIds.length === 0) throw new Error('추천할 증적이 없습니다.');
    const evidenceItems = group.evidenceIds
      .map((id) => editorState.evidence.find((item) => item.id === id))
      .filter(Boolean);
    const result = CaptureITLlm.validateSessionTitleSuggestion(
      await postLlm(CaptureITLlm.buildSessionTitleRequest(group, evidenceItems, report && report.changePurpose || '')),
    );
    await saveEvidenceGroupLlmLabel(group, result.title);
    if (!silent) setMessage('세트 제목을 추천받았습니다.');
  }

  // Auto_Title_On_Session_Stop: 방금 종료된 RecordingSession(sessionId)에 해당하는 증적 세트를
  // 찾아 제목 추천을 자동으로 한 번 호출한다. captureGraphCard()는 검색어 입력 등 다양한 이유로
  // 매우 자주 재렌더링되므로 "그려질 때마다"가 아니라 "세션이 막 종료된 시점 단 1회"로만 트리거를
  // 제한해야 한다 - stopRecordingSession()이 끝난 직후 정확히 그 시점이다.
  function autoRequestSessionTitleForSession(sessionId) {
    if (!sessionId || !llmReady) return;
    const group = CaptureITDomain.groupIntoCaptureSessionSets(editorState.evidence)
      .find((item) => item.sessionId === sessionId);
    if (!group || group.evidenceIds.length === 0) return;
    requestEvidenceGroupTitleSuggestion(group, { silent: true })
      .catch((error) => setMessage(`세트 제목 자동 추천 실패: ${error.message}`, true));
  }

  async function moveMappedEvidence(evidenceId, offset) {
    const feature = currentFeature();
    const index = feature.result.evidenceIds.indexOf(evidenceId);
    const target = Math.max(0, Math.min(feature.result.evidenceIds.length - 1, index + offset));
    if (index < 0 || index === target) return;
    const [id] = feature.result.evidenceIds.splice(index, 1);
    feature.result.evidenceIds.splice(target, 0, id);
    await saveReport();
    renderEvidence();
  }

  async function moveRecommendation(index, offset) {
    const feature = currentFeature();
    const target = Math.max(0, Math.min(feature.recommendations.length - 1, index + offset));
    if (index === target) return;
    const [item] = feature.recommendations.splice(index, 1);
    feature.recommendations.splice(target, 0, item);
    feature.recommendations.forEach((recommendation, position) => { recommendation.rank = position + 1; });
    await saveReport();
    renderRecommendations();
  }

  async function excludeRecommendation(index) {
    const feature = currentFeature();
    feature.recommendations.splice(index, 1);
    feature.recommendations.forEach((recommendation, position) => { recommendation.rank = position + 1; });
    await saveReport();
    renderRecommendations();
  }

  // "CaptureIT Report Editor" 제목 버그: 이 함수는 editor.js 자신(editor.html)의 document/location을
  // 읽으므로 실제로 테스트 중인 웹페이지의 정보를 담지 못한다(항상 확장 페이지 자신의 제목/URL이 됨).
  // background.js의 startRecordingRequest()가 실제 대상 탭에 COLLECT_PAGE_CONTEXT를 보내 진짜 페이지
  // 컨텍스트를 우선 사용하므로, 이 함수의 반환값은 그 요청이 실패했을 때만 쓰이는 폴백-의-폴백이다.
  function baselineContextForRecordingStart() {
    return {
      pageTitle: document.title,
      pageUrl: location.href,
      route: `${location.pathname}${location.search}${location.hash}`,
      viewportSize: { width: window.innerWidth, height: window.innerHeight },
      target: { visibleText: 'RecordingSession 시작' },
    };
  }

  async function activeTabForRecording() {
    if (typeof chrome === 'undefined' || !chrome.tabs || typeof chrome.tabs.query !== 'function') return null;
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs && tabs[0] || null;
  }

  async function startRecordingSessionRequest() {
    if (typeof chrome === 'undefined' || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
      throw new Error('확장 프로그램 안에서만 녹화를 시작할 수 있습니다.');
    }
    const tab = await activeTabForRecording();
    const response = await chrome.runtime.sendMessage({
      type: 'START_RECORDING_SESSION',
      reportId: report && report.id || null,
      tabId: tab && tab.id,
      windowId: tab && tab.windowId,
      recordingPolicy: CaptureITDomain.defaultRecordingPolicy({ mode: elements.captureMode.value }),
      captureBaselineContext: baselineContextForRecordingStart(),
    });
    if (!response || !response.ok) throw new Error(response && response.error ? response.error : '녹화 시작 실패');
    autoCaptureAvailable = response.autoCaptureAvailable !== false;
    return response.session;
  }

  async function stopRecordingSessionRequest() {
    if (typeof chrome === 'undefined' || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
      throw new Error('확장 프로그램 안에서만 녹화를 종료할 수 있습니다.');
    }
    const tab = await activeTabForRecording();
    const response = await chrome.runtime.sendMessage({
      type: 'STOP_RECORDING_SESSION',
      sessionId: session && session.id,
      windowId: tab && tab.windowId,
    });
    if (!response || !response.ok) throw new Error(response && response.error ? response.error : '녹화 종료 실패');
    return response.session;
  }

  async function toggleRecordingSession() {
    if (sessionButtonState === 'STARTING' || sessionButtonState === 'ACTIVE') return;
    sessionButtonState = 'STARTING';
    elements.toggleSession.disabled = true;
    renderSession();
    try {
      await ensureDraftReportForCapture();
      session = await startRecordingSessionRequest();
      sessionButtonState = 'ACTIVE';
      await refreshEvidence();
      setMessage(autoCaptureAvailable
        ? '녹화를 시작했습니다.'
        : '녹화를 시작했지만 이 탭은 클릭·화면 전환 자동 수집이 되지 않습니다(IE 모드 등). 화면을 캡처(Win+Shift+S)한 뒤 이 창에서 Ctrl+V 하세요.', !autoCaptureAvailable);
      renderPasteZone();
    } catch (error) {
      sessionButtonState = 'INACTIVE';
      renderSession();
      throw error;
    }
    renderSession();
    renderWorkspace();
  }

  async function stopRecordingSession() {
    const stoppedSessionId = session && session.id;
    session = await stopRecordingSessionRequest();
    sessionButtonState = 'INACTIVE';
    await refreshEvidence();
    renderSession();
    renderWorkspace();
    setMessage(editorState.evidence.length > 0
      ? `녹화를 종료했습니다. 증적 ${editorState.evidence.length}개를 ${itemWord()}에 연결하세요.`
      : '녹화를 종료했습니다.');
    // Auto_Title_On_Session_Stop: 방금 끝난 세션의 증적 그룹에 한해서만, 세션이 종료되는
    // 이 시점 단 한 번 제목 추천을 자동으로 호출한다(captureGraphCard 재렌더링과는 무관).
    autoRequestSessionTitleForSession(stoppedSessionId);
  }

  async function toggleSession() {
    if (sessionButtonState === 'STARTING') return;
    if (session && session.active) {
      await stopRecordingSession();
      renderWorkspace();
      return;
    }
    await toggleRecordingSession();
    renderWorkspace();
  }

  // Draft_Report를 보장한다. 이미 report가 있으면 아무 부작용 없이 그대로 둔다(idempotent).
  // 새로 생성된 경우 저장을 시도하지만, 저장이 실패해도 캡처/이미지 불러오기는 계속 진행된다(Requirement 1.7).
  async function ensureDraftReportForCapture() {
    const ensured = CaptureITDomain.ensureDraftReport(report);
    if (ensured === report) return;
    report = ensured;
    try {
      await CaptureITStorage.putReport(report);
      await refreshReportSummaries();
    } catch (error) {
      setMessage(`작업 초안 저장 실패: ${error.message}`, true);
    }
    renderAll();
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('파일 읽기 실패'));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('이미지 파일이 손상되었거나 지원되지 않습니다.'));
      image.src = dataUrl;
    });
  }

  // 붙여넣기·파일 불러오기 전용 수집 묶음을 돌려준다. 녹화 세션과는 별개라 순번이 섞이지 않는다.
  // 마지막 입력 후 IMPORT_SESSION_GAP_MS 안에 이어서 넣으면 같은 묶음(같은 Capture_Graph)으로 잇는다.
  function importSessionFor(nowMs) {
    if (!importSession || nowMs - importSessionLastAt > IMPORT_SESSION_GAP_MS) {
      importSession = CaptureITDomain.createSession('manual');
      importSession.active = false;
      importSession.lastEvidenceId = null;
    }
    importSessionLastAt = nowMs;
    return importSession;
  }

  async function fingerprintFor(imageDataUrl) {
    try {
      return await CaptureITEvidenceDedupe.fingerprintImageDataUrl(imageDataUrl);
    } catch {
      return null;
    }
  }

  // 모든 외부 이미지 입력(파일 선택, 붙여넣기, 되는 PC에서는 파일 끌어다 놓기)이 이 함수 하나로 증적이 된다.
  // origin: 'file' | 'paste'. 붙여넣기는 출처를 file-import로 유지하고(manifest 구조 불변)
  // triggerType만 clipboard-paste로 구분한다. 수집 시각은 붙여넣은 시각이다.
  async function importImages(files, origin = 'file') {
    await ensureDraftReportForCapture();
    const fromPaste = origin === 'paste';
    const target = importSessionFor(Date.now());
    const rejected = [];
    let added = 0;
    const addedIds = [];
    let skippedDuplicates = 0;
    for (const file of files) {
      const label = fromPaste ? '붙여넣은 이미지' : file.name;
      try {
        if (!String(file.type || '').startsWith('image/')) {
          throw new Error(/\.zip$/i.test(file.name || '') ? 'ZIP은 ⋮ → 받은 ZIP 열어 보기에서 엽니다' : '이미지 파일이 아닙니다');
        }
        // PNG·JPEG·WebP가 아닌 이미지(BMP, GIF 등)도 받아서 PNG로 바꿔 둔다. 문서와 AI 쪽이 세 형식만 다룬다.
        let imageDataUrl = await readFileAsDataUrl(file);
        let loaded = await loadImage(imageDataUrl);
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
          const canvas = document.createElement('canvas');
          canvas.width = loaded.naturalWidth;
          canvas.height = loaded.naturalHeight;
          canvas.getContext('2d').drawImage(loaded, 0, 0);
          imageDataUrl = canvas.toDataURL('image/png');
          loaded = await loadImage(imageDataUrl);
        }
        // 문서용 자르기가 편집기 창 크기가 아니라 이미지 원래 크기를 기준으로 하도록 기록한다.
        const viewportSize = { width: loaded.naturalWidth, height: loaded.naturalHeight };
        const fingerprint = await fingerprintFor(imageDataUrl);
        const previous = target.lastEvidenceId
          ? editorState.evidence.find((item) => item.id === target.lastEvidenceId)
          : null;
        // 같은 이미지를 연달아 넣으면 한 번만 받는다.
        if (previous && fingerprint && previous.fingerprint === fingerprint) {
          skippedDuplicates += 1;
          continue;
        }
        const nowIso = new Date().toISOString();
        const pastedTitle = `붙여넣은 화면 ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
        const evidence = {
          id: crypto.randomUUID(),
          sessionId: target.id,
          reportId: report && report.id || null,
          sequenceNo: CaptureITDomain.nextSequence(target),
          capturedAt: fromPaste ? nowIso : new Date(file.lastModified || Date.now()).toISOString(),
          triggerType: fromPaste ? 'clipboard-paste' : 'file-import',
          source: 'file-import',
          featureSpecId: null,
          previousCaptureId: target.lastEvidenceId || null,
          nextCaptureId: null,
          description: '',
          context: fromPaste
            ? { pageTitle: pastedTitle, target: { visibleText: '' }, viewportSize }
            : { pageTitle: file.name, target: { visibleText: file.name }, viewportSize },
          imageDataUrl,
          imageBlob: imageDataUrl.startsWith('data:image/png') && file.type !== 'image/png' ? await (await fetch(imageDataUrl)).blob() : file,
          fingerprint,
          mergedEvents: [],
        };
        if (previous) {
          previous.nextCaptureId = evidence.id;
          await CaptureITStorage.putEvidence(previous);
        }
        target.lastEvidenceId = evidence.id;
        await CaptureITStorage.putEvidence(evidence);
        editorState.evidence.push(evidence);
        addedIds.push(evidence.id);
        added += 1;
      } catch (error) {
        rejected.push(`${label} (${error.message})`);
      }
    }
    await CaptureITStorage.putSession(target);
    editorState = CaptureITDomain.createEditorState(editorState.evidence, editorState.features);
    const attached = await attachToCaptureTarget(addedIds);
    if (attached) {
      renderFeatures();
      renderFeature();
    }
    renderEvidence();
    renderStorageStatus();
    renderGuidance();
    renderWorkspace();
    const parts = [];
    if (added) parts.push(attached ? `${added}개 이미지를 '${captureTargetFeature().title}'에 연결했습니다.` : `${added}개 이미지를 증적 수집함에 넣었습니다.`);
    if (skippedDuplicates) parts.push(`같은 이미지 ${skippedDuplicates}개는 건너뛰었습니다.`);
    if (rejected.length) parts.push(`제외: ${rejected.join(', ')}`);
    setMessage(parts.join(' ') || '추가된 이미지가 없습니다.', rejected.length > 0);
  }

  function isEditableTarget(target) {
    if (!target || !target.closest) return false;
    return Boolean(target.closest('input, textarea, [contenteditable=""], [contenteditable="true"]'));
  }

  // 작업대 어디서든 Ctrl+V로 이미지를 증적으로 받는다. 입력란에서 글자를 붙여넣는 경우는 가로채지 않는다.
  function handlePaste(event) {
    const data = event.clipboardData;
    if (!data) return;
    const images = [...(data.files || [])].filter((file) => file.type && file.type.startsWith('image/'));
    if (images.length === 0) return;
    const hasText = [...(data.types || [])].includes('text/plain');
    if (isEditableTarget(event.target) && hasText) return;
    event.preventDefault();
    importImages(images, 'paste').catch((error) => setMessage(error.message, true));
  }

  function draggedFiles(event) {
    return Boolean(event.dataTransfer && [...(event.dataTransfer.types || [])].includes('Files'));
  }

  // 붙여넣기 안내 영역. 녹화 대상 탭이 자동 수집되지 않으면 경고 상태로 바꿔 강조한다.
  function renderPasteZone() {
    if (!elements.pasteZone) return;
    const unavailable = Boolean(session && session.active && !autoCaptureAvailable);
    elements.pasteZone.classList.toggle('paste-zone-warning', unavailable);
    elements.pasteZoneTitle.textContent = unavailable
      ? '이 탭은 자동 수집이 되지 않습니다'
      : '자동 수집이 안 되는 화면은 캡처해서 여기에 Ctrl+V';
    elements.pasteZoneHint.textContent = unavailable
      ? 'IE 모드 화면 등은 클릭이 기록되지 않습니다. 화면을 캡처(Win+Shift+S)한 뒤 이 창에서 Ctrl+V 하세요.'
      : '다른 브라우저나 IE 모드 화면은 Win+Shift+S로 캡처한 뒤 이 창을 누르고 Ctrl+V 하세요. 저장해 둔 이미지는 "이미지 불러오기"로 넣습니다.';
  }

  function renderExportEvidenceButtons() {
    elements.exportEvidenceOnly.disabled = editorState.evidence.length === 0;
    elements.cleanDuplicates.disabled = editorState.evidence.length < 2;
  }

  // 중복 화면 정리: 같은 세션에서 연달아 찍힌 거의 같은 화면을 첫 화면 하나로 합친다.
  // 직접 지정한 증적(강조·입력·붙여넣기 등), 테스트케이스에 연결된 증적, 결과 메시지가 있는 증적은 건드리지 않는다.
  async function cleanDuplicateEvidence() {
    if (editorState.evidence.length < 2) return;
    elements.cleanDuplicates.disabled = true;
    try {
      setMessage('비슷한 화면을 찾고 있습니다…');
      for (const evidence of editorState.evidence) {
        if (evidence.fingerprint || !evidence.imageDataUrl) continue;
        evidence.fingerprint = await fingerprintFor(evidence.imageDataUrl);
        if (evidence.fingerprint) await CaptureITStorage.putEvidence(evidence);
      }
      const plan = CaptureITEvidenceDedupe.planDuplicateCleanup(editorState.evidence);
      const removeCount = plan.reduce((total, group) => total + group.removeIds.length, 0);
      if (removeCount === 0) {
        setMessage('정리할 중복 화면이 없습니다.');
        return;
      }
      if (!confirm(`거의 같은 화면 ${removeCount}장을 찾았습니다. 묶음마다 첫 화면만 남기고 나머지는 지웁니다(지운 화면의 동작 기록은 남은 화면에 합칩니다). 계속할까요?`)) {
        setMessage('중복 화면 정리를 취소했습니다.');
        return;
      }
      const byId = new Map(editorState.evidence.map((item) => [item.id, item]));
      const removed = new Set();
      for (const group of plan) {
        const keeper = byId.get(group.keepId);
        const absorbed = group.removeIds.map((id) => byId.get(id)).filter(Boolean);
        CaptureITEvidenceDedupe.appendMergedEvents(keeper, absorbed);
        for (const item of absorbed) removed.add(item.id);
      }
      // 지운 증적을 건너뛰도록 앞뒤 연결(previous/nextCaptureId)을 다시 잇는다.
      const survivors = editorState.evidence.filter((item) => !removed.has(item.id));
      const bySession = new Map();
      for (const item of survivors) {
        if (!bySession.has(item.sessionId)) bySession.set(item.sessionId, []);
        bySession.get(item.sessionId).push(item);
      }
      const changed = new Set(plan.map((group) => group.keepId));
      for (const items of bySession.values()) {
        items.sort((left, right) => left.sequenceNo - right.sequenceNo);
        items.forEach((item, index) => {
          const previousId = index > 0 ? items[index - 1].id : null;
          const nextId = index < items.length - 1 ? items[index + 1].id : null;
          if (item.previousCaptureId !== previousId || item.nextCaptureId !== nextId) changed.add(item.id);
          item.previousCaptureId = previousId;
          item.nextCaptureId = nextId;
        });
      }
      for (const id of removed) await CaptureITStorage.deleteEvidence(id);
      for (const id of changed) {
        const item = byId.get(id);
        if (item && !removed.has(id)) await CaptureITStorage.putEvidence(item);
      }
      editorState = CaptureITDomain.createEditorState(survivors, editorState.features);
      await saveReport();
      renderEvidence();
      renderStorageStatus();
      renderWorkspace();
      setMessage(`중복 화면 ${removed.size}장을 정리했습니다.`);
    } finally {
      renderExportEvidenceButtons();
    }
  }

  async function ensureThumbnail(evidence) {
    if (evidence.thumbnailDataUrl) return evidence;
    if (!evidence.imageDataUrl) throw new Error(`이미지가 없는 증적입니다: ${evidence.id}`);
    const image = await loadImage(evidence.imageDataUrl);
    const scale = Math.min(1, 640 / image.naturalWidth, 480 / image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    evidence.thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.78);
    await CaptureITStorage.putEvidence(evidence);
    return evidence;
  }

  function createCropCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function cropOptionsForEvidence(evidence) {
    const context = evidence.context || {};
    return {
      loadImage,
      createCanvas: createCropCanvas,
      viewport: context.viewportSize || { width: window.innerWidth, height: window.innerHeight },
      targetContext: evidence.target || context.target || null,
      containerContext: evidence.container || context.container || null,
      domDiff: evidence.domDiff || null,
    };
  }

  // 예전에 창 크기가 0일 때 만들어진 빈 이미지("data:,")는 없는 것으로 보고 다시 만든다.
  function usableImage(dataUrl) {
    return typeof dataUrl === 'string' && dataUrl.length > 'data:,'.length;
  }

  // 같은 증적의 자르기를 동시에 여러 번 돌리지 않는다(검색 입력·새 증적마다 다시 그려져 중복 실행됐다).
  const cropsInFlight = new Map();

  function cropOnce(evidence, field, run) {
    const key = `${evidence.id}:${field}`;
    if (cropsInFlight.has(key)) return cropsInFlight.get(key);
    const job = (async () => {
      if (!evidence.imageDataUrl) throw new Error(`이미지가 없는 증적입니다: ${evidence.id}`);
      await run(evidence, cropOptionsForEvidence(evidence));
      await CaptureITStorage.putEvidence(evidence);
      return evidence;
    })().finally(() => cropsInFlight.delete(key));
    cropsInFlight.set(key, job);
    return job;
  }

  async function ensureLlmImage(evidence) {
    if (usableImage(evidence.llmImageDataUrl)) return evidence;
    return cropOnce(evidence, 'llm', CaptureITScreenshotCropper.ensureLlmImage);
  }

  async function ensureDocImage(evidence) {
    if (usableImage(evidence.docImageDataUrl)) return evidence;
    return cropOnce(evidence, 'doc', CaptureITScreenshotCropper.ensureDocImage);
  }

  // Bug_Fullscreen_Thumbnail 대응: evidence.imageDataUrl은 항상 캡처 시점의 전체 화면
  // 스크린샷이라 초점 없이 풀스크린으로만 보인다. 이미 크롭된 evidence.docImageDataUrl이 있으면
  // 그것으로 즉시 보여주고, 없으면 렌더링을 막지 않도록 일단 전체 이미지를 먼저 보여준 뒤
  // 백그라운드에서 ensureDocImage(기존 문서용 크롭 로직, LLM 이미지와 별개 필드)를 비동기로
  // 실행해서 완료되면 그 특정 <img> 엘리먼트의 src만 교체한다(전체 재렌더링을 트리거하지 않아
  // 스크롤 위치/포커스 등 사용자 상호작용을 방해하지 않는다). 크롭 실패는 조용히 무시하고
  // 이미 보이고 있는 전체 이미지를 그대로 유지한다(사용자에게 에러를 노출하지 않는 배경 개선).
  function swapToCroppedThumbnailWhenReady(evidence, imageElement) {
    if (usableImage(evidence.docImageDataUrl)) return;
    ensureDocImage(evidence)
      .then((updated) => {
        if (updated.docImageDataUrl) imageElement.src = updated.docImageDataUrl;
      })
      .catch(() => {});
  }

  function candidateAndAdjacentEvidence(candidateIds) {
    const candidates = new Set(candidateIds);
    const ordered = [...editorState.evidence].sort((left, right) => left.sequenceNo - right.sequenceNo);
    const included = new Set();
    ordered.forEach((item, index) => {
      if (!candidates.has(item.id)) return;
      if (index > 0) included.add(ordered[index - 1].id);
      included.add(item.id);
      if (index + 1 < ordered.length) included.add(ordered[index + 1].id);
    });
    return ordered.filter((item) => included.has(item.id));
  }

  // NH AI Gateway/OpenAI compatible은 각각 내부망/외부망 고정 대상이 있으므로 엔드포인트 입력란을
  // 그 Adapter의 기본값으로 강제하고 읽기 전용으로 잠근다(사용자가 잘못된 엔드포인트를 실수로
  // 입력해 "OpenAI로 했는데 엔드포인트가 틀렸다" 같은 혼선이 생기지 않도록 함). Raw JSON template만
  // 엔드포인트를 직접 입력할 수 있게 열어둔다. load()가 저장된 adapter 값을 반영한 뒤에도, 그리고
  // adapter select의 change 이벤트가 발생할 때마다 호출된다.
  function applyAdapterEndpointLock() {
    const adapter = elements.llmAdapter.value;
    const isLocked = CaptureITLlm.isAdapterEndpointLocked(adapter);
    if (isLocked) {
      elements.llmEndpoint.value = CaptureITLlm.defaultEndpointForAdapter(adapter);
    }
    elements.llmEndpoint.readOnly = isLocked;
    elements.llmEndpoint.classList.toggle('input-locked', isLocked);
    elements.llmEndpointHint.hidden = !isLocked;
  }

  function validatedEndpoint(value) {
    let endpoint;
    try { endpoint = new URL(value); } catch { throw new Error('내부망 LLM API 엔드포인트를 입력하십시오.'); }
    if (!['http:', 'https:'].includes(endpoint.protocol)) throw new Error('LLM 엔드포인트는 HTTP 또는 HTTPS 주소여야 합니다.');
    if (!llmAllowedOrigins.includes(endpoint.origin)) throw new Error('명시적으로 등록되지 않은 LLM Origin입니다. 엔드포인트를 다시 저장하십시오.');
    return endpoint.href;
  }

  function readLlmSettings() {
    return {
      adapter: elements.llmAdapter.value || 'nh-ai-gateway',
      apiKey: elements.llmApiKey.value || '',
      endpoint: validatedEndpoint(elements.llmEndpoint.value.trim() || CaptureITLlm.DEFAULT_ENDPOINT),
      model: elements.llmModel.value.trim() || CaptureITLlm.DEFAULT_MODEL,
      rawTemplate: elements.llmTemplate.value || '',
    };
  }

  async function saveLlmSettings() {
    const endpoint = new URL(elements.llmEndpoint.value.trim() || CaptureITLlm.DEFAULT_ENDPOINT);
    if (!['http:', 'https:'].includes(endpoint.protocol)) throw new Error('HTTP 또는 HTTPS 주소가 아닙니다.');
    llmAllowedOrigins = [endpoint.origin];
    elements.llmEndpoint.value = endpoint.href;
    await extensionStorage.set({
      llmAdapter: elements.llmAdapter.value || 'nh-ai-gateway',
      llmAllowedOrigins,
      llmApiKey: elements.llmApiKey.value || '',
      llmEndpoint: endpoint.href,
      llmModel: elements.llmModel.value.trim() || CaptureITLlm.DEFAULT_MODEL,
      llmTemplate: elements.llmTemplate.value || '',
    });
  }

  function renderLlmDiagnostics(summary) {
    llmDiagnostics = summary || null;
    elements.llmDiagnostics.textContent = summary ? JSON.stringify(summary, null, 2) : '';
    elements.llmDiagnostics.classList.toggle('has-content', Boolean(summary));
  }

  async function responseBody(response) {
    const text = await response.text();
    if (!text) return {};
    try { return JSON.parse(text); } catch { return { content: text }; }
  }

  async function postLlmOnce(payload, settings, maxTokens) {
    const adapterRequest = CaptureITLlm.buildAdapterRequest({ ...settings, payload, maxTokens });
    const response = await fetchLlm(adapterRequest.url, adapterRequest.options);
    const body = await responseBody(response);
    if (!response.ok) {
      const error = new Error(`AI 서버가 오류를 돌려줬습니다(HTTP ${response.status}).`);
      error.status = response.status;
      error.responseBody = body;
      throw error;
    }
    await setLlmReady(true);
    return CaptureITLlm.parseAdapterResponse(body);
  }

  // 답이 출력 한도에 걸려 비었거나 끊겼으면 한도를 늘려 한 번 더 요청한다.
  async function postLlm(payload) {
    await saveLlmSettings();
    const settings = readLlmSettings();
    try {
      return await postLlmOnce(payload, settings, CaptureITLlm.DEFAULT_MAX_TOKENS);
    } catch (error) {
      if (!error.outputLimit) throw error;
      return postLlmOnce(payload, settings, CaptureITLlm.RETRY_MAX_TOKENS);
    }
  }

  function diagnosticFeature() {
    return currentFeature() || CaptureITDomain.createFeature('진단용 테스트케이스');
  }

  function diagnosticEvidence() {
    if (editorState.evidence.length > 0) return editorState.evidence.slice(0, 3);
    return [{
      id: 'DIAGNOSTIC-CAPTURE-001',
      sequenceNo: 1,
      triggerType: 'diagnostic',
      capturedAt: new Date().toISOString(),
      context: {
        pageTitle: 'CaptureIT 진단',
        pageUrl: location.href,
        target: { visibleText: 'LLM 추천 요청 테스트' },
      },
    }];
  }

  function diagnosticPayload(kind) {
    if (kind === 'connection') {
      return {
        diagnostic: true,
        product: 'CaptureIT',
        task: 'Return JSON: {"ok":true}',
        responseSchema: { ok: true },
      };
    }
    return CaptureITLlm.buildStageOne(diagnosticFeature(), diagnosticEvidence(), report && report.changePurpose || '');
  }

  async function runLlmDiagnostic(kind) {
    await saveLlmSettings();
    const settings = readLlmSettings();
    const payload = diagnosticPayload(kind);
    const adapterRequest = CaptureITLlm.buildAdapterRequest({ ...settings, payload });
    const startedAt = Date.now();
    let summary;
    try {
      const response = await fetchLlm(adapterRequest.url, adapterRequest.options);
      const body = await responseBody(response);
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        summary = CaptureITLlm.buildDiagnosticSummary({
          ...settings,
          contentType: response.headers.get('content-type') || '',
          endedAt: Date.now(),
          error,
          requestBody: adapterRequest.requestBody,
          responseBody: body,
          startedAt,
          status: response.status,
        });
      } else {
        const parsed = CaptureITLlm.parseAdapterResponse(body);
        summary = CaptureITLlm.buildDiagnosticSummary({
          ...settings,
          contentType: response.headers.get('content-type') || '',
          endedAt: Date.now(),
          requestBody: adapterRequest.requestBody,
          responseBody: parsed,
          startedAt,
          status: response.status,
        });
      }
    } catch (error) {
      summary = CaptureITLlm.buildDiagnosticSummary({
        ...settings,
        endedAt: Date.now(),
        error,
        requestBody: adapterRequest.requestBody,
        responseBody: error.responseBody || null,
        startedAt,
        status: error.status || 0,
      });
    }
    renderLlmDiagnostics(summary);
    await extensionStorage.set({ llmDiagnostics: summary });
    await setLlmReady(Boolean(summary.ok));
    const redactedRequest = summary.redactedRequest;
    setMessage(summary.ok ? `LLM ${kind === 'connection' ? '연결' : '추천 요청'} 테스트 성공` : `LLM 테스트 확인 필요: ${summary.guidance}`, !summary.ok);
    return redactedRequest;
  }

  function validateCandidateIds(response) {
    if (!response || !Array.isArray(response.candidateCaptureIds) || response.candidateCaptureIds.length === 0) {
      throw new Error('LLM이 유효한 후보 증적을 반환하지 않았습니다.');
    }
    const known = new Set(editorState.evidence.map((item) => item.id));
    return [...new Set(response.candidateCaptureIds.map((id) => {
      if (typeof id !== 'string' || !known.has(id)) throw new Error(`알 수 없는 후보 증적입니다: ${id}`);
      return id;
    }))];
  }

  // targetFeature를 명시적으로 받도록 리팩터링했다 - 기존 "증적 설명 생성" 버튼은 항상
  // currentFeature()를 대상으로 호출하고(요청 시점), Auto_Recommend_On_Map(그래프가 테스트케이스에
  // 매핑되는 순간 자동으로 호출)은 매핑된 feature를 직접 넘겨준다(그 시점에 currentFeature()가
  // 반드시 그 feature와 같다는 보장이 없으므로 - 예: 다른 카드가 선택된 상태에서 드래그로 매핑).
  async function requestRecommendations(targetFeature = currentFeature()) {
    const feature = targetFeature;
    if (!feature) throw new Error(`${itemWord('을/를')} 고르세요.`);
    if (editorState.evidence.length === 0) throw new Error('추천할 증적이 없습니다.');
    const isCurrentFeature = feature.id === (currentFeature() && currentFeature().id);
    if (isCurrentFeature) elements.requestRecommendations.disabled = true;
    setMessage('1단계: 캡처 맥락과 순서로 후보를 선정하고 있습니다.');
    try {
      const stageOne = CaptureITLlm.buildStageOne(feature, editorState.evidence, report && report.changePurpose || '');
      const candidateIds = validateCandidateIds(await postLlm(stageOne));
      setMessage('2단계: 후보와 인접 이미지로 최종 증적을 추천하고 있습니다.');
      for (const evidence of candidateAndAdjacentEvidence(candidateIds)) await ensureThumbnail(evidence);
      // Bug_Context_Length_Exceeded 대응: 후보+인접 evidence 수가 많으면 이미지를 전부 payload에
      // 실었을 때 LLM의 컨텍스트 한도(HTTP 400)를 넘길 수 있으므로, 기존 recordingPolicy의
      // maxLlmImagesPerFeature 정책(기본 5장)을 그대로 재사용해 이미지 개수를 제한한다.
      const maxImages = report && report.recordingPolicy && report.recordingPolicy.maxLlmImagesPerFeature
        || CaptureITDomain.defaultRecordingPolicy().maxLlmImagesPerFeature;
      const stageTwo = CaptureITLlm.buildStageTwo(feature, editorState.evidence, candidateIds, report && report.changePurpose || '', { maxImages });
      const validated = CaptureITLlm.validateRecommendations(
        await postLlm(stageTwo),
        new Set(editorState.evidence.map((item) => item.id)),
      );
      if (validated.featureSpecId !== feature.id) throw new Error(`다른 ${itemWord()}의 추천 결과가 돌아왔습니다.`);
      feature.recommendations = validated.suggestions;
      await saveReport();
      renderRecommendations();
      setMessage(`${validated.suggestions.length}개 증적을 추천했습니다. 연결 여부와 PASS/FAIL은 사용자가 결정합니다.`);
    } finally {
      if (isCurrentFeature) elements.requestRecommendations.disabled = false;
    }
  }

  // Auto_AI_Pipeline: Capture_Graph(세션 전체)가 테스트케이스에 매핑되는 순간(🔗 매핑 버튼,
  // 드래그앤드롭, 빠른 매핑 다이얼로그 - mapEvidenceIds/submitQuickMapping 공유 경로 모두)
  // "증적 설명 생성" → "테스트케이스 설명 자동 생성"을 순차적으로 자동 실행한다. 두 단계 모두
  // 실패해도 매핑 자체는 이미 끝난 상태이므로 매핑 흐름을 막지 않고 진행 상태만 UI에 표시한다.
  const AI_PIPELINE_STEP_LABELS = {
    recommendations: '증적 설명 생성',
    description: `${docType().descriptionLabel} 초안`,
  };

  function setAiPipelineStepStatus(featureId, stepKey, status) {
    const pipeline = aiPipelines.get(featureId);
    if (!pipeline) return;
    const step = pipeline.steps.find((item) => item.key === stepKey);
    if (step) step.status = status;
    renderFeatures();
  }

  // feature-item 목록에 진행 중인 파이프라인 정보를 표시하기 위한 상태를 만든다. renderFeatures()가
  // 이 상태를 읽어 해당 feature 카드에 ai-generating 클래스(무지개 그라데이션)와 체크리스트를 그린다.
  function startAiPipeline(featureId) {
    clearTimeout(aiPipelineClearTimers.get(featureId));
    aiPipelineClearTimers.delete(featureId);
    aiPipelines.set(featureId, {
      featureId,
      steps: [
        { key: 'recommendations', label: AI_PIPELINE_STEP_LABELS.recommendations, status: 'active' },
        { key: 'description', label: AI_PIPELINE_STEP_LABELS.description, status: 'pending' },
      ],
    });
    renderFeatures();
  }

  // 완료된 체크리스트(✓✓)를 사용자가 잠깐 볼 수 있게 남겨둔 뒤 일정 시간 후 지운다.
  function finishAiPipeline(featureId) {
    aiPipelineClearTimers.set(featureId, setTimeout(() => {
      aiPipelines.delete(featureId);
      aiPipelineClearTimers.delete(featureId);
      renderFeatures();
    }, 2500));
  }

  // 두 LLM 호출을 순서대로 실행한다: 1단계(증적 설명 생성)가 끝나야 2단계(테스트케이스 설명
  // 자동 생성)가 시작된다. 1단계가 실패해도 2단계는 계속 시도한다(서로 독립적인 기능이므로 하나의
  // 실패가 나머지를 막을 필요는 없다) - 각 단계의 성공/실패는 체크리스트에 개별적으로 반영된다.
  async function runAutoAiPipeline(feature) {
    startAiPipeline(feature.id);
    try {
      await requestRecommendations(feature);
      setAiPipelineStepStatus(feature.id, 'recommendations', 'done');
    } catch (error) {
      setAiPipelineStepStatus(feature.id, 'recommendations', 'error');
      setMessage(`증적 설명 자동 생성 실패: ${error.message}`, true);
    }
    setAiPipelineStepStatus(feature.id, 'description', 'active');
    // requestTestCaseDescription은 postLlm 실패 시 내부에서 이미 setMessage로 알리고 null을
    // 반환하지만(throw하지 않음), 매핑된 증적이 없는 등 사전 조건 실패는 여전히 throw할 수 있으므로
    // 여기서도 방어적으로 감싼다.
    try {
      const descriptionResult = await requestTestCaseDescription(feature);
      setAiPipelineStepStatus(feature.id, 'description', descriptionResult ? 'done' : 'error');
    } catch (error) {
      setAiPipelineStepStatus(feature.id, 'description', 'error');
      setMessage(`${docType().descriptionLabel} 초안 실패: ${error.message}`, true);
    }
    finishAiPipeline(feature.id);
  }

  function autoRunAiPipelineForFeature(feature) {
    if (!llmReady) return;
    runAutoAiPipeline(feature).catch(() => {});
  }

  async function setLlmReady(value) {
    if (llmReady === value) return;
    llmReady = value;
    await extensionStorage.set({ llmReady: value }).catch(() => {});
  }

  // 응답이 오지 않으면 90초에서 끊고, 연결 실패를 알아볼 수 있는 말로 바꾼다.
  async function fetchLlm(url, options) {
    const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(LLM_TIMEOUT_MS)
      : undefined;
    try {
      return await fetch(url, { ...options, signal });
    } catch (error) {
      if (error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new Error(`AI 응답이 ${LLM_TIMEOUT_MS / 1000}초 안에 오지 않았습니다. ⋮ → AI 설정에서 연결 테스트를 해 보세요.`);
      }
      if (error instanceof TypeError) {
        throw new Error('AI 서버에 연결할 수 없습니다. 사내망 연결과 ⋮ → AI 설정을 확인하세요.');
      }
      throw error;
    }
  }

  function evidenceForFeature(feature) {
    const mappedIds = new Set(feature.result && feature.result.evidenceIds || []);
    if (mappedIds.size === 0) return [];
    return editorState.evidence
      .filter((item) => mappedIds.has(item.id))
      .sort((left, right) => Number(left.sequenceNo || 0) - Number(right.sequenceNo || 0));
  }

  function hydrateEvidenceSteps(steps, evidenceItems) {
    const byId = new Map(evidenceItems.map((item) => [item.id, item]));
    return steps.map((step) => ({
      ...step,
      evidence: (step.evidenceIds || []).map((id) => byId.get(id)).filter(Boolean),
    }));
  }

  // AI는 정리하고, 사람이 판정한다(PRD FR-03, FR-06-2).
  // - 판정(feature.result.status)은 절대 바꾸지 않는다. AI의 판단은 feature.aiOpinion에 참고용으로만 남긴다.
  //   aiOpinion은 report.js의 buildManifest가 고르는 필드가 아니므로 산출물에 들어가지 않는다.
  // - 사용자가 이미 쓴 내용은 덮어쓰지 않고, 비어 있는 칸만 AI 초안으로 채운다.
  function applyTestCaseDescription(feature, validated) {
    const fillIfEmpty = (current, draft) => (String(current || '').trim() ? current : draft || '');
    const type = docType();
    // 문서 유형마다 같은 저장 칸이 다른 뜻이다(PoC의 expectedResult는 '질문·후속'). 뜻이 맞는 칸만 채운다.
    if (type.id === 'proposal') {
      feature.description = fillIfEmpty(feature.description, validated.testProcedure || validated.testPurpose);
    } else if (type.id === 'poc') {
      feature.description = fillIfEmpty(feature.description, validated.testPurpose);
      feature.result.actualResult = fillIfEmpty(feature.result.actualResult, validated.actualResult);
    } else {
      feature.description = fillIfEmpty(feature.description, [
        `목적: ${validated.testPurpose}`,
        type.id === 'qa' ? `사전조건: ${validated.preconditions}` : '',
        `절차: ${validated.testProcedure}`,
        `판단 근거: ${validated.judgementBasis}`,
      ].filter(Boolean).join('\n'));
      feature.result.expectedResult = fillIfEmpty(feature.result.expectedResult, validated.expectedResult);
      feature.result.actualResult = fillIfEmpty(feature.result.actualResult, validated.actualResult);
      feature.result.verification = fillIfEmpty(feature.result.verification, type.id === 'test' ? validated.preconditions : validated.judgementBasis);
    }
    feature.aiOpinion = {
      status: TEST_CASE_STATUS_TO_VERDICT[validated.finalStatus] || null,
      basis: validated.judgementBasis || '',
      createdAt: new Date().toISOString(),
    };
  }

  async function requestTestCaseDescription(feature) {
    if (!feature) throw new Error(`${itemWord('을/를')} 고르세요.`);
    const evidenceItems = evidenceForFeature(feature);
    if (evidenceItems.length === 0) throw new Error(`${itemWord()}에 연결된 증적이 없습니다.`);
    setMessage(`${docType().descriptionLabel} 초안을 만들고 있습니다.`);
    try {
      for (const evidence of evidenceItems) await ensureLlmImage(evidence);
      const steps = CaptureITEvidenceStepBuilder.buildEvidenceSteps(evidenceItems);
      const hydratedSteps = hydrateEvidenceSteps(steps, evidenceItems);
      const evidencePacket = CaptureITLlm.buildLlmEvidencePacket(feature, hydratedSteps, {
        changePurpose: report && report.changePurpose || '',
      });
      const request = {
        ...CaptureITLlm.buildTestCaseDescriptionRequest(feature, hydratedSteps, {
          changePurpose: report && report.changePurpose || '',
        }),
        evidencePacket,
      };
      const validated = CaptureITLlm.validateTestCaseDescriptionResponse(await postLlm(request));
      applyTestCaseDescription(feature, validated);
      await saveReport();
      renderFeatures();
      renderWarnings();
      const opinion = feature.aiOpinion && feature.aiOpinion.status;
      setMessage(opinion
        ? `비어 있던 칸을 AI 초안으로 채웠습니다. AI 의견은 ${opinion}이며, 판정은 직접 선택하세요.`
        : '비어 있던 칸을 AI 초안으로 채웠습니다. 판정은 직접 선택하세요.');
      return validated;
    } catch (error) {
      setMessage(`${docType().descriptionLabel} 초안 실패: ${error.message}`, true);
      return null;
    }
  }

  // 매핑된 Evidence가 있는 Feature_Spec들을 buildReportDraftRequest가 기대하는
  // [{ feature: {...}, evidence: [...] }] 형태로 모은다(요구사항 10.1).
  function mappedEvidenceByFeatureForDraft() {
    const evidenceById = new Map(editorState.evidence.map((item) => [item.id, item]));
    return editorState.features
      .filter((feature) => feature.result.evidenceIds.length > 0)
      .map((feature) => ({
        feature: {
          id: feature.id,
          title: feature.title,
          description: feature.description || '',
          result: {
            verification: feature.result.verification || '',
            expectedResult: feature.result.expectedResult || '',
          },
        },
        evidence: feature.result.evidenceIds.map((id) => evidenceById.get(id)).filter(Boolean),
      }));
  }

  // 미리보기/ZIP 생성 트리거 시 매핑된 Evidence가 있으면 LLM에 보고서 초안(제목/형상·체크아웃 개요)을
  // 요청하고, 성공하면 검토용 다이얼로그에 표시한다(요구사항 10.1, 10.2). 실패 시 조용히 무시하고
  // 미리보기/ZIP 생성 자체를 막지 않는다(요구사항 10.6).
  async function requestReportDraftSuggestion() {
    if (!llmReady) return;
    const mappedEvidenceByFeature = mappedEvidenceByFeatureForDraft();
    if (mappedEvidenceByFeature.length === 0) return;
    try {
      for (const { evidence } of mappedEvidenceByFeature) {
        for (const item of evidence) await ensureThumbnail(item);
      }
      const payload = CaptureITLlm.buildReportDraftRequest(report, mappedEvidenceByFeature);
      const rawResponse = await postLlm(payload);
      const suggestion = CaptureITLlm.validateReportDraftSuggestion(rawResponse);
      elements.draftSuggestionTitle.value = suggestion.title;
      elements.draftSuggestionOverview.value = suggestion.configurationOverview;
      // previewReport()가 매 클릭마다 이 함수를 호출하므로, 이전 제안 다이얼로그가 아직 열려
      // 있는 상태에서 다시 showModal()을 호출하면 InvalidStateError가 던져질 수 있다.
      if (!elements.reportDraftSuggestionDialog.open) elements.reportDraftSuggestionDialog.showModal();
      renderGuidance();
    } catch {
      // 비차단(요구사항 10.6): LLM 초안 제안 실패는 미리보기/ZIP 생성 흐름에 영향을 주지 않는다.
    }
  }

  // Report_Draft_Suggestion 승인/수정-후-승인 핸들러. 다이얼로그의 input/textarea 값을 그대로 읽어
  // report.title/configurationOverview에 반영한다 - 사용자가 값을 편집했으면 편집된 값이,
  // 편집하지 않았으면 LLM 원본 제안이 그대로 저장되어 "즉시 승인"과 "수정 후 승인"을 하나의
  // 핸들러로 만족시킨다(요구사항 10.4). result.status(Verdict)나 evidence 매핑은 절대 건드리지 않는다(요구사항 10.7).
  async function approveDraftSuggestion() {
    report = CaptureITDomain.ensureDraftReport(report);
    report.title = elements.draftSuggestionTitle.value;
    report.configurationOverview = elements.draftSuggestionOverview.value;
    report.updatedAt = new Date().toISOString();
    await CaptureITStorage.putReport(report);
    await refreshReportSummaries();
    renderReportFields();
    elements.reportDraftSuggestionDialog.close();
    renderGuidance();
    setMessage('LLM 제안을 승인했습니다.');
  }

  function dataUrlBytes(dataUrl) {
    const separator = dataUrl.indexOf(',');
    if (separator < 0) throw new Error('잘못된 이미지 데이터입니다.');
    const metadata = dataUrl.slice(0, separator);
    const payload = dataUrl.slice(separator + 1);
    if (!metadata.includes(';base64')) return new TextEncoder().encode(decodeURIComponent(payload));
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function extensionForDataUrl(dataUrl) {
    const match = /^data:image\/(png|jpeg|webp);/i.exec(dataUrl || '');
    if (!match) return 'png';
    return match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  }

  function buildExportEntries() {
    const manifest = CaptureITReport.buildManifest(report, editorState.evidence);
    const entries = [
      { name: 'report.html', data: CaptureITReport.renderHtml(manifest, { template: currentTemplateId() }) },
      { name: 'report.md', data: CaptureITReport.renderMarkdown(manifest) },
      { name: 'manifest.json', data: `${JSON.stringify(manifest, null, 2)}\n` },
    ];
    for (const feature of manifest.features) {
      for (const selected of feature.result.evidence) {
        const source = editorState.evidence.find((item) => item.id === selected.captureId);
        if (source && source.imageDataUrl) entries.push({ name: selected.file, data: dataUrlBytes(source.imageDataUrl) });
      }
    }
    return { entries, manifest };
  }

  function buildEvidenceOnlyEntries() {
    const ordered = [...editorState.evidence].sort((left, right) => left.sequenceNo - right.sequenceNo);
    const manifest = {
      // QA 뷰어가 증적 묶음 ZIP을 알아보고 evidence-index.html로 열 수 있게 표시한다.
      kind: 'evidence-only',
      generatedAt: new Date().toISOString(),
      report: report ? { id: report.id, title: report.title } : null,
      totalEvidence: ordered.length,
      evidence: ordered.map((item, index) => ({
        captureId: item.id,
        sequenceNo: item.sequenceNo,
        capturedAt: item.capturedAt,
        triggerType: item.triggerType,
        source: item.source,
        pageTitle: item.context && item.context.pageTitle || '',
        pageUrl: item.context && item.context.pageUrl || '',
      targetText: item.context && item.context.target && item.context.target.visibleText || '',
        file: `assets/evidence-${String(index + 1).padStart(3, '0')}.${extensionForDataUrl(item.imageDataUrl)}`,
      })),
    };
    const rows = manifest.evidence.map((item) => `<tr><td>${item.sequenceNo}</td><td>${escapeHtml(item.triggerType)}</td><td>${escapeHtml(item.pageTitle)}</td><td>${escapeHtml(item.targetText)}</td><td><img src="${item.file}" alt=""></td></tr>`).join('');
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>CaptureIT Evidence</title><style>body{font-family:sans-serif;margin:24px;color:#172033}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #dbe2ec;text-align:left;vertical-align:top}img{max-width:260px;max-height:160px;object-fit:contain;background:#0f172a}</style></head><body><h1>${escapeHtml(report && report.title || 'CaptureIT Evidence')}</h1><p>총 ${ordered.length}개 증적</p><table><thead><tr><th>순번</th><th>트리거</th><th>페이지</th><th>대상</th><th>이미지</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const entries = [
      { name: 'evidence-index.html', data: html },
      { name: 'manifest.json', data: `${JSON.stringify(manifest, null, 2)}\n` },
    ];
    ordered.forEach((item, index) => {
      if (item.imageDataUrl) entries.push({ name: `assets/evidence-${String(index + 1).padStart(3, '0')}.${extensionForDataUrl(item.imageDataUrl)}`, data: dataUrlBytes(item.imageDataUrl) });
    });
    return { entries, manifest };
  }

  async function rememberExport(downloadId, fallbackFilename, kind) {
    let downloadItem = null;
    try {
      const matches = await chrome.downloads.search({ id: downloadId });
      downloadItem = matches && matches[0] || null;
    } catch {
      downloadItem = null;
    }
    const fullPath = downloadItem && downloadItem.filename || fallbackFilename;
    lastExport = {
      downloadId,
      exportedAt: new Date().toISOString(),
      filename: fullPath.split(/[\\/]/).pop() || fallbackFilename,
      fullPath,
      kind,
    };
    await extensionStorage.set({ lastExport });
    renderStorageStatus();
    return lastExport;
  }

  // 파일 이름: 보고서 제목 + 시각(전에는 UUID라 알아볼 수 없고 매번 같은 이름이었다).
  function exportFilename(suffix) {
    const title = String(report && report.title || 'CaptureIT')
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60) || 'CaptureIT';
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    return `CaptureIT/${title}-${suffix}-${stamp}.zip`;
  }

  // 저장 대화상자에서 고르거나 취소할 때까지 기다린다. download()는 저장 위치를 고르기 전에 끝나서
  // 취소해도 "생성 완료"가 뜨고, 30초 뒤 파일 주소를 지워 늦게 고르면 저장이 실패할 수 있었다.
  function waitForDownload(downloadId) {
    return new Promise((resolve) => {
      if (!chrome.downloads || !chrome.downloads.onChanged) {
        resolve({ state: 'complete' });
        return;
      }
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        chrome.downloads.onChanged.removeListener(listener);
        resolve(result);
      };
      const listener = (delta) => {
        if (delta.id !== downloadId || !delta.state) return;
        if (delta.state.current === 'complete') finish({ state: 'complete' });
        if (delta.state.current === 'interrupted') finish({ state: 'interrupted', error: delta.error && delta.error.current });
      };
      chrome.downloads.onChanged.addListener(listener);
      chrome.downloads.search({ id: downloadId }).then(([item]) => {
        if (item && item.state === 'complete') finish({ state: 'complete' });
        if (item && item.state === 'interrupted') finish({ state: 'interrupted', error: item.error });
      }).catch(() => {});
    });
  }

  // ZIP을 저장하고 결과를 알린다. 취소하면 조용히 알리고 '최근 ZIP'도 바꾸지 않는다.
  async function saveZip(archive, filename, kind) {
    const url = URL.createObjectURL(archive);
    try {
      const downloadId = await chrome.downloads.download({ url, filename, saveAs: true });
      setMessage('저장할 위치를 고르세요…');
      const result = await waitForDownload(downloadId);
      if (result.state === 'interrupted') {
        if (result.error === 'USER_CANCELED') {
          setMessage('저장을 취소했습니다.');
          return false;
        }
        throw new Error(`파일을 저장하지 못했습니다(${result.error || '알 수 없는 오류'}).`);
      }
      await rememberExport(downloadId, filename, kind);
      return true;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function exportReport() {
    await saveReport();
    const { entries, manifest } = buildExportEntries();
    setMessage(`ZIP 생성 중 · ${entries.length}개 파일 처리`);
    const archive = await CaptureITZip.writeZip(entries);
    if (await saveZip(archive, exportFilename('QA결과'), 'report')) {
      elements.exportDialog.close();
      setMessage(`증적 문서를 저장했습니다 · ${itemWord()} ${manifest.summary.total}개${docType().verdict ? ` · ${manifest.overallStatus}` : ''}`, false, { label: '폴더에서 보기', run: showLastDownloadFile });
    }
  }

  async function exportEvidenceOnly() {
    const { entries, manifest } = buildEvidenceOnlyEntries();
    if (manifest.totalEvidence === 0) throw new Error('내보낼 증적이 없습니다.');
    setMessage(`증적 ZIP 생성 중 · ${entries.length}개 파일 처리`);
    const archive = await CaptureITZip.writeZip(entries);
    if (await saveZip(archive, exportFilename('증적'), 'evidence-only')) {
      elements.exportDialog.close();
      setMessage(`증적 ZIP을 저장했습니다 · 증적 ${manifest.totalEvidence}개`, false, { label: '폴더에서 보기', run: showLastDownloadFile });
    }
  }

  async function showLastDownloadFile() {
    if (!lastExport || !Number.isInteger(lastExport.downloadId)) throw new Error('열 수 있는 최근 ZIP이 없습니다.');
    await chrome.downloads.show(lastExport.downloadId);
  }

  function showDefaultDownloadFolder() {
    chrome.downloads.showDefaultFolder();
  }

  // 마지막으로 미리보기에 사용한 Blob URL. 매 미리보기 생성마다 새 Blob을 만들기 때문에
  // 이전 URL을 추적해서 해제해야 메모리가 누적되지 않는다.
  let lastPreviewObjectUrl = null;

  // 이전에는 <dialog>+<iframe srcdoc>으로 같은 창 안에 모달을 띄웠으나, <dialog>는 이미 열려 있는
  // 상태에서 showModal()을 다시 호출하면 InvalidStateError를 던져 재클릭 시 렌더링이 끊기는
  // 문제가 있었다. 모달의 이런 상태 관리 부담을 없애기 위해, 미리보기를 별도의 브라우저 탭/창으로
  // 여는 방식으로 전환한다 - 매번 새 탭이 열리므로 "이미 열려 있는 모달" 상태 자체가 존재하지 않는다.
  async function previewReport() {
    await saveReport();
    const manifest = CaptureITReport.buildManifest(report, editorState.evidence);
    const parsed = new DOMParser().parseFromString(CaptureITReport.renderHtml(manifest, { template: currentTemplateId() }), 'text/html');
    for (const selected of manifest.features.flatMap((feature) => feature.result.evidence)) {
      const source = editorState.evidence.find((item) => item.id === selected.captureId);
      const image = [...parsed.querySelectorAll('img')]
        .find((candidate) => candidate.getAttribute('src') === selected.file);
      if (image && source) image.src = source.imageDataUrl;
    }
    const html = `<!doctype html>${parsed.documentElement.outerHTML}`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank', 'noopener');
    }
    if (lastPreviewObjectUrl) URL.revokeObjectURL(lastPreviewObjectUrl);
    lastPreviewObjectUrl = url;
    requestReportDraftSuggestion().catch(() => {});
  }

  // 보고서 정보(문서 머리말·변경 개요)는 내보내기 창 안에서 적는 대로 저장한다. 모두 선택 입력이다.
  // 예전의 프로젝트 저장 절차(프로젝트명 필수, 저장 버튼)는 저장이 원래 자동이라 절차만 하나 더 있어 없앴다.
  const REPORT_INFO_FIELDS = [
    ['reportTitle', 'title'],
    ['projectName', 'projectName'],
    ['reportAuthor', 'author'],
    ['changePurpose', 'changePurpose'],
    ['changeSummary', 'changeSummary'],
    ['configurationOverview', 'configurationOverview'],
  ];

  function bindInputs() {
    for (const [elementKey, reportKey] of REPORT_INFO_FIELDS) {
      elements[elementKey].addEventListener('change', async () => {
        const value = elements[elementKey].value;
        await ensureDraftReportForCapture();
        report[reportKey] = reportKey === 'title' ? value.trim() : value;
        queueSave();
        if (reportKey === 'title') renderReportSelector();
      });
    }
  }

  function openReportInfo() {
    openExportDialog();
    renderReportFields();
    elements.reportInfo.open = true;
    elements.reportTitle.focus();
  }

  async function refreshEvidence() {
    const knownIds = new Set(editorState.evidence.map((item) => item.id));
    const evidence = await loadReportEvidence();
    editorState = CaptureITDomain.createEditorState(evidence, editorState.features);
    const attached = await attachToCaptureTarget(evidence.filter((item) => !knownIds.has(item.id)).map((item) => item.id));
    if (attached) {
      renderFeatures();
      renderFeature();
    }
    renderEvidence();
    renderWarnings();
    renderStorageStatus();
    // 녹화 중 화면의 수집 현황 숫자(화면/입력 흐름/결과 메시지/AI 입력용 이미지)를 새 증적이
    // 생성될 때마다 최신 상태로 갱신한다.
    renderRecordingSummary(Boolean(session && session.active));
    renderWorkspace();
  }

  async function load() {
    await detectHost();
    const stored = await extensionStorage.get([
      'activeReportId',
      'captureSession',
      'lastExport',
      'llmAdapter',
      'llmAllowedOrigins',
      'llmApiKey',
      'llmDiagnostics',
      'llmEndpoint',
      'llmModel',
      'llmTemplate',
      'preferredReportTemplate',
      'preferredDocumentType',
      'pointerMarker',
      'llmReady',
    ]);
    session = stored.captureSession || null;
    lastExport = stored.lastExport || null;
    preferredTemplate = stored.preferredReportTemplate || null;
    preferredDocumentType = stored.preferredDocumentType || null;
    pointerSettings = CaptureITPointerMarker.normalizeSettings(stored.pointerMarker);
    llmReady = Boolean(stored.llmReady);
    elements.llmAdapter.value = stored.llmAdapter || 'nh-ai-gateway';
    elements.llmApiKey.value = stored.llmApiKey || '';
    elements.llmEndpoint.value = stored.llmEndpoint || CaptureITLlm.DEFAULT_ENDPOINT;
    elements.llmModel.value = stored.llmModel || CaptureITLlm.DEFAULT_MODEL;
    elements.llmTemplate.value = stored.llmTemplate || '';
    // 저장된 adapter가 nh-ai-gateway/openai-compatible이면 엔드포인트를 그 Adapter의 고정
    // 기본값으로 다시 맞추고 잠근다(저장된 llmEndpoint가 과거에 잘못 입력된 값이었더라도
    // 매번 로드 시 올바른 값으로 교정됨).
    applyAdapterEndpointLock();
    llmAllowedOrigins = Array.isArray(stored.llmAllowedOrigins) && stored.llmAllowedOrigins.length > 0
      ? stored.llmAllowedOrigins
      : [new URL(elements.llmEndpoint.value).origin];
    renderLlmDiagnostics(stored.llmDiagnostics || null);
    const reports = await CaptureITStorage.listReports();
    reportSummaries = reports.map((item) => ({ id: item.id, title: item.title, updatedAt: item.updatedAt }));
    if (reports.length === 0) {
      // Requirement 1: 캡처 우선 진입 - 저장된 report가 없으면 진입 즉시 report를 강제로 만들지 않는다.
      report = null;
      const evidence = await loadReportEvidence();
      editorState = CaptureITDomain.createEditorState(evidence, []);
      currentFeatureId = null;
      renderAll();
    } else {
      const active = reports.find((item) => item.id === stored.activeReportId) || reports[0];
      await loadReport(active.id);
      await saveReport();
    }
    await saveLlmSettings();
  }

  elements.reportSelect.addEventListener('change', () => loadReport(elements.reportSelect.value).catch((error) => setMessage(error.message, true)));
  elements.newReport.addEventListener('click', () => createReport().catch((error) => setMessage(error.message, true)));
  elements.deleteReport.addEventListener('click', () => removeReport().catch((error) => setMessage(error.message, true)));
  elements.addFeature.addEventListener('click', () => addFeature().catch((error) => setMessage(error.message, true)));
  elements.toggleSession.addEventListener('click', () => toggleSession().catch((error) => setMessage(error.message, true)));
  elements.stopRecordingBar.addEventListener('click', () => toggleSession().catch((error) => setMessage(error.message, true)));
  elements.imageImport.addEventListener('change', () => {
    const files = [...elements.imageImport.files];
    elements.imageImport.value = '';
    importImages(files, 'file').catch((error) => setMessage(error.message, true));
  });
  // "기존 이미지 불러오기"는 파일 입력을 감싼 label이라 키보드로 닿지 않았다.
  const importLabel = document.querySelector('.file-button');
  if (importLabel) {
    importLabel.tabIndex = 0;
    importLabel.setAttribute('role', 'button');
    importLabel.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      elements.imageImport.click();
    });
  }
  // 붙여넣기는 작업대 전체에서 받는다. 사내 DRM이 끌어다 놓기를 막으므로 화면 안내는 붙여넣기와
  // "이미지 불러오기"만 한다. 파일 드롭은 막히지 않은 PC를 위해 조용히 받아 둔다.
  document.addEventListener('paste', handlePaste);
  document.addEventListener('dragover', (event) => {
    if (!draggedFiles(event)) return;
    event.preventDefault();
    document.body.classList.add('file-dragging');
  });
  document.addEventListener('dragleave', (event) => {
    if (event.relatedTarget === null) document.body.classList.remove('file-dragging');
  });
  document.addEventListener('drop', (event) => {
    document.body.classList.remove('file-dragging');
    if (!draggedFiles(event)) return;
    event.preventDefault();
    importImages([...event.dataTransfer.files], 'file').catch((error) => setMessage(error.message, true));
  });
  elements.cleanDuplicates.addEventListener('click', () => cleanDuplicateEvidence().catch((error) => setMessage(`중복 화면 정리 실패: ${error.message}`, true)));
  elements.evidenceSearch.addEventListener('input', renderEvidence);
  window.addEventListener('resize', scheduleMappingLinks);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && pendingMapEvidenceIds) {
      setPendingMapping(null);
      setMessage('연결을 취소했습니다.');
    }
  });
  elements.openViewer.addEventListener('click', openViewerPage);
  elements.exportReport.addEventListener('click', () => withBusy(elements.exportReport, 'ZIP 만드는 중…', exportReport).catch((error) => setMessage(`보고서 생성 실패: ${error.message}`, true)));
  elements.exportEvidenceOnly.addEventListener('click', () => withBusy(elements.exportEvidenceOnly, 'ZIP 만드는 중…', exportEvidenceOnly).catch((error) => setMessage(`증적 ZIP 생성 실패: ${error.message}`, true)));
  elements.showLastDownload.addEventListener('click', () => showLastDownloadFile().catch((error) => setMessage(error.message, true)));
  elements.showDownloadFolder.addEventListener('click', () => showDefaultDownloadFolder());
  elements.previewReport.addEventListener('click', () => withBusy(elements.previewReport, '여는 중…', previewReport).catch((error) => setMessage(`미리보기 실패: ${error.message}`, true)));
  elements.closeEvidenceDetail.addEventListener('click', () => elements.evidenceDetailDialog.close());
  elements.previousEvidenceDetail.addEventListener('click', () => moveEvidenceDetail(-1));
  elements.nextEvidenceDetail.addEventListener('click', () => moveEvidenceDetail(1));
  elements.deleteEvidenceDetail.addEventListener('click', () => removeEvidenceFromDetail().catch((error) => setMessage(`증적 삭제 실패: ${error.message}`, true)));
  elements.closeFeatureDetail.addEventListener('click', () => closeFeatureDrawer());
  elements.featureDetailBackdrop.addEventListener('click', () => closeFeatureDrawer());
  elements.showInbox.addEventListener('click', () => { setNarrowPane('inbox'); scheduleMappingLinks(); });
  elements.showFeatures.addEventListener('click', () => { setNarrowPane('features'); scheduleMappingLinks(); });
  elements.openExport.addEventListener('click', openExportDialog);
  elements.closeExport.addEventListener('click', () => elements.exportDialog.close());
  elements.toggleView.addEventListener('click', () => switchView().catch((error) => setMessage(error.message, true)));
  elements.openReportSwitch.addEventListener('click', () => elements.reportSwitchDialog.showModal());
  elements.closeReportSwitch.addEventListener('click', () => elements.reportSwitchDialog.close());
  elements.openStorageDetail.addEventListener('click', () => elements.storageDetailDialog.showModal());
  elements.closeStorageDetail.addEventListener('click', () => elements.storageDetailDialog.close());
  elements.openMoreMenu.addEventListener('click', (event) => {
    event.stopPropagation();
    setMoreMenuOpen(elements.moreMenu.hidden);
  });
  document.addEventListener('click', (event) => {
    if (elements.moreMenu.hidden) return;
    if (elements.moreMenu.contains(event.target) || elements.openMoreMenu.contains(event.target)) return;
    setMoreMenuOpen(false);
  });
  for (const menuItem of elements.moreMenu.querySelectorAll('.more-menu-item')) {
    menuItem.addEventListener('click', () => setMoreMenuOpen(false));
  }
  elements.openLlmSettings.addEventListener('click', () => elements.llmSettingsDialog.showModal());
  elements.openCaptureSettings.addEventListener('click', () => {
    renderCaptureSettings();
    elements.captureSettingsDialog.showModal();
  });
  elements.closeCaptureSettings.addEventListener('click', () => elements.captureSettingsDialog.close());
  elements.pointerEnabled.addEventListener('change', () => {
    savePointerSettings({ enabled: elements.pointerEnabled.checked }).catch((error) => setMessage(error.message, true));
  });
  elements.closeLlmSettings.addEventListener('click', () => elements.llmSettingsDialog.close());
  elements.openReportInfo.addEventListener('click', openReportInfo);
  elements.dismissDraftSuggestion.addEventListener('click', () => {
    elements.reportDraftSuggestionDialog.close();
    renderGuidance();
  });
  elements.approveDraftSuggestion.addEventListener('click', () => approveDraftSuggestion().catch((error) => setMessage(error.message, true)));
  elements.cancelQuickMapping.addEventListener('click', () => elements.quickMappingDialog.close());
  elements.quickMappingFeature.addEventListener('change', fillQuickMappingFields);
  elements.quickMappingDialog.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    submitQuickMapping().catch((error) => setMessage(`빠른 매핑 실패: ${error.message}`, true));
  });
  const persistLlmSettings = async () => {
    try {
      await saveLlmSettings();
      await setLlmReady(false);
      setMessage(`AI 설정을 저장했습니다. 연결 테스트를 눌러 확인하면 자동 AI 기능이 켜집니다.`);
    } catch (error) {
      setMessage(`LLM 설정 실패: ${error.message}`, true);
    }
  };
  for (const input of [elements.llmEndpoint, elements.llmApiKey, elements.llmModel, elements.llmTemplate]) {
    input.addEventListener('change', persistLlmSettings);
  }
  // NH AI Gateway는 내부망 liteLLM 게이트웨이, OpenAI compatible은 외부망 공식 OpenAI API를
  // 가리키므로 서로 다른 네트워크 대상이다 - 이 두 Adapter를 선택하면 엔드포인트는 항상 그
  // Adapter의 고정 기본값으로 강제되고(잘못된 엔드포인트를 직접 입력해 발생하는 혼선을 원천 차단),
  // 입력란은 읽기 전용으로 잠긴다. Raw JSON template처럼 매핑에 없는 Adapter만 사용자가 직접
  // 엔드포인트를 입력할 수 있다. llmAdapter는 위 공용 change 루프에 넣지 않고 이 리스너 하나로만
  // 처리한다 - applyAdapterEndpointLock()으로 엔드포인트 값을 먼저 교정한 뒤에 persistLlmSettings를
  // 호출해야, 교정 전(과거) 엔드포인트 값이 저장되는 순서 버그가 생기지 않는다.
  elements.llmAdapter.addEventListener('change', () => {
    applyAdapterEndpointLock();
    persistLlmSettings();
  });

  elements.testLlmConnection.addEventListener('click', () => runLlmDiagnostic('connection').catch((error) => setMessage(`LLM 연결 테스트 실패: ${error.message}`, true)));
  elements.testLlmRecommendation.addEventListener('click', () => runLlmDiagnostic('recommendation').catch((error) => setMessage(`LLM 추천 테스트 실패: ${error.message}`, true)));
  elements.requestRecommendations.addEventListener('click', () => withBusy(elements.requestRecommendations, 'AI가 보는 중…', () => requestRecommendations()).catch((error) => setMessage(`추천 실패: ${error.message}`, true)));
  elements.requestTestCaseDescriptionButton.addEventListener('click', () => withBusy(elements.requestTestCaseDescriptionButton, 'AI가 쓰는 중…', () => requestTestCaseDescription(currentFeature())).catch((error) => setMessage(`${docType().descriptionLabel} 초안 실패: ${error.message}`, true)));
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message && message.type === 'EVIDENCE_CREATED') refreshEvidence().catch(() => {});
      // 녹화 중인 탭을 닫아 녹화가 끝난 경우 등, 편집기 밖에서 녹화 상태가 바뀌면 다시 읽는다.
      if (message && message.type === 'SESSION_CHANGED') {
        extensionStorage.get('captureSession').then((stored) => {
          session = stored.captureSession || null;
          renderSession();
          renderWorkspace();
          if (message.reason === 'tab-closed') setMessage('녹화 중인 탭이 닫혀 녹화를 종료했습니다.');
        }).catch(() => {});
      }
    });
  }

  bindInputs();
  CaptureITTooltip.install(document);
  load().catch((error) => setMessage(error.message, true));
})();
