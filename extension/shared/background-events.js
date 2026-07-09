(function attachBackgroundEvents(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CaptureITBackgroundEvents = api;
})(globalThis, function createBackgroundEventsApi() {
  function delay(milliseconds) {
    return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
  }

  async function sendTabMessageWithRetry({
    attempts = 8,
    delayMs = 150,
    message,
    sendMessage,
    tabId,
  }) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await sendMessage(tabId, message);
      } catch (error) {
        lastError = error;
        if (attempt < attempts && delayMs > 0) await delay(delayMs);
      }
    }
    throw lastError || new Error('Tab message retry failed');
  }

  // Self_Capture_Guard: CaptureIT 자신의 확장 페이지(editor.html/viewer.html)를 캡처 대상으로
  // 착각하지 않도록 하는 순수 판별 함수. chrome.tabs.captureVisibleTab(windowId)는 "그 창의
  // 현재 활성 탭"만 캡처할 수 있으므로, 사용자가 editor.html 탭에서 "녹화 시작"을 누르는 순간에는
  // editor.html 자신이 활성 탭이 되어 그대로 캡처되어 버린다. 이 함수는 캡처 직전 그 창의 활성
  // 탭 URL이 CaptureIT 자신의 확장 페이지인지 판별한다.
  function isOwnExtensionUrl(url, extensionId) {
    return typeof url === 'string' && typeof extensionId === 'string' && extensionId.length > 0
      && url.startsWith(`chrome-extension://${extensionId}/`);
  }

  // Self_Capture_Guard가 자기 캡처 상황을 감지했을 때의 처리 방침을 결정하는 순수 함수.
  // targetTabId(의도된 캡처 대상 탭)가 있고 현재 활성 탭과 다르면 그 탭으로 전환한 뒤 캡처하도록
  // 'activate-target'을, targetTabId를 모르면 캡처 자체를 건너뛰도록 'skip'을 반환한다.
  function resolveSelfCaptureAction({ activeTabId, activeTabUrl, extensionId, targetTabId }) {
    if (!isOwnExtensionUrl(activeTabUrl, extensionId)) return { action: 'capture' };
    if (targetTabId && targetTabId !== activeTabId) return { action: 'activate-target', targetTabId };
    return { action: 'skip' };
  }

  // Self_Capture_Guard의 타이밍 문제 대응: chrome.tabs.update({active:true})로 탭을 전환한 직후
  // 곧바로 chrome.tabs.captureVisibleTab을 호출하면, 브라우저가 새로 활성화된 탭을 아직 실제로
  // 그리기(paint) 전이라 이전 탭(editor.html)의 화면이 그대로 캡처되는 레이스가 발생할 수 있다.
  // 이 순수 함수는 resolveSelfCaptureAction의 판단 결과를 바탕으로, chrome.* API 호출 없이도
  // "어떤 순서로 무엇을 해야 하는지"를 미리 계산해 반환한다. captureVisibleGuarded는 이 계획을
  // 그대로 순서대로 실행하기만 하면 된다 - 시퀀싱 로직 자체는 이 함수에서 단위 테스트한다.
  //   - 'capture' 액션이면: 곧바로 캡처(전환/대기/포커스 복원 불필요).
  //   - 'activate-target' 액션이면: 대상 탭으로 전환 -> paint-settle 대기 -> 캡처 -> 원래 활성
  //     탭으로 포커스 복원, 순서로 단계를 나열한다.
  function planGuardedCaptureSteps(decision, activeTabId) {
    if (decision.action === 'skip') return { steps: ['skip'] };
    if (decision.action === 'activate-target') {
      return {
        steps: ['update', 'delay', 'capture', 'restore'],
        targetTabId: decision.targetTabId,
        restoreTabId: activeTabId,
      };
    }
    return { steps: ['capture'] };
  }

  return {
    isOwnExtensionUrl,
    planGuardedCaptureSteps,
    resolveSelfCaptureAction,
    sendTabMessageWithRetry,
  };
});
