# CaptureIT UX Storage LLM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make captures, storage location, export files, and internal LLM connectivity visible and diagnosable to users.

**Architecture:** Keep the existing extension architecture. Add focused behavior to `editor.html/css/js` and extend `shared/llm.js` as the adapter/diagnostic boundary. Continue to store report/evidence in IndexedDB and lightweight UI state in `chrome.storage.local`.

**Tech Stack:** Microsoft Edge MV3 extension, vanilla JavaScript, IndexedDB, chrome.storage.local, chrome.downloads, node:test.

---

### Task 1: Storage Location and Download Access

**Files:**
- Modify: `tests/editor-shell.test.cjs`
- Modify: `extension/editor.html`
- Modify: `extension/editor.js`
- Modify: `extension/editor.css`

- [x] **Step 1: Write failing shell tests**

Add assertions for `storage-location`, `storage-evidence-count`, `storage-report-id`, `storage-last-saved-at`, `storage-last-export-name`, `storage-last-export-path`, `show-last-download`, `show-download-folder`, and `export-evidence-only`.

- [x] **Step 2: Run test to verify failure**

Run: `node --test tests/editor-shell.test.cjs`

- [x] **Step 3: Add storage status panel and handlers**

Implement visible copy that distinguishes browser internal storage from user-accessible ZIP downloads. Persist last export metadata in `chrome.storage.local`.

- [x] **Step 4: Run test to verify pass**

Run: `node --test tests/editor-shell.test.cjs`

### Task 2: LLM Adapter and Diagnostics

**Files:**
- Modify: `tests/llm.test.cjs`
- Modify: `extension/shared/llm.js`
- Modify: `extension/editor.html`
- Modify: `extension/editor.js`
- Modify: `extension/editor.css`

- [x] **Step 1: Write failing adapter tests**

Assert default endpoint `http://ai-driven-gw.aihb.kube.test.nhbank/v1/messages`, NH gateway payload-key request, redaction, content-string JSON parsing, direct JSON parsing, and error classification.

- [x] **Step 2: Run test to verify failure**

Run: `node --test tests/llm.test.cjs`

- [x] **Step 3: Implement adapter functions**

Add `DEFAULT_ENDPOINT`, `buildAdapterRequest`, `parseAdapterResponse`, `redactSecrets`, `classifyDiagnosticError`, and `buildDiagnosticSummary`.

- [x] **Step 4: Add editor LLM settings panel**

Expose endpoint, API key, model, adapter, raw template, connection test, recommendation test, and redacted diagnostics.

- [x] **Step 5: Run focused tests**

Run: `node --test tests/llm.test.cjs tests/editor-shell.test.cjs`

### Task 3: Capture Receipt and Recent Evidence Clarity

**Files:**
- Modify: `tests/editor-shell.test.cjs`
- Modify: `tests/edge-smoke-contract.test.cjs`
- Modify: `extension/editor.html`
- Modify: `extension/editor.js`
- Modify: `extension/editor.css`
- Modify: `extension/content.js`
- Modify: `extension/content.css` if created

- [x] **Step 1: Write failing tests**

Assert editor has `recent-evidence`, `evidence-detail-dialog`, and toast-related script markers. Assert smoke script checks for receipt UI.

- [x] **Step 2: Implement recent capture and detail modal**

Show the latest evidence prominently, with linked/unlinked status and actions.

- [x] **Step 3: Implement content receipt toast**

On `EVIDENCE_CREATED`, show #sequence, trigger, page title, target text, and editor-open action.

- [x] **Step 4: Run focused tests**

Run: `node --test tests/editor-shell.test.cjs tests/edge-smoke-contract.test.cjs`

### Task 4: Smoke and Leakage Verification

**Files:**
- Modify: `tests/edge-smoke.mjs`
- Modify: `tests/edge-smoke-contract.test.cjs`
- Modify: `docs/verification/2026-07-06-vertical-slice-checklist.md`
- Add: `walkthrough.md`

- [x] **Step 1: Extend smoke assertions**

Check that storage panel exists, last export metadata is visible, LLM diagnostics controls exist, and exported ZIP does not contain API key strings.

- [x] **Step 2: Run complete verification**

Run:

```powershell
node --test tests/*.test.cjs
node tests/edge-smoke.mjs
node tests/chrome-smoke.mjs
```

- [x] **Step 3: Document walkthrough**

Write `walkthrough.md` with the implemented user flow, storage explanation, LLM diagnostics flow, and verification commands.
