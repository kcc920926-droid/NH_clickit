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

  // 캡처 계획(순수 함수). chrome.tabs.captureVisibleTab(windowId)는 "그 창에서 지금 보이는 탭"을
  // 찍으므로, 항상 대상 탭이 속한 창을 기준으로 판단한다(편집기 창을 기준으로 하면 대상 탭이 다른
  // 창에 있을 때 편집기가 찍힌다).
  //   - 대상 탭이 확장 자신의 페이지면 찍지 않는다(skip: self).
  //   - 대상 탭이 그 창에서 보이는 탭이면 확인 후 찍는다.
  //   - 보이지 않는데 activateTarget(녹화 시작 시 첫 화면)이면 그 탭으로 넘어가 그려질 때까지
  //     기다린 뒤 찍는다. 편집기로 되돌아가지 않는다(사용자는 곧바로 테스트를 시작한다).
  //   - 보이지 않고 activateTarget이 아니면 찍지 않는다(skip: hidden). 뒤에 있는 탭에서 생긴
  //     이벤트로 지금 보이는 다른 탭이 찍히는 것을 막는다.
  function planTabCapture({ targetTab, extensionId, activateTarget = false }) {
    if (!targetTab || !Number.isInteger(targetTab.id)) return { action: 'skip', reason: 'no-target', steps: ['skip'] };
    if (isOwnExtensionUrl(targetTab.url, extensionId)) return { action: 'skip', reason: 'self', steps: ['skip'] };
    const base = { targetTabId: targetTab.id, windowId: targetTab.windowId };
    if (targetTab.active) return { ...base, action: 'capture', steps: ['verify', 'capture'] };
    if (activateTarget) return { ...base, action: 'activate', steps: ['activate', 'wait-paint', 'verify', 'capture'] };
    return { action: 'skip', reason: 'hidden', steps: ['skip'] };
  }

  const SKIP_MESSAGES = {
    'no-target': '캡처할 탭을 찾을 수 없어 건너뜁니다.',
    self: 'CaptureIT 화면은 증적으로 찍지 않습니다.',
    hidden: '대상 탭이 화면에 보이지 않아 캡처를 건너뜁니다.',
    moved: '캡처 직전에 다른 탭이 열려 있어 건너뜁니다.',
  };

  function skipMessage(reason) {
    return SKIP_MESSAGES[reason] || '캡처를 건너뜁니다.';
  }

  return {
    isOwnExtensionUrl,
    planTabCapture,
    sendTabMessageWithRetry,
    skipMessage,
  };
});
