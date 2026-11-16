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
  // 녹화 시작·종료와 캡처는 한 줄(workQueue)로 처리해 순번이 겹치지 않게 한다.
  assert.match(script, /let workQueue = Promise\.resolve\(\)/);
  assert.equal((script.match(/enqueue\(\(\) => (captureRequest|startRecordingRequest|stopRecordingRequest)\(/g) || []).length, 3);
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

// Self_Capture_Guard 타이밍 버그(Bug 1): chrome.tabs.update({active:true}) 직후 곧바로
// captureVisibleTab을 호출하면 아직 새 탭이 그려지기(paint) 전이라 이전 탭(editor.html)이 캡처될
// 계산하는 헬퍼이며, captureVisibleGuarded는 이 계획을 그대로 실행하기만 한다.
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

  assert.match(body, /const contextResponse = await collectPageContextWithInjection\(tabId\)/,
    'startRecordingRequest should query the real tab for its own page context');
  // 페이지 맥락은 최상위 프레임에서만 받고, 수집 스크립트가 없는 오래된 탭에는 넣어 준 뒤 다시 묻는다.
  assert.match(script, /type: 'COLLECT_PAGE_CONTEXT' \}, \{ frameId: 0 \}\)\.catch\(\(\) => null\)/);
  assert.match(script, /chrome\.scripting\.executeScript\(\{ target: \{ tabId, allFrames: true \}, files: files\.js \}\)/);
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

  const sendMessageIndex = body.indexOf('collectPageContextWithInjection(tabId)');
  assert.ok(sendMessageIndex !== -1, 'COLLECT_PAGE_CONTEXT call should still exist');
  assert.ok(
    guardMatch.index < sendMessageIndex,
    'the tabId guard must run before any chrome.tabs.sendMessage call',
  );
});


// 녹화 시작 직후 첫 화면이 편집기(자기 자신)로 찍히던 버그: 대상 탭이 아니라 편집기 창을 찍고,
// 고정 120ms만 기다린 뒤 찍고, 찍은 뒤 편집기로 되돌아갔기 때문이다.
test('planTabCapture는 대상 탭이 속한 창을 찍고, 보이는 탭이면 확인 후 바로 찍는다', () => {
  const plan = backgroundEvents.planTabCapture({ targetTab: { id: 42, windowId: 7, active: true, url: 'https://app/x' }, extensionId: 'abc' });
  assert.deepEqual(plan, { targetTabId: 42, windowId: 7, action: 'capture', steps: ['verify', 'capture'] });
});

test('planTabCapture는 녹화 시작 첫 화면이면 대상 탭으로 넘어가 그려질 때까지 기다리고 편집기로 되돌아가지 않는다', () => {
  const plan = backgroundEvents.planTabCapture({ targetTab: { id: 42, windowId: 9, active: false, url: 'https://app/x' }, extensionId: 'abc', activateTarget: true });
  assert.deepEqual(plan.steps, ['activate', 'wait-paint', 'verify', 'capture']);
  assert.equal(plan.windowId, 9, '편집기 창이 아니라 대상 탭의 창을 찍는다');
  assert.equal(plan.steps.includes('restore'), false);
});

test('planTabCapture는 뒤에 있는 탭의 이벤트로 다른 탭을 찍지 않고, 확장 자신의 페이지도 찍지 않는다', () => {
  assert.equal(backgroundEvents.planTabCapture({ targetTab: { id: 42, windowId: 1, active: false, url: 'https://app/x' }, extensionId: 'abc' }).reason, 'hidden');
  assert.equal(backgroundEvents.planTabCapture({ targetTab: { id: 5, windowId: 1, active: true, url: 'chrome-extension://abc/editor.html' }, extensionId: 'abc', activateTarget: true }).reason, 'self');
  assert.equal(backgroundEvents.planTabCapture({ targetTab: null, extensionId: 'abc' }).reason, 'no-target');
  assert.match(backgroundEvents.skipMessage('moved'), /다른 탭/);
});

test('captureVisibleGuarded는 계획대로 전환·그려짐 대기·직전 확인 후 대상 탭의 창을 찍는다', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/background.js'), 'utf8');
  const body = extractCaptureVisibleGuardedBody(script);
  assert.match(body, /CaptureITBackgroundEvents\.planTabCapture\(/);
  const order = ["plan.steps.includes('activate')", "plan.steps.includes('wait-paint')", "plan.steps.includes('verify')", 'captureWithRateLimit(plan.windowId)'];
  const indexes = order.map((needle) => body.indexOf(needle));
  assert.ok(indexes.every((index) => index !== -1), indexes.join(','));
  assert.deepEqual([...indexes].sort((a, b) => a - b), indexes, '전환 → 그려짐 대기 → 확인 → 캡처 순서');
  assert.doesNotMatch(body, /restore/, '찍은 뒤 편집기로 되돌아가지 않는다');
  assert.match(script, /type: 'WAIT_FOR_PAINT'/);
  assert.match(script, /coordinatorFor\(tabId, \{ activateTarget: true \}\)\.startRecordingSession/);
  assert.match(script, /coordinatorFor\(sender\.tab\.id\)\.capture/);
  assert.match(body, /setCaptureItUiVisible\(plan\.targetTabId, false\)/, '캡처하는 동안 CaptureIT 알림을 감춘다');
  assert.match(script, /MIN_CAPTURE_INTERVAL_MS = 550/, '초당 2회 제한에 걸리지 않게 간격을 둔다');
  assert.match(script, /function isSessionTab\(/, '녹화 중인 탭(과 그 탭이 연 창)만 수집한다');
  assert.match(script, /chrome\.tabs\.onRemoved\.addListener/, '녹화 중인 탭을 닫으면 녹화를 끝낸다');
  assert.match(script, /chrome\.runtime\.onStartup\.addListener/, '브라우저를 다시 켜면 이전 녹화를 끝낸다');
  assert.equal([...script.matchAll(/chrome\.tabs\.captureVisibleTab\(/g)].length, 1, 'captureVisibleTab은 captureVisibleGuarded 안에서만 부른다');
});

test('마지막 웹페이지 탭은 서비스 워커가 재시작돼도 세션 저장소와 열린 창에서 다시 찾는다', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/background.js'), 'utf8');
  assert.match(script, /chrome\.storage\.session\.set\(\{ \[LAST_WEB_TAB_KEY\]: tabId \}\)/);
  assert.match(script, /chrome\.tabs\.query\(\{ active: true, windowType: 'normal' \}\)/);
  assert.match(script, /function\s+resolveRecordingTargetTabId\s*\(/);
});

test('콘텐츠 스크립트는 그려짐 신호에 응답하고, 캡처하는 동안 직전 수집 알림을 감춘다', () => {
  const content = fs.readFileSync(path.resolve(__dirname, '../extension/content.js'), 'utf8');
  assert.match(content, /message\.type === 'WAIT_FOR_PAINT'/);
  assert.match(content, /function waitForVisiblePaint\(/);
  assert.match(content, /toast\.style\.visibility = 'hidden'/);
});
