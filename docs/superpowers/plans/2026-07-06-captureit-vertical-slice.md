# CaptureIT Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Edge-first Manifest V3 extension that captures event-driven and user-selected contextual evidence, stores ordered page context locally, maps evidence to one feature result, and exports a verified offline HTML/Markdown/ZIP report.

**Architecture:** Use a dependency-free JavaScript extension so it can build and run inside the closed network. Browser-facing scripts coordinate through Chrome-compatible Edge APIs; pure UMD modules hold domain, context, report, ZIP, and LLM protocol logic so Node's built-in test runner can test the same code. `chrome.storage.local` stores settings and report indexes, while IndexedDB stores evidence metadata and image blobs.

**Tech Stack:** Microsoft Edge Manifest V3, vanilla JavaScript/HTML/CSS, IndexedDB, `chrome.storage.local`, `chrome.tabs.captureVisibleTab`, `chrome.contextMenus`, Node 22 built-in test runner.

**Repository note:** This directory is not a Git repository. Replace commit checkpoints with test-and-file-list checkpoints; do not initialize Git without user authorization.

---

## File Map

- `package.json`: dependency-free test and fixture commands.
- `extension/manifest.json`: Edge MV3 permissions, content scripts, service worker, editor action, icons.
- `extension/shared/domain.js`: sessions, evidence records, feature mapping, status calculation.
- `extension/shared/page-context.js`: visible and safe DOM context extraction.
- `extension/shared/event-policy.js`: supported triggers and duplicate suppression.
- `extension/shared/storage.js`: IndexedDB evidence/report persistence.
- `extension/shared/report.js`: manifest, HTML, and Markdown generation.
- `extension/shared/zip.js`: uncompressed ZIP writer/reader and CRC32.
- `extension/shared/llm.js`: two-stage internal-LLM request and response validation.
- `extension/background.js`: capture coordinator, session state, context-menu handling, screenshot persistence.
- `extension/content.js`: event observation, shortcut selection mode, overlay lifecycle, context capture.
- `extension/editor.html`, `extension/editor.js`, `extension/editor.css`: Evidence Inbox, feature mapping, verdict, export, LLM recommendation.
- `extension/viewer.html`, `extension/viewer.js`: read-only ZIP viewer.
- `extension/icons/*`: packaged copies of the approved icon sizes.
- `fixtures/order-demo/*`: local order page used to exercise capture triggers.
- `scripts/serve-fixture.mjs`: dependency-free local HTTP server.
- `tests/*.test.cjs`: Node unit and integration tests.
- `tests/edge-smoke.mjs`: Edge extension smoke workflow.
- `artifacts/demo-report/*`: verified end-to-end evidence and report output.

## Task 1: Scaffold and Domain Model

**Files:**
- Create: `package.json`
- Create: `extension/shared/domain.js`
- Create: `tests/domain.test.cjs`

- [ ] **Step 1: Write failing domain tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const domain = require('../extension/shared/domain.js');

test('session sequence numbers are monotonic and never reused', () => {
  const session = domain.createSession('event');
  assert.equal(domain.nextSequence(session), 1);
  assert.equal(domain.nextSequence(session), 2);
  assert.equal(domain.nextSequence(session), 3);
});

test('overall status is FAIL, INCOMPLETE, or PASS', () => {
  assert.equal(domain.overallStatus([]), 'INCOMPLETE');
  assert.equal(domain.overallStatus([{ status: 'PASS' }, { status: null }]), 'INCOMPLETE');
  assert.equal(domain.overallStatus([{ status: 'PASS' }, { status: 'FAIL' }]), 'FAIL');
  assert.equal(domain.overallStatus([{ status: 'PASS' }]), 'PASS');
});
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `node --test tests/domain.test.cjs`

Expected: FAIL because `extension/shared/domain.js` does not exist.

- [ ] **Step 3: Implement the domain API**

```js
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CaptureITDomain = api;
})(globalThis, function () {
  function createSession(mode, now = new Date().toISOString()) {
    return { id: crypto.randomUUID(), mode, startedAt: now, endedAt: null, lastSequenceNo: 0 };
  }
  function nextSequence(session) {
    session.lastSequenceNo += 1;
    return session.lastSequenceNo;
  }
  function overallStatus(results) {
    if (!results.length || results.some((item) => !item.status)) return 'INCOMPLETE';
    if (results.some((item) => item.status === 'FAIL')) return 'FAIL';
    return 'PASS';
  }
  return { createSession, nextSequence, overallStatus };
});
```

- [ ] **Step 4: Run domain tests**

Run: `node --test tests/domain.test.cjs`

Expected: 2 tests pass, 0 fail.

- [ ] **Step 5: Record checkpoint**

Run: `Get-ChildItem package.json,extension/shared/domain.js,tests/domain.test.cjs`

Expected: all three files exist.

## Task 2: Safe Page Context and Event Policy

**Files:**
- Create: `extension/shared/page-context.js`
- Create: `extension/shared/event-policy.js`
- Create: `tests/page-context.test.cjs`
- Create: `tests/event-policy.test.cjs`

- [ ] **Step 1: Write failing tests for redaction and trigger policy**

```js
test('redacts passwords and limits visible text', () => {
  const result = context.sanitizeContext({
    target: { tagName: 'INPUT', type: 'password', value: 'secret' },
    visibleText: 'A'.repeat(5000)
  });
  assert.equal(result.target.value, undefined);
  assert.equal(result.visibleText.length, 2000);
});

test('deduplicates identical triggers inside the window', () => {
  const policy = events.createPolicy(750);
  assert.equal(policy.accept('click', 'https://internal/orders', 1000), true);
  assert.equal(policy.accept('click', 'https://internal/orders', 1200), false);
  assert.equal(policy.accept('click', 'https://internal/orders', 2000), true);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/page-context.test.cjs tests/event-policy.test.cjs`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement bounded context extraction and dedupe**

Implement exports with these exact signatures:

```js
sanitizeContext(input) -> { target, surroundingContext, visibleText }
collectPageContext(target, document, window) -> SafePageContext
createPolicy(windowMs) -> { accept(triggerType, url, now) }
```

`collectPageContext` must exclude password values, hidden inputs, cookies, headers, and full HTML; it must include title, URL, route, viewport, scroll position, target role/label/text, nearest heading, row/column text, and bounded visible text.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/page-context.test.cjs tests/event-policy.test.cjs`

Expected: all tests pass.

## Task 3: IndexedDB Persistence

**Files:**
- Create: `extension/shared/storage.js`
- Create: `tests/storage-contract.test.cjs`

- [ ] **Step 1: Write a failing storage-contract test**

```js
test('storage exports the required repository surface', () => {
  assert.deepEqual(Object.keys(storage).sort(), [
    'deleteEvidence', 'getEvidence', 'listEvidence', 'openDatabase',
    'putEvidence', 'putReport', 'getReport'
  ].sort());
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/storage-contract.test.cjs`

Expected: FAIL because the storage module does not exist.

- [ ] **Step 3: Implement IndexedDB stores**

Create database `captureit`, version `1`, with object stores:

```js
evidence: { keyPath: 'id', indexes: ['sessionId', 'sequenceNo', 'featureSpecId', 'capturedAt'] }
reports: { keyPath: 'id', indexes: ['updatedAt'] }
sessions: { keyPath: 'id', indexes: ['startedAt'] }
```

Every public function returns a Promise and never stores authentication tokens.

- [ ] **Step 4: Run storage-contract tests**

Run: `node --test tests/storage-contract.test.cjs`

Expected: all tests pass.

## Task 4: Manifest, Background Capture, and Content Capture

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/background.js`
- Create: `extension/content.js`
- Copy: `assets/icons/captureit-icon-{16,32,48,128}.png` to `extension/icons/`
- Create: `tests/manifest.test.cjs`

- [ ] **Step 1: Write a failing manifest test**

```js
test('manifest declares Edge MV3 capture permissions and scripts', () => {
  const manifest = JSON.parse(fs.readFileSync('extension/manifest.json', 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.background.service_worker, 'background.js');
  for (const permission of ['activeTab', 'contextMenus', 'storage', 'unlimitedStorage']) {
    assert.ok(manifest.permissions.includes(permission));
  }
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/manifest.test.cjs`

Expected: FAIL because the manifest does not exist.

- [ ] **Step 3: Implement the extension capture flow**

`background.js` must:

```js
- create the CaptureIT context-menu item on installation;
- maintain session mode in chrome.storage.local;
- receive CAPTURE_REQUEST messages;
- reject requests while capture is OFF;
- call chrome.tabs.captureVisibleTab;
- persist an Evidence record with sequence and page context;
- route context-menu clicks to the frame that was right-clicked;
- capture navigation completion without waiting for business success state.
```

`content.js` must:

```js
- observe click and submit events only while event capture is ON;
- detect URL/route changes without polling business state;
- schedule click capture after two animation frames;
- enter selection mode on Ctrl+Shift+E;
- prevent the selected click from executing the page action;
- track the last right-click target;
- render and remove a red-border/yellow-fill overlay;
- restore the original scroll position after contextual capture.
```

- [ ] **Step 4: Run manifest and all unit tests**

Run: `node --test tests/*.test.cjs`

Expected: all tests pass.

## Task 5: Evidence Inbox and Feature Result Editor

**Files:**
- Create: `extension/editor.html`
- Create: `extension/editor.css`
- Create: `extension/editor.js`
- Create: `tests/editor-state.test.cjs`

- [ ] **Step 1: Write failing state tests**

```js
test('evidence remains in the inbox until explicitly mapped', () => {
  const state = domain.createEditorState([evidence]);
  assert.equal(state.inbox.length, 1);
  domain.mapEvidence(state, evidence.id, 'FS-001');
  assert.equal(state.inbox.length, 0);
  assert.equal(state.features[0].evidenceIds[0], evidence.id);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/editor-state.test.cjs`

Expected: FAIL because editor-state APIs do not exist.

- [ ] **Step 3: Implement editor state and UI**

The editor must provide:

```text
- session ON/OFF and mode selection;
- time-ordered Evidence Inbox cards;
- trigger, URL/title, captured time, target, and context display;
- feature creation with exactly one result set;
- drag/click evidence mapping and return-to-inbox;
- verification, expected result, actual result, PASS/FAIL/UNSET controls;
- no locking after verdict selection;
- non-blocking missing-data warnings.
```

- [ ] **Step 4: Run all tests**

Run: `node --test tests/*.test.cjs`

Expected: all tests pass.

## Task 6: Report and ZIP Export

**Files:**
- Create: `extension/shared/report.js`
- Create: `extension/shared/zip.js`
- Create: `tests/report.test.cjs`
- Create: `tests/zip.test.cjs`

- [ ] **Step 1: Write failing report and ZIP round-trip tests**

```js
test('HTML and Markdown contain the same selected evidence', () => {
  const manifest = report.buildManifest(sampleReport, sampleEvidence);
  assert.match(report.renderHtml(manifest), /FS-001-001\.png/);
  assert.match(report.renderMarkdown(manifest), /FS-001-001\.png/);
});

test('ZIP writer and reader preserve report entries', async () => {
  const blob = await zip.writeZip([{ name: 'report.html', data: '<h1>QA</h1>' }]);
  const entries = await zip.readZip(blob);
  assert.equal(new TextDecoder().decode(entries.get('report.html')), '<h1>QA</h1>');
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/report.test.cjs tests/zip.test.cjs`

Expected: FAIL because report and ZIP modules do not exist.

- [ ] **Step 3: Implement static report generation and stored ZIP format**

`report.js` must escape all user values, calculate overall status, preserve selected evidence sequence/context in `manifest.json`, and emit JavaScript-free HTML plus equivalent Markdown. `zip.js` must write and read ZIP entries using the STORE method, validate paths against traversal, enforce file-count and uncompressed-size limits, and validate CRC32.

- [ ] **Step 4: Run report and ZIP tests**

Run: `node --test tests/report.test.cjs tests/zip.test.cjs`

Expected: all tests pass.

## Task 7: Read-only Viewer

**Files:**
- Create: `extension/viewer.html`
- Create: `extension/viewer.js`
- Create: `extension/viewer.css`
- Create: `tests/viewer.test.cjs`

- [ ] **Step 1: Write failing viewer-selection test**

```js
test('viewer prefers HTML and falls back to Markdown', () => {
  assert.equal(viewer.chooseEntry(new Set(['report.html', 'report.md'])), 'report.html');
  assert.equal(viewer.chooseEntry(new Set(['report.md'])), 'report.md');
  assert.equal(viewer.chooseEntry(new Set()), null);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/viewer.test.cjs`

Expected: FAIL because viewer selection is absent.

- [ ] **Step 3: Implement file/drop ZIP loading and safe display**

The viewer must reject invalid packages, prefer `report.html`, strip scripts and event-handler attributes, resolve packaged images to Blob URLs, fall back to sanitized Markdown, and expose no editing controls.

- [ ] **Step 4: Run viewer and ZIP tests**

Run: `node --test tests/viewer.test.cjs tests/zip.test.cjs`

Expected: all tests pass.

## Task 8: Internal LLM Recommendation Adapter

**Files:**
- Create: `extension/shared/llm.js`
- Create: `tests/llm.test.cjs`

- [ ] **Step 1: Write failing payload and response tests**

```js
test('stage one excludes full-resolution images', () => {
  const payload = llm.buildStageOne(feature, evidence);
  assert.equal(payload.evidence[0].image, undefined);
});

test('response rejects unknown evidence IDs', () => {
  assert.throws(() => llm.validateRecommendations({ suggestions: [{ captureId: 'missing' }] }, new Set(['CAP-1'])));
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/llm.test.cjs`

Expected: FAIL because the LLM adapter does not exist.

- [ ] **Step 3: Implement two-stage recommendation and manual fallback**

Stage one sends feature text plus bounded evidence metadata/order. Stage two sends only top candidates, thumbnails, and adjacent captures. Validate `featureSpecId`, `captureId`, integer rank, `before|action|after` role, and reason. The editor may call the configured allowlisted internal endpoint only after explicit user action; failures leave manual mapping fully usable.

- [ ] **Step 4: Run LLM tests**

Run: `node --test tests/llm.test.cjs`

Expected: all tests pass.

## Task 9: Fixture and Edge Smoke Test

**Files:**
- Create: `fixtures/order-demo/index.html`
- Create: `fixtures/order-demo/app.js`
- Create: `fixtures/order-demo/style.css`
- Create: `scripts/serve-fixture.mjs`
- Create: `tests/edge-smoke.mjs`

- [ ] **Step 1: Create the fixture behavior test**

The fixture must contain order `ORD-1002`, status `승인 대기`, an approval button, a success toast, and hash-based list/detail routing. Clicking approval changes the fixture state, but CaptureIT must capture based on the click trigger rather than waiting for the changed status.

- [ ] **Step 2: Run the fixture locally**

Run: `node scripts/serve-fixture.mjs`

Expected: server listens on `http://127.0.0.1:4173` without external network access.

- [ ] **Step 3: Run the Edge smoke workflow**

Run: `node tests/edge-smoke.mjs`

Expected artifacts:

```text
artifacts/demo-report/assets/FS-001-001.png
artifacts/demo-report/assets/FS-001-002.png
artifacts/demo-report/report.html
artifacts/demo-report/report.md
artifacts/demo-report/manifest.json
artifacts/demo-report/qa-result.zip
```

If native browser context-menu automation is unavailable, exercise the same contextual-capture message path through the `Ctrl+Shift+E` selection mode. Do not synthesize screenshots. If Edge cannot capture in the available environment, stop the smoke test with a clear error and preserve the passing unit/integration results.

- [ ] **Step 4: Visually inspect evidence and report**

Verify that contextual images contain the highlighted target plus surrounding table/title context, event-driven images preserve sequence and trigger metadata, and `report.html` opens offline with all relative images.

## Task 10: Documentation and Completion Audit

**Files:**
- Modify: `README.md`
- Create: `docs/verification/vertical-slice-checklist.md`

- [ ] **Step 1: Document Edge loading and usage**

Document `edge://extensions`, Developer mode, Load unpacked, choosing `extension/`, running the fixture, capture-mode usage, Evidence Inbox mapping, report export, viewer import, and internal-LLM endpoint configuration.

- [ ] **Step 2: Run the complete automated suite**

Run: `node --test tests/*.test.cjs`

Expected: all tests pass, 0 failures.

- [ ] **Step 3: Run the Edge smoke workflow**

Run: `node tests/edge-smoke.mjs`

Expected: exits 0 and produces the six demo-report artifacts listed in Task 9.

- [ ] **Step 4: Audit PRD completion conditions**

For each numbered condition in `PRD.md` section 16, record PASS, FAIL, or NOT VERIFIED with a direct file, test, or runtime artifact reference. Do not mark the project complete while any condition is FAIL or NOT VERIFIED.
