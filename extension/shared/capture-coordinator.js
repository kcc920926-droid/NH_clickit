(function attachCaptureCoordinator(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CaptureITCaptureCoordinator = api;
})(globalThis, function createCaptureCoordinatorApi(root) {
  const domain = root.CaptureITDomain || (typeof require === 'function' ? require('./domain.js') : null);

  function createCaptureCoordinator(dependencies) {
    const {
      captureVisible,
      createId = () => crypto.randomUUID(),
      ensureRecordingLock = async () => true,
      // 중복 화면 합치기: 둘 다 주입된 경우에만 동작한다(주입하지 않으면 기존 동작과 동일).
      fingerprintImage = null,
      loadEvidence = null,
      loadActiveRecordingSession = async () => null,
      loadSession,
      now = () => new Date().toISOString(),
      persistEvidence,
      saveSession,
    } = dependencies;
    const dedupe = dependencies.dedupe
      || root.CaptureITEvidenceDedupe
      || (typeof require === 'function' ? require('./evidence-dedupe.js') : null);

    // 방금 찍은 화면이 직전 증적과 거의 같으면 새 증적을 만들지 않고 직전 증적에 동작 기록만 합친다.
    // 합쳤으면 직전 증적을, 아니면 null을 돌려준다. 실패해도 일반 저장으로 넘어간다.
    async function mergeIntoPreviousIfDuplicate(session, request, imageDataUrl, fingerprint) {
      if (!dedupe || !fingerprint || typeof loadEvidence !== 'function' || !session.lastEvidenceId) return null;
      const policy = session.recordingPolicy || {};
      if (policy.mergeDuplicateScreens === false) return null;
      const previous = await loadEvidence(session.lastEvidenceId);
      if (!previous || !previous.fingerprint) return null;
      const candidate = {
        sessionId: session.id,
        triggerType: request.triggerType,
        capturedAt: now(),
        context: request.context || {},
        domDiff: request.domDiff || null,
        fingerprint,
      };
      const options = {};
      if (policy.duplicateMaxChangedRatio !== undefined) options.maxChangedRatio = policy.duplicateMaxChangedRatio;
      if (!dedupe.isNearDuplicate(previous, candidate, options)) return null;
      dedupe.appendMergedEvents(previous, [candidate]);
      await persistEvidence(previous);
      return previous;
    }

    function mapRequestContext(request) {
      const after = request.after || request.context || {};
      return {
        event: request.before || request.after || request.domDiff
          ? { triggerType: request.triggerType, capturedFrom: request.source || 'web-capture' }
          : null,
        page: after.page || {
          pageTitle: after.pageTitle || '',
          pageUrl: after.pageUrl || '',
          route: after.route || '',
        },
        target: after.target || request.target || null,
        container: after.container || after.containerContext || request.containerContext || null,
        domBefore: request.before || null,
        domAfter: request.after || null,
        domDiff: request.domDiff || null,
      };
    }

    async function createEvidenceForSession(session, request, { allowMerge = false } = {}) {
      session.lastSequenceNo += 1;
      const imageDataUrl = await captureVisible(request);
      let fingerprint = null;
      if (typeof fingerprintImage === 'function') {
        fingerprint = await Promise.resolve(fingerprintImage(imageDataUrl)).catch(() => null);
      }
      if (allowMerge) {
        const merged = await mergeIntoPreviousIfDuplicate(session, request, imageDataUrl, fingerprint).catch(() => null);
        if (merged) {
          // 합친 화면은 증적이 되지 않았으므로 순번을 쓰지 않는다.
          session.lastSequenceNo -= 1;
          return { ...merged, merged: true };
        }
      }
      const mapped = mapRequestContext(request);
      const evidence = {
        id: createId(),
        sessionId: session.id,
        reportId: session.reportId || null,
        sequenceNo: session.lastSequenceNo,
        capturedAt: now(),
        triggerType: request.triggerType,
        source: 'web-capture',
        featureSpecId: null,
        previousCaptureId: session.lastEvidenceId || null,
        nextCaptureId: null,
        context: request.context,
        stepId: null,
        event: mapped.event,
        page: mapped.page,
        target: mapped.target,
        container: mapped.container,
        domBefore: mapped.domBefore,
        domAfter: mapped.domAfter,
        domDiff: mapped.domDiff,
        formSelector: request.formSelector || request.context && request.context.formSelector || '',
        dirtyFields: request.dirtyFields || request.context && request.context.dirtyFields || [],
        imageDataUrl,
        thumbnailDataUrl: null,
        llmImageDataUrl: null,
        docImageDataUrl: null,
        imageMeta: {},
        fingerprint,
        mergedEvents: [],
        apiEvents: [],
        serverEvents: [],
        assertions: [],
      };
      session.lastEvidenceId = evidence.id;
      await persistEvidence(evidence);
      await saveSession(session);
      return evidence;
    }

    async function capture(request) {
      const session = await loadSession();
      if (!session || !session.active) throw new Error('Capture session is not active');
      return createEvidenceForSession(session, request, { allowMerge: true });
    }

    async function startRecordingSession({ tabId, recordingPolicy = {}, captureBaselineContext = {}, reportId = null }) {
      const locked = await ensureRecordingLock(tabId);
      if (!locked) {
        return loadActiveRecordingSession(tabId);
      }

      const session = domain.createRecordingSession(recordingPolicy, now(), createId());
      session.active = true;
      session.tabId = tabId;
      session.reportId = reportId;
      await saveSession(session);

      if (session.recordingPolicy.captureBaselineOnStart !== false) {
        const baseline = await createEvidenceForSession(session, {
          triggerType: 'baseline',
          context: captureBaselineContext,
          after: captureBaselineContext,
        });
        session.baselineEvidenceId = baseline.id;
        await saveSession(session);
      }

      return session;
    }

    async function stopRecordingSession(session) {
      session.active = false;
      session.endedAt = now();
      await saveSession(session);
      return session;
    }

    return { capture, startRecordingSession, stopRecordingSession };
  }

  return {
    createCaptureCoordinator,
  };
});
