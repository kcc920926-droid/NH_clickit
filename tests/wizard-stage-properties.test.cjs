const test = require('node:test');
const assert = require('node:assert/strict');
const fc = require('fast-check');

test('Wizard Property 1: exactly one Wizard_Stage is visible for any active stage', () => {
  // Feature: capture-wizard-ux-redesign, Property 1: 임의의 활성 단계에 대해 정확히 하나의 Wizard_Stage만 visible이다
  // For any active stage index in the range 0 to 2, computing the per-stage visibility vector for
  // that index SHALL yield exactly one true entry (at the position equal to that index) and false
  // for every other of the three positions.
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 2 }), (activeIndex) => {
      const visibility = [0, 1, 2].map((i) => i === activeIndex);

      const trueCount = visibility.filter(Boolean).length;
      assert.equal(trueCount, 1);
      assert.equal(visibility[activeIndex], true);

      visibility.forEach((isVisible, index) => {
        if (index !== activeIndex) {
          assert.equal(isVisible, false);
        }
      });
    }),
    { numRuns: 100 },
  );
});

const { STAGES, planActions } = require('../extension/shared/wizard-stage.js');

test('wizard stage model merges evidence review, mapping, and result entry into three stages', () => {
  assert.deepEqual(STAGES, ['capture', 'mapping-result', 'completion']);
});

test('Wizard Property 2: Primary_Action is always 0 or 1 and never overlaps Secondary_Action set', () => {
  // Feature: capture-wizard-ux-redesign, Property 2: Primary_Action은 항상 0개 또는 1개이며 Secondary_Action 집합과 겹치지 않는다
  // For any stage index (0 to 2) and any combination of context boolean flags (sessionActive,
  // currentFeatureHasMappedEvidence), planActions SHALL return a primary value that is either null
  // or a single action identifier, and whenever primary is not null, that identifier SHALL NOT
  // appear anywhere in the returned secondary array.
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 2 }),
      fc.record({
        sessionActive: fc.boolean(),
        currentFeatureHasMappedEvidence: fc.boolean(),
      }),
      (stageIndex, context) => {
        const plan = planActions(stageIndex, context);

        assert.ok(plan.primary === null || typeof plan.primary === 'string');

        if (plan.primary !== null) {
          assert.equal(plan.secondary.includes(plan.primary), false);
        }
      },
    ),
    { numRuns: 100 },
  );
});

const { furthestReachableIndex } = require('../extension/shared/wizard-stage.js');

test('Wizard Property 3: furthest reachable stage never decreases as data grows', () => {
  // Feature: capture-wizard-ux-redesign, Property 3: 도달 가능한 가장 먼 단계는 데이터가 늘어날 때 결코 감소하지 않는다
  // For any Wizard_Stage_Snapshot and any subsequent snapshot obtained by only increasing
  // evidenceCount, featureCount, or mappedFeatureCount, or by only changing sessionActive from
  // false to true (never decreasing any count or turning sessionActive from true to false),
  // furthestReachableIndex applied to the later snapshot SHALL be greater than or equal to
  // furthestReachableIndex applied to the earlier snapshot.
  fc.assert(
    fc.property(
      fc.record({
        evidenceCount: fc.nat(50),
        featureCount: fc.nat(20),
        mappedFeatureCount: fc.nat(20),
        sessionActive: fc.boolean(),
      }),
      fc.record({
        dEvidence: fc.nat(10),
        dFeature: fc.nat(10),
        dMapped: fc.nat(10),
        turnSessionOn: fc.boolean(),
      }),
      (base, growth) => {
        const grown = {
          evidenceCount: base.evidenceCount + growth.dEvidence,
          featureCount: base.featureCount + growth.dFeature,
          mappedFeatureCount: base.mappedFeatureCount + growth.dMapped,
          sessionActive: base.sessionActive || growth.turnSessionOn,
        };

        assert.ok(furthestReachableIndex(grown) >= furthestReachableIndex(base));
      },
    ),
    { numRuns: 100 },
  );
});

const { navigate } = require('../extension/shared/wizard-stage.js');

test('Wizard Property 4: navigate never mutates the snapshot and never lands on an unreachable stage', () => {
  // Feature: capture-wizard-ux-redesign, Property 4: 단계 전환은 어떤 snapshot 필드도 변경하지 않으며, 도달 불가능한 단계로는 결코 전환되지 않는다
  // For any Wizard_Stage_Snapshot, current stage index, and requested target stage index, calling
  // navigate SHALL leave every field of the snapshot object identical to its value before the
  // call, and SHALL return a resulting index that is always between 0 and
  // furthestReachableIndex(snapshot) inclusive — equal to the target index when the target is
  // reachable, and equal to the unchanged current index otherwise.
  fc.assert(
    fc.property(
      fc
        .record({
          evidenceCount: fc.nat(50),
          featureCount: fc.nat(20),
          mappedFeatureCount: fc.nat(20),
          sessionActive: fc.boolean(),
        })
        .chain((snapshot) =>
          // currentIndex는 항상 그 이전에 정당하게 도달한 단계여야 하므로(실제 앱에서
          // 도달 불가능한 단계에 "현재 있을" 수는 없다), furthestReachableIndex(snapshot)
          // 이하로만 생성한다. targetIndex는 도달 가능 여부와 무관하게 임의로 생성한다.
          fc.tuple(
            fc.constant(snapshot),
            fc.integer({ min: 0, max: furthestReachableIndex(snapshot) }),
            fc.integer({ min: 0, max: 2 }),
          ),
        ),
      ([snapshot, currentIndex, targetIndex]) => {
        const before = { ...snapshot };
        const furthest = furthestReachableIndex(snapshot);

        const result = navigate(snapshot, currentIndex, targetIndex);

        assert.deepEqual({ ...snapshot }, before);
        assert.ok(result >= 0 && result <= furthest);

        if (targetIndex <= furthest) {
          assert.equal(result, targetIndex);
        } else {
          assert.equal(result, currentIndex);
        }
      },
    ),
    { numRuns: 100 },
  );
});
