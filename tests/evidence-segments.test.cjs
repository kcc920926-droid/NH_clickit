const test = require('node:test');
const assert = require('node:assert/strict');
const Domain = require('../extension/shared/domain.js');
const Segments = require('../extension/shared/evidence-segments.js');
const { splitByScreen } = require('../extension/shared/evidence-split.js');

const ev = (id, seq, title = '주문', target = '', featureSpecId = null) => ({
  id, sequenceNo: seq, sessionId: 'S1', triggerType: 'click', featureSpecId,
  context: { pageUrl: `https://x/app#/${title}`, pageTitle: title, target: { visibleText: target } },
});

function stateWith(count, featureTitles = []) {
  const evidence = Array.from({ length: count }, (_, index) => ev(`E${index + 1}`, index + 1));
  const state = Domain.createEditorState(evidence, []);
  for (const title of featureTitles) Domain.addFeature(state, title, `F-${title}`);
  return state;
}
const layout = (state) => state.features.map((feature) => `${feature.title}:${feature.result.evidenceIds.join(',')}`);
const ids = (state) => Segments.runs(state.evidence).map((run) => run.evidenceIds.join(','));

test('구획: 같은 항목에 연달아 연결된 사진끼리, 연결 안 된 사진끼리 순번 순서로 묶인다', () => {
  const state = stateWith(5, ['A', 'B']);
  Domain.mapEvidenceBatch(state, ['E1', 'E2'], 'F-A');
  Domain.mapEvidenceBatch(state, ['E4'], 'F-B');
  assert.deepEqual(Segments.runs([...state.evidence].reverse()), [
    { featureId: 'F-A', evidenceIds: ['E1', 'E2'] },
    { featureId: null, evidenceIds: ['E3'] },
    { featureId: 'F-B', evidenceIds: ['E4'] },
    { featureId: null, evidenceIds: ['E5'] },
  ]);
});

test('나누기: 연결 안 된 세트에서 첫 사진을 누르면 전부 새 항목으로, 그다음부터는 누른 사진부터 끝까지가 새 항목', () => {
  const state = stateWith(6);
  const first = Segments.splitAt(state, state.evidence, 'E1');
  assert.equal(first.created, true);
  assert.deepEqual(first.evidenceIds, ['E1', 'E2', 'E3', 'E4', 'E5', 'E6']);
  Segments.splitAt(state, state.evidence, 'E3');
  Segments.splitAt(state, state.evidence, 'E5');
  assert.deepEqual(ids(state), ['E1,E2', 'E3,E4', 'E5,E6'], '6장을 3개로: 3번 누름');
  assert.deepEqual(state.features.map((feature) => feature.result.evidenceIds), [['E1', 'E2'], ['E3', 'E4'], ['E5', 'E6']], '항목 순서도 사진 순서대로');
  assert.equal(Segments.splitAt(state, state.evidence, 'E3'), null, '이미 구획의 첫 사진이면 나눌 것이 없다');
});

test('나누기: 가운데를 나누면 새 항목은 원래 항목 바로 뒤에 들어간다', () => {
  const state = stateWith(6);
  Segments.splitAt(state, state.evidence, 'E1');
  Segments.splitAt(state, state.evidence, 'E5');
  Segments.splitAt(state, state.evidence, 'E3');
  assert.deepEqual(state.features.map((feature) => feature.result.evidenceIds), [['E1', 'E2'], ['E3', 'E4'], ['E5', 'E6']]);
});

test('차례로 채우기: 미리 만들어 둔 빈 항목이 있으면 새로 만들지 않고 순서대로 채운다', () => {
  const state = stateWith(6, ['로그인', '조회', '승인']);
  assert.equal(Segments.previewSplit(state, state.evidence, 'E1').target.title, '로그인', '어디로 갈지 미리 알려 준다');
  Segments.splitAt(state, state.evidence, 'E1');
  assert.equal(Segments.previewSplit(state, state.evidence, 'E3').target.title, '조회');
  Segments.splitAt(state, state.evidence, 'E3');
  const last = Segments.splitAt(state, state.evidence, 'E6');
  assert.equal(last.created, false);
  assert.deepEqual(layout(state), ['로그인:E1,E2', '조회:E3,E4,E5', '승인:E6'], '항목 3개에 3번 누름');
  assert.equal(Segments.previewSplit(state, state.evidence, 'E4').target, null, '빈 항목이 없으면 새로 만든다');
  assert.equal(Segments.splitAt(state, state.evidence, 'E4').created, true);
  assert.deepEqual(state.features.map((feature) => feature.result.evidenceIds), [['E1', 'E2'], ['E3'], ['E4', 'E5'], ['E6']]);
});

test('합치기: 아래 구획이 위 항목으로 가고, 자동으로 만들어져 손대지 않은 빈 항목은 사라진다', () => {
  const state = stateWith(6);
  Segments.splitAt(state, state.evidence, 'E1');
  Segments.splitAt(state, state.evidence, 'E3');
  Segments.splitAt(state, state.evidence, 'E5');
  const merged = Segments.mergeUp(state, state.evidence, 'E3');
  assert.equal(merged.removed.length, 1);
  assert.deepEqual(state.features.map((feature) => feature.result.evidenceIds), [['E1', 'E2', 'E3', 'E4'], ['E5', 'E6']]);
  assert.equal(Segments.mergeUp(state, state.evidence, 'E1'), null, '맨 위 구획은 합칠 위가 없다');
});

test('합치기: 사용자가 이름을 고치거나 내용을 쓴 항목은 비어도 남긴다', () => {
  const state = stateWith(4);
  Segments.splitAt(state, state.evidence, 'E1');
  const second = Segments.splitAt(state, state.evidence, 'E3').feature;
  second.title = '내가 고친 이름';
  const merged = Segments.mergeUp(state, state.evidence, 'E3');
  assert.equal(merged.removed.length, 0);
  assert.deepEqual(layout(state)[1], '내가 고친 이름:');
});

test('합치기: 위가 연결 안 된 사진들이면 그 사진들이 이 항목 앞에 붙는다', () => {
  const state = stateWith(4, ['A']);
  Domain.mapEvidenceBatch(state, ['E3', 'E4'], 'F-A');
  const merged = Segments.mergeUp(state, state.evidence, 'E3');
  assert.deepEqual(merged.evidenceIds, ['E1', 'E2']);
  assert.deepEqual(state.features[0].result.evidenceIds, ['E1', 'E2', 'E3', 'E4']);
  assert.deepEqual(ids(state), ['E1,E2,E3,E4']);
});

test('화면별 자동 나누기: 빈 항목부터 채우고 모자라면 새로 만든다. 같은 이름은 번호를 붙인다', () => {
  const state = Domain.createEditorState([
    ev('E1', 1, '주문'), ev('E2', 2, '주문'), ev('E3', 3, '상세'), ev('E4', 4, '주문'),
  ], []);
  Domain.addFeature(state, '미리 만든 항목', 'F-1');
  const assigned = Segments.assignParts(state, splitByScreen(state.evidence));
  assert.deepEqual(assigned.map((item) => item.created), [false, true, true]);
  assert.deepEqual(layout(state), ['미리 만든 항목:E1,E2', '상세:E3', '주문:E4']);
  const again = Domain.createEditorState([ev('E1', 1, '주문'), ev('E2', 2, '상세'), ev('E3', 3, '주문')], []);
  Segments.assignParts(again, splitByScreen(again.evidence));
  assert.deepEqual(again.features.map((feature) => feature.title), ['주문', '상세', '주문 (2)']);
});

test('녹화가 끝나 자동으로 나눌 때는 주소를 모르는 사진(붙여넣기)을 한 장씩 쪼개지 않는다', () => {
  const pasted = (id, seq) => ({ id, sequenceNo: seq, triggerType: 'clipboard-paste', context: { pageTitle: `붙여넣은 화면 ${seq}` } });
  const list = [ev('E1', 1, '주문'), pasted('P1', 2), pasted('P2', 3), ev('E2', 4, '주문')];
  assert.deepEqual(splitByScreen(list, { unknownTogether: true }).map((part) => part.evidenceIds), [['E1'], ['P1', 'P2'], ['E2']]);
  assert.deepEqual(splitByScreen(list).map((part) => part.evidenceIds), [['E1'], ['P1'], ['P2'], ['E2']], '직접 고른 "화면별로 나누기"는 한 장씩');
});

test('되돌리기: 연결 구조만 되돌리고, 그 사이에 고친 이름은 남긴다', () => {
  const state = stateWith(4, ['A']);
  Domain.mapEvidenceBatch(state, ['E1', 'E2', 'E3', 'E4'], 'F-A');
  const saved = Segments.snapshot(state);
  Segments.splitAt(state, state.evidence, 'E3');
  state.features[0].title = 'A 고침';
  assert.equal(state.features.length, 2);
  const changed = Segments.restore(state, saved);
  assert.deepEqual(changed.sort(), ['E3', 'E4']);
  assert.deepEqual(layout(state), ['A 고침:E1,E2,E3,E4']);
  assert.ok(state.evidence.every((item) => item.featureSpecId === 'F-A'));
});

test('되돌리기: 합치며 지워진 항목이 제자리에 돌아온다', () => {
  const state = stateWith(4);
  Segments.splitAt(state, state.evidence, 'E1');
  Segments.splitAt(state, state.evidence, 'E3');
  const before = layout(state);
  const saved = Segments.snapshot(state);
  Segments.mergeUp(state, state.evidence, 'E3');
  assert.equal(state.features.length, 1);
  Segments.restore(state, saved);
  assert.deepEqual(layout(state), before);
  assert.deepEqual(ids(state), ['E1,E2', 'E3,E4']);
});
