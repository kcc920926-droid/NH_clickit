const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const fc = require('fast-check');

const modulePath = path.resolve(__dirname, '../extension/shared/dom-diff.js');

function loadDomDiff() {
  assert.equal(fs.existsSync(modulePath), true, 'dom-diff module should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

test('Property 13: Dom_Diff classification is deterministic from before/after text and vocabulary', () => {
  const { diffContexts } = loadDomDiff();
  const resultTexts = ['완료', '성공', '저장됨', '등록되었습니다'];
  const validationTexts = ['오류', '실패', '필수입니다', '올바르지 않습니다'];
  const neutralTexts = ['상세 보기', '목록', '검색', '다음'];

  fc.assert(
    fc.property(
      fc.array(fc.constantFrom(...resultTexts), { minLength: 0, maxLength: 4 }),
      fc.array(fc.constantFrom(...validationTexts), { minLength: 0, maxLength: 4 }),
      fc.array(fc.constantFrom(...neutralTexts), { minLength: 0, maxLength: 4 }),
      (results, validations, neutrals) => {
        const candidates = [...results, ...validations, ...neutrals].map((text, index) => ({
          text,
          selector: `#candidate-${index}`,
        }));
        const beforeContext = { visibleText: neutrals.join(' ') };
        const afterContext = {
          visibleText: [...neutrals, ...results, ...validations].join(' '),
          resultCandidates: candidates,
        };

        const first = diffContexts(beforeContext, afterContext);
        const second = diffContexts(beforeContext, afterContext);

        assert.deepEqual(second, first);
        assert.deepEqual(first.resultMessages.map((entry) => entry.text), results);
        assert.deepEqual(first.validationMessages.map((entry) => entry.text), validations);
        for (const text of neutrals) {
          assert.equal(first.resultMessages.some((entry) => entry.text === text), false);
          assert.equal(first.validationMessages.some((entry) => entry.text === text), false);
        }
      },
    ),
    { numRuns: 100 },
  );
});
