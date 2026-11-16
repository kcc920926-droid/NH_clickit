const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dedupe = require('../extension/shared/evidence-dedupe.js');
require('../extension/shared/domain.js');
const { createCaptureCoordinator } = require('../extension/shared/capture-coordinator.js');

const CELLS = dedupe.FINGERPRINT_WIDTH * dedupe.FINGERPRINT_HEIGHT;

// 회색조 칸 값 배열로 지문 문자열을 만든다. changedCells개 칸만 밝기를 크게 바꾼다.
function fingerprint(changedCells = 0, base = 120) {
  const gray = new Uint8Array(CELLS).fill(base);
  for (let index = 0; index < changedCells; index += 1) gray[index] = 255;
  return Buffer.from(gray).toString('base64');
}

function evidence(overrides = {}) {
  return {
    id: overrides.id || 'E1',
    sessionId: 'S1',
    sequenceNo: 1,
    triggerType: 'click',
    featureSpecId: null,
    context: { pageUrl: 'http://app.local/orders', target: { visibleText: '조회' } },
    fingerprint: fingerprint(0),
    ...overrides,
  };
}

test('fingerprintFromRgba는 RGBA 격자를 회색조 지문으로 바꾸고 같은 입력이면 같은 지문을 만든다', () => {
  const rgba = new Uint8ClampedArray(CELLS * 4).fill(200);
  const first = dedupe.fingerprintFromRgba(rgba);
  assert.equal(first, dedupe.fingerprintFromRgba(rgba));
  assert.equal(Buffer.from(first, 'base64').length, CELLS);
  assert.equal(dedupe.changedRatio(first, first), 0);
});

test('changedRatio는 바뀐 칸 비율을 계산하고 지문이 없으면 1을 돌려준다', () => {
  assert.equal(dedupe.changedRatio(fingerprint(0), fingerprint(23)), 23 / CELLS);
  assert.equal(dedupe.changedRatio(null, fingerprint(0)), 1);
  // 허용 오차 이내의 작은 밝기 차이는 바뀐 칸으로 세지 않는다.
  assert.equal(dedupe.changedRatio(fingerprint(0, 120), fingerprint(0, 130)), 0);
});

test('isNearDuplicate는 같은 페이지의 거의 같은 화면만 중복으로 본다', () => {
  const previous = evidence({ id: 'E1' });
  assert.equal(dedupe.isNearDuplicate(previous, evidence({ id: 'E2', fingerprint: fingerprint(5) })), true);
  assert.equal(dedupe.isNearDuplicate(previous, evidence({ id: 'E2', fingerprint: fingerprint(200) })), false, '화면이 크게 다르면 중복이 아니다');
  assert.equal(
    dedupe.isNearDuplicate(previous, evidence({ id: 'E2', context: { pageUrl: 'http://app.local/other' } })),
    false,
    '다른 페이지면 중복이 아니다',
  );
  assert.equal(
    dedupe.isNearDuplicate(previous, evidence({ id: 'E2', context: { pageUrl: 'http://app.local/orders#tab2' } })),
    true,
    'URL 해시만 다르면 같은 페이지로 본다',
  );
  assert.equal(dedupe.isNearDuplicate(previous, evidence({ id: 'E2', sessionId: 'S2' })), false, '세션이 다르면 중복이 아니다');
});

test('isNearDuplicate는 직접 지정·입력·결과 메시지·연결된 증적을 합치지 않는다', () => {
  const previous = evidence({ id: 'E1' });
  for (const triggerType of ['manual-pin', 'shortcut-context', 'context-menu', 'form-input', 'baseline', 'clipboard-paste', 'file-import']) {
    assert.equal(dedupe.isNearDuplicate(previous, evidence({ id: 'E2', triggerType })), false, triggerType);
  }
  assert.equal(
    dedupe.isNearDuplicate(previous, evidence({ id: 'E2', domDiff: { resultMessages: [{ text: '저장되었습니다', priority: 4 }] } })),
    false,
    '알림창(role=alert 등)에 뜬 결과 메시지가 있으면 합치지 않는다',
  );
  assert.equal(
    dedupe.isNearDuplicate(previous, evidence({ id: 'E2', domDiff: { resultMessages: [{ text: '저장 완료 버튼 …', priority: 1 }] } })),
    true,
    '페이지 본문에서 찾은 단어(버튼 이름 등)만으로는 보호하지 않는다',
  );
  assert.equal(
    dedupe.isNearDuplicate(previous, evidence({ id: 'E2', domDiff: { changedText: ['3건'] } })),
    false,
    '동작 뒤 화면 글자가 바뀌었으면 그림이 비슷해도 합치지 않는다',
  );
  assert.equal(dedupe.isNearDuplicate(evidence({ id: 'E1', featureSpecId: 'F1' }), evidence({ id: 'E2' })), false);
});

test('planDuplicateCleanup은 연달아 찍힌 같은 화면을 첫 화면 하나로 묶고 입력을 바꾸지 않는다', () => {
  const list = [
    evidence({ id: 'A', sequenceNo: 1, triggerType: 'navigation' }),
    evidence({ id: 'B', sequenceNo: 2 }),
    evidence({ id: 'C', sequenceNo: 3 }),
    evidence({ id: 'D', sequenceNo: 4, fingerprint: fingerprint(300) }),
    evidence({ id: 'E', sequenceNo: 5, fingerprint: fingerprint(300) }),
    evidence({ id: 'F', sequenceNo: 6, triggerType: 'manual-pin', fingerprint: fingerprint(300) }),
  ];
  const snapshot = JSON.stringify(list);
  const plan = dedupe.planDuplicateCleanup(list);
  assert.deepEqual(plan, [
    { keepId: 'A', removeIds: ['B', 'C'] },
    { keepId: 'D', removeIds: ['E'] },
  ]);
  assert.equal(JSON.stringify(list), snapshot);
});

test('appendMergedEvents는 합쳐진 증적의 동작 기록을 남기고 이전 합침 기록도 이어받는다', () => {
  const keeper = evidence({ id: 'A', mergedEvents: [] });
  const absorbed = evidence({
    id: 'B',
    capturedAt: '2026-11-16T00:00:00.000Z',
    mergedEvents: [{ triggerType: 'click', capturedAt: '2026-11-15T00:00:00.000Z', targetText: '이전' }],
  });
  dedupe.appendMergedEvents(keeper, [absorbed]);
  assert.deepEqual(keeper.mergedEvents.map((item) => item.targetText), ['이전', '조회']);
});

function coordinatorHarness({ previous, fingerprintValue, request }) {
  const store = new Map(previous ? [[previous.id, previous]] : []);
  const session = { id: 'S1', active: true, lastSequenceNo: previous ? previous.sequenceNo : 0, lastEvidenceId: previous ? previous.id : null };
  const persisted = [];
  const coordinator = createCaptureCoordinator({
    loadSession: async () => session,
    saveSession: async () => {},
    persistEvidence: async (item) => { persisted.push(item); store.set(item.id, item); },
    captureVisible: async () => 'data:image/png;base64,AAAA',
    fingerprintImage: async () => fingerprintValue,
    loadEvidence: async (id) => store.get(id) || null,
    createId: () => 'NEW',
    now: () => '2026-11-16T00:00:00.000Z',
  });
  return { coordinator, session, persisted, request };
}

test('수집 중 같은 화면이 다시 찍히면 새 증적 없이 직전 증적에 합치고 순번을 쓰지 않는다', async () => {
  const previous = evidence({ id: 'PREV', sequenceNo: 4, mergedEvents: [] });
  const { coordinator, session, persisted } = coordinatorHarness({ previous, fingerprintValue: fingerprint(3) });
  const result = await coordinator.capture({
    triggerType: 'click',
    context: { pageUrl: 'http://app.local/orders', target: { visibleText: '다시 조회' } },
  });
  assert.equal(result.merged, true);
  assert.equal(result.id, 'PREV');
  assert.equal(session.lastSequenceNo, 4);
  assert.equal(session.lastEvidenceId, 'PREV');
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].mergedEvents.at(-1).targetText, '다시 조회');
  assert.equal('merged' in persisted[0], false, 'merged 표시는 저장하지 않는다');
});

test('화면이 바뀌었거나 직접 지정한 캡처면 평소처럼 새 증적을 만든다', async () => {
  const previous = evidence({ id: 'PREV', sequenceNo: 4 });
  const changed = coordinatorHarness({ previous, fingerprintValue: fingerprint(400) });
  const created = await changed.coordinator.capture({ triggerType: 'click', context: { pageUrl: 'http://app.local/orders' } });
  assert.equal(created.id, 'NEW');
  assert.equal(created.sequenceNo, 5);
  assert.equal(created.fingerprint, fingerprint(400));

  const pinned = coordinatorHarness({ previous: evidence({ id: 'PREV', sequenceNo: 4 }), fingerprintValue: fingerprint(0) });
  const pin = await pinned.coordinator.capture({ triggerType: 'shortcut-context', context: { pageUrl: 'http://app.local/orders' } });
  assert.equal(pin.id, 'NEW');
  assert.equal(pin.merged, undefined);
});

test('녹화 정책에서 mergeDuplicateScreens를 끄면 합치지 않는다', async () => {
  const harness = coordinatorHarness({ previous: evidence({ id: 'PREV', sequenceNo: 4 }), fingerprintValue: fingerprint(0) });
  harness.session.recordingPolicy = { mergeDuplicateScreens: false };
  const result = await harness.coordinator.capture({ triggerType: 'click', context: { pageUrl: 'http://app.local/orders' } });
  assert.equal(result.id, 'NEW');
});

test('편집기는 붙여넣기·창 전체 끌어다 놓기·중복 정리·증적 ZIP 버튼을 연결한다', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/editor.js'), 'utf8');
  const html = fs.readFileSync(path.resolve(__dirname, '../extension/editor.html'), 'utf8');
  const background = fs.readFileSync(path.resolve(__dirname, '../extension/background.js'), 'utf8');

  assert.match(script, /document\.addEventListener\('paste', handlePaste\)/);
  assert.match(script, /importImages\(images, 'paste'\)/);
  assert.match(script, /triggerType: fromPaste \? 'clipboard-paste' : 'file-import'/);
  assert.match(script, /source: 'file-import'/, '붙여넣은 증적도 manifest 출처 값은 file-import를 유지한다');
  assert.match(script, /document\.addEventListener\('drop'/);
  assert.doesNotMatch(script, /evidenceDropZone\.addEventListener\('drop'/, '파일 드롭은 문서 전체 한 곳에서만 받는다(이중 불러오기 방지)');
  assert.match(script, /CaptureITEvidenceDedupe\.planDuplicateCleanup\(/);
  // 불러온 이미지는 편집기 창 크기가 아니라 이미지 원래 크기를 기준으로 자른다.
  assert.match(script, /const viewportSize = \{ width: loaded\.naturalWidth, height: loaded\.naturalHeight \}/);

  for (const id of ['paste-zone', 'clean-duplicates', 'export-evidence-quick', 'export-evidence-completion']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }
  assert.match(html, /<script src="shared\/evidence-dedupe\.js"><\/script>/);
  // 안내 메시지는 단계 컨테이너 밖에 있어 어느 단계에서나 보인다.
  assert.ok(html.indexOf('id="editor-message"') < html.indexOf('<main'), '#editor-message should sit above the stage containers');

  assert.match(background, /import '\.\/shared\/evidence-dedupe\.js';/);
  assert.ok(
    background.indexOf("import './shared/evidence-dedupe.js'") < background.indexOf("import './shared/capture-coordinator.js'"),
    'dedupe must load before the coordinator',
  );
  assert.match(background, /autoCaptureAvailable/);
});

test('사용자 화면 문구에 내부 식별자가 남지 않는다', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../extension/editor.js'), 'utf8');
  const html = fs.readFileSync(path.resolve(__dirname, '../extension/editor.html'), 'utf8');
  const userStrings = [...script.matchAll(/(?:setMessage|new Error)\(\s*(['`])((?:(?!\1).)*)\1/g)].map((match) => match[2]);
  for (const text of userStrings) {
    assert.doesNotMatch(text, /RecordingSession|Draft_Report|RECORDING|\bN\/A\b/, text);
  }
  assert.doesNotMatch(html, />\s*(RECORDING|N\/A)\s*</);
  assert.match(script, /null: '미판정'/);
});
