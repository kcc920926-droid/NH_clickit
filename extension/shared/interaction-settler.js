(function attachInteractionSettler(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CaptureITInteractionSettler = api;
})(globalThis, function createInteractionSettlerApi() {
  function defaultObserve() {
    return () => {};
  }

  function createInteractionSettler(dependencies = {}) {
    const observe = dependencies.observe || defaultObserve;
    const now = dependencies.now || Date.now;
    const setTimer = dependencies.setTimer || setTimeout;
    const clearTimer = dependencies.clearTimer || clearTimeout;

    function waitForSettle(options = {}) {
      const mutationQuietMs = Math.max(0, Number(options.mutationQuietMs ?? 0));
      const maxSettleMs = Math.max(0, Number(options.maxSettleMs ?? mutationQuietMs));
      const startedAt = now();

      return new Promise((resolve) => {
        let quietTimer = null;
        let maxTimer = null;
        let unsubscribe = null;
        let done = false;

        function finish(reason) {
          if (done) return;
          done = true;
          if (quietTimer !== null) clearTimer(quietTimer);
          if (maxTimer !== null) clearTimer(maxTimer);
          if (typeof unsubscribe === 'function') unsubscribe();
          resolve({
            settled: true,
            reason,
            waitedMs: Math.max(0, now() - startedAt),
          });
        }

        function resetQuietTimer() {
          if (quietTimer !== null) clearTimer(quietTimer);
          quietTimer = setTimer(() => finish('quiet'), mutationQuietMs);
        }

        unsubscribe = observe(resetQuietTimer) || null;
        resetQuietTimer();
        maxTimer = setTimer(() => finish('max-settle'), maxSettleMs);
      });
    }

    return { waitForSettle };
  }

  return { createInteractionSettler };
});
