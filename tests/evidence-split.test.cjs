const test = require('node:test');
const assert = require('node:assert/strict');
const { splitByScreen } = require('../extension/shared/evidence-split.js');

const ev = (id, seq, url, title, target = '', triggerType = 'click') => ({ id, sequenceNo: seq, triggerType, context: { pageUrl: url, pageTitle: title, target: { visibleText: target } } });

test('녹화 세트를 화면(주소 + 앱 안 # 경로)이 바뀔 때마다 나눈다', () => {
  const parts = splitByScreen([
    ev('E3', 3, 'https://x/app#/orders/1', '주문 상세', '승인'),
    ev('E1', 1, 'https://x/app#/orders', '주문 목록'),
    ev('E2', 2, 'https://x/app#/orders', '주문 목록', '상세 보기'),
    ev('E4', 4, 'https://x/app#/orders/1', '주문 상세', '확인'),
    ev('E5', 5, 'https://x/app#/orders', '주문 목록'),
  ]);
  assert.deepEqual(parts.map((part) => part.evidenceIds), [['E1', 'E2'], ['E3', 'E4'], ['E5']], '순번 순서로, 다시 돌아온 화면은 새 묶음');
  assert.deepEqual(parts.map((part) => part.title), ['주문 목록 · 상세 보기', '주문 상세 · 승인', '주문 목록']);
});

test('같은 화면 안의 쿼리 문자열 차이는 같은 화면으로, 붙여넣은 이미지는 한 장씩', () => {
  const parts = splitByScreen([
    ev('E1', 1, 'https://x/list?page=1', '목록'),
    ev('E2', 2, 'https://x/list?page=2', '목록'),
    { id: 'P1', sequenceNo: 3, triggerType: 'clipboard-paste', context: { pageTitle: '붙여넣은 화면 10:00' } },
    { id: 'P2', sequenceNo: 4, triggerType: 'clipboard-paste', context: { pageTitle: '붙여넣은 화면 10:01' } },
  ]);
  assert.deepEqual(parts.map((part) => part.evidenceIds), [['E1', 'E2'], ['P1'], ['P2']]);
  assert.equal(parts[1].title, '붙여넣은 화면 10:00');
});

test('제목에는 실제로 누른 짧은 글자만 붙인다(화면 진입 때 잡힌 메뉴 전체 글자 등은 빼고)', () => {
  const parts = splitByScreen([
    ev('E1', 1, 'https://x/app#/orders', '주문 승인', 'O OrderOps 대시보드 주문 관리 3 고객 관리 설정', 'baseline'),
    ev('E2', 2, 'https://x/app#/orders', '주문 승인', '처리 중'),
  ]);
  assert.equal(parts[0].title, '주문 승인 · 처리 중');
  const longOnly = splitByScreen([ev('E1', 1, 'https://x/a', '목록', '아주 긴 버튼 글자가 스무 글자를 훨씬 넘는 경우에는 쓰지 않는다')]);
  assert.equal(longOnly[0].title, '목록');
});
