const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const backgroundEvents = require('../extension/shared/background-events.js');

// captureVisibleGuarded 함수 본문(중괄호 짝 맞춰서)만 추출한다 - 순서 검증에 사용.
function extractCaptureVisibleGuardedBody(script) {
  const signatureRegex = /async function captureVisibleGuarded\([^)]*\)\s*{/;
  const match = signatureRegex.exec(script);
  assert.ok(match, 'captureVisibleGuarded should exist');
  let depth = 1;
  let index = match.index + match[0].length;
  while (depth > 0 && index < script.length) {
    if (script[index] === '{') depth += 1;
    else if (script[index] === '}') depth -= 1;
    index += 1;
  }
  return script.slice(match.index + match[0].length, index - 1);
}

test('navigation messages retry until the content script is ready', async () => {
  let attempts = 0;
  const response = await backgroundEvents.sendTabMessageWithRetry({
    tabId: 42,
    message: { type: 'CAPTURE_NAVIGATION' },
    attempts: 4,
    delayMs: 0,
    sendMessage: async (tabId, message) => {
      attempts += 1;
      assert.equal(tabId, 42);
      assert.deepEqual(message, { type: 'CAPTURE_NAVIGATION' });
      if (attempts < 3) throw new Error('Receiving end does not exist');
      return { ok: true };
    },
  });

  assert.equal(attempts, 3);
  assert.deepEqual(response, { ok: true });
});

test('navigation message retry reports the final failure after exhausting attempts', async () => {
  await assert.rejects(
    () => backgroundEvents.sendTabMessageWithRetry({
      tabId: 99,
      message: { type: 'CAPTURE_NAVIGATION' },
      attempts: 2,
      delayMs: 0,
      sendMessage: async () => {
        throw new Error('still not ready');
      },
    }),
    /still not ready/,
  );
});

test('background forwards enriched evidence request fields into CaptureCoordinator', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/background.js'), 'utf8');
  const captureRequestBody = script.slice(script.indexOf('async function captureRequest'), script.indexOf('chrome.runtime.onInstalled'));

  for (const field of ['before', 'after', 'domDiff', 'formSelector', 'dirtyFields']) {
    assert.match(captureRequestBody, new RegExp(`${field}:\\s*message\\.${field}`));
  }
});

test('background exposes recording session start and stop message handlers', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/background.js'), 'utf8');

  assert.match(script, /START_RECORDING_SESSION/);
  assert.match(script, /STOP_RECORDING_SESSION/);
  assert.match(script, /startRecordingSession\(/);
  assert.match(script, /stopRecordingSession\(/);
  assert.match(script, /recordingQueue/);
});

// Self_Capture_Guard: CaptureIT가 녹화 시작 직후 자기 자신(editor.html)을 캡처하는 회귀를
// 막기 위한 순수 판별 함수 테스트.
test('isOwnExtensionUrl matches only URLs belonging to the given extension id', () => {
  assert.equal(
    backgroundEvents.isOwnExtensionUrl('chrome-extension://abc123/editor.html', 'abc123'),
    true,
  );
  assert.equal(
    backgroundEvents.isOwnExtensionUrl('chrome-extension://abc123/viewer.html', 'abc123'),
    true,
  );
  assert.equal(
    backgroundEvents.isOwnExtensionUrl('https://example.com/orders', 'abc123'),
    false,
  );
  assert.equal(
    backgroundEvents.isOwnExtensionUrl('chrome-extension://other-extension/page.html', 'abc123'),
    false,
  );
  assert.equal(backgroundEvents.isOwnExtensionUrl(undefined, 'abc123'), false);
  assert.equal(backgroundEvents.isOwnExtensionUrl('chrome-extension://abc123/editor.html', ''), false);
});

test('resolveSelfCaptureAction allows capture when the active tab is not the extension itself', () => {
  const decision = backgroundEvents.resolveSelfCaptureAction({
    activeTabId: 7,
    activeTabUrl: 'https://example.com/orders',
    extensionId: 'abc123',
    targetTabId: 7,
  });
  assert.deepEqual(decision, { action: 'capture' });
});

test('resolveSelfCaptureAction switches to the target tab when the extension page is active but a target tab is known', () => {
  const decision = backgroundEvents.resolveSelfCaptureAction({
    activeTabId: 1,
    activeTabUrl: 'chrome-extension://abc123/editor.html',
    extensionId: 'abc123',
    targetTabId: 42,
  });
  assert.deepEqual(decision, { action: 'activate-target', targetTabId: 42 });
});

test('resolveSelfCaptureAction skips capture when the extension page is active and no target tab is known', () => {
  const decision = backgroundEvents.resolveSelfCaptureAction({
    activeTabId: 1,
    activeTabUrl: 'chrome-extension://abc123/editor.html',
    extensionId: 'abc123',
    targetTabId: null,
  });
  assert.deepEqual(decision, { action: 'skip' });
});

test('resolveSelfCaptureAction does not switch tabs when the target tab is already active', () => {
  const decision = backgroundEvents.resolveSelfCaptureAction({
    activeTabId: 42,
    activeTabUrl: 'chrome-extension://abc123/editor.html',
    extensionId: 'abc123',
    targetTabId: 42,
  });
  assert.deepEqual(decision, { action: 'skip' });
});

// Self_Capture_Guard 타이밍 버그(Bug 1): chrome.tabs.update({active:true}) 직후 곧바로
// captureVisibleTab을 호출하면 아직 새 탭이 그려지기(paint) 전이라 이전 탭(editor.html)이 캡처될
// 수 있다. planGuardedCaptureSteps는 이 순서(전환 -> 대기 -> 캡처 -> 포커스 복원)를 순수하게
// 계산하는 헬퍼이며, captureVisibleGuarded는 이 계획을 그대로 실행하기만 한다.
test('planGuardedCaptureSteps orders update, delay, capture, and restore when a switch is required', () => {
  const plan = backgroundEvents.planGuardedCaptureSteps({ action: 'activate-target', targetTabId: 42 }, 1);
  assert.deepEqual(plan.steps, ['update', 'delay', 'capture', 'restore']);
  assert.equal(plan.targetTabId, 42);
  assert.equal(plan.restoreTabId, 1);
});

test('planGuardedCaptureSteps skips update/delay/restore on the normal capture path (no switch needed)', () => {
  const plan = backgroundEvents.planGuardedCaptureSteps({ action: 'capture' }, 7);
  assert.deepEqual(plan.steps, ['capture']);
  assert.equal(plan.targetTabId, undefined);
  assert.equal(plan.restoreTabId, undefined);
});

test('planGuardedCaptureSteps reports skip when the guard refuses to capture', () => {
  const plan = backgroundEvents.planGuardedCaptureSteps({ action: 'skip' }, 1);
  assert.deepEqual(plan.steps, ['skip']);
});

test('captureVisibleGuarded awaits the delay between tab activation and capture, and restores focus only after a guarded switch', async () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/background.js'), 'utf8');
  const captureVisibleGuardedBody = extractCaptureVisibleGuardedBody(script);

  assert.match(captureVisibleGuardedBody, /CaptureITBackgroundEvents\.planGuardedCaptureSteps\(/, 'captureVisibleGuarded should delegate sequencing to planGuardedCaptureSteps');
  assert.match(captureVisibleGuardedBody, /plan\.steps\.includes\('delay'\)/, 'captureVisibleGuarded should await the delay step when planned');
  assert.match(captureVisibleGuardedBody, /plan\.steps\.includes\('restore'\)/, 'captureVisibleGuarded should restore focus when planned');

  const updateIndex = captureVisibleGuardedBody.indexOf("plan.steps.includes('update')");
  const delayIndex = captureVisibleGuardedBody.indexOf("plan.steps.includes('delay')");
  const captureIndex = captureVisibleGuardedBody.indexOf('chrome.tabs.captureVisibleTab(');
  const restoreIndex = captureVisibleGuardedBody.indexOf("plan.steps.includes('restore')");
  assert.ok(updateIndex !== -1 && delayIndex !== -1 && captureIndex !== -1 && restoreIndex !== -1);
  assert.ok(updateIndex < delayIndex, 'tab activation should be sequenced before the paint-settle delay');
  assert.ok(delayIndex < captureIndex, 'the paint-settle delay should be awaited before capturing');
  assert.ok(captureIndex < restoreIndex, 'focus restoration should happen after capture completes');
});

// Bug_Duplicate_Capture(Bug 2): CAPTURE_NAVIGATION은 탐색 완료(메인 프레임 전용 개념)를 알리는
// 신호이므로, all_frames:true인 content.js가 모든 iframe에서 각자 중복 처리하지 않도록
// frameId: 0으로 명시해야 한다.
test('CAPTURE_NAVIGATION dispatch targets only the main frame (frameId: 0) so iframes never duplicate the navigation-complete signal', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/background.js'), 'utf8');
  assert.match(
    script,
    /sendMessage:\s*\(targetTabId,\s*message\)\s*=>\s*chrome\.tabs\.sendMessage\(targetTabId,\s*message,\s*\{\s*frameId:\s*0\s*\}\)/,
    'CAPTURE_NAVIGATION dispatch should pass { frameId: 0 } as the third argument to chrome.tabs.sendMessage',
  );
});

// "CaptureIT Report Editor" 제목 버그: editor.js가 보내는 captureBaselineContext는 항상 editor.html
// 자신의 document.title이므로, startRecordingRequest는 실제 웹페이지 탭에 COLLECT_PAGE_CONTEXT를
// 물어 진짜 컨텍스트를 우선 사용하고 실패 시에만 message.captureBaselineContext로 폴백해야 한다.
test('startRecordingRequest prefers the real tab context from COLLECT_PAGE_CONTEXT over editor.js-supplied captureBaselineContext', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/background.js'), 'utf8');
  const signatureRegex = /async function startRecordingRequest\([^)]*\)\s*{/;
  const match = signatureRegex.exec(script);
  assert.ok(match, 'startRecordingRequest should exist');
  let depth = 1;
  let index = match.index + match[0].length;
  while (depth > 0 && index < script.length) {
    if (script[index] === '{') depth += 1;
    else if (script[index] === '}') depth -= 1;
    index += 1;
  }
  const body = script.slice(match.index + match[0].length, index - 1);

  assert.match(
    body,
    /chrome\.tabs\.sendMessage\(tabId,\s*\{\s*type:\s*'COLLECT_PAGE_CONTEXT'\s*\}\)\.catch\(\(\)\s*=>\s*null\)/,
    'startRecordingRequest should query the real tab for its own page context and swallow failures',
  );
  assert.match(
    body,
    /const captureBaselineContext = \(contextResponse && contextResponse\.ok && contextResponse\.context\) \|\| message\.captureBaselineContext \|\| \{\}/,
    'the real tab context should win, falling back to message.captureBaselineContext only when the query fails',
  );
  assert.match(
    body,
    /captureBaselineContext,\s*\n\s*\}\);/,
    'startRecordingSession should be called with the resolved captureBaselineContext variable, not message.captureBaselineContext directly',
  );
});

// Bug_Invalid_TabId_Signature: 내부망 실사용에서 "녹화 시작"을 누르자마자
// "Error in invocation of tabs.sendMessage(integer tabId, ...)" 인자 시그니처 오류가 발생했다.
// 근본 원인은 resolveRecordingTargetTabId()가 추적된 웹페이지 탭이 없으면 null을 반환할 수
// 있는데, startRecordingRequest가 그 null tabId로 곧바로 chrome.tabs.sendMessage(null, ...)를
// 호출했기 때문이다(Chrome은 tabId에 정수가 아닌 값이 오면 즉시 인자 시그니처 오류를 던진다).
test('startRecordingRequest는 유효한 tabId가 없으면 chrome.tabs.sendMessage를 호출하기 전에 명확한 에러로 먼저 실패한다', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/background.js'), 'utf8');
  const signatureRegex = /async function startRecordingRequest\([^)]*\)\s*{/;
  const match = signatureRegex.exec(script);
  assert.ok(match, 'startRecordingRequest should exist');
  let depth = 1;
  let index = match.index + match[0].length;
  while (depth > 0 && index < script.length) {
    if (script[index] === '{') depth += 1;
    else if (script[index] === '}') depth -= 1;
    index += 1;
  }
  const body = script.slice(match.index + match[0].length, index - 1);

  const guardMatch = /if\s*\(!Number\.isInteger\(tabId\)\)\s*\{\s*throw new Error\(/.exec(body);
  assert.ok(guardMatch, 'startRecordingRequest should guard against a non-integer tabId with an explicit throw');

  const sendMessageIndex = body.indexOf("chrome.tabs.sendMessage(tabId, { type: 'COLLECT_PAGE_CONTEXT' })");
  assert.ok(sendMessageIndex !== -1, 'COLLECT_PAGE_CONTEXT call should still exist');
  assert.ok(
    guardMatch.index < sendMessageIndex,
    'the tabId guard must run before any chrome.tabs.sendMessage call',
  );
});

test('background.js captures visible tab only through the self-capture guard, never calling chrome.tabs.captureVisibleTab directly elsewhere', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/background.js'), 'utf8');

  assert.match(script, /function\s+captureVisibleGuarded\s*\(/, 'captureVisibleGuarded helper should exist');
  assert.match(script, /CaptureITBackgroundEvents\.resolveSelfCaptureAction\(/, 'captureVisibleGuarded should consult resolveSelfCaptureAction');
  assert.match(script, /coordinatorFor\(sender\.tab\.windowId,\s*sender\.tab\.id\)/, 'captureRequest should pass the source tab id as the self-capture guard target');
  assert.match(script, /function\s+resolveRecordingTargetTabId\s*\(/, 'startRecordingRequest should resolve the real web-page tab instead of trusting the caller-provided tabId blindly');

  const captureVisibleCalls = [...script.matchAll(/chrome\.tabs\.captureVisibleTab\(/g)];
  assert.equal(captureVisibleCalls.length, 1, 'chrome.tabs.captureVisibleTab should only be called once, inside captureVisibleGuarded');
});
