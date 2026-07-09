const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const fc = require('fast-check');

const modulePath = path.resolve(__dirname, '../extension/shared/interaction-settler.js');

function loadSettler() {
  assert.equal(fs.existsSync(modulePath), true, 'interaction-settler module should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

function createManualClock() {
  let currentTime = 0;
  let nextId = 1;
  const timers = new Map();

  return {
    now: () => currentTime,
    setTimer(fn, ms) {
      const id = nextId;
      nextId += 1;
      timers.set(id, { at: currentTime + Math.max(0, ms), fn });
      return id;
    },
    clearTimer(id) {
      timers.delete(id);
    },
    advanceTo(targetTime) {
      while (true) {
        let nextEntry = null;
        for (const [id, timer] of timers) {
          if (timer.at <= targetTime && (!nextEntry || timer.at < nextEntry.timer.at)) {
            nextEntry = { id, timer };
          }
        }
        if (!nextEntry) break;
        currentTime = nextEntry.timer.at;
        timers.delete(nextEntry.id);
        nextEntry.timer.fn();
      }
      currentTime = targetTime;
    },
  };
}

async function runSettlerScenario({ mutationQuietMs, maxSettleMs, mutationTimes }) {
  const { createInteractionSettler } = loadSettler();
  const clock = createManualClock();
  let observeCallback;
  const settler = createInteractionSettler({
    observe(callback) {
      observeCallback = callback;
      return () => {};
    },
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  });

  const resultPromise = settler.waitForSettle({ mutationQuietMs, maxSettleMs });
  for (const time of mutationTimes) {
    clock.advanceTo(time);
    observeCallback();
  }
  clock.advanceTo(maxSettleMs);
  return resultPromise;
}

test('Property 15: InteractionSettler resolves at the first full mutation-quiet boundary', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.integer({ min: 2, max: 50 }).chain((mutationQuietMs) =>
        fc.array(fc.integer({ min: 1, max: mutationQuietMs - 1 }), { minLength: 0, maxLength: 8 }).map((intervals) => ({
          mutationQuietMs,
          intervals,
        })),
      ),
      async ({ mutationQuietMs, intervals }) => {
        const mutationTimes = [0];
        for (const interval of intervals) {
          mutationTimes.push(mutationTimes[mutationTimes.length - 1] + interval);
        }
        const expectedResolveAt = mutationTimes[mutationTimes.length - 1] + mutationQuietMs;
        const maxSettleMs = expectedResolveAt + 100;

        const result = await runSettlerScenario({ mutationQuietMs, maxSettleMs, mutationTimes });

        assert.deepEqual(result, { settled: true, reason: 'quiet', waitedMs: expectedResolveAt });
      },
    ),
    { numRuns: 100 },
  );
});

test('Property 16: InteractionSettler resolves at maxSettleMs when no quiet interval is long enough', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        mutationQuietMs: fc.integer({ min: 2, max: 50 }),
        maxSettleMs: fc.integer({ min: 1, max: 200 }),
      }),
      async ({ mutationQuietMs, maxSettleMs }) => {
        const mutationTimes = [];
        const interval = mutationQuietMs - 1;
        for (let time = 0; time < maxSettleMs; time += interval) {
          mutationTimes.push(time);
        }

        const result = await runSettlerScenario({ mutationQuietMs, maxSettleMs, mutationTimes });

        assert.deepEqual(result, { settled: true, reason: 'max-settle', waitedMs: maxSettleMs });
      },
    ),
    { numRuns: 100 },
  );
});
