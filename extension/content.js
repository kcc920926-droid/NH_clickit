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
  let manualPinInProgress = false;

  function getState() {
    return chrome.storage.local.get('captureSession').then((result) => (
      result.captureSession || { active: false, mode: null }
    )).then((state) => {
      recordingActive = Boolean(state.active);
      recordingMode = state.mode || null;
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
    const observer = new MutationObserver(onMutation);
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });
    return () => observer.disconnect();
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

  function showCaptureReceipt(receipt = {}) {
    const key = receipt.evidenceId || `${receipt.sequenceNo || ''}:${receipt.triggerType || ''}`;
    if (key && key === lastReceiptKey) return;
    lastReceiptKey = key;
    const context = receiptContext(receipt);
    const target = context.target || {};
    const sequence = receipt.sequenceNo ? `#${receipt.sequenceNo}` : '저장됨';
    const trigger = receipt.triggerType || 'capture';
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
    title.textContent = `CaptureIT 캡처 ${sequence}`;
    const meta = document.createElement('div');
    meta.textContent = `${trigger} · ${pageTitle}`;
    const detail = document.createElement('div');
    detail.textContent = targetText;
    const hint = document.createElement('div');
    hint.textContent = '클릭하면 닫힘 · 편집기의 수집된 증적에 저장됨';
    Object.assign(meta.style, { marginTop: '6px', color: '#475569' });
    Object.assign(detail.style, { marginTop: '4px', color: '#1d4ed8', fontWeight: '700' });
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

  async function requestCapture(request) {
    const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_REQUEST', ...request });
    if (!response || !response.ok) throw new Error(response && response.error ? response.error : 'Capture failed');
    return response;
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
    return controller.captureSettledEvent(triggerType, target, beforeContext).catch(() => false);
  }

  async function markFieldDirtyFromEvent(event) {
    const target = event.target;
    if (!isFieldTarget(target)) return false;
    if (!await shouldCollectFormInput()) return false;
    return controller.markFieldDirty(formSelectorFor(target), fieldMetaFor(target)).catch(() => false);
  }

  async function handleFieldBlurFromEvent(event) {
    const target = event.target;
    if (!isFieldTarget(target)) return false;
    if (!await shouldCollectFormInput()) return false;
    return controller.handleFieldBlur(formSelectorFor(target)).catch(() => false);
  }

  async function handleFormSubmitFromEvent(event) {
    const target = event.target;
    const beforeContext = collectContext(target);
    if (!await shouldCaptureAutomaticEvent('submit')) return false;
    return controller.handleFormSubmit(formSelectorFor(target), target, beforeContext).catch(() => false);
  }

  async function captureRouteChange(previousRoute, nextRoute) {
    if (!await shouldCaptureAutomaticEvent('route-change', nextRoute)) return false;
    return controller.captureRouteChange(previousRoute, nextRoute).catch(() => false);
  }

  function detectRouteChange() {
    const previousRoute = knownUrl;
    const nextRoute = window.location.href;
    if (previousRoute === nextRoute) return;
    knownUrl = nextRoute;
    captureRouteChange(previousRoute, nextRoute);
  }

  async function captureBaseline() {
    const state = await getState();
    if (!state.active) return false;
    return controller.captureBaseline(collectContext(document.body)).catch(() => false);
  }

  async function captureNavigation() {
    const beforeContext = collectContext(document.body);
    return captureSettledEvent('navigation', document.body, beforeContext);
  }

  document.addEventListener('click', (event) => {
    if (replayedEvents.has(event)) return;
    const pathName = CaptureITContentController.classifyClickCapturePath(event);
    if (pathName === 'manual-pin') {
      event.preventDefault();
      event.stopImmediatePropagation();
      const target = event.target;
      manualPinInProgress = true;
      const originalProps = {
        bubbles: true,
        cancelable: true,
        clientX: event.clientX,
        clientY: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        button: event.button,
        buttons: event.buttons,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
          relatedTarget: event.relatedTarget,
          view: event.view,
        };
      controller.captureHighlightShortcut(target).then((captured) => {
        if (!captured) return;
        const replayEvent = new MouseEvent('click', originalProps);
        replayedEvents.add(replayEvent);
        target.dispatchEvent(replayEvent);
      }).catch(() => {}).finally(() => {
        manualPinInProgress = false;
      });
      return;
    }
    const beforeContext = collectContext(event.target);
    captureSettledEvent('click', event.target, beforeContext);
  }, true);

  document.addEventListener('input', (event) => markFieldDirtyFromEvent(event), true);
  document.addEventListener('change', (event) => markFieldDirtyFromEvent(event), true);
  document.addEventListener('blur', (event) => handleFieldBlurFromEvent(event), true);
  document.addEventListener('submit', (event) => handleFormSubmitFromEvent(event), true);
  document.addEventListener('contextmenu', (event) => controller.setLastContextTarget(event.target), true);

  window.addEventListener('hashchange', detectRouteChange);
  window.addEventListener('popstate', detectRouteChange);

  setInterval(detectRouteChange, 250);

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
      controller.captureContextMenu().then((captured) => sendResponse({ ok: captured }));
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
    if (message.type === 'CAPTURE_RECEIPT') {
      showCaptureReceipt(message);
      sendResponse({ ok: true });
      return false;
    }
    return false;
  });
})();
