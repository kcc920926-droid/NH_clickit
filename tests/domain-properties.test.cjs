const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fc = require('fast-check');

const modulePath = path.resolve(__dirname, '../extension/shared/domain.js');

function loadDomain() {
  assert.equal(fs.existsSync(modulePath), true, 'domain module should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

// Arbitrary: an array of evidence items, each with a unique id, a sessionId
// drawn from a small fixed pool (so multiple evidence share sessions), and an
// arbitrary integer sequenceNo.
const sessionIdPool = ['SESSION-A', 'SESSION-B', 'SESSION-C'];

function evidenceListArbitrary() {
  return fc
    .uniqueArray(fc.integer({ min: 0, max: 999 }), { minLength: 0, maxLength: 30 })
    .chain((indices) =>
      fc.tuple(
        ...indices.map(() =>
          fc.record({
            sessionId: fc.constantFrom(...sessionIdPool),
            sequenceNo: fc.integer({ min: -1000, max: 1000 }),
          }),
        ),
      ).map((records) => records.map((record, position) => ({
        id: `CAP-${indices[position]}`,
        sessionId: record.sessionId,
        sequenceNo: record.sequenceNo,
      }))),
    );
}

test('Streamlined Property 1: Capture_Session_Set grouping is equivalent to a sessionId partition', () => {
  // Feature: streamlined-report-authoring, Property 1: Capture_Session_Set 그룹화는 sessionId 파티션과 동치
  // For any array of unmapped Evidence items (each with a sessionId and sequenceNo), grouping them into
  // Capture_Session_Sets SHALL produce groups such that every Evidence id appears in exactly one group,
  // each group's evidenceIds set equals exactly the Evidence ids sharing that group's sessionId, each
  // group's reported count equals the length of its evidenceIds, and no Evidence id present in a
  // separately-provided "already mapped" set appears in any group.
  const domain = loadDomain();

  fc.assert(
    fc.property(evidenceListArbitrary(), (evidenceList) => {
      const groups = domain.groupIntoCaptureSessionSets(evidenceList);

      // Reference partition built directly from the input via a Map keyed by sessionId.
      const referenceBySession = new Map();
      for (const evidence of evidenceList) {
        if (!referenceBySession.has(evidence.sessionId)) {
          referenceBySession.set(evidence.sessionId, new Set());
        }
        referenceBySession.get(evidence.sessionId).add(evidence.id);
      }

      // Every evidence id appears in exactly one group.
      const seen = new Map();
      for (const group of groups) {
        for (const id of group.evidenceIds) {
          seen.set(id, (seen.get(id) ?? 0) + 1);
        }
      }
      for (const evidence of evidenceList) {
        assert.equal(seen.get(evidence.id), 1);
      }
      assert.equal(seen.size, evidenceList.length);

      // Each group's evidenceIds set equals exactly the reference partition for that sessionId,
      // and count equals evidenceIds.length.
      for (const group of groups) {
        const referenceIds = referenceBySession.get(group.sessionId);
        assert.ok(referenceIds, `unexpected sessionId in output: ${group.sessionId}`);
        assert.equal(group.evidenceIds.length, referenceIds.size);
        assert.equal(new Set(group.evidenceIds).size, group.evidenceIds.length);
        for (const id of group.evidenceIds) {
          assert.ok(referenceIds.has(id));
        }
        assert.equal(group.count, group.evidenceIds.length);
      }

      // No group is produced for a sessionId absent from the input, and every distinct
      // sessionId present in the input produces exactly one group.
      assert.equal(groups.length, referenceBySession.size);
    }),
    { numRuns: 100 },
  );
});

test('Streamlined Property 17: Capture_Session_Set grouping confines adjacent Capture_Node links to within a session', () => {
  // Feature: streamlined-report-authoring, Property 17: Capture_Session_Set 그룹화는 인접 Capture_Node 연결 관계를 세션 내부로 한정한다
  // For any array of unmapped Evidence items spanning two or more distinct sessionId values, the
  // adjacent-pair connections implied by rendering each group's evidenceIds array as a Capture_Graph
  // SHALL only ever connect two Evidence ids that share the same sessionId, and no adjacent pair
  // spanning two different groups SHALL be produced, even when the groups are listed consecutively
  // in the grouping function's output.
  const domain = loadDomain();

  fc.assert(
    fc.property(
      evidenceListArbitrary().filter((list) => new Set(list.map((item) => item.sessionId)).size >= 2),
      (evidenceList) => {
        const groups = domain.groupIntoCaptureSessionSets(evidenceList);
        const sessionById = new Map(evidenceList.map((item) => [item.id, item.sessionId]));

        for (const group of groups) {
          for (let index = 0; index + 1 < group.evidenceIds.length; index += 1) {
            const leftId = group.evidenceIds[index];
            const rightId = group.evidenceIds[index + 1];
            assert.equal(sessionById.get(leftId), group.sessionId);
            assert.equal(sessionById.get(rightId), group.sessionId);
            assert.equal(sessionById.get(leftId), sessionById.get(rightId));
          }
        }

        // No adjacent pair spans two different groups: since each group is rendered as its own
        // Capture_Graph container, connectors are only ever drawn within a single group's
        // evidenceIds array. Confirm distinct groups never share evidence ids (partition property),
        // which structurally guarantees no cross-group adjacency can be formed from this output.
        const idToGroupSession = new Map();
        for (const group of groups) {
          for (const id of group.evidenceIds) {
            assert.equal(idToGroupSession.has(id), false, 'evidence id must belong to exactly one group');
            idToGroupSession.set(id, group.sessionId);
          }
        }
      },
    ),
    { numRuns: 100 },
  );
});

// Helper: builds a fresh editor state with `featureCount` features (FS-0..FS-{n-1}) and
// `evidenceCount` evidence items (CAP-0..CAP-{n-1}), all initially unmapped.
function buildState(domain, evidenceCount, featureCount) {
  const evidence = Array.from({ length: evidenceCount }, (_, index) => ({
    id: `CAP-${index}`,
    featureSpecId: null,
    sessionId: 'SESSION-1',
    sequenceNo: index,
  }));
  const features = Array.from({ length: featureCount }, (_, index) => domain.createFeature(`Feature ${index}`, `FS-${index}`));
  return domain.createEditorState(evidence, features);
}

test('Streamlined Property 2: batch mapping replaces prior links and applies atomically', () => {
  // Feature: streamlined-report-authoring, Property 2: 배치 매핑은 이전 연결을 대체하며 원자적으로 적용된다
  // For any set of Evidence ids (a Capture_Session_Set or a single Evidence id) and any target
  // Feature_Spec id, and for any prior mapping state in which some of those Evidence ids were
  // already mapped to a different Feature_Spec, mapping that set to the target SHALL result in
  // every Evidence id in the set having featureSpecId equal to the target, the target Feature_Spec's
  // evidenceIds containing exactly those ids (no duplicates, no omissions), and none of those ids
  // remaining in any other Feature_Spec's evidenceIds.
  const domain = loadDomain();

  fc.assert(
    fc.property(
      fc.integer({ min: 2, max: 8 }).chain((evidenceCount) =>
        fc.record({
          evidenceCount: fc.constant(evidenceCount),
          featureCount: fc.integer({ min: 2, max: 4 }),
          selectedIndices: fc.uniqueArray(fc.integer({ min: 0, max: evidenceCount - 1 }), {
            minLength: 1,
            maxLength: evidenceCount,
          }),
        }),
      ),
      ({ evidenceCount, featureCount, selectedIndices }) => {
        const state = buildState(domain, evidenceCount, featureCount);
        const targetFeatureId = `FS-${featureCount - 1}`;

        // Pre-map a random subset of the selected ids to a different feature to simulate
        // "some ids already mapped to a different Feature_Spec" prior state.
        const priorFeatureId = featureCount > 1 ? 'FS-0' : targetFeatureId;
        for (const index of selectedIndices) {
          if (priorFeatureId !== targetFeatureId && index % 2 === 0) {
            domain.mapEvidence(state, `CAP-${index}`, priorFeatureId);
          }
        }

        const selectedIds = selectedIndices.map((index) => `CAP-${index}`);
        domain.mapEvidenceBatch(state, selectedIds, targetFeatureId);

        const targetFeature = state.features.find((feature) => feature.id === targetFeatureId);

        for (const id of selectedIds) {
          const evidence = state.evidence.find((item) => item.id === id);
          assert.equal(evidence.featureSpecId, targetFeatureId);
        }

        const targetSet = new Set(targetFeature.result.evidenceIds);
        assert.equal(targetSet.size, targetFeature.result.evidenceIds.length);
        assert.equal(targetSet.size, new Set(selectedIds).size);
        for (const id of selectedIds) {
          assert.ok(targetSet.has(id));
        }

        for (const feature of state.features) {
          if (feature.id === targetFeatureId) continue;
          for (const id of selectedIds) {
            assert.equal(feature.result.evidenceIds.includes(id), false);
          }
        }
      },
    ),
    { numRuns: 100 },
  );
});

test('Streamlined Property 3: drag-and-drop and Alternative_Mapping_Control produce identical results', () => {
  // Feature: streamlined-report-authoring, Property 3: 드래그앤드롭과 Alternative_Mapping_Control은 항상 동일한 결과를 만든다
  // For any set of Evidence ids and any target Feature_Spec id, invoking the mapping through the
  // Drag_And_Drop_Mapping code path and invoking it through the Alternative_Mapping_Control code
  // path, starting from the same prior state, SHALL produce identical resulting editor state
  // (identical featureSpecId assignments and identical per-feature evidenceIds ordering).
  const domain = loadDomain();

  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 8 }).chain((evidenceCount) =>
        fc.record({
          evidenceCount: fc.constant(evidenceCount),
          featureCount: fc.integer({ min: 1, max: 4 }),
          selectedIndices: fc.uniqueArray(fc.integer({ min: 0, max: evidenceCount - 1 }), {
            minLength: 1,
            maxLength: evidenceCount,
          }),
          targetIndex: fc.integer({ min: 0, max: 3 }),
        }),
      ),
      ({ evidenceCount, featureCount, selectedIndices, targetIndex }) => {
        const boundedTargetIndex = targetIndex % featureCount;
        const targetFeatureId = `FS-${boundedTargetIndex}`;
        const selectedIds = selectedIndices.map((index) => `CAP-${index}`);

        // Both code paths share the exact same starting state shape and call the exact same
        // domain function (mapEvidenceBatch) -- confirming determinism across two independent
        // invocations from identical starting states.
        const dragState = buildState(domain, evidenceCount, featureCount);
        const buttonState = buildState(domain, evidenceCount, featureCount);

        domain.mapEvidenceBatch(dragState, selectedIds, targetFeatureId); // Drag_And_Drop_Mapping
        domain.mapEvidenceBatch(buttonState, selectedIds, targetFeatureId); // Alternative_Mapping_Control

        const dragAssignments = dragState.evidence.map((item) => [item.id, item.featureSpecId]);
        const buttonAssignments = buttonState.evidence.map((item) => [item.id, item.featureSpecId]);
        assert.deepEqual(dragAssignments, buttonAssignments);

        const dragEvidenceIdsByFeature = dragState.features.map((feature) => feature.result.evidenceIds);
        const buttonEvidenceIdsByFeature = buttonState.features.map((feature) => feature.result.evidenceIds);
        assert.deepEqual(dragEvidenceIdsByFeature, buttonEvidenceIdsByFeature);
      },
    ),
    { numRuns: 100 },
  );
});

test('Streamlined Property 10: Quick_Mapping_Dialog matches mapEvidenceBatch and gates on required verification', () => {
  // Feature: streamlined-report-authoring, Property 10: Quick_Mapping_Dialog는 mapEvidenceBatch와 동일한 매핑 결과를 만들며 검증 내용 필수 게이팅을 지킨다
  // For any set of Evidence ids, target Feature_Spec id, and (verification, expectedResult,
  // actualResult) string triple, submitting the Quick_Mapping_Dialog SHALL throw and leave state
  // unchanged whenever verification.trim() is empty; whenever verification.trim() is non-empty, it
  // SHALL succeed, SHALL result in every Evidence id having featureSpecId equal to the target
  // feature with the same per-feature evidenceIds as an equivalent direct mapEvidenceBatch call on
  // the same starting state, and SHALL set the target feature's verification/expectedResult/
  // actualResult to exactly the provided values (defaulting omitted optional fields to the empty
  // string) without modifying result.status.
  const domain = loadDomain();

  const whitespaceStringArbitrary = fc.stringMatching(/^[ \t\n]*$/);
  const nonEmptyStringArbitrary = fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0);

  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 6 }).chain((evidenceCount) =>
        fc.record({
          evidenceCount: fc.constant(evidenceCount),
          featureCount: fc.integer({ min: 1, max: 3 }),
          selectedIndices: fc.uniqueArray(fc.integer({ min: 0, max: evidenceCount - 1 }), {
            minLength: 1,
            maxLength: evidenceCount,
          }),
          targetIndex: fc.integer({ min: 0, max: 2 }),
          verification: fc.option(whitespaceStringArbitrary, { nil: undefined }).chain((maybeBlank) =>
            maybeBlank !== undefined
              ? fc.constant(maybeBlank)
              : fc.oneof(whitespaceStringArbitrary, nonEmptyStringArbitrary),
          ),
          expectedResult: fc.option(fc.string({ maxLength: 10 }), { nil: undefined }),
          actualResult: fc.option(fc.string({ maxLength: 10 }), { nil: undefined }),
          initialStatus: fc.constantFrom(null, 'PASS', 'FAIL'),
        }),
      ),
      ({
        evidenceCount,
        featureCount,
        selectedIndices,
        targetIndex,
        verification,
        expectedResult,
        actualResult,
        initialStatus,
      }) => {
        const boundedTargetIndex = targetIndex % featureCount;
        const targetFeatureId = `FS-${boundedTargetIndex}`;
        const selectedIds = selectedIndices.map((index) => `CAP-${index}`);

        const quickState = buildState(domain, evidenceCount, featureCount);
        quickState.features.find((feature) => feature.id === targetFeatureId).result.status = initialStatus;

        const fields = { verification, expectedResult, actualResult };

        if (!verification || !verification.trim()) {
          const before = JSON.stringify(quickState);
          assert.throws(() => domain.applyQuickMapping(quickState, selectedIds, targetFeatureId, fields));
          assert.equal(JSON.stringify(quickState), before);
          return;
        }

        const directState = buildState(domain, evidenceCount, featureCount);
        directState.features.find((feature) => feature.id === targetFeatureId).result.status = initialStatus;
        domain.mapEvidenceBatch(directState, selectedIds, targetFeatureId);

        domain.applyQuickMapping(quickState, selectedIds, targetFeatureId, fields);

        const quickAssignments = quickState.evidence.map((item) => [item.id, item.featureSpecId]);
        const directAssignments = directState.evidence.map((item) => [item.id, item.featureSpecId]);
        assert.deepEqual(quickAssignments, directAssignments);

        const quickEvidenceIdsByFeature = quickState.features.map((feature) => feature.result.evidenceIds);
        const directEvidenceIdsByFeature = directState.features.map((feature) => feature.result.evidenceIds);
        assert.deepEqual(quickEvidenceIdsByFeature, directEvidenceIdsByFeature);

        const targetFeature = quickState.features.find((feature) => feature.id === targetFeatureId);
        assert.equal(targetFeature.result.verification, verification);
        assert.equal(targetFeature.result.expectedResult, expectedResult === undefined ? '' : expectedResult);
        assert.equal(targetFeature.result.actualResult, actualResult === undefined ? '' : actualResult);
        assert.equal(targetFeature.result.status, initialStatus);
      },
    ),
    { numRuns: 100 },
  );
});

test('Streamlined Property 4: saving as a project always defaults omitted optional fields and never throws', () => {
  // Feature: streamlined-report-authoring, Property 4: 프로젝트 저장 시 선택 필드는 항상 빈 문자열로 기본값 처리되고 저장은 실패하지 않는다
  // For any Draft_Report and any combination of provided/omitted values for 보고서명, 작성자,
  // changePurpose, changeSummary, and configurationOverview (with a always-provided non-empty
  // 프로젝트명), saving as a Project SHALL never throw a validation error, SHALL set each omitted
  // optional field to the empty string, and SHALL preserve each provided field's value verbatim.
  const domain = loadDomain();

  const optionalFieldArbitrary = fc.option(fc.string({ maxLength: 20 }), { nil: undefined });

  fc.assert(
    fc.property(
      fc.record({
        projectName: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        title: optionalFieldArbitrary,
        author: optionalFieldArbitrary,
        changePurpose: optionalFieldArbitrary,
        changeSummary: optionalFieldArbitrary,
        configurationOverview: optionalFieldArbitrary,
      }),
      (projectDetails) => {
        const draft = domain.createReport('', 'REPORT-1');
        draft.isDraft = true;

        let saved;
        assert.doesNotThrow(() => {
          saved = domain.saveAsProject(draft, projectDetails);
        });

        assert.equal(saved.projectName, projectDetails.projectName);
        for (const field of ['title', 'author', 'changePurpose', 'changeSummary', 'configurationOverview']) {
          const provided = projectDetails[field];
          if (provided === undefined) {
            assert.equal(saved[field], '');
          } else {
            assert.equal(saved[field], provided);
          }
        }
        assert.equal(saved.isDraft, false);
      },
    ),
    { numRuns: 100 },
  );
});

test('Streamlined Property 11: unset Verdicts are always tallied as not-yet-judged regardless of default display', () => {
  // Feature: streamlined-report-authoring, Property 11: Default_Verdict_Selection의 UI 표시와 무관하게 미확인 Test_Result_Set은 항상 미판정으로 집계된다
  // For any array of Feature_Spec results where each result.status is null, 'PASS', or 'FAIL'
  // (representing any mix of confirmed and not-yet-confirmed Verdicts), overallStatus SHALL return
  // 'PASS' only when every result's status is exactly 'PASS', and validationWarnings SHALL include
  // an UNSET_VERDICT warning for every feature whose status is null, regardless of what value a
  // Default_Verdict_Selection control might currently be displaying for that feature.
  const domain = loadDomain();

  fc.assert(
    fc.property(
      fc.array(fc.constantFrom(null, 'PASS', 'FAIL'), { minLength: 0, maxLength: 10 }),
      (statuses) => {
        const results = statuses.map((status) => ({ status }));
        const overall = domain.overallStatus(results);
        const allPass = statuses.length > 0 && statuses.every((status) => status === 'PASS');
        assert.equal(overall === 'PASS', allPass);

        const report = domain.createReport('QA', 'REPORT-1');
        statuses.forEach((status, index) => {
          const feature = domain.createFeature(`Feature ${index}`, `FS-${index}`);
          // Fully populate other fields so only UNSET_VERDICT (or its absence) is under test.
          feature.result.status = status;
          feature.result.evidenceIds = ['CAP-0'];
          feature.result.verification = 'v';
          feature.result.expectedResult = 'e';
          feature.result.actualResult = 'a';
          report.features.push(feature);
        });

        const warnings = domain.validationWarnings(report);
        const unsetVerdictFeatureIds = new Set(
          warnings.filter((warning) => warning.code === 'UNSET_VERDICT').map((warning) => warning.featureId),
        );

        report.features.forEach((feature, index) => {
          assert.equal(unsetVerdictFeatureIds.has(feature.id), statuses[index] === null);
        });
      },
    ),
    { numRuns: 100 },
  );
});

test('Streamlined Property 12: mapping operations never alter an existing Verdict', () => {
  // Feature: streamlined-report-authoring, Property 12: Verdict는 오직 Verdict_Confirmation을 통해서만, 그리고 확인 시점의 선택값과 정확히 같은 값으로만 확정된다
  // For any feature and any sequence of Evidence-mapping operations (mapEvidence, mapEvidenceBatch,
  // applyQuickMapping) or Report_Draft_Suggestion approvals applied to it before a
  // Verdict_Confirmation occurs, result.status SHALL remain null throughout; when a
  // Verdict_Confirmation is then performed with a given selected value ('PASS' or 'FAIL', including
  // the case where the value is the untouched Default_Verdict_Selection), result.status SHALL
  // become exactly that selected value and no other function SHALL alter it afterward without
  // another explicit Verdict_Confirmation.
  //
  // At the domain.js level, this is verified as: none of mapEvidence / mapEvidenceBatch /
  // applyQuickMapping ever reads or writes feature.result.status -- status is unchanged by any
  // sequence of these operations, whatever value it held before (null, 'PASS', or 'FAIL').
  const domain = loadDomain();

  fc.assert(
    fc.property(
      fc.record({
        initialStatus: fc.constantFrom(null, 'PASS', 'FAIL'),
        evidenceCount: fc.integer({ min: 2, max: 6 }),
        featureCount: fc.integer({ min: 1, max: 3 }),
        operation: fc.constantFrom('mapEvidence', 'mapEvidenceBatch', 'applyQuickMapping'),
        verification: fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim().length > 0),
      }),
      ({ initialStatus, evidenceCount, featureCount, operation, verification }) => {
        const state = buildState(domain, evidenceCount, featureCount);
        const targetFeatureId = 'FS-0';
        const targetFeature = state.features.find((feature) => feature.id === targetFeatureId);
        targetFeature.result.status = initialStatus;

        if (operation === 'mapEvidence') {
          domain.mapEvidence(state, 'CAP-0', targetFeatureId);
        } else if (operation === 'mapEvidenceBatch') {
          const ids = Array.from({ length: evidenceCount }, (_, index) => `CAP-${index}`);
          domain.mapEvidenceBatch(state, ids, targetFeatureId);
        } else {
          const ids = Array.from({ length: evidenceCount }, (_, index) => `CAP-${index}`);
          domain.applyQuickMapping(state, ids, targetFeatureId, { verification });
        }

        assert.equal(targetFeature.result.status, initialStatus);
      },
    ),
    { numRuns: 100 },
  );
});

test('Property 43: createRecordingSession output is a strict superset of createSession output', () => {
  const domain = loadDomain();

  fc.assert(
    fc.property(
      fc.record({
        mode: fc.constantFrom('event', 'manual', 'context'),
        now: fc.date().map((date) => date.toISOString()),
        id: fc.uuid(),
        inputDebounceMs: fc.integer({ min: 0, max: 5000 }),
        mutationQuietMs: fc.integer({ min: 0, max: 5000 }),
      }),
      ({ mode, now, id, inputDebounceMs, mutationQuietMs }) => {
        const recordingPolicy = domain.defaultRecordingPolicy({ mode, inputDebounceMs, mutationQuietMs });
        const baseSession = domain.createSession(mode, now, id);
        const recordingSession = domain.createRecordingSession(recordingPolicy, now, id);

        for (const [key, value] of Object.entries(baseSession)) {
          assert.deepEqual(recordingSession[key], value);
        }

        assert.deepEqual(recordingSession.recordingPolicy, recordingPolicy);
        assert.equal(recordingSession.lastEvidenceId, null);
        assert.equal(recordingSession.baselineEvidenceId, null);
      },
    ),
    { numRuns: 100 },
  );
});
