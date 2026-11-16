import './shared/domain.js';
import './shared/storage.js';
import './shared/evidence-dedupe.js';
import './shared/capture-coordinator.js';
import './shared/background-events.js';

const MENU_ID = 'captureit-context-capture';
const SESSION_KEY = 'captureSession';

// 녹화 시작·종료와 캡처를 한 줄로 처리한다. 따로 돌면 첫 화면(baseline)을 기다리는 동안 들어온 클릭이
// 같은 순번을 받고, 이전·다음 연결이 꼬였다.
let workQueue = Promise.resolve();

function enqueue(task) {
  const run = workQueue.then(task);
  workQueue = run.catch(() => {});
  return run;
}

// Self_Capture_Guard의 근본 원인 대응: editor.html에서 "녹화 시작"을 클릭하는 시점에는
// editor.html 자신이 항상 그 창의 활성 탭이므로, chrome.tabs.query({active:true})로는 사용자가
// 테스트하려는 실제 웹페이지 탭을 알아낼 수 없다. 그래서 이 값을 별도로 추적한다: 사용자가 마지막
// 으로 활성화했던 "일반 웹페이지"(http/https) 탭 id를 기억해 두고, 녹화 시작 시 이 탭을 실제
// 대상으로 사용한다.
let lastActiveWebTabId = null;

function isHttpUrl(url) {
  return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
}

// MV3 서비스 워커는 수십 초 쉬면 종료되어 전역 변수가 사라진다. 그러면 "녹화할 웹페이지 탭을 찾을 수
// 없습니다"가 났으므로 chrome.storage.session에도 남긴다(브라우저를 닫으면 지워지는 저장소).
const LAST_WEB_TAB_KEY = 'lastActiveWebTabId';

async function trackTabIfWebPage(tabId) {
  if (!Number.isInteger(tabId)) return;
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!isHttpUrl(tab.url)) return;
    lastActiveWebTabId = tabId;
    if (chrome.storage.session) await chrome.storage.session.set({ [LAST_WEB_TAB_KEY]: tabId });
  } catch {
    // 탭이 이미 닫혔거나 접근할 수 없는 경우 조용히 무시한다(추적 갱신을 건너뜀).
  }
}

async function isUsableWebTab(tabId) {
  if (!Number.isInteger(tabId)) return false;
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  return Boolean(tab && isHttpUrl(tab.url));
}

// 마지막으로 본 웹페이지 탭: 메모리 → 세션 저장소 → 지금 열린 창들의 보이는 웹페이지 탭 순으로 찾는다.
async function lastWebTabId() {
  if (await isUsableWebTab(lastActiveWebTabId)) return lastActiveWebTabId;
  if (chrome.storage.session) {
    const stored = (await chrome.storage.session.get(LAST_WEB_TAB_KEY))[LAST_WEB_TAB_KEY];
    if (await isUsableWebTab(stored)) return stored;
  }
  const visible = await chrome.tabs.query({ active: true, windowType: 'normal' }).catch(() => []);
  const candidate = visible.find((tab) => isHttpUrl(tab.url));
  return candidate ? candidate.id : null;
}

chrome.tabs.onActivated.addListener(({ tabId }) => { trackTabIfWebPage(tabId); });
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) trackTabIfWebPage(tabId);
});

async function loadSession() {
  const result = await chrome.storage.local.get(SESSION_KEY);
  return result[SESSION_KEY] || null;
}

async function saveSession(session) {
  await Promise.all([
    chrome.storage.local.set({ [SESSION_KEY]: session }),
    CaptureITStorage.putSession(session),
  ]);
}

async function persistEvidence(evidence) {
  if (evidence.previousCaptureId) {
    const previous = await CaptureITStorage.getEvidence(evidence.previousCaptureId);
    if (previous) {
      previous.nextCaptureId = evidence.id;
      await CaptureITStorage.putEvidence(previous);
    }
  }
  await CaptureITStorage.putEvidence(evidence);
}

// 녹화 시작 시 대상 탭으로 넘어간 뒤 "실제로 보이고 그려졌다"는 신호를 콘텐츠 스크립트에서 받는다.
// 고정 시간(예전 120ms)만 기다리면 무거운 화면에서는 아직 편집기 화면이 남아 있어 그대로 찍혔다.
// 콘텐츠 스크립트가 없는 탭(IE 모드 등)은 응답이 없으므로 짧게 기다린 뒤 진행한다.
const PAINT_WAIT_TIMEOUT_MS = 2000;
const PAINT_FALLBACK_DELAY_MS = 500;

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForTabPaint(tabId) {
  const painted = chrome.tabs.sendMessage(tabId, { type: 'WAIT_FOR_PAINT', timeoutMs: PAINT_WAIT_TIMEOUT_MS }, { frameId: 0 })
    .then((response) => Boolean(response && response.ok))
    .catch(() => false);
  const timedOut = sleep(PAINT_WAIT_TIMEOUT_MS + 300).then(() => false);
  if (!await Promise.race([painted, timedOut])) await sleep(PAINT_FALLBACK_DELAY_MS);
}

// 모든 화면 캡처는 이 함수 하나를 거친다. 순서 결정은 CaptureITBackgroundEvents.planTabCapture(순수 함수)에 맡긴다.
//   activate(필요할 때만) -> wait-paint -> verify(그 창에서 보이는 탭이 대상 탭인지) -> capture
// 대상 탭이 속한 창을 찍고, 찍기 직전에 보이는 탭이 대상과 다르면 저장하지 않고 건너뛴다.
async function captureVisibleGuarded(targetTabId, { activateTarget = false } = {}) {
  const targetTab = Number.isInteger(targetTabId) ? await chrome.tabs.get(targetTabId).catch(() => null) : null;
  const plan = CaptureITBackgroundEvents.planTabCapture({ targetTab, extensionId: chrome.runtime.id, activateTarget });
  if (plan.action === 'skip') throw new Error(CaptureITBackgroundEvents.skipMessage(plan.reason));

  if (plan.steps.includes('activate')) {
    await chrome.tabs.update(plan.targetTabId, { active: true });
    await chrome.windows.update(plan.windowId, { focused: true }).catch(() => {});
  }
  if (plan.steps.includes('wait-paint')) {
    await waitForTabPaint(plan.targetTabId);
  }
  if (plan.steps.includes('verify')) {
    const [visible] = await chrome.tabs.query({ windowId: plan.windowId, active: true });
    if (!visible || visible.id !== plan.targetTabId) throw new Error(CaptureITBackgroundEvents.skipMessage('moved'));
  }
  // 캡처하는 동안 CaptureIT 알림을 감춘다(직전 캡처 알림이 다음 사진에 찍히지 않게).
  await setCaptureItUiVisible(plan.targetTabId, false);
  try {
    return await captureWithRateLimit(plan.windowId);
  } finally {
    await setCaptureItUiVisible(plan.targetTabId, true);
  }
}

function setCaptureItUiVisible(tabId, visible) {
  return chrome.tabs.sendMessage(tabId, { type: 'CAPTUREIT_UI', visible }, { frameId: 0 }).catch(() => {});
}

// 브라우저는 화면 캡처를 초당 2회로 제한한다. 입력 후 바로 제출하면 세 장이 0.5초 안에 몰려
// 한 장이 조용히 사라졌으므로, 간격을 두고 제한에 걸리면 한 번 더 시도한다.
const MIN_CAPTURE_INTERVAL_MS = 550;
let lastCaptureAt = 0;

async function captureWithRateLimit(windowId) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const wait = lastCaptureAt + MIN_CAPTURE_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCaptureAt = Date.now();
    try {
      return await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
    } catch (error) {
      if (attempt > 0 || !/MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND/.test(String(error && error.message))) throw error;
    }
  }
  throw new Error('화면 캡처에 실패했습니다.');
}

function coordinatorFor(targetTabId, captureOptions = {}) {
  return CaptureITCaptureCoordinator.createCaptureCoordinator({
    loadSession,
    saveSession,
    persistEvidence,
    captureVisible: () => captureVisibleGuarded(targetTabId, captureOptions),
    // 중복 화면 합치기: 직전 증적과 거의 같은 화면이면 새 증적 대신 직전 증적에 합친다.
    fingerprintImage: (dataUrl) => CaptureITEvidenceDedupe.fingerprintImageDataUrl(dataUrl),
    loadEvidence: (id) => CaptureITStorage.getEvidence(id),
  });
}

function contextSummary(context = {}) {
  const target = context.target || {};
  return [
    context.pageTitle,
    target.visibleText,
    target.ariaLabel,
    target.cssSelector,
  ].filter(Boolean).join(' · ').slice(0, 160);
}

// 녹화 중인 탭과 그 탭에서 열린 팝업·새 창만 수집한다. 다른 탭을 클릭해도 녹화되던 문제를 막는다.
function isSessionTab(session, tab) {
  if (!session || !Number.isInteger(session.tabId) || !tab) return true;
  const allowed = new Set([session.tabId, ...(session.childTabIds || [])]);
  return allowed.has(tab.id);
}

async function captureRequest(message, sender) {
  if (!sender.tab) throw new Error('Capture request has no source tab');
  const session = await loadSession();
  if (!session || !session.active) throw new Error('Capture session is not active');
  if (!isSessionTab(session, sender.tab)) throw new Error('녹화 중인 탭이 아니어서 건너뜁니다.');
  const evidence = await coordinatorFor(sender.tab.id).capture({
    triggerType: message.triggerType,
    context: message.context,
    before: message.before,
    after: message.after,
    domDiff: message.domDiff,
    formSelector: message.formSelector,
    dirtyFields: message.dirtyFields,
    source: message.source,
  });
  await chrome.runtime.sendMessage({ type: 'EVIDENCE_CREATED', evidenceId: evidence.id }).catch(() => {});
  await chrome.tabs.sendMessage(sender.tab.id, {
    type: 'CAPTURE_RECEIPT',
    evidenceId: evidence.id,
    sequenceNo: evidence.sequenceNo,
    triggerType: message.triggerType || evidence.triggerType,
    merged: Boolean(evidence.merged),
    contextSummary: contextSummary(message.context),
    pageTitle: message.context && message.context.pageTitle || '',
    targetText: message.context && message.context.target && message.context.target.visibleText || '',
  }, { frameId: 0 }).catch(() => {});
  return { ok: true, evidenceId: evidence.id, sequenceNo: evidence.sequenceNo, merged: Boolean(evidence.merged) };
}

async function resolveRecordingTargetTabId(requestedTabId) {
  // editor.js는 "녹화 시작" 클릭 시점의 활성 탭 id를 tabId로 보내는데, 그 시점의 활성 탭은
  // 항상 editor.html 자신이다(사용자가 그 탭에서 버튼을 눌렀으므로). 그래서 요청받은 tabId가
  // CaptureIT 자신의 확장 페이지라면, 사용자가 그 전에 보고 있던 실제 웹페이지 탭
  // (lastActiveWebTabId)으로 대체한다.
  if (!Number.isInteger(requestedTabId)) return lastWebTabId();
  try {
    const tab = await chrome.tabs.get(requestedTabId);
    if (isHttpUrl(tab.url)) return requestedTabId;
  } catch {
    // 탭을 조회할 수 없으면 아래에서 마지막 웹페이지 탭으로 폴백한다.
  }
  return lastWebTabId();
}

async function startRecordingRequest(message, sender) {
  const requestedTabId = message.tabId || sender.tab && sender.tab.id || null;
  const tabId = await resolveRecordingTargetTabId(requestedTabId);
  const existing = await loadSession();
  if (existing && existing.active && (!tabId || existing.tabId === tabId)) {
    return { ok: true, session: existing };
  }
  // Bug_Invalid_TabId_Signature: resolveRecordingTargetTabId()는 추적된 웹페이지 탭이 아직 없으면
  // (예: 확장을 새로 로드한 뒤 실제 웹페이지 탭을 한 번도 활성화하지 않은 상태) null을 반환할 수
  // 있다. chrome.tabs.sendMessage(null, ...)를 호출하면 "Error in invocation of
  // tabs.sendMessage(integer tabId, ...)" 인자 시그니처 오류가 그대로 사용자에게 노출된다
  // (내부망 실사용에서 실제로 재현됨). tabId가 유효한 정수가 아니면 chrome.tabs.* 호출 자체를
  // 시도하지 않고, 원인을 알 수 있는 안내 메시지로 먼저 실패시킨다.
  if (!Number.isInteger(tabId)) {
    throw new Error('녹화할 웹페이지 탭을 찾을 수 없습니다. 테스트할 화면 탭을 한 번 클릭해 활성화한 뒤 다시 시도하십시오. 다른 브라우저나 IE 모드 화면이면 캡처(Win+Shift+S) 후 이 화면에 Ctrl+V 하세요.');
  }
  // Self_Capture_Guard(coordinatorFor의 targetTabId)에 실제 웹페이지 탭 id를 전달한다 - baseline
  // 캡처가 editor.html이 아니라 사용자가 테스트하려는 실제 탭을 찍도록 보장한다(REQ 1.1, 1.3).
  //
  // "CaptureIT Report Editor" 제목 버그: editor.js가 만드는 captureBaselineContext는 editor.js
  // 자신(editor.html 탭)의 document.title/location을 읽으므로 항상 "CaptureIT Report Editor" 등
  // 확장 페이지 자신의 정보가 된다. 여기서 실제 웹페이지 탭(tabId)에게 COLLECT_PAGE_CONTEXT를
  // 물어봐서 진짜 페이지 컨텍스트를 우선 사용하고, 탭이 준비되지 않았거나 chrome:// 페이지 등이라
  // content script가 없어 실패하는 경우에만 editor.js가 보낸 값으로 폴백한다.
  const contextResponse = await collectPageContextWithInjection(tabId);
  const captureBaselineContext = (contextResponse && contextResponse.ok && contextResponse.context) || message.captureBaselineContext || {};
  // 첫 화면(baseline)은 대상 탭으로 넘어가 그려진 뒤 찍는다. 편집기로 되돌아가지 않는다.
  const started = await coordinatorFor(tabId, { activateTarget: true }).startRecordingSession({
    tabId,
    reportId: message.reportId || null,
    recordingPolicy: message.recordingPolicy || {},
    captureBaselineContext,
  });
  // 콘텐츠 스크립트가 응답하지 않으면(IE 모드 탭 등) 클릭·화면 전환 자동 수집이 동작하지 않는다.
  // 편집기가 붙여넣기 안내로 바꿀 수 있도록 알려준다.
  const autoCaptureAvailable = Boolean(contextResponse && contextResponse.ok);
  return { ok: true, session: started, autoCaptureAvailable };
}

// 확장을 설치·갱신하기 전에 열린 탭에는 수집 스크립트가 없다. 그런 탭은 스크립트를 넣어 주고,
// 그래도 응답이 없을 때만(IE 모드 등) 자동 수집이 안 되는 탭으로 본다.
async function collectPageContextWithInjection(tabId) {
  const ask = () => chrome.tabs.sendMessage(tabId, { type: 'COLLECT_PAGE_CONTEXT' }, { frameId: 0 }).catch(() => null);
  const first = await ask();
  if (first && first.ok) return first;
  if (!chrome.scripting) return first;
  const files = (chrome.runtime.getManifest().content_scripts || [])[0];
  if (!files || !files.js) return first;
  await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: files.js }).catch(() => null);
  return ask();
}

async function stopRecordingRequest() {
  const active = await loadSession();
  if (!active || !active.active) return { ok: true, session: active || null };
  const stopped = await coordinatorFor(active.tabId).stopRecordingSession(active);
  return { ok: true, session: stopped };
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'CaptureIT 강조 캡처',
    contexts: ['all'],
    documentUrlPatterns: ['http://*/*', 'https://*/*'],
  });
});

// 아이콘을 누르면 테스트 화면 옆 사이드 패널에 작업대를 연다. 탭 왕복이 없어 녹화 첫 장이
// 작업대 자신으로 찍히는 일도 없다. 사이드 패널이 없는 브라우저에서는 아래 onClicked가 탭으로 연다
// (openPanelOnActionClick이 켜져 있으면 onClicked는 불리지 않는다).
function enableSidePanel() {
  if (!chrome.sidePanel || typeof chrome.sidePanel.setPanelBehavior !== 'function') return;
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}
enableSidePanel();

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('editor.html') });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab || !tab.id) return;
  await chrome.tabs.sendMessage(
    tab.id,
    { type: 'CAPTURE_CONTEXT_MENU' },
    info.frameId === undefined ? undefined : { frameId: info.frameId },
  ).catch(() => {});
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status !== 'complete') return;
  const session = await loadSession();
  if (!session || !session.active || session.mode !== 'event') return;
  if (!isSessionTab(session, { id: tabId })) return;
  // Bug_Duplicate_Capture: manifest.json은 content_scripts에 all_frames:true를 지정하므로
  // content.js는 페이지의 모든 iframe에서 독립적으로 실행된다. frameId를 지정하지 않고
  // chrome.tabs.sendMessage(tabId, message)를 호출하면 그 탭의 모든 프레임(메인 프레임 +
  // 모든 iframe)에 동일한 메시지가 전달되어, "탐색 완료"라는 단일 이벤트가 프레임 수만큼
  // 중복 캡처된다. 탐색 완료는 본질적으로 메인 프레임 개념이므로 frameId: 0으로 한정해
  // iframe들이 같은 신호를 중복 처리하지 않도록 한다.
  await CaptureITBackgroundEvents.sendTabMessageWithRetry({
    tabId,
    message: { type: 'CAPTURE_NAVIGATION' },
    sendMessage: (targetTabId, message) => chrome.tabs.sendMessage(targetTabId, message, { frameId: 0 }),
  }).catch(() => {});
});

// 녹화 중인 탭이 연 팝업·새 창도 같은 녹화로 본다(업무 화면이 자식 창으로 열리는 경우).
chrome.tabs.onCreated.addListener((tab) => {
  if (!Number.isInteger(tab.openerTabId)) return;
  enqueue(async () => {
    const session = await loadSession();
    if (!session || !session.active || !isSessionTab(session, { id: tab.openerTabId })) return;
    session.childTabIds = [...new Set([...(session.childTabIds || []), tab.id])];
    await saveSession(session);
  }).catch(() => {});
});

// 녹화 중인 탭을 닫으면 녹화를 끝낸다. 켜진 채로 남으면 다른 탭이 계속 찍혔다.
chrome.tabs.onRemoved.addListener((tabId) => {
  enqueue(async () => {
    const session = await loadSession();
    if (!session || !session.active || session.tabId !== tabId) return;
    await coordinatorFor(tabId).stopRecordingSession(session);
    await chrome.runtime.sendMessage({ type: 'SESSION_CHANGED', reason: 'tab-closed' }).catch(() => {});
  }).catch(() => {});
});

// 브라우저를 다시 켜면 이전 녹화는 끝난 것으로 본다.
chrome.runtime.onStartup.addListener(() => {
  enqueue(async () => {
    const session = await loadSession();
    if (session && session.active) await coordinatorFor(session.tabId).stopRecordingSession(session);
  }).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return false;
  if (message.type === 'CAPTURE_REQUEST') {
    enqueue(() => captureRequest(message, sender))
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === 'START_RECORDING_SESSION') {
    enqueue(() => startRecordingRequest(message, sender))
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === 'STOP_RECORDING_SESSION') {
    enqueue(() => stopRecordingRequest())
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  return false;
});
