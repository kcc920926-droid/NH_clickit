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
      loadActiveRecordingSession = async () => null,
      loadSession,
      now = () => new Date().toISOString(),
      persistEvidence,
      saveSession,
    } = dependencies;

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

    async function createEvidenceForSession(session, request) {
      session.lastSequenceNo += 1;
      const imageDataUrl = await captureVisible(request);
      const mapped = mapRequestContext(request);
      const evidence = {
        id: createId(),
        sessionId: session.id,
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
      return createEvidenceForSession(session, request);
    }

    async function startRecordingSession({ tabId, recordingPolicy = {}, captureBaselineContext = {} }) {
      const locked = await ensureRecordingLock(tabId);
      if (!locked) {
        return loadActiveRecordingSession(tabId);
      }

      const session = domain.createRecordingSession(recordingPolicy, now(), createId());
      session.active = true;
      session.tabId = tabId;
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
