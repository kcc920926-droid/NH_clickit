const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (relative) => fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8');
const editor = read('extension/editor.js');
const html = read('extension/editor.html');
const css = read('extension/editor.css');

function functionBody(source, name) {
  const match = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\([^)]*\\)\\s*{`).exec(source);
  assert.ok(match, `function ${name} should exist`);
  let depth = 1;
  let index = match.index + match[0].length;
  const start = index;
  while (depth > 0) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}') depth -= 1;
    index += 1;
  }
  return source.slice(start, index - 1);
}

test('세트는 구획(같은 항목에 연달아 연결된 사진들)으로 나눠 그린다', () => {
  const card = functionBody(editor, 'captureGraphCard');
  assert.match(card, /const segments = CaptureITSegments\.runs\(items\);/);
  assert.match(card, /segments\.map\(\(run, index\) => sceneSegment\(run, index, segments, group, items\)\)/);
  const segment = functionBody(editor, 'sceneSegment');
  assert.match(segment, /title\.addEventListener\('change', \(\) => saveFeatureTitle\(feature, title\.value\)\);/, '항목 이름을 구획에서 바로 고친다');
  assert.match(segment, /if \(index > 0\) \{/, '맨 위 구획에는 합치기가 없다');
  assert.match(segment, /CaptureITSegments\.previewSplit\(editorState, items, id\)/, '사진마다 나눌 수 있는지와 어디로 갈지를 미리 구한다');
  assert.ok(html.indexOf('shared/evidence-split.js') < html.indexOf('shared/evidence-segments.js'));
  assert.ok(html.indexOf('shared/evidence-segments.js') < html.indexOf('src="editor.js"'));
  assert.match(css, /\.scene-seg \{/);
});

test('나누기·합치기는 확인 창 없이 바로 하고 "되돌리기"를 건넨다', () => {
  const split = functionBody(editor, 'splitHere');
  assert.match(split, /const saved = CaptureITSegments\.snapshot\(editorState\);/);
  assert.match(split, /CaptureITSegments\.splitAt\(editorState, evidenceItems\(setEvidenceIds\), evidenceId\)/);
  const merge = functionBody(editor, 'mergeSegmentUp');
  assert.match(merge, /CaptureITSegments\.mergeUp\(editorState, evidenceItems\(setEvidenceIds\), evidenceId\)/);
  for (const body of [split, merge]) {
    assert.doesNotMatch(body, /confirm\(/);
    assert.doesNotMatch(body, /autoRunAiPipelineForFeature/, '끊는 자리를 고칠 때마다 AI를 돌리지 않는다');
    assert.match(body, /await commitLinkChange\(saved,/);
  }
  const commit = functionBody(editor, 'commitLinkChange');
  assert.match(commit, /await persistMappedEvidence\(changed\);/);
  assert.match(commit, /setMessage\(message, false, \{ label: '되돌리기', run: \(\) => undoLinkChange\(saved\) \}\);/);
  assert.match(functionBody(editor, 'undoLinkChange'), /CaptureITSegments\.restore\(editorState, saved\)/);
});

test('녹화가 끝나면 방금 찍은 사진을 화면이 바뀐 곳에서 나눠 붙여 둔다', () => {
  const stop = functionBody(editor, 'stopRecordingSession');
  assert.match(stop, /const linked = await autoLinkStoppedSession\(stoppedSessionId\);/);
  assert.doesNotMatch(stop, /연결하세요/, '끝난 뒤 "연결하세요"라고 일을 넘기지 않는다');
  const auto = functionBody(editor, 'autoLinkStoppedSession');
  assert.match(auto, /const fresh = sessionFreshEvidence\(sessionId\);/, '그 녹화에서 아직 연결 안 된 사진만');
  assert.match(auto, /auto: true,/);
  assert.match(auto, /oneScene: marked,/, '"다음 장면"으로 끊어 둔 녹화는 남은 사진을 한 항목으로');
  const split = functionBody(editor, 'splitIntoFeatures');
  assert.match(split, /splitByScreen\(free, \{ unknownTogether: Boolean\(options\.auto\) \}\)/, '자동일 때는 주소를 모르는 사진을 쪼개지 않는다');
});

test('녹화 중 "다음 장면"을 누르면 지금까지 찍은 화면이 한 항목으로 묶인다', () => {
  assert.match(html, /<button id="next-scene-bar" class="button button-quiet" type="button" hidden>/);
  assert.ok(html.indexOf('id="next-scene-bar"') < html.indexOf('id="stop-recording-bar"'), '녹화 종료 버튼 옆에 둔다');
  const session = functionBody(editor, 'renderSession');
  assert.match(session, /elements\.nextSceneBar\.hidden = !active;/);
  assert.match(session, /elements\.nextSceneBar\.textContent = `다음 \$\{itemWord\(\)\}`;/, '목적에 맞는 이름(다음 장면·다음 테스트케이스)');
  const mark = functionBody(editor, 'markNextScene');
  assert.match(mark, /await refreshEvidenceNow\(\);/, '방금 찍힌 것까지 읽고 묶는다');
  assert.match(mark, /sceneMarkedSessions\.add\(sessionId\);/);
  assert.match(mark, /CaptureITSegments\.assignParts\(editorState,/);
  assert.match(editor, /elements\.nextSceneBar\.addEventListener\('click', \(\) => markNextScene\(\)/);
});

test('연결을 바꾸는 일과 증적 새로 읽기는 한 줄로 세운다(녹화 중 겹치면 연결이 지워질 수 있다)', () => {
  for (const name of ['splitHere', 'mergeSegmentUp', 'splitIntoFeatures', 'markNextScene', 'undoLinkChange', 'refreshEvidence']) {
    assert.match(functionBody(editor, name), /return serial\(/, name);
  }
});

test('자동으로 만든 항목을 손대지 않은 채 비우면 지운다', () => {
  assert.match(functionBody(editor, 'dropBlankFeatures'), /CaptureITSegments\.pruneBlank\(editorState\)/);
  for (const name of ['unmapSingleEvidence', 'unmapEvidenceGroup', 'removeEvidence', 'removeEvidenceGroup', 'mapEvidenceIds']) {
    assert.match(functionBody(editor, name), /dropBlankFeatures\(\);/, name);
  }
});

test('AI가 빈 응답을 주면 한도에 걸린 것으로 보고 1분 기다렸다 다시 보낸다', () => {
  const send = functionBody(editor, 'sendLlmRequest');
  assert.match(send, /if \(error\.code !== 'EMPTY_RESPONSE' \|\| error\.outputLimit\) throw error;/, '출력 한도로 빈 답은 기다리지 않고 한도를 늘려 다시 요청하게 넘긴다');
  assert.match(send, /tokenBudget\.exhaust\(entry\);\s*await waitBeforeRetry\(CaptureITAiBudget\.retryDelayMs\(null, attempt, 429\),/);
  assert.match(send, /`빈 응답을 받아 \$\{seconds\}초 뒤 다시 보냄\(한도는 1분 단위로 풀림\)`/);
  assert.match(send, /if \(attempt >= 2\) \{/, '두 번 다시 보내도 비어 있으면 알린다');
  const budget = require('../extension/shared/ai-budget.js');
  assert.equal(budget.retryDelayMs(null, 0, 429), 60000);
});
