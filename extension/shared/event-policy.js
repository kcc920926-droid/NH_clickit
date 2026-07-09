(function attachEventPolicy(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CaptureITEventPolicy = api;
})(globalThis, function createEventPolicyApi() {
  const EVENT_TRIGGERS = new Set(['click', 'submit', 'navigation', 'route-change']);

  function isEventTrigger(triggerType) {
    return EVENT_TRIGGERS.has(triggerType);
  }

  function createPolicy(windowMs = 750) {
    const acceptedAt = new Map();
    return {
      accept(triggerType, url, now = Date.now()) {
        if (!isEventTrigger(triggerType)) return false;
        const signature = `${triggerType}\u0000${url}`;
        const previous = acceptedAt.get(signature);
        if (previous !== undefined && now - previous < windowMs) return false;
        acceptedAt.set(signature, now);
        return true;
      },
    };
  }

  return {
    createPolicy,
    isEventTrigger,
  };
});
