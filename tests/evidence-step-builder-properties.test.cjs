const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fc = require('fast-check');

const modulePath = path.resolve(__dirname, '../extension/shared/evidence-step-builder.js');

function loadBuilder() {
  assert.equal(fs.existsSync(modulePath), true, 'evidence-step-builder module should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

const stepTypes = ['baseline', 'form-input', 'click', 'submit', 'route-change', 'manual-pin', 'result-check'];
const actionTypes = ['baseline', 'form-input', 'click', 'submit', 'route-change', 'manual-pin', 'result-check'];

function evidenceListArbitrary() {
  return fc
    .uniqueArray(fc.integer({ min: 1, max: 500 }), { minLength: 0, maxLength: 30 })
    .chain((sequenceNumbers) =>
      fc.tuple(
        ...sequenceNumbers.map(() =>
          fc.record({
            triggerType: fc.constantFrom(...actionTypes),
            formSelector: fc.constantFrom('#login', '#order', '#profile'),
          }),
        ),
      ).map((records) => records.map((record, index) => ({
        id: `CAP-${sequenceNumbers[index]}`,
        sequenceNo: sequenceNumbers[index],
        triggerType: record.triggerType,
        formSelector: record.formSelector,
        context: { target: { visibleText: record.triggerType } },
      }))),
    );
}

test('Property 34: EvidenceStep grouping never creates more steps than raw events and merges consecutive same-form inputs', () => {
  const builder = loadBuilder();

  fc.assert(
    fc.property(evidenceListArbitrary(), (evidenceList) => {
      const steps = builder.buildEvidenceSteps(evidenceList);

      assert.equal(steps.length <= evidenceList.length, true);
      for (let index = 0; index + 1 < steps.length; index += 1) {
        const left = steps[index];
        const right = steps[index + 1];
        assert.equal(left.stepType === 'form-input' && right.stepType === 'form-input' && left.formSelector === right.formSelector, false);
      }
    }),
    { numRuns: 100 },
  );
});

test('Property 35: every EvidenceStep has a valid stepType and primaryEvidenceId from its evidenceIds', () => {
  const builder = loadBuilder();

  fc.assert(
    fc.property(evidenceListArbitrary(), (evidenceList) => {
      const steps = builder.buildEvidenceSteps(evidenceList);

      for (const step of steps) {
        assert.equal(stepTypes.includes(step.stepType), true);
        assert.equal(step.evidenceIds.includes(step.primaryEvidenceId), true);
      }
    }),
    { numRuns: 100 },
  );
});

test('Property 36: EvidenceSteps are sorted by stepNo and source sequence order', () => {
  const builder = loadBuilder();

  fc.assert(
    fc.property(evidenceListArbitrary(), (evidenceList) => {
      const shuffled = [...evidenceList].reverse();
      const sequenceById = new Map(evidenceList.map((item) => [item.id, item.sequenceNo]));
      const steps = builder.buildEvidenceSteps(shuffled);

      for (let index = 0; index < steps.length; index += 1) {
        assert.equal(steps[index].stepNo, index + 1);
      }
      for (let index = 0; index + 1 < steps.length; index += 1) {
        const leftMin = Math.min(...steps[index].evidenceIds.map((id) => sequenceById.get(id)));
        const rightMin = Math.min(...steps[index + 1].evidenceIds.map((id) => sequenceById.get(id)));
        assert.equal(leftMin < rightMin, true);
      }
    }),
    { numRuns: 100 },
  );
});
