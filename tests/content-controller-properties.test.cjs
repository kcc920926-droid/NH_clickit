const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fc = require('fast-check');

const modulePath = path.resolve(__dirname, '../extension/shared/content-controller.js');

function loadController() {
  assert.equal(fs.existsSync(modulePath), true, 'content controller module should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

// Feature: streamlined-report-authoring, Property 13: Highlight_Shortcut_Capture의 결과는 대상 요소의 연결 상태 궤적에 의해 결정된다. For any target element and any timeline of connection/disconnection events relative to the capture pipeline's await points, invoking captureHighlightShortcut SHALL request a capture with triggerType exactly 'shortcut-context' and SHALL signal success (enabling a subsequent Fallback_Click_Replay) if and only if the target remained connected through every check point in the pipeline; if the target became disconnected before any check point, the function SHALL return a falsy result, SHALL NOT request a capture past that point, and the caller SHALL NOT perform a Fallback_Click_Replay.
// Validates: Requirements 9.2, 9.4, 9.6
test('Shortcut Property 13: captureHighlightShortcut result is determined by target connectivity trajectory', async () => {
  const content = loadController();

  await fc.assert(
    fc.asyncProperty(
      fc.tuple(fc.boolean(), fc.boolean(), fc.boolean()),
      async (trajectory) => {
        const [checkpoint1, checkpoint2, checkpoint3] = trajectory;

        const target = { isConnected: checkpoint1 };
        const capturedRequests = [];

        const controller = content.createContentController({
          getState: async () => ({ active: true }),
          collectContext: () => ({}),
          showOverlay: () => {},
          scheduleAfterPaint: async () => {
            target.isConnected = checkpoint2;
          },
          requestCapture: async (request) => {
            capturedRequests.push(request);
            return { ok: true };
          },
          notifyCapture: () => {},
          hideOverlay: async () => {
            target.isConnected = checkpoint3;
          },
        });

        const expectedCaptureRequested = checkpoint1 && checkpoint2;
        const expectedSuccess = checkpoint1 && checkpoint2 && checkpoint3;

        const result = await controller.captureHighlightShortcut(target);

        assert.equal(Boolean(result), expectedSuccess);

        if (expectedCaptureRequested) {
          assert.equal(capturedRequests.length, 1);
          assert.equal(capturedRequests[0].triggerType, 'shortcut-context');
        } else {
          assert.equal(capturedRequests.length, 0);
        }
      }
    ),
    { numRuns: 100 }
  );
});

test('Property 4: inactive state never creates automatic event evidence', async () => {
  const content = loadController();

  await fc.assert(
    fc.asyncProperty(fc.constantFrom('click', 'submit', 'route-change'), async (triggerType) => {
      const calls = [];
      const controller = content.createContentController({
        getState: async () => ({ active: false, mode: 'event' }),
        collectContext: () => ({}),
        scheduleAfterPaint: async () => {},
        requestCapture: async (request) => calls.push(request),
      });

      assert.equal(await controller.captureEvent(triggerType, {}), false);
      assert.deepEqual(calls, []);
    }),
    { numRuns: 30 },
  );
});

test('Property 5: duplicate triggers are suppressed only inside the suppression window', async () => {
  const content = loadController();

  await fc.assert(
    fc.asyncProperty(fc.integer({ min: 0, max: 100 }), async (deltaMs) => {
      let currentTime = 1000;
      const calls = [];
      const controller = content.createContentController({
        getState: async () => ({ active: true, mode: 'event' }),
        getRecordingPolicy: async () => ({ duplicateTriggerSuppressMs: 50 }),
        now: () => currentTime,
        collectContext: () => ({ route: '/same', target: { visibleText: '저장' } }),
        scheduleAfterPaint: async () => {},
        requestCapture: async (request) => { calls.push(request); return {}; },
      });

      await controller.captureEvent('click', { id: 'button' });
      currentTime += deltaMs;
      await controller.captureEvent('click', { id: 'button' });

      assert.equal(calls.length, deltaMs <= 50 ? 1 : 2);
    }),
    { numRuns: 30 },
  );
});

test('Property 6: Manual_Pin processing does not suppress other event detection', async () => {
  const content = loadController();
  const calls = [];
  const controller = content.createContentController({
    getState: async () => ({ active: true, mode: 'event' }),
    collectContext: () => ({}),
    scheduleAfterPaint: async () => {},
    requestCapture: async (request) => { calls.push(request); return {}; },
  });

  await controller.captureManualPin({ isConnected: true });
  await controller.captureEvent('click', { id: 'button' });

  assert.deepEqual(calls.map((request) => request.triggerType), ['manual-pin', 'click']);
});

test('Property 7: dirty field flush creates one form Evidence with exactly accumulated fields', async () => {
  const content = loadController();

  await fc.assert(
    fc.asyncProperty(fc.uniqueArray(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 6 }), async (selectors) => {
      const calls = [];
      const controller = content.createContentController({
        getState: async () => ({ active: true, mode: 'event' }),
        getRecordingPolicy: async () => ({ inputDebounceMs: 1000 }),
        collectContext: () => ({}),
        scheduleAfterPaint: async () => {},
        requestCapture: async (request) => { calls.push(request); return {}; },
      });

      for (const selector of selectors) {
        await controller.markFieldDirty('#form', { selector, label: selector, accessibleName: selector, maskedValue: 'x' });
      }
      await controller.flushDirtyFields('#form');

      assert.equal(calls.length, 1);
      assert.deepEqual(calls[0].dirtyFields.map((field) => field.selector).sort(), selectors.sort());
    }),
    { numRuns: 30 },
  );
});

test('Property 8: blur flushes immediately regardless of debounce', async () => {
  const content = loadController();
  const calls = [];
  const controller = content.createContentController({
    getState: async () => ({ active: true, mode: 'event' }),
    getRecordingPolicy: async () => ({ inputDebounceMs: 99999 }),
    collectContext: () => ({}),
    scheduleAfterPaint: async () => {},
    requestCapture: async (request) => { calls.push(request); return {}; },
  });

  await controller.markFieldDirty('#form', { selector: '#name', label: '이름', accessibleName: '이름', maskedValue: '홍*동' });
  await controller.handleFieldBlur('#form');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].triggerType, 'form-input');
});

test('Property 9: submit flushes pending dirty fields before submit evidence', async () => {
  const content = loadController();
  const calls = [];
  const controller = content.createContentController({
    getState: async () => ({ active: true, mode: 'event' }),
    getRecordingPolicy: async () => ({ inputDebounceMs: 99999, mutationQuietMs: 0, maxSettleMs: 10 }),
    settler: { waitForSettle: async () => ({ settled: true }) },
    diffContexts: () => ({}),
    collectContext: () => ({ pageTitle: '제출' }),
    scheduleAfterPaint: async () => {},
    requestCapture: async (request) => { calls.push(request); return {}; },
  });

  await controller.markFieldDirty('#form', { selector: '#name', label: '이름', accessibleName: '이름', maskedValue: '홍*동' });
  await controller.handleFormSubmit('#form', { tagName: 'FORM' }, { pageTitle: '이전' });

  assert.deepEqual(calls.map((request) => request.triggerType), ['form-input', 'submit']);
});

test('Property 17: settled event capture is requested only after InteractionSettler resolves', async () => {
  const content = loadController();
  const order = [];
  const controller = content.createContentController({
    getState: async () => ({ active: true, mode: 'event' }),
    getRecordingPolicy: async () => ({ mutationQuietMs: 10, maxSettleMs: 100 }),
    settler: { waitForSettle: async () => { order.push('settled'); } },
    diffContexts: () => ({}),
    collectContext: () => ({ pageTitle: '이후' }),
    scheduleAfterPaint: async () => {},
    requestCapture: async () => { order.push('capture'); return {}; },
  });

  await controller.captureSettledEvent('click', {}, { pageTitle: '이전' });

  assert.deepEqual(order, ['settled', 'capture']);
});

test('Property 18: route-change evidence records the exact previous/new route pair', async () => {
  const content = loadController();
  await fc.assert(
    fc.asyncProperty(fc.webUrl(), fc.webUrl(), async (previousRoute, nextRoute) => {
      const calls = [];
      const controller = content.createContentController({
        getState: async () => ({ active: true, mode: 'event' }),
        collectContext: () => ({}),
        scheduleAfterPaint: async () => {},
        requestCapture: async (request) => { calls.push(request); return {}; },
      });

      await controller.captureRouteChange(previousRoute, nextRoute);

      assert.equal(calls[0].context.previousRoute, previousRoute);
      assert.equal(calls[0].context.route, nextRoute);
    }),
    { numRuns: 30 },
  );
});

test('Property 19: route recording failure never blocks evidence creation', async () => {
  const content = loadController();
  const calls = [];
  const controller = content.createContentController({
    getState: async () => ({ active: true, mode: 'event' }),
    getRouteContext: () => { throw new Error('route read failed'); },
    collectContext: () => ({}),
    scheduleAfterPaint: async () => {},
    requestCapture: async (request) => { calls.push(request); return {}; },
  });

  await controller.captureRouteChange('/old', '/new');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].triggerType, 'route-change');
});

test('Property 20: Manual_Pin and automatic click paths are mutually exclusive by modifiers', () => {
  const content = loadController();

  fc.assert(
    fc.property(fc.record({ ctrlKey: fc.boolean(), shiftKey: fc.boolean(), altKey: fc.boolean(), metaKey: fc.boolean() }), (event) => {
      const pathName = content.classifyClickCapturePath(event);
      const manual = event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey;

      assert.equal(pathName, manual ? 'manual-pin' : 'click');
    }),
    { numRuns: 100 },
  );
});
