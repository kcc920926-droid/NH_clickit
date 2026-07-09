const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

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

async function flush() {
  await Promise.resolve();
}

test('waitForSettle resolves quiet when no mutations occur', async () => {
  const { createInteractionSettler } = loadSettler();
  const clock = createManualClock();
  let observeCallback;
  let unobserved = false;
  const settler = createInteractionSettler({
    observe(callback) {
      observeCallback = callback;
      return () => {
        unobserved = true;
      };
    },
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  });

  const resultPromise = settler.waitForSettle({ mutationQuietMs: 25, maxSettleMs: 100 });
  assert.equal(typeof observeCallback, 'function');

  clock.advanceTo(24);
  await flush();
  clock.advanceTo(25);

  assert.deepEqual(await resultPromise, { settled: true, reason: 'quiet', waitedMs: 25 });
  assert.equal(unobserved, true);
});

test('waitForSettle supports mutationQuietMs zero as an immediate quiet boundary', async () => {
  const { createInteractionSettler } = loadSettler();
  const clock = createManualClock();
  const settler = createInteractionSettler({
    observe() {
      return () => {};
    },
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  });

  const resultPromise = settler.waitForSettle({ mutationQuietMs: 0, maxSettleMs: 100 });
  clock.advanceTo(0);

  assert.deepEqual(await resultPromise, { settled: true, reason: 'quiet', waitedMs: 0 });
});
