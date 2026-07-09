(function initializeEditor() {
  const byId = (id) => document.getElementById(id);
  const elements = {
    addFeature: byId('add-feature'),
    captureMode: byId('capture-mode'),
    captureModeHint: byId('capture-mode-hint'),
    captureFirstHeading: byId('capture-first-heading'),
    recordingSummary: byId('recording-summary'),
    recordingSummaryScreens: byId('recording-summary-screens'),
    recordingSummaryInputs: byId('recording-summary-inputs'),
    recordingSummaryResults: byId('recording-summary-results'),
    recordingSummaryAiReady: byId('recording-summary-ai-ready'),
    changePurpose: byId('change-purpose'),
    changeSummary: byId('change-summary'),
    completionSummaryFeatures: byId('completion-summary-features'),
    completionSummaryPass: byId('completion-summary-pass'),
    completionSummaryFail: byId('completion-summary-fail'),
    completionSummaryNa: byId('completion-summary-na'),
    completionSummaryEvidence: byId('completion-summary-evidence'),
    completionSummaryAiImages: byId('completion-summary-ai-images'),
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
    openSaveProject: byId('open-save-project'),
    openSaveProjectMenu: byId('open-save-project-menu'),
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
    cancelSaveProject: byId('cancel-save-project'),
    saveProjectDialog: byId('save-project-dialog'),
    saveStatus: byId('save-status'),
    sessionStatus: byId('session-status'),
    showDownloadFolder: byId('show-download-folder'),
    showLastDownload: byId('show-last-download'),
    stageCapture: byId('stage-capture'),
    stageCompletion: byId('stage-completion'),
    stageMappingResult: byId('stage-mapping-result'),
    stageTabs: [
      byId('stage-tab-capture'),
      byId('stage-tab-mapping-result'),
      byId('stage-tab-completion'),
    ],
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
  // Wizard_Stage 오케스트레이션: 현재 활성 단계 인덱스(0~3). 저장소에 저장하지 않는 순수 UI 상태.
  let activeStageIndex = 0;
  let sessionButtonState = 'INACTIVE';
  // Auto_AI_Pipeline: 매핑 직후 "증적 설명 생성" → "테스트케이스 설명 자동 생성"이 자동으로
  // 순차 실행되는 동안의 진행 상태. { featureId, steps: [{ key, label, status }] } 형태이며
  // status는 'pending'|'active'|'done'|'error' 중 하나. 저장소에 저장하지 않는 순수 UI 상태로,
  // featureCard()가 이 값을 읽어 해당 feature 카드에만 진행 표시(체크리스트/그라데이션)를 그린다.
  let aiPipelineStatus = null;
  let aiPipelineClearTimer = null;

  const roleLabel = { before: '수행 전', action: '수행 시점', after: '수행 후' };
  // 캡처 모드 선택 UI는 기본 화면에서 제거됐으나(iOS 원칙 1, 2), 내부적으로는 항상 'event' 모드로
  // 동작한다. 이 텍스트는 IDLE/RECORDING 두 상태의 안내문으로 재사용된다.
  const captureStageHintText = {
    idle: '테스트를 평소처럼 진행하면 화면, DOM, API 맥락이 자동으로 저장됩니다.',
    recording: '테스트 화면을 평소처럼 조작하세요. 주요 화면은 자동으로 수집됩니다.',
  };

  // 3개 Wizard_Stage 컨테이너. 증적 확인, 테스트케이스 매핑, 결과 입력은 같은 단계에서 처리한다.
  const STAGE_CONTAINERS = [
    elements.stageCapture,
    elements.stageMappingResult,
    elements.stageCompletion,
  ];

  // 액션 식별자(wizard-stage.js의 planActions가 반환하는 문자열)와 실제 버튼 엘리먼트를 잇는 고정 맵.
  // 'import-images'는 hidden <input type="file">이 아니라 그것을 감싸는 <label class="file-button">이
  // 실제 클릭 가능한 엘리먼트이므로 그 label을 사용한다.
  const ACTION_ID_TO_BUTTON = {
    'start-session': elements.toggleSession,
    'end-session': elements.toggleSession,
    'import-images': document.querySelector('.file-button'),
    'add-feature': elements.addFeature,
    'request-recommendations': elements.requestRecommendations,
    'preview-report': elements.previewReport,
    'export-report': elements.exportReport,
    'open-save-project': elements.openSaveProject,
  };

  // 여러 액션 식별자가 같은 버튼을 공유할 수 있으므로(예: 'start-session'/'end-session'은 모두
  // elements.toggleSession을 가리킴), 버튼 엘리먼트 기준으로 그룹화해 한 버튼에 대해 정확히 한 번만
  // classList/hidden을 적용한다(같은 버튼을 두 번 순회하며 서로 다른 결과로 덮어쓰는 것을 방지).
  const BUTTON_TO_ACTION_IDS = new Map();
  for (const [actionId, button] of Object.entries(ACTION_ID_TO_BUTTON)) {
    if (!button) continue;
    if (!BUTTON_TO_ACTION_IDS.has(button)) BUTTON_TO_ACTION_IDS.set(button, []);
    BUTTON_TO_ACTION_IDS.get(button).push(actionId);
  }

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

  function currentFeature() {
    return editorState.features.find((feature) => feature.id === currentFeatureId) || null;
  }

  function createInitialReport(title = '새 QA 보고서') {
    const created = CaptureITDomain.createReport(title);
    created.features.push(CaptureITDomain.createFeature('새 테스트케이스'));
    return created;
  }

  function setMessage(message, error = false) {
    elements.editorMessage.textContent = message;
    elements.editorMessage.classList.toggle('message-error', error);
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

  // 녹화 중 수집 현황 요약: RecordingSession이 활성화된 동안 editorState.evidence를
  // triggerType 기준으로 집계해 "화면/입력 흐름/결과 메시지/AI 입력용 이미지" 4개 숫자로 보여준다
  // (iOS 원칙 6, 7 - 사용자가 지금 무엇이 쌓이고 있는지 설명 없이 이해할 수 있어야 한다).
  function computeRecordingSummary() {
    const evidenceList = editorState && Array.isArray(editorState.evidence) ? editorState.evidence : [];
    const screens = evidenceList.filter((item) => ['baseline', 'click', 'route-change', 'manual-pin', 'navigation'].includes(item.triggerType)).length;
    const inputs = evidenceList.filter((item) => item.triggerType === 'form-input').length;
    const results = evidenceList.filter((item) => (item.domAfter && (item.domAfter.resultMessages || []).length > 0)).length;
    const aiReady = evidenceList.filter((item) => Boolean(item.llmImageDataUrl)).length;
    return { screens, inputs, results, aiReady };
  }

  function renderRecordingSummary(active) {
    elements.recordingSummary.hidden = !active;
    if (!active) return;
    const summary = computeRecordingSummary();
    elements.recordingSummaryScreens.textContent = String(summary.screens);
    elements.recordingSummaryInputs.textContent = String(summary.inputs);
    elements.recordingSummaryResults.textContent = String(summary.results);
    elements.recordingSummaryAiReady.textContent = String(summary.aiReady);
  }

  // 첫 화면(IDLE)과 녹화 중 화면(RECORDING)을 하나의 섹션에서 텍스트/상태만 바꿔가며 표현한다
  // (iOS 원칙 3 - 한 화면에는 하나의 주 행동만 둔다: IDLE에서는 "녹화 시작", RECORDING에서는
  // "녹화 종료"만 강조된 primary CTA로 보인다).
  function renderSession() {
    const active = Boolean(session && session.active);
    if (sessionButtonState !== 'STARTING') sessionButtonState = active ? 'ACTIVE' : 'INACTIVE';
    const starting = sessionButtonState === 'STARTING';
    elements.sessionStatus.textContent = active ? 'RECORDING' : starting ? '녹화 시작 중…' : '';
    elements.sessionStatus.className = `status-pill ${active ? 'status-pill-recording' : 'status-pill-off'}`;
    elements.captureFirstHeading.textContent = active ? '녹화 중' : '테스트 화면을 녹화하세요';
    elements.captureModeHint.textContent = starting
      ? '녹화를 시작하고 있습니다…'
      : active ? captureStageHintText.recording : captureStageHintText.idle;
    elements.toggleSession.textContent = starting ? '녹화 시작 중…' : active ? '녹화 종료' : '녹화 시작';
    elements.toggleSession.disabled = starting;
    elements.toggleSession.classList.toggle('button-danger', active);
    elements.toggleSession.classList.toggle('button-primary', !active);
    elements.captureMode.disabled = starting || active;
    if (active) elements.captureMode.value = session.mode;
    renderRecordingSummary(active);
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
    // Header 단순화: "증적 n개"만 조용히 header에 표시한다(저장 위치 등 세부 정보는 더보기로 이동).
    elements.headerEvidenceCount.textContent = `증적 ${evidenceCount}개`;
  }

  function setMoreMenuOpen(open) {
    elements.moreMenu.hidden = !open;
    elements.openMoreMenu.setAttribute('aria-expanded', String(open));
  }

  function saveFeatureTitle(feature, value) {
    feature.title = value.trim() || '제목 없는 테스트케이스';
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

  // 판정 순환 순서: PASS -> FAIL -> N/A(null) -> PASS ... Default_Verdict_Selection이었던
  // 'PASS' 기본값 대신, 이제 판정 자체가 이 pill 클릭 즉시 feature.result.status에 반영된다
  // (별도 확인 단계 없음 - 완료 탭으로 이동하는 것 자체가 사용자의 최종 승인으로 간주된다).
  const VERDICT_CYCLE = ['PASS', 'FAIL', null];
  const VERDICT_LABEL = { PASS: 'PASS', FAIL: 'FAIL', null: 'N/A' };
  const TEST_CASE_STATUS_TO_VERDICT = { PASS: 'PASS', FAIL: 'FAIL', INCOMPLETE: null, NOT_JUDGED: null };

  async function cycleVerdict(feature) {
    const currentIndex = VERDICT_CYCLE.indexOf(feature.result.status ?? null);
    const nextValue = VERDICT_CYCLE[(currentIndex + 1) % VERDICT_CYCLE.length];
    feature.result.status = nextValue;
    await saveReport();
    renderFeatures();
    renderWarnings();
  }

  function verdictPill(feature) {
    const status = feature.result.status ?? null;
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `feature-status-pill verdict-${(status || 'na').toLowerCase()}`;
    pill.textContent = VERDICT_LABEL[status];
    pill.title = '클릭해서 판정 변경 (PASS → FAIL → N/A)';
    pill.setAttribute('aria-label', `판정: ${VERDICT_LABEL[status]}. 클릭해서 변경`);
    pill.addEventListener('click', (event) => {
      event.stopPropagation();
      cycleVerdict(feature).catch((error) => setMessage(`판정 변경 실패: ${error.message}`, true));
    });
    return pill;
  }

  // 카드를 선택하면 결과 입력 필드(기대/실제 결과)가 확장되고 매핑 대상 테스트케이스로 지정된다.
  // 선택된 증적 슬라이드 드로어(#feature-mapping-target)는 여기서 자동으로 열리지 않는다 -
  // 드로어는 featureDrawerToggleButton()의 명시적 클릭으로만 연다(요청: "오버레이로 바로 진입하지
  // 않고, 오버레이 진입 버튼을 단다"). 같은 카드를 다시 클릭하면 선택을 해제한다(토글).
  function selectFeature(featureId) {
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
    const pipeline = aiPipelineStatus && aiPipelineStatus.featureId === feature.id ? aiPipelineStatus : null;
    const generating = Boolean(pipeline && pipeline.steps.some((step) => step.status === 'active'));
    const card = document.createElement('article');
    card.className = `feature-item ${selected ? 'selected' : ''} ${generating ? 'ai-generating' : ''}`;
    card.dataset.featureId = feature.id;
    const onSelect = () => selectFeature(feature.id);
    card.addEventListener('click', onSelect);
    const header = document.createElement('div');
    header.className = 'feature-title-row';
    const indexLabel = document.createElement('span');
    indexLabel.className = 'feature-index';
    indexLabel.textContent = `${index + 1}.`;
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'feature-title-input';
    titleInput.value = feature.title || '';
    titleInput.placeholder = '테스트케이스명';
    titleInput.addEventListener('click', (event) => event.stopPropagation());
    titleInput.addEventListener('change', () => saveFeatureTitle(feature, titleInput.value));
    titleInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') titleInput.blur();
    });
    const status = verdictPill(feature);
    const drawerToggle = iconButton('선택된 증적 보기', 'eye', () => openFeatureDrawer(feature.id));
    drawerToggle.classList.add('feature-drawer-toggle');
    header.append(indexLabel, titleInput, status, drawerToggle);

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
    controls.append(
      iconButton('위로 이동', 'arrow-up', () => moveFeature(feature.id, -1), index === 0),
      iconButton('아래로 이동', 'arrow-down', () => moveFeature(feature.id, 1), index === editorState.features.length - 1),
      iconButton('테스트케이스 삭제', 'trash', () => removeFeature(feature.id), false, 'danger'),
    );
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
    descriptionLabel.textContent = '테스트케이스 설명';
    const description = document.createElement('textarea');
    description.className = 'feature-description-edit';
    description.rows = 2;
    description.placeholder = '테스트케이스 설명';
    description.value = feature.description || '';
    description.addEventListener('change', () => saveFeatureDescription(feature, description.value));
    descriptionField.append(descriptionLabel, description);

    // 카드가 선택됐을 때만 확장되어 보이는 결과 입력 영역(기대 결과/실제 결과).
    // 별도의 "테스트케이스 결과" 패널 없이 카드 자체에 통합되어 있다. 확장/축소는
    // max-height 트랜지션으로 아래로 부드럽게 펼쳐지는 느낌을 준다(grid-template-rows
    // 트랜지션은 브라우저 지원이 일정치 않아 애니메이션이 재생되지 않는 경우가 있어 사용하지 않는다).
    const resultFields = document.createElement('div');
    resultFields.className = 'feature-result-fields';
    const expectedField = document.createElement('label');
    expectedField.className = 'wide';
    expectedField.append('기대 결과');
    const expectedInput = document.createElement('textarea');
    expectedInput.rows = 2;
    expectedInput.value = feature.result.expectedResult || '';
    expectedInput.addEventListener('click', (event) => event.stopPropagation());
    expectedInput.addEventListener('change', () => saveFeatureExpectedResult(feature, expectedInput.value));
    expectedField.append(expectedInput);
    const actualField = document.createElement('label');
    actualField.className = 'wide';
    actualField.append('실제 결과');
    const actualInput = document.createElement('textarea');
    actualInput.rows = 2;
    actualInput.value = feature.result.actualResult || '';
    actualInput.addEventListener('click', (event) => event.stopPropagation());
    actualInput.addEventListener('change', () => saveFeatureActualResult(feature, actualInput.value));
    actualField.append(actualInput);
    resultFields.append(expectedField, actualField);

    card.append(header);
    if (pipelineChecklist) card.append(pipelineChecklist);
    card.append(descriptionField, resultFields, controls);
    return card;
  }

  function renderFeatures() {
    elements.featureList.replaceChildren(...editorState.features.map(featureCard));
    elements.noFeature.hidden = editorState.features.length > 0;
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
    elements.featureDetailHeading.textContent = feature.title || '제목 없는 테스트케이스';
    renderRecommendations();
    // Feature_Spec 매핑 안내 (요구사항 8.2, 8.3): 매핑된 Evidence가 없으면 매핑 유도 문구를,
    // 있으면 다음 입력 행동(기대 결과/실제 결과/판정)을 안내한다.
    if (feature.result.evidenceIds.length === 0) {
      elements.featureMappingGuidance.textContent = '이 테스트케이스에 Capture_Graph나 Evidence를 드래그하거나 매핑 버튼을 누르세요.';
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
      );
    } else {
      controls.append(button('연결', () => mapEvidence(evidence), !currentFeature()));
    }
    controls.append(button('삭제', () => removeEvidence(evidence.id)));
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
  function mapToFeatureButton(evidenceIds) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button button-secondary map-to-feature-button icon-action-button';
    button.title = '테스트케이스에 매핑';
    button.setAttribute('aria-label', '테스트케이스에 매핑');
    button.replaceChildren(iconSvg('link'));
    button.disabled = !currentFeature();
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const feature = currentFeature();
      if (!feature) {
        setMessage('먼저 테스트케이스를 선택하십시오.', true);
        return;
      }
      try {
        await mapEvidenceIds(evidenceIds, feature);
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
      setMessage('먼저 테스트케이스를 추가하십시오.', true);
      return;
    }
    quickMappingEvidenceIds = evidenceIds;
    const feature = currentFeature();
    const options = editorState.features.map((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.title || '제목 없는 테스트케이스';
      option.selected = Boolean(feature && item.id === feature.id);
      return option;
    });
    elements.quickMappingFeature.replaceChildren(...options);
    elements.quickMappingVerification.value = '';
    elements.quickMappingExpectedResult.value = '';
    elements.quickMappingActualResult.value = '';
    elements.quickMappingDialog.showModal();
  }

  // 더블클릭이 카드/노드 내부의 버튼(펼치기, 이 기능에 매핑)을 눌렀을 때도 발생하므로,
  // 버튼 클릭이었으면 Quick_Mapping_Dialog를 열지 않는다.
  function isButtonTarget(event) {
    return Boolean(event.target.closest('button'));
  }

  function mappedFeatureTitle(evidence) {
    if (!evidence.featureSpecId) return '';
    const feature = editorState.features.find((item) => item.id === evidence.featureSpecId);
    return feature ? feature.title || '제목 없는 테스트케이스' : '매핑된 테스트케이스';
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
    node.draggable = true;
    node.addEventListener('dragstart', (event) => {
      event.stopPropagation();
      event.dataTransfer.setData('application/x-captureit-evidence-ids', JSON.stringify([evidence.id]));
    });
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

  function captureGraphCard(group) {
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
    card.draggable = true;
    card.addEventListener('dragstart', (event) => {
      // 드래그 아예 끄자: 제목 입력란(또는 다른 input/textarea) 안에서 시작된 상호작용은
      // 카드 전체를 드래그하지 않아야 한다 - 텍스트 선택 제스처가 이벤트 버블링으로 이 카드의
      // dragstart로 올라오는 경우를 여기서 한 번 더 막는다(titleInput 자체의 draggable=false와
      // dragstart preventDefault에 더한 안전망).
      if (event.target.closest('input, textarea')) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.setData('application/x-captureit-evidence-ids', JSON.stringify(group.evidenceIds));
    });
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
    // 드래그 아예 끄자: 이 입력란에서 텍스트를 선택/편집하는 제스처가 조상(card)의
    // draggable=true로 인해 카드 전체 드래그로 이어지지 않도록 입력란 자체의 드래그를 끈다.
    titleInput.setAttribute('draggable', 'false');
    titleInput.addEventListener('dragstart', (event) => event.preventDefault());
    titleInput.addEventListener('mousedown', (event) => event.stopPropagation());
    titleInput.addEventListener('click', (event) => event.stopPropagation());
    titleInput.addEventListener('change', () => { saveEvidenceGroupLabel(group, titleInput.value); });

    const headerActions = document.createElement('div');
    headerActions.className = 'capture-graph-header-actions';
    headerActions.append(
      mapToFeatureButton(group.evidenceIds),
      // LLM 추천 세트 제목: 테스트케이스 선택(currentFeature())과 무관하게 항상 사용 가능해야 한다 -
      // 제목 추천은 evidence 세트 단위 작업이며 매핑 여부에 의존하지 않는다.
      iconButton('제목 추천받기', 'sparkle', () => {
        requestEvidenceGroupTitleSuggestion(group).catch((error) => setMessage(`제목 추천 실패: ${error.message}`, true));
      }),
      iconButton('세트 연결 해제', 'link-off', () => unmapEvidenceGroup(group.evidenceIds), mappedFeatureIds.length === 0),
      iconButton('세트 삭제', 'trash', () => removeEvidenceGroup(group.evidenceIds), false, 'danger'),
    );
    header.append(titleInput, headerActions);

    const body = document.createElement('div');
    body.className = 'capture-graph-body capture-graph-nodes';
    body.append(...items.map((item) => captureNode(item, group.evidenceIds)));

    if (group.count > 1) {
      let expanded = false;
      body.hidden = true;
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'capture-graph-toggle';
      toggle.title = '펼치기';
      toggle.setAttribute('aria-label', '펼치기');
      toggle.replaceChildren(iconSvg('chevronDown'));
      toggle.addEventListener('click', () => {
        expanded = !expanded;
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
    elements.evidenceDetailTitle.textContent = `증적 ${evidenceDetailIndex + 1}/${evidenceDetailIds.length} · #${evidence.sequenceNo} · ${evidence.triggerType}`;
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
    elements.evidenceDetailMeta.textContent = JSON.stringify(evidenceSummary(evidence), null, 2);
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
    await removeEvidence(evidenceId);
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

  function renderRecentEvidence() {
    const evidence = latestEvidence();
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

  function renderEvidence() {
    // 리렌더링으로 DOM이 교체되면 이전에 hover 상태였던 프리뷰가 고아 상태로 남을 수 있으므로 항상 숨긴다.
    hideNodeContextPreview();
    const query = elements.evidenceSearch.value.trim().toLowerCase();
    const evidenceItems = editorState.evidence.filter((item) => !query || evidenceSearchText(item).includes(query));
    const graphs = CaptureITDomain.groupIntoCaptureSessionSets(evidenceItems);
    elements.evidenceInbox.replaceChildren(...graphs.map((group) => captureGraphCard(group)));
    const feature = currentFeature();
    const mapped = feature ? feature.result.evidenceIds
      .map((id) => editorState.evidence.find((item) => item.id === id))
      .filter(Boolean) : [];
    elements.mappedEvidence.replaceChildren(...mapped.map((item, index) => evidenceCard(item, true, index)));
    renderRecentEvidence();
    scheduleMappingLinks();
  }

  function graphLinkSources(graph, featureId) {
    return [graph.querySelector('.capture-graph-header') || graph];
  }

  function renderMappingLinks() {
    const layer = elements.mappingLinkLayer;
    if (!layer) return;
    layer.replaceChildren();
    if (activeStageIndex !== 1 || elements.stageMappingResult.hidden) return;

    const stageRect = elements.stageMappingResult.getBoundingClientRect();
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

  function renderWarnings() {
    if (!report) return;
    const warnings = CaptureITDomain.validationWarnings(report);
    elements.validationWarnings.replaceChildren(...warnings.map((warning) => {
      const item = document.createElement('li');
      const feature = warning.featureId && editorState.features.find((entry) => entry.id === warning.featureId);
      item.textContent = `${feature ? `${feature.title}: ` : ''}${warning.message}`;
      return item;
    }));
  }

  // 완료 단계 요약: 검증 항목 수/PASS/FAIL/N/A 판정 분포, 문서에 포함되는(매핑된) 증적 수(중복 제거),
  // AI 입력용 이미지(llmImageDataUrl 보유) 수를 계산한다. renderStage()가 호출될 때마다 함께
  // 갱신되므로 완료 단계가 보이지 않는 동안에도 데이터가 항상 최신 상태로 유지된다.
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
    const aiImages = evidenceList.filter((item) => Boolean(item.llmImageDataUrl)).length;

    return { features: features.length, pass, fail, na, evidence: mappedEvidenceIds.size, aiImages };
  }

  function renderCompletionSummary() {
    const summary = computeCompletionSummary();
    elements.completionSummaryFeatures.textContent = String(summary.features);
    elements.completionSummaryPass.textContent = String(summary.pass);
    elements.completionSummaryFail.textContent = String(summary.fail);
    elements.completionSummaryNa.textContent = String(summary.na);
    elements.completionSummaryEvidence.textContent = String(summary.evidence);
    elements.completionSummaryAiImages.textContent = String(summary.aiImages);
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

  // 단계별 다음 행동 안내(요구사항 8.1~8.7). 조건들을 우선순위대로 확인해 해당하는 문구들을 모아
  // #guidance-banner에 표시한다. 표시할 문구가 없으면 배너를 숨긴다.
  function renderGuidance() {
    const messages = [];
    // 8.6/8.1: 캡처 세션 활성 여부에 따른 안내. 세션이 비활성이고 아직 아무 Evidence도 없으면
    // "캡처 시작/이미지 불러오기" 안내로 흡수한다.
    if (session && session.active) {
      messages.push('캡처 세션이 진행 중입니다.');
    } else {
      messages.push('캡처를 시작하거나 이미지를 불러오세요.');
    }
    // 8.5: Feature_Spec이 하나도 없으면 추가부터 안내.
    if (editorState.features.length === 0) {
      messages.push('테스트케이스를 추가한 뒤 증적을 연결하세요.');
    }
    // 8.4: Draft_Report 상태면 저장이 선택 사항임을 안내.
    if (report && report.isDraft) {
      messages.push('저장은 선택사항입니다. 미리보기나 ZIP 생성 후에 해도 됩니다.');
    }
    // 8.7: Report_Draft_Suggestion 다이얼로그가 열려 있으면 승인/수정 안내.
    if (elements.reportDraftSuggestionDialog.open) {
      messages.push('제안된 보고서명과 형상·체크아웃 개요는 승인 또는 수정 후 저장됩니다.');
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

  // editorState/report/session으로부터 wizard-stage.js가 요구하는 snapshot을 만든다.
  function currentStageSnapshot() {
    return {
      evidenceCount: editorState.evidence.length,
      featureCount: editorState.features.length,
      mappedFeatureCount: editorState.features.filter((feature) => feature.result.evidenceIds.length > 0).length,
      sessionActive: Boolean(session && session.active),
    };
  }

  // planActions의 결과를 실제 button 엘리먼트의 CSS 클래스/hidden 속성에 반영한다.
  // 버튼 자체(핸들러, disabled 로직)는 기존 코드를 그대로 사용하고, 여기서는 오직
  // 'button-primary'/'button-secondary' 클래스와 hidden만 토글한다.
  function applyActionPlan(snapshot) {
    const context = {
      sessionActive: snapshot.sessionActive,
      currentFeatureHasMappedEvidence: Boolean(currentFeature() && currentFeature().result.evidenceIds.length > 0),
    };
    const plan = CaptureITWizardStage.planActions(activeStageIndex, context);
    for (const [button, actionIds] of BUTTON_TO_ACTION_IDS) {
      const isPrimary = actionIds.some((actionId) => plan.primary === actionId);
      const isSecondary = !isPrimary && actionIds.some((actionId) => plan.secondary.includes(actionId));
      button.classList.toggle('button-primary', isPrimary);
      button.classList.toggle('button-secondary', isSecondary);
      button.hidden = !isPrimary && !isSecondary;
    }
  }

  // 이 함수가 4개의 공유 영역을 현재 activeStageIndex에 맞는 컨테이너로 재배치하고,
  // 각 stage 컨테이너의 hidden 속성을 갱신하고, 탭의 disabled/active 상태와 planActions 결과에
  // 따른 button-primary/button-secondary 클래스를 다시 적용한다.
  // evidence-drop-zone/feature-panel/feature-mapping-target/.actions는 모두 stage-mapping-result
  // 안에 정적으로 배치되어 있어(더 이상 여러 단계에 걸쳐 재배치되지 않음) mountRegion 호출이 필요 없다.
  function renderStage() {
    const snapshot = currentStageSnapshot();
    if (activeStageIndex < 0 || activeStageIndex >= STAGE_CONTAINERS.length) activeStageIndex = 0;

    STAGE_CONTAINERS.forEach((container, index) => {
      container.hidden = index !== activeStageIndex;
      elements.stageTabs[index].disabled = false;
      elements.stageTabs[index].classList.toggle('active', index === activeStageIndex);
    });

    applyActionPlan(snapshot);
    renderCompletionSummary();
    scheduleMappingLinks();
  }

  // 탭 클릭/다음 단계 버튼 클릭 시 호출: 단계 탭은 데이터 충족 여부와 무관하게 직접 렌더링한다.
  function goToStage(targetIndex) {
    if (targetIndex >= 0 && targetIndex < STAGE_CONTAINERS.length) activeStageIndex = targetIndex;
    renderStage();
  }

  function renderAll() {
    renderReportSelector();
    renderReportFields();
    renderSession();
    renderFeatures();
    renderFeature();
    renderEvidence();
    renderWarnings();
    renderStorageStatus();
    renderGuidance();
    renderStage();
  }

  async function refreshReportSummaries() {
    const reports = await CaptureITStorage.listReports();
    reportSummaries = reports.map((item) => ({ id: item.id, title: item.title, updatedAt: item.updatedAt }));
    await extensionStorage.set({ reportIndex: reportSummaries, activeReportId: report && report.id });
    renderReportSelector();
  }

  async function saveReport() {
    if (!report) return;
    report.features = editorState.features;
    report.updatedAt = new Date().toISOString();
    elements.saveStatus.textContent = '저장 중…';
    await CaptureITStorage.putReport(report);
    await refreshReportSummaries();
    elements.saveStatus.textContent = '저장됨';
    renderWarnings();
    renderStorageStatus();
  }

  function queueSave() {
    saveQueue = saveQueue.then(saveReport).catch((error) => setMessage(`저장 실패: ${error.message}`, true));
    return saveQueue;
  }

  async function submitSaveAsProject() {
    const draftReport = CaptureITDomain.ensureDraftReport(report);
    draftReport.features = editorState.features;
    let saved;
    try {
      saved = CaptureITDomain.saveAsProject(draftReport, {
        projectName: elements.projectName.value,
        title: elements.reportTitle.value,
        author: elements.reportAuthor.value,
        changePurpose: elements.changePurpose.value,
        changeSummary: elements.changeSummary.value,
        configurationOverview: elements.configurationOverview.value,
      });
    } catch (error) {
      setMessage(error.message, true);
      elements.projectName.focus();
      return;
    }
    saved.updatedAt = new Date().toISOString();
    report = saved;
    await CaptureITStorage.putReport(report);
    await refreshReportSummaries();
    renderAll();
    elements.saveProjectDialog.close();
    setMessage('프로젝트로 저장되었습니다.');
  }

  async function loadReport(reportId) {
    const loaded = await CaptureITStorage.getReport(reportId);
    if (!loaded) throw new Error('보고서를 찾을 수 없습니다.');
    report = loaded;
    const evidence = await CaptureITStorage.listEvidence();
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
    if (!report || !confirm(`'${report.title}' 보고서를 삭제하시겠습니까?`)) return;
    const removedFeatureIds = new Set(report.features.map((feature) => feature.id));
    for (const evidence of editorState.evidence) {
      if (!removedFeatureIds.has(evidence.featureSpecId)) continue;
      evidence.featureSpecId = null;
      await CaptureITStorage.putEvidence(evidence);
    }
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
    const feature = CaptureITDomain.addFeature(editorState, '새 테스트케이스');
    currentFeatureId = feature.id;
    await saveReport();
    renderFeatures();
    renderFeature();
    renderEvidence();
    renderStage();
  }

  async function moveFeature(featureId, offset) {
    CaptureITDomain.moveFeature(editorState, featureId, offset);
    await saveReport();
    renderFeatures();
  }

  async function removeFeature(featureId) {
    const feature = editorState.features.find((item) => item.id === featureId);
    if (!feature || !confirm(`'${feature.title}' 테스트케이스를 삭제하시겠습니까?`)) return;
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
    renderStage();
  }

  async function mapEvidence(evidence) {
    const feature = currentFeature();
    if (!feature) throw new Error('먼저 테스트케이스를 선택하십시오.');
    CaptureITDomain.mapEvidence(editorState, evidence.id, feature.id);
    await CaptureITStorage.putEvidence(evidence);
    await saveReport();
    renderEvidence();
    renderRecommendations();
    renderStage();
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
    renderStage();
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
    renderRecommendations();
    renderStage();
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
    renderStage();
    elements.quickMappingDialog.close();
    setMessage('빠른 매핑을 완료했습니다.');
    // Auto_AI_Pipeline: Quick_Mapping_Dialog로 매핑을 마친 경우도 mapEvidenceIds 경로와
    // 동일하게 자동으로 "증적 설명 생성" → "테스트케이스 설명 자동 생성"을 순서대로 호출한다.
    const mappedFeature = editorState.features.find((item) => item.id === featureId);
    if (mappedFeature) autoRunAiPipelineForFeature(mappedFeature);
  }

  // 드래그된 데이터가 CaptureIT evidence-ids 페이로드인지 확인한다(이미지 파일 드롭 등 다른 종류의 드래그와 구분).
  function draggedEvidenceIdsType(event) {
    return Boolean(event.dataTransfer && Array.from(event.dataTransfer.types || []).includes('application/x-captureit-evidence-ids'));
  }

  // dataTransfer에서 evidence-ids 배열을 안전하게 읽는다. 파싱 실패/빈 배열이면 null을 반환한다.
  function readDraggedEvidenceIds(event) {
    const raw = event.dataTransfer.getData('application/x-captureit-evidence-ids');
    if (!raw) return null;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  }

  async function dropEvidenceIdsOnFeature(event) {
    event.preventDefault();
    elements.mappedEvidence.classList.remove('dragover');
    const evidenceIds = readDraggedEvidenceIds(event);
    if (!evidenceIds) return;
    const feature = currentFeature();
    if (!feature) {
      setMessage('먼저 테스트케이스를 선택하십시오.', true);
      return;
    }
    await mapEvidenceIds(evidenceIds, feature);
  }

  async function removeEvidence(evidenceId) {
    if (!confirm('이 증적을 삭제하시겠습니까? 캡처 순번은 재사용되지 않습니다.')) return;
    for (const feature of editorState.features) {
      feature.result.evidenceIds = feature.result.evidenceIds.filter((id) => id !== evidenceId);
    }
    editorState.evidence = editorState.evidence.filter((item) => item.id !== evidenceId);
    editorState = CaptureITDomain.createEditorState(editorState.evidence, editorState.features);
    await CaptureITStorage.deleteEvidence(evidenceId);
    await saveReport();
    renderEvidence();
    renderFeatures();
    renderRecommendations();
    renderStage();
  }

  // Feature_Group_Actions: capture-graph(세션) 헤더의 "세트 삭제" 버튼. removeEvidence의
  // 삭제/저장/렌더링 순서를 그대로 evidenceIds 배열 전체에 적용한다.
  async function removeEvidenceGroup(evidenceIds) {
    if (!confirm(`이 증적 세트(${evidenceIds.length}개)를 삭제하시겠습니까? 캡처 순번은 재사용되지 않습니다.`)) return;
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
    renderStage();
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
    if (!sessionId) return;
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
      throw new Error('확장 런타임에서만 RecordingSession을 시작할 수 있습니다.');
    }
    const tab = await activeTabForRecording();
    const response = await chrome.runtime.sendMessage({
      type: 'START_RECORDING_SESSION',
      tabId: tab && tab.id,
      windowId: tab && tab.windowId,
      recordingPolicy: CaptureITDomain.defaultRecordingPolicy({ mode: elements.captureMode.value }),
      captureBaselineContext: baselineContextForRecordingStart(),
    });
    if (!response || !response.ok) throw new Error(response && response.error ? response.error : 'RecordingSession 시작 실패');
    return response.session;
  }

  async function stopRecordingSessionRequest() {
    if (typeof chrome === 'undefined' || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
      throw new Error('확장 런타임에서만 RecordingSession을 종료할 수 있습니다.');
    }
    const tab = await activeTabForRecording();
    const response = await chrome.runtime.sendMessage({
      type: 'STOP_RECORDING_SESSION',
      sessionId: session && session.id,
      windowId: tab && tab.windowId,
    });
    if (!response || !response.ok) throw new Error(response && response.error ? response.error : 'RecordingSession 종료 실패');
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
      setMessage('녹화를 시작했습니다.');
    } catch (error) {
      sessionButtonState = 'INACTIVE';
      renderSession();
      throw error;
    }
    renderSession();
    renderStage();
  }

  async function stopRecordingSession() {
    const stoppedSessionId = session && session.id;
    session = await stopRecordingSessionRequest();
    sessionButtonState = 'INACTIVE';
    renderSession();
    renderStage();
    setMessage('녹화를 종료했습니다.');
    // Auto_Title_On_Session_Stop: 방금 끝난 세션의 증적 그룹에 한해서만, 세션이 종료되는
    // 이 시점 단 한 번 제목 추천을 자동으로 호출한다(captureGraphCard 재렌더링과는 무관).
    autoRequestSessionTitleForSession(stoppedSessionId);
  }

  async function toggleSession() {
    if (sessionButtonState === 'STARTING') return;
    if (session && session.active) {
      await stopRecordingSession();
      renderStage();
      return;
    }
    await toggleRecordingSession();
    renderStage();
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
      setMessage(`Draft_Report 저장 실패: ${error.message}`, true);
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

  async function importImages(files) {
    await ensureDraftReportForCapture();
    if (!session) {
      session = CaptureITDomain.createSession('manual');
      session.active = false;
    }
    const rejected = [];
    for (const file of files) {
      try {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('지원하지 않는 형식');
        const imageDataUrl = await readFileAsDataUrl(file);
        await loadImage(imageDataUrl);
        const evidence = {
          id: crypto.randomUUID(),
          sessionId: session.id,
          sequenceNo: CaptureITDomain.nextSequence(session),
          capturedAt: new Date(file.lastModified || Date.now()).toISOString(),
          triggerType: 'file-import',
          source: 'file-import',
          featureSpecId: null,
          previousCaptureId: session.lastEvidenceId || null,
          nextCaptureId: null,
          description: '',
          context: { pageTitle: file.name, target: { visibleText: file.name } },
          imageDataUrl,
          imageBlob: file,
        };
        if (evidence.previousCaptureId) {
          const previous = editorState.evidence.find((item) => item.id === evidence.previousCaptureId);
          if (previous) {
            previous.nextCaptureId = evidence.id;
            await CaptureITStorage.putEvidence(previous);
          }
        }
        session.lastEvidenceId = evidence.id;
        await CaptureITStorage.putEvidence(evidence);
        editorState.evidence.push(evidence);
      } catch (error) {
        rejected.push(`${file.name} (${error.message})`);
      }
    }
    await CaptureITStorage.putSession(session);
    editorState = CaptureITDomain.createEditorState(editorState.evidence, editorState.features);
    renderEvidence();
    renderStorageStatus();
    renderStage();
    setMessage(rejected.length ? `제외된 파일: ${rejected.join(', ')}` : `${files.length}개 이미지를 수집된 증적에 추가했습니다.`, rejected.length > 0);
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

  async function ensureLlmImage(evidence) {
    if (evidence.llmImageDataUrl) return evidence;
    if (!evidence.imageDataUrl) throw new Error(`이미지가 없는 증적입니다: ${evidence.id}`);
    await CaptureITScreenshotCropper.ensureLlmImage(evidence, cropOptionsForEvidence(evidence));
    await CaptureITStorage.putEvidence(evidence);
    return evidence;
  }

  async function ensureDocImage(evidence) {
    if (evidence.docImageDataUrl) return evidence;
    if (!evidence.imageDataUrl) throw new Error(`이미지가 없는 증적입니다: ${evidence.id}`);
    await CaptureITScreenshotCropper.ensureDocImage(evidence, cropOptionsForEvidence(evidence));
    await CaptureITStorage.putEvidence(evidence);
    return evidence;
  }

  // Bug_Fullscreen_Thumbnail 대응: evidence.imageDataUrl은 항상 캡처 시점의 전체 화면
  // 스크린샷이라 초점 없이 풀스크린으로만 보인다. 이미 크롭된 evidence.docImageDataUrl이 있으면
  // 그것으로 즉시 보여주고, 없으면 렌더링을 막지 않도록 일단 전체 이미지를 먼저 보여준 뒤
  // 백그라운드에서 ensureDocImage(기존 문서용 크롭 로직, LLM 이미지와 별개 필드)를 비동기로
  // 실행해서 완료되면 그 특정 <img> 엘리먼트의 src만 교체한다(전체 재렌더링을 트리거하지 않아
  // 스크롤 위치/포커스 등 사용자 상호작용을 방해하지 않는다). 크롭 실패는 조용히 무시하고
  // 이미 보이고 있는 전체 이미지를 그대로 유지한다(사용자에게 에러를 노출하지 않는 배경 개선).
  function swapToCroppedThumbnailWhenReady(evidence, imageElement) {
    if (evidence.docImageDataUrl) return;
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

  async function postLlm(payload) {
    await saveLlmSettings();
    const settings = readLlmSettings();
    const adapterRequest = CaptureITLlm.buildAdapterRequest({ ...settings, payload });
    const response = await fetch(adapterRequest.url, adapterRequest.options);
    const body = await responseBody(response);
    if (!response.ok) {
      const error = new Error(`내부망 LLM 응답 오류: HTTP ${response.status}`);
      error.status = response.status;
      error.responseBody = body;
      throw error;
    }
    return CaptureITLlm.parseAdapterResponse(body);
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
      const response = await fetch(adapterRequest.url, adapterRequest.options);
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
    if (!feature) throw new Error('테스트케이스를 선택하십시오.');
    if (editorState.evidence.length === 0) throw new Error('추천할 증적이 없습니다.');
    const isCurrentFeature = feature.id === (currentFeature() && currentFeature().id);
    if (isCurrentFeature) elements.requestRecommendations.disabled = true;
    setMessage('1단계: 캡처 맥락과 순서로 후보를 선정하고 있습니다.');
    try {
      const stageOne = CaptureITLlm.buildStageOne(feature, editorState.evidence, report.changePurpose);
      const candidateIds = validateCandidateIds(await postLlm(stageOne));
      setMessage('2단계: 후보와 인접 이미지로 최종 증적을 추천하고 있습니다.');
      for (const evidence of candidateAndAdjacentEvidence(candidateIds)) await ensureThumbnail(evidence);
      // Bug_Context_Length_Exceeded 대응: 후보+인접 evidence 수가 많으면 이미지를 전부 payload에
      // 실었을 때 LLM의 컨텍스트 한도(HTTP 400)를 넘길 수 있으므로, 기존 recordingPolicy의
      // maxLlmImagesPerFeature 정책(기본 5장)을 그대로 재사용해 이미지 개수를 제한한다.
      const maxImages = report && report.recordingPolicy && report.recordingPolicy.maxLlmImagesPerFeature
        || CaptureITDomain.defaultRecordingPolicy().maxLlmImagesPerFeature;
      const stageTwo = CaptureITLlm.buildStageTwo(feature, editorState.evidence, candidateIds, report.changePurpose, { maxImages });
      const validated = CaptureITLlm.validateRecommendations(
        await postLlm(stageTwo),
        new Set(editorState.evidence.map((item) => item.id)),
      );
      if (validated.featureSpecId !== feature.id) throw new Error('다른 테스트케이스의 추천 결과가 반환되었습니다.');
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
    description: '테스트케이스 설명 자동 생성',
  };

  function setAiPipelineStepStatus(stepKey, status) {
    if (!aiPipelineStatus) return;
    const step = aiPipelineStatus.steps.find((item) => item.key === stepKey);
    if (step) step.status = status;
    renderFeatures();
  }

  // feature-item 목록에 진행 중인 파이프라인 정보를 표시하기 위한 상태를 만든다. renderFeatures()가
  // 이 상태를 읽어 해당 feature 카드에 ai-generating 클래스(무지개 그라데이션)와 체크리스트를 그린다.
  function startAiPipeline(featureId) {
    if (aiPipelineClearTimer) {
      clearTimeout(aiPipelineClearTimer);
      aiPipelineClearTimer = null;
    }
    aiPipelineStatus = {
      featureId,
      steps: [
        { key: 'recommendations', label: AI_PIPELINE_STEP_LABELS.recommendations, status: 'active' },
        { key: 'description', label: AI_PIPELINE_STEP_LABELS.description, status: 'pending' },
      ],
    };
    renderFeatures();
  }

  // 완료된 체크리스트(✓✓)를 사용자가 잠깐 볼 수 있게 남겨둔 뒤 일정 시간 후 지운다.
  function finishAiPipeline() {
    aiPipelineClearTimer = setTimeout(() => {
      aiPipelineStatus = null;
      aiPipelineClearTimer = null;
      renderFeatures();
    }, 2500);
  }

  // 두 LLM 호출을 순서대로 실행한다: 1단계(증적 설명 생성)가 끝나야 2단계(테스트케이스 설명
  // 자동 생성)가 시작된다. 1단계가 실패해도 2단계는 계속 시도한다(서로 독립적인 기능이므로 하나의
  // 실패가 나머지를 막을 필요는 없다) - 각 단계의 성공/실패는 체크리스트에 개별적으로 반영된다.
  async function runAutoAiPipeline(feature) {
    startAiPipeline(feature.id);
    try {
      await requestRecommendations(feature);
      setAiPipelineStepStatus('recommendations', 'done');
    } catch (error) {
      setAiPipelineStepStatus('recommendations', 'error');
      setMessage(`증적 설명 자동 생성 실패: ${error.message}`, true);
    }
    setAiPipelineStepStatus('description', 'active');
    // requestTestCaseDescription은 postLlm 실패 시 내부에서 이미 setMessage로 알리고 null을
    // 반환하지만(throw하지 않음), 매핑된 증적이 없는 등 사전 조건 실패는 여전히 throw할 수 있으므로
    // 여기서도 방어적으로 감싼다.
    try {
      const descriptionResult = await requestTestCaseDescription(feature);
      setAiPipelineStepStatus('description', descriptionResult ? 'done' : 'error');
    } catch (error) {
      setAiPipelineStepStatus('description', 'error');
      setMessage(`테스트케이스 설명 자동 생성 실패: ${error.message}`, true);
    }
    finishAiPipeline();
  }

  function autoRunAiPipelineForFeature(feature) {
    runAutoAiPipeline(feature).catch(() => {});
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

  function applyTestCaseDescription(feature, validated) {
    feature.description = [
      `목적: ${validated.testPurpose}`,
      `사전조건: ${validated.preconditions}`,
      `절차: ${validated.testProcedure}`,
      `판단 근거: ${validated.judgementBasis}`,
    ].filter(Boolean).join('\n');
    feature.result.expectedResult = validated.expectedResult;
    feature.result.actualResult = validated.actualResult;
    feature.result.verification = validated.judgementBasis;
    feature.result.status = TEST_CASE_STATUS_TO_VERDICT[validated.finalStatus];
  }

  async function requestTestCaseDescription(feature) {
    if (!feature) throw new Error('테스트케이스를 선택하십시오.');
    const evidenceItems = evidenceForFeature(feature);
    if (evidenceItems.length === 0) throw new Error('테스트케이스에 매핑된 증적이 없습니다.');
    setMessage('테스트케이스 설명을 생성하고 있습니다.');
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
      setMessage('테스트케이스 설명을 반영했습니다.');
      return validated;
    } catch (error) {
      setMessage(`테스트케이스 설명 생성 실패: ${error.message}`, true);
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
      { name: 'report.html', data: CaptureITReport.renderHtml(manifest) },
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

  async function exportReport() {
    await saveReport();
    const { entries, manifest } = buildExportEntries();
    setMessage(`ZIP 생성 중 · ${entries.length}개 파일 처리`);
    const archive = await CaptureITZip.writeZip(entries);
    const url = URL.createObjectURL(archive);
    const filename = `CaptureIT/${report.id}-qa-result.zip`;
    try {
      const downloadId = await chrome.downloads.download({ url, filename, saveAs: true });
      await rememberExport(downloadId, filename, 'report');
      setMessage(`ZIP 생성 완료 · ${manifest.summary.total}개 테스트케이스 · ${manifest.overallStatus}`);
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
    requestReportDraftSuggestion().catch(() => {});
  }

  async function exportEvidenceOnly() {
    const { entries, manifest } = buildEvidenceOnlyEntries();
    if (manifest.totalEvidence === 0) throw new Error('내보낼 증적이 없습니다.');
    setMessage(`증적 ZIP 생성 중 · ${entries.length}개 파일 처리`);
    const archive = await CaptureITZip.writeZip(entries);
    const url = URL.createObjectURL(archive);
    const filename = `CaptureIT/${report && report.id || 'captureit'}-evidence-only.zip`;
    try {
      const downloadId = await chrome.downloads.download({ url, filename, saveAs: true });
      await rememberExport(downloadId, filename, 'evidence-only');
      setMessage(`증적 ZIP 생성 완료 · ${manifest.totalEvidence}개 증적`);
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 30000);
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
    const parsed = new DOMParser().parseFromString(CaptureITReport.renderHtml(manifest), 'text/html');
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

  function updateReportFromInputs() {
    if (!report) return;
    report.title = elements.reportTitle.value;
    report.projectName = elements.projectName.value;
    report.author = elements.reportAuthor.value;
    report.changePurpose = elements.changePurpose.value;
    report.changeSummary = elements.changeSummary.value;
    report.configurationOverview = elements.configurationOverview.value;
    queueSave();
  }

  // 테스트케이스 필드(제목/설명/기대결과/실제결과)는 각 카드가 자체 change 리스너로
  // saveFeatureTitle/saveFeatureDescription/saveFeatureExpectedResult/saveFeatureActualResult를
  // 직접 호출하므로, 여기서는 보고서 식별 정보 입력만 바인딩한다.
  function bindInputs() {
    for (const input of [
      elements.reportTitle,
      elements.projectName,
      elements.reportAuthor,
      elements.changePurpose,
      elements.changeSummary,
      elements.configurationOverview,
    ]) input.addEventListener('change', updateReportFromInputs);
  }

  async function refreshEvidence() {
    const evidence = await CaptureITStorage.listEvidence();
    editorState = CaptureITDomain.createEditorState(evidence, editorState.features);
    renderEvidence();
    renderWarnings();
    renderStorageStatus();
    // 녹화 중 화면의 수집 현황 숫자(화면/입력 흐름/결과 메시지/AI 입력용 이미지)를 새 증적이
    // 생성될 때마다 최신 상태로 갱신한다.
    renderRecordingSummary(Boolean(session && session.active));
  }

  async function load() {
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
    ]);
    session = stored.captureSession || null;
    lastExport = stored.lastExport || null;
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
      const evidence = await CaptureITStorage.listEvidence();
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
  elements.imageImport.addEventListener('change', () => importImages([...elements.imageImport.files]).catch((error) => setMessage(error.message, true)));
  elements.evidenceSearch.addEventListener('input', renderEvidence);
  window.addEventListener('resize', scheduleMappingLinks);
  for (const eventName of ['dragenter', 'dragover']) {
    elements.evidenceDropZone.addEventListener(eventName, (event) => { event.preventDefault(); elements.evidenceDropZone.classList.add('dragging'); });
  }
  for (const eventName of ['dragleave', 'drop']) {
    elements.evidenceDropZone.addEventListener(eventName, (event) => { event.preventDefault(); elements.evidenceDropZone.classList.remove('dragging'); });
  }
  elements.evidenceDropZone.addEventListener('drop', (event) => importImages([...event.dataTransfer.files]).catch((error) => setMessage(error.message, true)));
  for (const eventName of ['dragenter', 'dragover']) {
    elements.mappedEvidence.addEventListener(eventName, (event) => {
      if (!draggedEvidenceIdsType(event)) return;
      event.preventDefault();
      elements.mappedEvidence.classList.add('dragover');
    });
  }
  elements.mappedEvidence.addEventListener('dragleave', (event) => {
    event.preventDefault();
    elements.mappedEvidence.classList.remove('dragover');
  });
  elements.mappedEvidence.addEventListener('drop', (event) => {
    dropEvidenceIdsOnFeature(event).catch((error) => setMessage(error.message, true));
  });
  elements.openViewer.addEventListener('click', openViewerPage);
  elements.exportReport.addEventListener('click', () => exportReport().catch((error) => setMessage(`보고서 생성 실패: ${error.message}`, true)));
  elements.exportEvidenceOnly.addEventListener('click', () => exportEvidenceOnly().catch((error) => setMessage(`증적 ZIP 생성 실패: ${error.message}`, true)));
  elements.showLastDownload.addEventListener('click', () => showLastDownloadFile().catch((error) => setMessage(error.message, true)));
  elements.showDownloadFolder.addEventListener('click', () => showDefaultDownloadFolder());
  elements.previewReport.addEventListener('click', () => previewReport().catch((error) => setMessage(`미리보기 실패: ${error.message}`, true)));
  elements.closeEvidenceDetail.addEventListener('click', () => elements.evidenceDetailDialog.close());
  elements.previousEvidenceDetail.addEventListener('click', () => moveEvidenceDetail(-1));
  elements.nextEvidenceDetail.addEventListener('click', () => moveEvidenceDetail(1));
  elements.deleteEvidenceDetail.addEventListener('click', () => removeEvidenceFromDetail().catch((error) => setMessage(`증적 삭제 실패: ${error.message}`, true)));
  elements.closeFeatureDetail.addEventListener('click', () => closeFeatureDrawer());
  elements.featureDetailBackdrop.addEventListener('click', () => closeFeatureDrawer());
  elements.stageTabs.forEach((button) => button.addEventListener('click', () => goToStage(Number(button.dataset.stageIndex))));
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
  elements.closeLlmSettings.addEventListener('click', () => elements.llmSettingsDialog.close());
  elements.openSaveProjectMenu.addEventListener('click', () => {
    renderReportFields();
    elements.saveProjectDialog.showModal();
  });
  elements.openSaveProject.addEventListener('click', () => {
    renderReportFields();
    elements.saveProjectDialog.showModal();
  });
  elements.cancelSaveProject.addEventListener('click', () => elements.saveProjectDialog.close());
  elements.saveProjectDialog.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    submitSaveAsProject().catch((error) => setMessage(`프로젝트 저장 실패: ${error.message}`, true));
  });
  elements.dismissDraftSuggestion.addEventListener('click', () => {
    elements.reportDraftSuggestionDialog.close();
    renderGuidance();
  });
  elements.approveDraftSuggestion.addEventListener('click', () => approveDraftSuggestion().catch((error) => setMessage(error.message, true)));
  elements.cancelQuickMapping.addEventListener('click', () => elements.quickMappingDialog.close());
  elements.quickMappingDialog.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    submitQuickMapping().catch((error) => setMessage(`빠른 매핑 실패: ${error.message}`, true));
  });
  const persistLlmSettings = async () => {
    try {
      await saveLlmSettings();
      setMessage(`LLM 설정 저장: ${llmAllowedOrigins[0]}`);
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
  elements.requestRecommendations.addEventListener('click', () => requestRecommendations().catch((error) => setMessage(`추천 실패: ${error.message}`, true)));
  elements.requestTestCaseDescriptionButton.addEventListener('click', () => requestTestCaseDescription(currentFeature()).catch((error) => setMessage(`테스트케이스 설명 생성 실패: ${error.message}`, true)));
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message && message.type === 'EVIDENCE_CREATED') refreshEvidence().catch(() => {});
    });
  }

  bindInputs();
  load().catch((error) => setMessage(error.message, true));
})();
