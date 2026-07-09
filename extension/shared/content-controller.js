(function attachContentController(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CaptureITContentController = api;
})(globalThis, function createContentControllerApi() {
  function classifyClickCapturePath(event = {}) {
    return event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey ? 'manual-pin' : 'click';
  }

  function createContentController(dependencies) {
    const {
      collectContext,
      clearTimer = clearTimeout,
      diffContexts = () => ({}),
      getRecordingPolicy = async () => ({}),
      getRouteContext = (previousRoute, nextRoute) => ({ previousRoute, route: nextRoute }),
      getState,
      hideOverlay = () => {},
      notifyCapture = () => {},
      now = () => Date.now(),
      requestCapture,
      scheduleAfterPaint,
      setTimer = setTimeout,
      settler = { waitForSettle: async () => ({ settled: true }) },
      showOverlay = () => {},
    } = dependencies;
    let lastContextTarget = null;
    const lastTriggerAt = new Map();
    const dirtyForms = new Map();

    function triggerSignature(triggerType, target) {
      return `${triggerType}\u0000${target && (target.id || target.name || target.text || target.tagName) || ''}`;
    }

    async function acceptsTrigger(triggerType, target) {
      const policy = await getRecordingPolicy();
      const windowMs = Math.max(0, Number(policy.duplicateTriggerSuppressMs || 0));
      if (!windowMs) return true;
      const signature = triggerSignature(triggerType, target);
      const timestamp = now();
      const last = lastTriggerAt.get(signature);
      if (last !== undefined && timestamp - last <= windowMs) return false;
      lastTriggerAt.set(signature, timestamp);
      return true;
    }

    async function captureEvent(triggerType, target) {
      const state = await getState();
      if (!state.active || state.mode !== 'event') return false;
      if (!await acceptsTrigger(triggerType, target)) return false;
      await scheduleAfterPaint();
      const context = collectContext(target);
      const receipt = await requestCapture({ triggerType, context });
      notifyCapture({ ...receipt, triggerType, context });
      return true;
    }

    function setLastContextTarget(target) {
      lastContextTarget = target;
    }

    async function captureTarget(target, triggerType) {
      const state = await getState();
      if (!state.active) return false;
      showOverlay(target);
      try {
        await scheduleAfterPaint();
        const context = collectContext(target);
        const receipt = await requestCapture({ triggerType, context });
        notifyCapture({ ...receipt, triggerType, context });
      } finally {
        hideOverlay();
      }
      return true;
    }

    async function captureContextMenu() {
      if (!lastContextTarget || !lastContextTarget.isConnected) return false;
      return captureTarget(lastContextTarget, 'context-menu');
    }

    async function captureHighlightShortcut(target) {
      const state = await getState();
      if (!state.active) return false;
      if (!target || !target.isConnected) return false;
      showOverlay(target);
      try {
        await scheduleAfterPaint();
        if (!target.isConnected) return false;
        const context = collectContext(target);
        const receipt = await requestCapture({ triggerType: 'shortcut-context', context });
        notifyCapture({ ...receipt, triggerType: 'shortcut-context', context });
      } finally {
        hideOverlay();
      }
      if (!target.isConnected) return false;
      return true;
    }

    async function captureManualPin(target) {
      const state = await getState();
      if (!state.active) return false;
      return captureTarget(target, 'manual-pin');
    }

    async function captureSettledEvent(triggerType, target, beforeContext) {
      const state = await getState();
      if (!state.active || state.mode && state.mode !== 'event') return false;
      const policy = await getRecordingPolicy();
      await settler.waitForSettle({
        mutationQuietMs: policy.mutationQuietMs ?? 0,
        maxSettleMs: policy.maxSettleMs ?? policy.mutationQuietMs ?? 0,
      });
      const afterContext = collectContext(target);
      const domDiff = diffContexts(beforeContext, afterContext);
      const receipt = await requestCapture({
        triggerType,
        before: beforeContext,
        after: afterContext,
        domDiff,
        context: afterContext,
      });
      notifyCapture({ ...receipt, triggerType, context: afterContext });
      return true;
    }

    async function captureFormEvidence(formSelector, dirtyFieldEntries) {
      const state = await getState();
      if (!state.active || state.mode && state.mode !== 'event') return false;
      const fields = dirtyFieldEntries.map((entry) => ({
        selector: entry.selector || '',
        label: entry.label || '',
        accessibleName: entry.accessibleName || '',
        maskedValue: entry.maskedValue || '',
      }));
      const context = { formSelector, dirtyFields: fields };
      const receipt = await requestCapture({
        triggerType: 'form-input',
        formSelector,
        dirtyFields: fields,
        context,
      });
      notifyCapture({ ...receipt, triggerType: 'form-input', context });
      return true;
    }

    async function flushDirtyFields(formSelector) {
      const record = dirtyForms.get(formSelector);
      if (!record || record.fields.size === 0) return false;
      if (record.timer) clearTimer(record.timer);
      dirtyForms.delete(formSelector);
      return captureFormEvidence(formSelector, [...record.fields.values()]);
    }

    async function markFieldDirty(formSelector, fieldMeta) {
      const state = await getState();
      if (!state.active || state.mode && state.mode !== 'event') return false;
      const policy = await getRecordingPolicy();
      const debounceMs = Math.max(0, Number(policy.inputDebounceMs ?? 800));
      const record = dirtyForms.get(formSelector) || { fields: new Map(), timer: null };
      const selector = fieldMeta.selector || fieldMeta.name || fieldMeta.accessibleName || String(record.fields.size);
      record.fields.set(selector, { ...fieldMeta, selector });
      if (record.timer) clearTimer(record.timer);
      dirtyForms.set(formSelector, record);
      if (debounceMs === 0) {
        await flushDirtyFields(formSelector);
      } else {
        record.timer = setTimer(() => {
          flushDirtyFields(formSelector).catch(() => {});
        }, debounceMs);
      }
      return true;
    }

    function handleFieldBlur(formSelector) {
      return flushDirtyFields(formSelector);
    }

    async function handleFormSubmit(formSelector, target, beforeContext) {
      await flushDirtyFields(formSelector);
      return captureSettledEvent('submit', target, beforeContext);
    }

    async function captureBaseline(context) {
      const state = await getState();
      if (!state.active) return false;
      const receipt = await requestCapture({ triggerType: 'baseline', context });
      notifyCapture({ ...receipt, triggerType: 'baseline', context });
      return true;
    }

    async function captureRouteChange(previousRoute, nextRoute) {
      const state = await getState();
      if (!state.active || state.mode && state.mode !== 'event') return false;
      let context;
      try {
        context = getRouteContext(previousRoute, nextRoute);
      } catch (_error) {
        context = { previousRoute, route: nextRoute };
      }
      const receipt = await requestCapture({ triggerType: 'route-change', context });
      notifyCapture({ ...receipt, triggerType: 'route-change', context });
      return true;
    }

    return {
      captureBaseline,
      captureContextMenu,
      captureEvent,
      captureHighlightShortcut,
      captureManualPin,
      captureRouteChange,
      captureSettledEvent,
      captureFormEvidence,
      flushDirtyFields,
      handleFieldBlur,
      handleFormSubmit,
      markFieldDirty,
      setLastContextTarget,
    };
  }

  return {
    classifyClickCapturePath,
    createContentController,
  };
});
