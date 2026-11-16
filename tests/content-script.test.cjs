const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourcePath = path.resolve(__dirname, '../extension/content.js');

function source() {
  return fs.readFileSync(sourcePath, 'utf8');
}

test('content script wires form input/change/blur/submit events to the recording collector', () => {
  const script = source();

  for (const eventName of ['input', 'change', 'blur', 'submit']) {
    assert.match(script, new RegExp(`document\\.addEventListener\\('${eventName}'`));
  }
  assert.match(script, /controller\.markFieldDirty/);
  assert.match(script, /controller\.handleFieldBlur/);
  assert.match(script, /controller\.handleFormSubmit/);
  assert.match(script, /let recordingActive = false/);
  assert.match(script, /function shouldCaptureAutomaticEvent/);
});

test('content script routes click and route-change through settling and DOM diff capture', () => {
  const script = source();

  assert.match(script, /CaptureITInteractionSettler\.createInteractionSettler/);
  assert.match(script, /CaptureITDomDiff\.diffContexts/);
  assert.match(script, /controller\.captureSettledEvent/);
  assert.match(script, /CaptureITContentController\.classifyClickCapturePath/);
  assert.match(script, /window\.addEventListener\('hashchange',\s*detectRouteChange\)/);
  assert.match(script, /window\.addEventListener\('popstate',\s*detectRouteChange\)/);
  assert.match(script, /setInterval\(detectRouteChange,\s*250\)/);
  assert.match(script, /controller\.captureRouteChange\(previousRoute,\s*nextRoute\)/);
});

test('content script exposes baseline capture and keeps manual pin branch independent', () => {
  const script = source();

  // Ctrl+Shift+클릭은 녹화 중일 때만 가로채고, 캡처가 실패해도 원래 클릭을 Ctrl·Shift 없이 다시 실행한다.
  assert.match(script, /if \(pathName === 'manual-pin' && recordingActive\)/);
  assert.match(script, /ctrlKey: false,\s*\n\s*shiftKey: false,/);
  assert.match(script, /\.finally\(\(\) => \{\s*\n\s*if \(!target\.isConnected\) return;\s*\n\s*const replayEvent = new MouseEvent\('click', replayProps\)/);
  // 녹화 중이 아니면 클릭마다 무거운 맥락 수집을 하지 않는다.
  assert.match(script, /if \(stateLoaded && !recordingActive\) return;\s*\n\s*const pathName/);
  // CaptureIT 알림을 클릭한 것은 증적이 아니다.
  assert.match(script, /if \(isCaptureItNode\(event\.target\)\) return;/);
  assert.match(script, /CAPTURE_BASELINE/);
  assert.match(script, /controller\.captureBaseline/);
});

// "CaptureIT Report Editor" 제목 버그 수정: background.js가 RecordingSession 시작 시 baseline
// 컨텍스트로 editor.html 자신이 아닌 실제 웹페이지의 컨텍스트를 얻을 수 있도록, 순수 컨텍스트 조회용
// 메시지 핸들러를 추가한다. 이 핸들러는 스크린샷/캡처(requestCapture)를 절대 트리거하지 않아야 한다.
test('content script exposes a pure page-context read for COLLECT_PAGE_CONTEXT without triggering a capture', () => {
  const script = source();
  const listenerStart = script.indexOf('chrome.runtime.onMessage.addListener');
  const listenerBody = script.slice(listenerStart, script.indexOf('})();', listenerStart));

  const conditionMatch = /if\s*\(message\.type === 'COLLECT_PAGE_CONTEXT'\)\s*\{/.exec(listenerBody);
  assert.ok(conditionMatch, 'COLLECT_PAGE_CONTEXT handler block should be present');
  let depth = 1;
  let index = conditionMatch.index + conditionMatch[0].length;
  while (depth > 0 && index < listenerBody.length) {
    if (listenerBody[index] === '{') depth += 1;
    else if (listenerBody[index] === '}') depth -= 1;
    index += 1;
  }
  const handlerBody = listenerBody.slice(conditionMatch.index + conditionMatch[0].length, index - 1);

  assert.match(
    handlerBody,
    /sendResponse\(\{\s*ok:\s*true,\s*context:\s*collectContext\(document\.body\)\s*\}\);/,
    'COLLECT_PAGE_CONTEXT handler should respond with collectContext(document.body)',
  );
  assert.doesNotMatch(handlerBody, /requestCapture/, 'COLLECT_PAGE_CONTEXT must not trigger requestCapture');
});
