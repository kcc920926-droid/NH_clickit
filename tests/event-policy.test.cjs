const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '../extension/shared/event-policy.js');

function loadPolicy() {
  assert.equal(fs.existsSync(modulePath), true, 'event policy module should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

test('deduplicates identical triggers inside the configured window', () => {
  const events = loadPolicy();
  const policy = events.createPolicy(750);

  assert.equal(policy.accept('click', 'https://internal.example/orders', 1000), true);
  assert.equal(policy.accept('click', 'https://internal.example/orders', 1200), false);
  assert.equal(policy.accept('submit', 'https://internal.example/orders', 1300), true);
  assert.equal(policy.accept('click', 'https://internal.example/orders', 1800), true);
});

test('accepts only supported event-driven trigger types', () => {
  const events = loadPolicy();

  assert.equal(events.isEventTrigger('click'), true);
  assert.equal(events.isEventTrigger('submit'), true);
  assert.equal(events.isEventTrigger('navigation'), true);
  assert.equal(events.isEventTrigger('route-change'), true);
  assert.equal(events.isEventTrigger('context-menu'), false);
});
