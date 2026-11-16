(function initializeCaptureContentScript() {
  const policy = CaptureITEventPolicy.createPolicy(750);
  const replayedEvents = new WeakSet();
  let overlay = null;
  let receiptToast = null;
  let receiptTimer = null;
  let lastReceiptKey = '';
  let savedScroll = null;
  let knownUrl = window.location.href;
  let recordingActive = false;
  let recordingMode = null;
  let stateLoaded = false;
  let lastClickAt = 0;
  const isTopFrame = window.top === window;
  // 클릭 직후 이만큼 안에 생긴 화면 전환은 클릭 캡처가 이미 새 화면을 찍으므로 따로 찍지 않는다.
  const CLICK_ROUTE_GRACE_MS = 1500;

  function getState() {
    return chrome.storage.local.get('captureSession').then((result) => (
      result.captureSession || { active: false, mode: null }
    )).then((state) => {
      recordingActive = Boolean(state.active);
      recordingMode = state.mode || null;
      stateLoaded = true;
      return state;
    });
  }

  function scheduleAfterPaint() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  function collectContext(target) {
    const resolvedTarget = target || document.body;
    return {
      ...CaptureITPageContext.collectPageContext(resolvedTarget, document, window),
      target: CaptureITPageContext.collectTargetContext(resolvedTarget, document),
      container: CaptureITPageContext.collectContainerContext(resolvedTarget, document),
    };
  }

  function collectRouteContext(previousRoute, nextRoute) {
    return CaptureITPageContext.sanitizeContext({
      ...collectContext(document.body),
      previousRoute,
      route: nextRoute,
    });
  }

  function observeMutations(onMutation) {
    if (typeof MutationObserver !== 'function' || !document.documentElement) return () => {};
    const observer = new MutationObserver((records) => {
      // CaptureIT 자신의 알림·강조 표시 변화는 화면 안정 판단에서 뺀다.
      if (records.every((record) => isCaptureItNode(record.target))) return;
      onMutation(records);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }

  function isCaptureItNode(node) {
    const element = node && (node.nodeType === 1 ? node : node.parentElement);
    return Boolean(element && typeof element.closest === 'function'
      && element.closest('[data-captureit-receipt],[data-captureit-overlay]'));
  }

  function isFieldTarget(target) {
    if (!target || !target.tagName) return false;
    const tagName = String(target.tagName).toLowerCase();
    return tagName === 'input' || tagName === 'select' || tagName === 'textarea' || target.isContentEditable;
  }

  function formSelectorFor(target) {
    const form = target && (target.form || (typeof target.closest === 'function' ? target.closest('form') : null));
    if (form) return CaptureITPageContext.collectTargetContext(form, document).selector;
    const container = CaptureITPageContext.collectContainerContext(target || document.body, document);
    return container.selector || 'document';
  }

  function fieldMetaFor(target) {
    const meta = CaptureITPageContext.collectTargetContext(target, document);
    if (target && target.isContentEditable) {
      return {
        ...meta,
        maskedValue: '',
        value: '',
        visibleText: shortText(target.innerText || target.textContent || '', 500),
      };
    }
    return meta;
  }

  function shortText(value, maxLength = 80) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
  }

  function receiptContext(receipt) {
    if (receipt.context) return receipt.context;
    return {
      pageTitle: receipt.pageTitle || document.title || '',
      target: { visibleText: receipt.targetText || receipt.contextSummary || '' },
    };
  }

  const TRIGGER_LABELS = {
    baseline: '시작 화면',
    click: '클릭 후 화면',
    submit: '제출 후 화면',
    navigation: '페이지 이동',
    'route-change': '화면 전환',
    'form-input': '입력',
    'manual-pin': '강조 캡처',
    'shortcut-context': '강조 캡처',
    'context-menu': '강조 캡처',
  };

  // 알림은 최상위 프레임에만 띄운다(iframe마다 뜨면 다음 사진에 찍혀 들어간다).
  function showCaptureReceipt(receipt = {}) {
    if (!isTopFrame) return;
    // 같은 증적에 여러 번 합쳐질 수 있으므로 합친 경우는 순번만으로 중복 판단하지 않는다.
    const key = receipt.merged
      ? ''
      : receipt.evidenceId || `${receipt.sequenceNo || ''}:${receipt.triggerType || ''}`;
    if (key && key === lastReceiptKey) return;
    lastReceiptKey = key;
    const context = receiptContext(receipt);
    const target = context.target || {};
    const sequence = receipt.sequenceNo ? `#${receipt.sequenceNo}` : '저장됨';
    const triggerLabel = receipt.failed ? (receipt.reason || '') : TRIGGER_LABELS[receipt.triggerType] || '캡처';
    const trigger = receipt.merged ? `${triggerLabel} · 같은 화면이라 #${receipt.sequenceNo || ''}에 합침` : triggerLabel;
    const pageTitle = shortText(context.pageTitle || document.title || '현재 페이지', 56);
    const targetText = shortText(target.visibleText || target.ariaLabel || target.cssSelector || '화면 컨텍스트', 90);

    if (!receiptToast) {
      receiptToast = document.createElement('div');
      receiptToast.setAttribute('data-captureit-receipt', 'true');
      Object.assign(receiptToast.style, {
        position: 'fixed',
        right: '18px',
        bottom: '18px',
        width: 'min(360px, calc(100vw - 36px))',
        padding: '14px 16px',
        border: '1px solid rgba(37, 99, 235, .28)',
        borderRadius: '14px',
        color: '#0f172a',
        background: 'rgba(255, 255, 255, .96)',
        boxShadow: '0 18px 48px rgba(15, 23, 42, .22)',
        fontFamily: 'Inter, Pretendard, "Segoe UI", sans-serif',
        fontSize: '13px',
        lineHeight: '1.45',
        zIndex: '2147483647',
      });
      receiptToast.addEventListener('click', () => {
        receiptToast.remove();
        receiptToast = null;
      });
    }

    receiptToast.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = receipt.failed
      ? `CaptureIT ${receipt.title || '캡처하지 못했습니다'}`
      : receipt.merged ? 'CaptureIT 중복 화면 합침' : `CaptureIT 캡처 ${sequence}`;
    const meta = document.createElement('div');
    meta.textContent = `${trigger} · ${pageTitle}`;
    const detail = document.createElement('div');
    detail.textContent = targetText;
    const hint = document.createElement('div');
    hint.textContent = receipt.failed ? '클릭하면 닫힘' : '클릭하면 닫힘 · 편집기의 수집된 증적에 저장됨';
    Object.assign(meta.style, { marginTop: '6px', color: '#475569' });
    Object.assign(detail.style, { marginTop: '4px', color: receipt.failed ? '#b3261e' : '#1d4ed8', fontWeight: '700' });
    Object.assign(hint.style, { marginTop: '8px', color: '#64748b', fontSize: '11px' });
    receiptToast.append(title, meta, detail, hint);
    document.documentElement.appendChild(receiptToast);

    clearTimeout(receiptTimer);
    receiptTimer = setTimeout(() => {
      if (!receiptToast) return;
      receiptToast.remove();
      receiptToast = null;
    }, 5000);
  }

  // 화면이 실제로 보이고 그려질 때까지 기다린다. 숨겨진 탭에서는 requestAnimationFrame이 돌지 않으므로
  // 보이게 된 뒤 두 프레임이 지나야 응답한다. 녹화 시작 시 첫 화면이 편집기로 찍히던 문제를 막는다.
  function waitForVisiblePaint(timeoutMs = 2000) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        document.removeEventListener('visibilitychange', onVisible);
        resolve(ok);
      };
      const paint = () => requestAnimationFrame(() => requestAnimationFrame(() => finish(true)));
      const onVisible = () => { if (document.visibilityState === 'visible') paint(); };
      setTimeout(() => finish(document.visibilityState === 'visible'), timeoutMs);
      if (document.visibilityState === 'visible') paint();
      else document.addEventListener('visibilitychange', onVisible);
    });
  }

  // 캡처하는 동안 직전 수집 알림을 잠시 감춘다. 알림은 5초 동안 떠 있어서 다음 증적 사진에 찍혀 들어갔다.
  // 일부러 건너뛴 경우(대상 탭이 가려짐 등)는 조용히 넘기고, 그 밖의 실패는 이유를 알린다.
  const SILENT_FAILURES = /화면에 보이지 않아|다른 탭이 열려|녹화 중인 탭이 아니|Capture session is not active|Extension context invalidated/;

  function reportCaptureFailure(error, { force = false, title } = {}) {
    const reason = error && error.message ? error.message : String(error || '');
    if (!force && SILENT_FAILURES.test(reason)) return false;
    const friendly = /MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND/.test(reason)
      ? '너무 빠르게 연속으로 캡처되어 한 장을 놓쳤습니다.'
      : reason;
    showCaptureReceipt({ failed: true, title, reason: friendly, evidenceId: `failed-${Date.now()}` });
    return false;
  }

  async function requestCapture(request) {
    const toast = receiptToast;
    if (toast) {
      toast.style.visibility = 'hidden';
      await scheduleAfterPaint();
    }
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_REQUEST', ...request });
      if (!response || !response.ok) throw new Error(response && response.error ? response.error : 'Capture failed');
      return response;
    } finally {
      if (toast) toast.style.visibility = '';
    }
  }

  function showOverlay(target) {
    savedScroll = { x: window.scrollX, y: window.scrollY };
    target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    const rect = target.getBoundingClientRect();
    overlay = document.createElement('div');
    overlay.setAttribute('data-captureit-overlay', 'true');
    Object.assign(overlay.style, {
      position: 'fixed',
      left: `${Math.max(0, rect.left - 4)}px`,
      top: `${Math.max(0, rect.top - 4)}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      border: '4px solid #ef4444',
      borderRadius: '4px',
      background: 'rgba(250, 204, 21, 0.28)',
      boxSizing: 'content-box',
      pointerEvents: 'none',
      zIndex: '2147483647',
    });
    document.documentElement.appendChild(overlay);
  }

  function hideOverlay() {
    if (overlay) overlay.remove();
    overlay = null;
    if (savedScroll) window.scrollTo(savedScroll.x, savedScroll.y);
    savedScroll = null;
  }

  const controller = CaptureITContentController.createContentController({
    collectContext,
    diffContexts: CaptureITDomDiff.diffContexts,
    getRecordingPolicy: async () => {
      const state = await getState();
      return state.recordingPolicy || {};
    },
    getRouteContext: collectRouteContext,
    getState,
    hideOverlay,
    requestCapture,
    scheduleAfterPaint,
    settler: CaptureITInteractionSettler.createInteractionSettler({ observe: observeMutations }),
    showOverlay,
    notifyCapture: showCaptureReceipt,
  });

  async function shouldCaptureAutomaticEvent(triggerType, eventUrl = window.location.href) {
    if (!recordingActive || recordingMode !== 'event') {
      const state = await getState();
      if (!state.active || state.mode !== 'event') return false;
    }
    return policy.accept(triggerType, eventUrl);
  }

  async function shouldCollectFormInput() {
    if (!recordingActive || recordingMode !== 'event') {
      const state = await getState();
      return Boolean(state.active && state.mode === 'event');
    }
    return true;
  }

  async function captureSettledEvent(triggerType, target, beforeContext, eventUrl = window.location.href) {
    if (!await shouldCaptureAutomaticEvent(triggerType, eventUrl)) return false;
    return controller.captureSettledEvent(triggerType, target, beforeContext).catch((error) => reportCaptureFailure(error));
  }

  async function markFieldDirtyFromEvent(event) {
    const target = event.target;
    if (stateLoaded && !recordingActive) return false;
    if (!isFieldTarget(target) || isCaptureItNode(target)) return false;
    if (!await shouldCollectFormInput()) return false;
    return controller.markFieldDirty(formSelectorFor(target), fieldMetaFor(target)).catch((error) => reportCaptureFailure(error));
  }

  async function handleFieldBlurFromEvent(event) {
    const target = event.target;
    if (stateLoaded && !recordingActive) return false;
    if (!isFieldTarget(target) || isCaptureItNode(target)) return false;
    if (!await shouldCollectFormInput()) return false;
    return controller.handleFieldBlur(formSelectorFor(target)).catch((error) => reportCaptureFailure(error));
  }

  async function handleFormSubmitFromEvent(event) {
    const target = event.target;
    if (stateLoaded && !recordingActive) return false;
    const beforeContext = collectContext(target);
    if (!await shouldCaptureAutomaticEvent('submit')) return false;
    return controller.handleFormSubmit(formSelectorFor(target), target, beforeContext).catch((error) => reportCaptureFailure(error));
  }

  async function captureRouteChange(previousRoute, nextRoute) {
    if (Date.now() - lastClickAt < CLICK_ROUTE_GRACE_MS) return false;
    if (!await shouldCaptureAutomaticEvent('route-change', nextRoute)) return false;
    return controller.captureRouteChange(previousRoute, nextRoute).catch((error) => reportCaptureFailure(error));
  }

  // 화면 전환 감지는 최상위 프레임에서만 한다(iframe 안의 주소 변화로 탭 전체가 찍히지 않게).
  function detectRouteChange() {
    if (!isTopFrame) return;
    const previousRoute = knownUrl;
    const nextRoute = window.location.href;
    if (previousRoute === nextRoute) return;
    knownUrl = nextRoute;
    if (stateLoaded && !recordingActive) return;
    captureRouteChange(previousRoute, nextRoute);
  }

  async function captureBaseline() {
    const state = await getState();
    if (!state.active) return false;
    return controller.captureBaseline(collectContext(document.body)).catch((error) => reportCaptureFailure(error));
  }

  async function captureNavigation() {
    const beforeContext = collectContext(document.body);
    return captureSettledEvent('navigation', document.body, beforeContext);
  }

  function targetKey(target) {
    if (!target || !target.tagName) return '';
    const text = String(target.innerText || target.value || target.getAttribute && target.getAttribute('aria-label') || '').trim().slice(0, 40);
    return `${target.tagName}#${target.id || ''}.${text}`;
  }

  document.addEventListener('click', (event) => {
    if (replayedEvents.has(event)) return;
    if (isCaptureItNode(event.target)) return;
    // 녹화 중이 아니면 아무것도 하지 않는다(무거운 맥락 수집도, Ctrl+Shift+클릭 가로채기도 하지 않는다).
    if (stateLoaded && !recordingActive) return;
    const pathName = CaptureITContentController.classifyClickCapturePath(event);
    if (pathName === 'manual-pin' && recordingActive) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const target = event.target;
      // 강조 캡처 뒤 원래 클릭을 다시 실행한다. Ctrl·Shift를 뗀 클릭으로 재생해야 링크가 새 창으로
      // 열리거나 표에서 다중 선택되는 일이 없다. 캡처가 실패해도 원래 동작은 반드시 실행한다.
      const replayProps = {
        bubbles: true,
        cancelable: true,
        clientX: event.clientX,
        clientY: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        button: event.button,
        buttons: event.buttons,
        ctrlKey: false,
        shiftKey: false,
        altKey: event.altKey,
        metaKey: event.metaKey,
        relatedTarget: event.relatedTarget,
        view: event.view,
      };
      controller.captureHighlightShortcut(target)
        .catch((error) => reportCaptureFailure(error, { force: true, title: '강조 캡처하지 못했습니다' }))
        .finally(() => {
          if (!target.isConnected) return;
          const replayEvent = new MouseEvent('click', replayProps);
          replayedEvents.add(replayEvent);
          target.dispatchEvent(replayEvent);
        });
      return;
    }
    lastClickAt = Date.now();
    const beforeContext = collectContext(event.target);
    captureSettledEvent('click', event.target, beforeContext, `${window.location.href}\u0000${targetKey(event.target)}`);
  }, true);

  document.addEventListener('input', (event) => markFieldDirtyFromEvent(event), true);
  document.addEventListener('change', (event) => markFieldDirtyFromEvent(event), true);
  document.addEventListener('blur', (event) => handleFieldBlurFromEvent(event), true);
  document.addEventListener('submit', (event) => handleFormSubmitFromEvent(event), true);
  document.addEventListener('contextmenu', (event) => controller.setLastContextTarget(event.target), true);

  window.addEventListener('hashchange', detectRouteChange);
  window.addEventListener('popstate', detectRouteChange);

  if (isTopFrame) setInterval(detectRouteChange, 250);

  getState().catch(() => {});
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes.captureSession) return;
      const state = changes.captureSession.newValue || { active: false, mode: null };
      recordingActive = Boolean(state.active);
      recordingMode = state.mode || null;
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) return false;
    if (message.type === 'CAPTURE_CONTEXT_MENU') {
      controller.captureContextMenu()
        .then((captured) => {
          if (!captured) {
            reportCaptureFailure(new Error(recordingActive ? '강조할 요소를 찾지 못했습니다. 요소 위에서 다시 우클릭하세요.' : '녹화 중일 때만 강조 캡처가 됩니다. 편집기에서 녹화를 시작하세요.'), { force: true, title: '강조 캡처하지 못했습니다' });
          }
          sendResponse({ ok: captured });
        })
        .catch((error) => {
          reportCaptureFailure(error, { force: true, title: '강조 캡처하지 못했습니다' });
          sendResponse({ ok: false });
        });
      return true;
    }
    if (message.type === 'CAPTURE_BASELINE') {
      captureBaseline().then((captured) => sendResponse({ ok: captured }));
      return true;
    }
    if (message.type === 'CAPTURE_NAVIGATION') {
      captureNavigation().then((captured) => sendResponse({ ok: captured }));
      return true;
    }
    if (message.type === 'COLLECT_PAGE_CONTEXT') {
      // 순수 컨텍스트 조회 - 스크린샷/캡처를 트리거하지 않는다. background.js가 RecordingSession
      // 시작 시 baseline 컨텍스트로 editor.html 자신의 document/location 대신 실제 웹페이지의
      // 컨텍스트를 얻기 위해 사용한다.
      sendResponse({ ok: true, context: collectContext(document.body) });
      return false;
    }
    if (message.type === 'CAPTUREIT_UI') {
      // 캡처 직전 CaptureIT 알림을 감추고, 화면에 반영된 뒤 응답한다. 캡처 후 다시 보인다.
      if (receiptToast) receiptToast.style.visibility = message.visible ? '' : 'hidden';
      if (message.visible || !receiptToast) {
        sendResponse({ ok: true });
        return false;
      }
      scheduleAfterPaint().then(() => sendResponse({ ok: true }));
      return true;
    }
    if (message.type === 'WAIT_FOR_PAINT') {
      waitForVisiblePaint(message.timeoutMs).then((ok) => sendResponse({ ok }));
      return true;
    }
    if (message.type === 'CAPTURE_RECEIPT') {
      showCaptureReceipt(message);
      sendResponse({ ok: true });
      return false;
    }
    return false;
  });
})();
