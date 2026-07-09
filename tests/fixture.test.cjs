const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixtureRoot = path.resolve(__dirname, '../fixtures/order-demo');

test('order fixture exposes the approval scenario and hash routes', () => {
  const html = fs.readFileSync(path.join(fixtureRoot, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(fixtureRoot, 'app.js'), 'utf8');

  assert.match(html, /ORD-1002/);
  assert.match(html, /승인 대기/);
  assert.match(html, /id="approve-order"/);
  assert.match(html, /id="success-toast"/);
  assert.match(html, /id="order-table"/);
  assert.match(script, /location\.hash/);
  assert.match(script, /hashchange/);
  assert.match(script, /승인 완료/);
});

test('fixture server is dependency-free and binds only to loopback', () => {
  const server = fs.readFileSync(path.resolve(__dirname, '../scripts/serve-fixture.mjs'), 'utf8');
  assert.match(server, /node:http/);
  assert.match(server, /127\.0\.0\.1/);
  assert.match(server, /4173/);
  assert.doesNotMatch(server, /express|koa|fastify/i);
});
