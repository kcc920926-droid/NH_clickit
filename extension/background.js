import './shared/domain.js';
import './shared/storage.js';
import './shared/capture-coordinator.js';
import './shared/background-events.js';

const MENU_ID = 'captureit-context-capture';
const SESSION_KEY = 'captureSession';

let captureQueue = Promise.resolve();
let recordingQueue = Promise.resolve();

// Self_Capture_Guard의 근본 원인 대응: editor.html에서 "녹화 시작"을 클릭하는 시점에는
// editor.html 자신이 항상 그 창의 활성 탭이므로, chrome.tabs.query({active:true})로는 사용자가
// 테스트하려는 실제 웹페이지 탭을 알아낼 수 없다. 그래서 이 값을 별도로 추적한다: 사용자가 마지막
// 으로 활성화했던 "일반 웹페이지"(http/https) 탭 id를 기억해 두고, 녹화 시작 시 이 탭을 실제
// 대상으로 사용한다.
let lastActiveWebTabId = null;

function isHttpUrl(url) {
  return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
}

async function trackTabIfWebPage(tabId) {
  if (!Number.isInteger(tabId)) return;
  try {
    const tab = await chrome.tabs.get(tabId);
    if (isHttpUrl(tab.url)) lastActiveWebTabId = tabId;
  } catch {
    // 탭이 이미 닫혔거나 접근할 수 없는 경우 조용히 무시한다(추적 갱신을 건너뜀).
  }
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

// Self_Capture_Guard 타이밍 대응: chrome.tabs.update({active:true})가 반환된 시점에도 브라우저가
// 새로 활성화된 탭을 실제로 다시 그리기(paint) 전일 수 있어, 곧바로 captureVisibleTab을 호출하면
// 여전히 이전(editor.html) 탭의 화면이 캡처되는 레이스가 남는다. 이 기본 대기 함수는 그 사이에
// 짧게 쉬어(paint-settle) 이 레이스를 완화한다. 테스트에서는 실제 setTimeout 없이 순서만
// 검증하도록 이 의존성을 주입해서 대체할 수 있다.
function defaultPaintSettleDelay() {
  return new Promise((resolve) => setTimeout(resolve, 120));
}

// Self_Capture_Guard: 실제로 chrome.tabs.captureVisibleTab을 호출하기 직전에 그 창의 현재
// 활성 탭이 CaptureIT 자신의 확장 페이지(editor.html/viewer.html)인지 확인한다. 그런 경우라면
// targetTabId(캡처를 요청한 콘텐츠 스크립트가 속한 실제 탭)로 전환한 뒤 캡처하거나, 전환할 수
// 없으면 캡처를 건너뛰어 "녹화 시작을 누르자마자 editor.html이 캡처되는" 문제를 막는다.
// 순서/타이밍 결정은 CaptureITBackgroundEvents.planGuardedCaptureSteps(순수 함수)에 위임하고,
// 이 함수는 그 계획을 그대로 chrome.* API 호출로 옮기는 역할만 한다:
//   전환(update) -> paint-settle 대기(delay) -> 캡처(capture) -> 원래 탭으로 포커스 복원(restore).
// 복원은 실제로 탭을 전환한 경우('activate-target')에만 수행하고, 원래부터 대상 탭이 활성 탭이었던
// 정상 캡처 경로('capture')에서는 아무 것도 하지 않는다(사용자를 임의로 다른 탭으로 옮기지 않음).
async function captureVisibleGuarded(windowId, targetTabId, delay = defaultPaintSettleDelay) {
  const activeTabs = await chrome.tabs.query({ windowId, active: true });
  const activeTab = activeTabs && activeTabs[0];
  const decision = CaptureITBackgroundEvents.resolveSelfCaptureAction({
    activeTabId: activeTab && activeTab.id,
    activeTabUrl: activeTab && activeTab.url,
    extensionId: chrome.runtime.id,
    targetTabId,
  });
  const plan = CaptureITBackgroundEvents.planGuardedCaptureSteps(decision, activeTab && activeTab.id);
  if (plan.steps[0] === 'skip') throw new Error('Self-capture guard: refusing to capture the extension\'s own page');

  if (plan.steps.includes('update')) {
    await chrome.tabs.update(plan.targetTabId, { active: true });
    await chrome.tabs.get(plan.targetTabId);
  }
  if (plan.steps.includes('delay')) {
    await delay();
  }
  const image = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
  if (plan.steps.includes('restore') && Number.isInteger(plan.restoreTabId)) {
    await chrome.tabs.update(plan.restoreTabId, { active: true }).catch(() => {});
  }
  return image;
}

function coordinatorFor(windowId, targetTabId, delay) {
  return CaptureITCaptureCoordinator.createCaptureCoordinator({
    loadSession,
    saveSession,
    persistEvidence,
    captureVisible: () => captureVisibleGuarded(windowId, targetTabId, delay),
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

async function captureRequest(message, sender) {
  if (!sender.tab) throw new Error('Capture request has no source tab');
  const evidence = await coordinatorFor(sender.tab.windowId, sender.tab.id).capture({
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
    triggerType: evidence.triggerType,
    contextSummary: contextSummary(message.context),
    pageTitle: message.context && message.context.pageTitle || '',
    targetText: message.context && message.context.target && message.context.target.visibleText || '',
  }).catch(() => {});
  return { ok: true, evidenceId: evidence.id, sequenceNo: evidence.sequenceNo };
}

async function resolveRecordingTargetTabId(requestedTabId) {
  // editor.js는 "녹화 시작" 클릭 시점의 활성 탭 id를 tabId로 보내는데, 그 시점의 활성 탭은
  // 항상 editor.html 자신이다(사용자가 그 탭에서 버튼을 눌렀으므로). 그래서 요청받은 tabId가
  // CaptureIT 자신의 확장 페이지라면, 사용자가 그 전에 보고 있던 실제 웹페이지 탭
  // (lastActiveWebTabId)으로 대체한다.
  if (!Number.isInteger(requestedTabId)) return lastActiveWebTabId;
  try {
    const tab = await chrome.tabs.get(requestedTabId);
    if (isHttpUrl(tab.url)) return requestedTabId;
  } catch {
    // 탭을 조회할 수 없으면 아래에서 lastActiveWebTabId로 폴백한다.
  }
  return lastActiveWebTabId;
}

async function startRecordingRequest(message, sender) {
  const requestedTabId = message.tabId || sender.tab && sender.tab.id || null;
  const tabId = await resolveRecordingTargetTabId(requestedTabId);
  const windowId = message.windowId || sender.tab && sender.tab.windowId;
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
    throw new Error('녹화할 웹페이지 탭을 찾을 수 없습니다. 테스트할 화면 탭을 한 번 클릭해 활성화한 뒤 다시 시도하십시오.');
  }
  // Self_Capture_Guard(coordinatorFor의 targetTabId)에 실제 웹페이지 탭 id를 전달한다 - baseline
  // 캡처가 editor.html이 아니라 사용자가 테스트하려는 실제 탭을 찍도록 보장한다(REQ 1.1, 1.3).
  //
  // "CaptureIT Report Editor" 제목 버그: editor.js가 만드는 captureBaselineContext는 editor.js
  // 자신(editor.html 탭)의 document.title/location을 읽으므로 항상 "CaptureIT Report Editor" 등
  // 확장 페이지 자신의 정보가 된다. 여기서 실제 웹페이지 탭(tabId)에게 COLLECT_PAGE_CONTEXT를
  // 물어봐서 진짜 페이지 컨텍스트를 우선 사용하고, 탭이 준비되지 않았거나 chrome:// 페이지 등이라
  // content script가 없어 실패하는 경우에만 editor.js가 보낸 값으로 폴백한다.
  const contextResponse = await chrome.tabs.sendMessage(tabId, { type: 'COLLECT_PAGE_CONTEXT' }).catch(() => null);
  const captureBaselineContext = (contextResponse && contextResponse.ok && contextResponse.context) || message.captureBaselineContext || {};
  const started = await coordinatorFor(windowId, tabId).startRecordingSession({
    tabId,
    recordingPolicy: message.recordingPolicy || {},
    captureBaselineContext,
  });
  return { ok: true, session: started };
}

async function stopRecordingRequest(message, sender) {
  const windowId = message.windowId || sender.tab && sender.tab.windowId;
  const active = await loadSession();
  if (!active || !active.active) return { ok: true, session: active || null };
  const stopped = await coordinatorFor(windowId).stopRecordingSession(active);
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return false;
  if (message.type === 'CAPTURE_REQUEST') {
    captureQueue = captureQueue
      .then(() => captureRequest(message, sender))
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === 'START_RECORDING_SESSION') {
    recordingQueue = recordingQueue
      .then(() => startRecordingRequest(message, sender))
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === 'STOP_RECORDING_SESSION') {
    recordingQueue = recordingQueue
      .then(() => stopRecordingRequest(message, sender))
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  return false;
});
