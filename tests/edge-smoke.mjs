import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createServer as createNetServer } from 'node:net';
import { basename, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const reportModule = require('../extension/shared/report.js');
const zipModule = require('../extension/shared/zip.js');
const projectRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const extensionPath = join(projectRoot, 'extension');
const artifactRoot = join(projectRoot, 'artifacts', process.env.CAPTUREIT_ARTIFACT_DIR || 'demo-report');
const edgeCandidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const browserLabel = process.env.CAPTUREIT_BROWSER_LABEL || 'Edge';
const browserCandidates = process.env.CAPTUREIT_BROWSER_PATH ? [process.env.CAPTUREIT_BROWSER_PATH] : edgeCandidates;
const edgeLaunchOptions = { stdio: 'ignore', windowsHide: false };
const browserStartTimeoutMs = readPositiveIntegerEnv('CAPTUREIT_BROWSER_START_TIMEOUT_MS', 30000);
const cdpCommandTimeoutMs = readPositiveIntegerEnv('CAPTUREIT_CDP_COMMAND_TIMEOUT_MS', 30000);
const cdpConnectTimeoutMs = readPositiveIntegerEnv('CAPTUREIT_CDP_CONNECT_TIMEOUT_MS', 10000);
const smokeLlmApiKey = 'secret-key';

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function readPositiveIntegerEnv(name, defaultValue) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : defaultValue;
}

function findLoopbackPort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = createNetServer();
    server.unref();
    server.addListener('error', rejectPort);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close((error) => {
        if (error) rejectPort(error);
        else resolvePort(address.port);
      });
    });
  });
}

async function firstReadable(paths) {
  for (const path of paths) {
    try {
      await readFile(path);
      return path;
    } catch {
      // Continue to the next configured Chromium-family executable path.
    }
  }
  throw new Error(`${browserLabel} executable was not found`);
}

async function waitUntil(description, action, timeoutMs = 10000, intervalMs = 100) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await action();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await delay(intervalMs);
  }
  throw new Error(`${description} timed out${lastError ? `: ${lastError.message}` : ''}`);
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id || !this.pending.has(message.id)) return;
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);
      clearTimeout(pending.timeout);
      if (message.error) pending.reject(new Error(`${message.error.message} (${pending.method})`));
      else pending.resolve(message.result);
    });
    socket.addEventListener('close', () => {
      for (const pending of this.pending.values()) pending.reject(new Error(`${browserLabel} DevTools connection closed`));
      this.pending.clear();
    });
  }

  static connect(url) {
    return new Promise((resolveConnection, rejectConnection) => {
      const socket = new WebSocket(url);
      const timeout = setTimeout(() => rejectConnection(new Error(`${browserLabel} DevTools connection timed out`)), cdpConnectTimeoutMs);
      socket.addEventListener('open', () => {
        clearTimeout(timeout);
        resolveConnection(new CdpClient(socket));
      }, { once: true });
      socket.addEventListener('error', () => {
        clearTimeout(timeout);
        rejectConnection(new Error(`${browserLabel} DevTools connection failed`));
      }, { once: true });
    });
  }

  send(method, params = {}) {
    return new Promise((resolveCommand, rejectCommand) => {
      const id = this.nextId;
      this.nextId += 1;
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        rejectCommand(new Error(`${browserLabel} DevTools command timed out: ${method}`));
      }, cdpCommandTimeoutMs);
      this.pending.set(id, { method, resolve: resolveCommand, reject: rejectCommand, timeout });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(client, expression) {
  const reply = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (reply.exceptionDetails) {
    const detail = reply.exceptionDetails.exception && reply.exceptionDetails.exception.description;
    throw new Error(detail || reply.exceptionDetails.text || `${browserLabel} evaluation failed`);
  }
  return reply.result.value;
}

function extensionIdsFromTargets(targets) {
  const ids = new Set();
  for (const target of targets) {
    const match = /^chrome-extension:\/\/([^/]+)\//.exec(target.url || '');
    if (match) ids.add(match[1]);
  }
  return [...ids];
}

async function createExtensionPage(port, targets) {
  const diagnostics = [];
  for (const extensionId of extensionIdsFromTargets(targets)) {
    const extensionUrl = `chrome-extension://${extensionId}/editor.html`;
    let candidate;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(extensionUrl)}`, { method: 'PUT' });
      if (!response.ok) throw new Error(`cannot open extension page: HTTP ${response.status}`);
      const pageTarget = await response.json();
      candidate = await CdpClient.connect(pageTarget.webSocketDebuggerUrl);
      await candidate.send('Runtime.enable');
      const identity = await waitUntil('CaptureIT extension page', async () => {
        const current = await evaluate(candidate, `({
          ready: document.readyState === 'complete',
          name: chrome.runtime && chrome.runtime.getManifest ? chrome.runtime.getManifest().name : '',
          isCaptureIt: Boolean(chrome.runtime && chrome.runtime.getManifest && chrome.runtime.getManifest().name === 'CaptureIT'),
          storageType: typeof CaptureITStorage
        })`);
        return current.ready && current.isCaptureIt && current.storageType === 'object' ? current : null;
      }, browserStartTimeoutMs, 100);
      diagnostics.push({ extensionId, identity });
      return candidate;
    } catch (error) {
      diagnostics.push({ extensionId, error: error.message });
    }
    if (candidate) candidate.close();
  }
  throw new Error(`CaptureIT extension page was not available: ${JSON.stringify(diagnostics)}`);
}

async function clickCenter(client, selector, button = 'left') {
  const point = await evaluate(client, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  if (!point) throw new Error(`Click target was not found: ${selector}`);
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button, clickCount: 1 });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button, clickCount: 1 });
}

async function listTargets(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!response.ok) throw new Error(`DevTools target list returned HTTP ${response.status}`);
  return response.json();
}

async function closeBrowserProcess(launched) {
  if (!launched) return;
  let browserClient;
  try {
    const response = await fetch(`http://127.0.0.1:${launched.port}/json/version`);
    if (response.ok) {
      const version = await response.json();
      if (version.webSocketDebuggerUrl) {
        browserClient = await CdpClient.connect(version.webSocketDebuggerUrl);
        await browserClient.send('Browser.close');
      }
    }
  } catch {
    // Fall back to killing the spawned process handle below.
  } finally {
    if (browserClient) browserClient.close();
  }
  if (launched.browser) {
    if (launched.browser.exitCode === null && !launched.browser.killed) {
      await new Promise((resolveExit) => {
        const timeout = setTimeout(resolveExit, 5000);
        launched.browser.once('exit', () => {
          clearTimeout(timeout);
          resolveExit();
        });
      });
    }
    if (launched.browser.exitCode === null && !launched.browser.killed) launched.browser.kill();
  }
  await delay(2500);
}

async function evidenceCount(extensionPage) {
  return evaluate(extensionPage, 'CaptureITStorage.listEvidence().then((items) => items.length)');
}

async function capturedTriggerTypes(extensionPage) {
  return evaluate(extensionPage, 'CaptureITStorage.listEvidence().then((items) => items.map((item) => item.triggerType))');
}

async function waitForEvidenceIdle(extensionPage, quietMs = 800, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let previousCount = -1;
  let stableSince = Date.now();
  while (Date.now() < deadline) {
    const count = await evidenceCount(extensionPage);
    if (count !== previousCount) {
      previousCount = count;
      stableSince = Date.now();
    } else if (Date.now() - stableSince >= quietMs) {
      return count;
    }
    await delay(100);
  }
  throw new Error('Evidence pipeline did not become idle');
}

async function ensureNavigationEvidence(extensionPage, fixtureOrigin) {
  try {
    await waitUntil('navigation evidence', async () => (await capturedTriggerTypes(extensionPage)).includes('navigation'), 5000);
    return;
  } catch {
    await evaluate(extensionPage, `(async () => {
      const [tab] = await chrome.tabs.query({ url: ${JSON.stringify(`${fixtureOrigin}/*`)} });
      if (!tab) throw new Error('Fixture tab not found for navigation fallback');
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_NAVIGATION' });
      if (!response || !response.ok) throw new Error('Navigation fallback capture failed');
      return response;
    })()`);
  }
  await waitUntil('navigation evidence after fallback', async () => (await capturedTriggerTypes(extensionPage)).includes('navigation'), 10000);
}

function imageBytes(dataUrl) {
  const match = /^data:image\/png;base64,(.+)$/s.exec(dataUrl || '');
  if (!match) throw new Error('Captured evidence is not a PNG data URL');
  return Buffer.from(match[1], 'base64');
}

function assertPng(buffer) {
  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'invalid PNG signature');
  assert.ok(buffer.readUInt32BE(16) >= 1000, 'captured viewport is unexpectedly narrow');
  assert.ok(buffer.readUInt32BE(20) >= 700, 'captured viewport is unexpectedly short');
}

async function writeArtifacts(evidence) {
  const artifactsBase = resolve(projectRoot, 'artifacts');
  const resolvedArtifactRoot = resolve(artifactRoot);
  if (!resolvedArtifactRoot.startsWith(`${artifactsBase}${sep}`)) throw new Error('Unsafe artifact output path');
  await rm(resolvedArtifactRoot, { recursive: true, force: true });
  await mkdir(join(resolvedArtifactRoot, 'assets'), { recursive: true });

  const ordered = [...evidence].sort((left, right) => left.sequenceNo - right.sequenceNo);
  const images = ordered.map((item) => imageBytes(item.imageDataUrl));
  images.forEach(assertPng);

  const now = new Date().toISOString();
  const report = {
    id: 'REPORT-DEMO',
    title: 'CaptureIT 주문 승인 QA 보고서',
    projectName: 'OrderOps',
    author: `CaptureIT ${browserLabel} Smoke`,
    changePurpose: 'ORD-1002 승인 이벤트 및 승인 완료 컨텍스트 검증',
    changeSummary: '클릭, 단축키, 우클릭 컨텍스트 캡처 검증',
    configurationOverview: `${browserLabel} unpacked extension smoke profile`,
    createdAt: now,
    updatedAt: now,
    features: [{
      id: 'FS-001',
      title: '주문 승인',
      description: '승인 대기 주문을 승인하고 상태 변경을 확인한다.',
      result: {
        verification: '승인 버튼 클릭 시 즉시 증적을 수집하고 완료 상태를 컨텍스트 강조 캡처한다.',
        expectedResult: '이벤트 캡처와 강조 캡처가 순서와 페이지 맥락을 포함한다.',
            actualResult: `실제 ${browserLabel} 확장 캡처 ${ordered.length}건이 생성되고 보고서에 포함되었다.`,
        status: 'PASS',
        evidenceIds: ordered.map((item) => item.id),
      },
    }],
  };
  const manifest = reportModule.buildManifest(report, ordered);
  const html = reportModule.renderHtml(manifest);
  const markdown = reportModule.renderMarkdown(manifest);
  const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;
  const entries = [
    { name: 'report.html', data: html },
    { name: 'report.md', data: markdown },
    { name: 'manifest.json', data: manifestJson },
    ...images.map((image, index) => ({ name: `assets/FS-001-${String(index + 1).padStart(3, '0')}.png`, data: image })),
  ];
  assert.ok(entries.some((entry) => entry.name === 'assets/FS-001-004.png'));
  const archive = await zipModule.writeZip(entries);

  await Promise.all([
    ...images.map((image, index) => writeFile(join(resolvedArtifactRoot, 'assets', `FS-001-${String(index + 1).padStart(3, '0')}.png`), image)),
    writeFile(join(resolvedArtifactRoot, 'report.html'), html, 'utf8'),
    writeFile(join(resolvedArtifactRoot, 'report.md'), markdown, 'utf8'),
    writeFile(join(resolvedArtifactRoot, 'manifest.json'), manifestJson, 'utf8'),
    writeFile(join(resolvedArtifactRoot, 'qa-result.zip'), Buffer.from(await archive.arrayBuffer())),
  ]);

  const roundTrip = await zipModule.readZip(archive);
  assert.deepEqual([...roundTrip.keys()].sort(), entries.map((item) => item.name).sort());
  assertExportDoesNotLeakLlmApiKeys(roundTrip);
  return manifest;
}

function assertExportDoesNotLeakLlmApiKeys(entries) {
  const decoder = new TextDecoder();
  for (const [name, data] of entries) {
    if (/\.(png|jpg|jpeg|webp)$/i.test(name)) continue;
    const text = decoder.decode(data);
    assert.equal(text.includes(smokeLlmApiKey), false, `${name} does not leak LLM API keys`);
  }
}

async function launchBrowser(browserPath, profile, fixtureOrigin, fixtureUrl) {
  const browser = spawn(browserPath, [
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=msEdgeFirstRunExperience',
    `--load-extension=${extensionPath}`,
    '--remote-debugging-port=0',
    '--remote-allow-origins=*',
    '--window-size=1440,1000',
    '--window-position=40,40',
    fixtureUrl,
  ], edgeLaunchOptions);

  const portFile = join(profile, 'DevToolsActivePort');
  const port = await waitUntil(`${browserLabel} DevTools port`, async () => {
    const content = await readFile(portFile, 'utf8');
    return Number(content.split(/\r?\n/)[0]) || null;
  }, browserStartTimeoutMs);

  const targets = await waitUntil(`CaptureIT ${browserLabel} targets`, async () => {
    const current = await listTargets(port);
    const fixturePage = current.find((target) => target.type === 'page' && target.url.startsWith(`${fixtureOrigin}/`));
    const extensionWorkers = current.filter((target) => (
      target.type === 'service_worker'
      && /^chrome-extension:\/\//.test(target.url || '')
      && /\/background\.js$/.test(target.url || '')
    ));
    return fixturePage && extensionWorkers.length > 0 ? { fixturePage, extensionWorkers, port } : null;
  }, browserStartTimeoutMs);

  return { browser, port, targets };
}

async function verifyPersistentStorageAfterRelaunch({
  browserPath,
  expectedEvidenceCount,
  fixtureOrigin,
  fixtureUrl,
  profile,
  sessionId,
}) {
  const relaunched = await launchBrowser(browserPath, profile, fixtureOrigin, fixtureUrl);
  let relaunchedExtensionPage;
  try {
    relaunchedExtensionPage = await createExtensionPage(relaunched.port, relaunched.targets.extensionWorkers);
    const restored = await evaluate(relaunchedExtensionPage, `(async () => {
      const { captureSession } = await chrome.storage.local.get('captureSession');
      const evidence = await CaptureITStorage.listEvidence();
      const session = await CaptureITStorage.getSession(${JSON.stringify(sessionId)});
      return {
        activeSessionId: captureSession && captureSession.id,
        evidenceCount: evidence.length,
        sequences: evidence.map((item) => item.sequenceNo),
        sessionId: session && session.id,
      };
    })()`);
    assert.equal(restored.activeSessionId, sessionId);
    assert.equal(restored.sessionId, sessionId);
    assert.equal(restored.evidenceCount, expectedEvidenceCount);
    assert.deepEqual(restored.sequences, restored.sequences.map((_, index) => index + 1));
    process.stdout.write(`CDP: storage restored after ${browserLabel} relaunch\n`);
  } finally {
    if (relaunchedExtensionPage) relaunchedExtensionPage.close();
    await closeBrowserProcess(relaunched);
  }
}

async function run() {
  const browserPath = await firstReadable(browserCandidates);
  const tempRoot = resolve(tmpdir());
  const safeBrowserLabel = browserLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'browser';
  const profile = await mkdtemp(join(tempRoot, `captureit-${safeBrowserLabel}-`));
  const fixturePort = await findLoopbackPort();
  const fixtureOrigin = `http://127.0.0.1:${fixturePort}`;
  const fixtureUrl = `${fixtureOrigin}/#/orders`;
  const fixture = spawn(process.execPath, [join(projectRoot, 'scripts', 'serve-fixture.mjs')], {
    cwd: projectRoot,
    env: { ...process.env, CAPTUREIT_FIXTURE_PORT: String(fixturePort) },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let browser;
  let launched;
  let page;
  let extensionPage;

  try {
    await waitUntil('fixture server', async () => {
      const response = await fetch(fixtureUrl);
      return response.ok && (await response.text()).includes('ORD-1002');
    });

    launched = await launchBrowser(browserPath, profile, fixtureOrigin, fixtureUrl);
    browser = launched.browser;
    const targets = launched.targets;

    page = await CdpClient.connect(targets.fixturePage.webSocketDebuggerUrl);
    extensionPage = await createExtensionPage(launched.port, targets.extensionWorkers);
    process.stdout.write('CDP: page Runtime.enable\n');
    await page.send('Runtime.enable');
    process.stdout.write('CDP: page Page.enable\n');
    await page.send('Page.enable');
    process.stdout.write('CDP: CaptureIT extension page ready\n');
    const editorUi = await evaluate(extensionPage, `({
      storageLocation: Boolean(document.querySelector('#storage-location')),
      lastExportPath: Boolean(document.querySelector('#storage-last-export-path')),
      recentEvidence: Boolean(document.querySelector('#recent-evidence')),
      llmDiagnostics: Boolean(document.querySelector('#llm-diagnostics'))
    })`);
    assert.deepEqual(editorUi, {
      storageLocation: true,
      lastExportPath: true,
      recentEvidence: true,
      llmDiagnostics: true,
    });
    await page.send('Page.bringToFront');
    await waitUntil('fixture DOM', () => evaluate(page, 'document.readyState === "complete" && Boolean(document.querySelector("#approve-order"))'));

    const session = {
      id: crypto.randomUUID(),
      mode: 'event',
      active: true,
      startedAt: new Date().toISOString(),
      endedAt: null,
      lastSequenceNo: 0,
      lastEvidenceId: null,
    };
    await evaluate(extensionPage, `(async () => {
      await chrome.storage.local.set({ captureSession: ${JSON.stringify(session)}, llmApiKey: ${JSON.stringify(smokeLlmApiKey)} });
      await CaptureITStorage.putSession(${JSON.stringify(session)});
      return true;
    })()`);

    await page.send('Page.navigate', { url: `${fixtureOrigin}/?captureit-smoke=1#/orders` });
    await waitUntil('navigated fixture DOM', () => evaluate(page, 'document.readyState === "complete" && Boolean(document.querySelector("#approve-order"))'));
    await ensureNavigationEvidence(extensionPage, fixtureOrigin);
    await waitForEvidenceIdle(extensionPage);

    await clickCenter(page, '#approve-order');
    try {
      await waitUntil('event-driven evidence', async () => (await capturedTriggerTypes(extensionPage)).includes('click'), 10000);
    } catch (error) {
      const pageDiagnostic = await evaluate(page, `({
        visibilityState: document.visibilityState,
        orderStatus: document.querySelector('#order-status')?.textContent,
        hasApproveButton: Boolean(document.querySelector('#approve-order'))
      })`);
      const extensionDiagnostic = await evaluate(extensionPage, `(async () => {
        const extensionName = chrome.runtime.getManifest().name;
        const { captureSession } = await chrome.storage.local.get('captureSession');
        const evidence = await CaptureITStorage.listEvidence();
        const tabs = await chrome.tabs.query({ url: ${JSON.stringify(`${fixtureOrigin}/*`)} });
        let captureProbe;
        try {
          const image = await chrome.tabs.captureVisibleTab(tabs[0]?.windowId, { format: 'png' });
          captureProbe = { ok: true, length: image.length };
        } catch (captureError) {
          captureProbe = { ok: false, error: captureError.message };
        }
        return {
          extensionName,
          captureSession,
          evidence: evidence.map((item) => ({
            sequenceNo: item.sequenceNo,
            triggerType: item.triggerType,
            url: item.context && item.context.url,
            target: item.context && item.context.target && item.context.target.visibleText,
          })),
          tabs,
          captureProbe,
        };
      })()`);
      throw new Error(`${error.message}; page=${JSON.stringify(pageDiagnostic)}; extension=${JSON.stringify(extensionDiagnostic)}`);
    }
    await waitUntil('fixture approval completion', () => evaluate(page, 'document.querySelector("#order-status")?.textContent === "승인 완료"'), 5000);

    await evaluate(extensionPage, `(async () => {
      const { captureSession } = await chrome.storage.local.get('captureSession');
      captureSession.mode = 'context';
      await chrome.storage.local.set({ captureSession });
      await CaptureITStorage.putSession(captureSession);
      const [tab] = await chrome.tabs.query({ url: ${JSON.stringify(`${fixtureOrigin}/*`)} });
      if (!tab) throw new Error('Fixture tab not found');
      return chrome.tabs.sendMessage(tab.id, { type: 'ENTER_SELECTION' });
    })()`);
    await clickCenter(page, '#order-status');
    await waitUntil('context evidence', async () => (await capturedTriggerTypes(extensionPage)).includes('shortcut-context'), 10000);

    await clickCenter(page, '#order-status', 'right');
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await evaluate(extensionPage, `(async () => {
      const [tab] = await chrome.tabs.query({ url: ${JSON.stringify(`${fixtureOrigin}/*`)} });
      if (!tab) throw new Error('Fixture tab not found');
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_CONTEXT_MENU' });
      if (!response || !response.ok) throw new Error('Context-menu capture failed');
      return response;
    })()`);
    await waitUntil('context-menu evidence', async () => (await capturedTriggerTypes(extensionPage)).includes('context-menu'), 10000);

    const evidence = await evaluate(extensionPage, 'CaptureITStorage.listEvidence()');
    const evidenceDiagnostic = evidence.map((item) => ({
      sequenceNo: item.sequenceNo,
      triggerType: item.triggerType,
      target: item.context && item.context.target && item.context.target.visibleText,
    }));
    assert.ok(evidence.length >= 4, `smoke workflow must produce at least four captures: ${JSON.stringify(evidenceDiagnostic)}`);
    assert.deepEqual(evidence.map((item) => item.sequenceNo), evidence.map((_, index) => index + 1));
    for (const triggerType of ['navigation', 'click', 'shortcut-context', 'context-menu']) {
      assert.ok(evidence.some((item) => item.triggerType === triggerType), `missing ${triggerType}: ${JSON.stringify(evidenceDiagnostic)}`);
    }
    assert.ok(evidence.every((item) => item.context.pageTitle === 'OrderOps · 주문 승인'));
    assert.ok(evidence.every((item) => item.context.target && item.context.surroundingContext));
    assert.ok(await evaluate(extensionPage, `document.querySelector('#recent-evidence')?.textContent.includes('#')`));

    const manifest = await writeArtifacts(evidence);
    page.close();
    page = null;
    extensionPage.close();
    extensionPage = null;
    await closeBrowserProcess(launched);
    launched = null;
    browser = null;
    await rm(join(profile, 'DevToolsActivePort'), { force: true }).catch(() => {});
    await verifyPersistentStorageAfterRelaunch({
      browserPath,
      expectedEvidenceCount: evidence.length,
      fixtureOrigin,
      fixtureUrl,
      profile,
      sessionId: session.id,
    });
    process.stdout.write(`${browserLabel} smoke PASS: ${manifest.features[0].result.evidence.length} captures, ${manifest.overallStatus}\n`);
  } finally {
    if (page) page.close();
    if (extensionPage) extensionPage.close();
    if (launched) await closeBrowserProcess(launched);
    else if (browser && !browser.killed) browser.kill();
    if (!fixture.killed) fixture.kill();
    await delay(500);
    const safeProfile = resolve(profile);
    if (safeProfile.startsWith(`${tempRoot}${sep}`) && basename(safeProfile).startsWith(`captureit-${safeBrowserLabel}-`)) {
      await rm(safeProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
    }
  }
}

run().catch((error) => {
  process.stderr.write(`${browserLabel} smoke FAIL: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
