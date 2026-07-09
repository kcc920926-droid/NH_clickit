const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const modulePath = path.resolve(__dirname, '../extension/shared/dom-diff.js');

function loadDomDiff() {
  assert.equal(fs.existsSync(modulePath), true, 'dom-diff module should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

test('diffContexts reports text that appears only after the event', () => {
  const { diffContexts } = loadDomDiff();

  const diff = diffContexts(
    { visibleText: '주문 저장 전 입력 화면' },
    { visibleText: '주문 저장 전 입력 화면 저장되었습니다' },
  );

  assert.deepEqual(diff.changedText, ['저장되었습니다']);
});

test('diffContexts classifies result and validation messages by vocabulary', () => {
  const { diffContexts } = loadDomDiff();

  const diff = diffContexts({}, {
    resultCandidates: [
      { text: '저장되었습니다', selector: '#success', role: 'status' },
      { text: '필수입니다', selector: '#required', role: 'alert' },
      { text: '일반 안내 문구', selector: '#neutral' },
    ],
  });

  assert.deepEqual(diff.resultMessages.map((entry) => entry.text), ['저장되었습니다']);
  assert.deepEqual(diff.validationMessages.map((entry) => entry.text), ['필수입니다']);
});

test('diffContexts sorts candidate result elements by source priority', () => {
  const { diffContexts } = loadDomDiff();

  const diff = diffContexts({}, {
    resultCandidates: [
      { text: '완료', selector: '.plain' },
      { text: '성공', selector: '.toast', className: 'toast' },
      { text: '저장됨', selector: '[role=status]', role: 'status' },
      { text: '등록되었습니다', selector: '[role=alert]', role: 'alert' },
    ],
  });

  assert.deepEqual(
    diff.candidateResultElements.map((entry) => entry.selector),
    ['[role=alert]', '[role=status]', '.toast', '.plain'],
  );
});

test('diffContexts scans surrounding context text as a fallback candidate', () => {
  const { diffContexts } = loadDomDiff();

  const diff = diffContexts({}, {
    surroundingContext: {
      visibleText: '등록되었습니다',
    },
  });

  assert.deepEqual(diff.resultMessages.map((entry) => entry.text), ['등록되었습니다']);
  assert.equal(diff.resultMessages[0].selector, 'surroundingContext.visibleText');
});
