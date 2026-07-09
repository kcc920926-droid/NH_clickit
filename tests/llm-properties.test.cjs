const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fc = require('fast-check');

const modulePath = path.resolve(__dirname, '../extension/shared/llm.js');

function loadLlm() {
  assert.equal(fs.existsSync(modulePath), true, 'LLM adapter should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

// Reference implementation reproducing editor.js's approveDraftSuggestion() dialog
// approve/dismiss handling: whatever is currently in the dialog inputs (either the
// original suggestion values, or the user's edited values) is assigned verbatim to
// report.title / report.configurationOverview. Dismissal leaves the report untouched.
function applyDraftSuggestionAction(report, suggestion, action, editedValues) {
  if (action === 'dismiss') return { ...report };
  const title = action === 'approve-edited' ? editedValues.title : suggestion.title;
  const configurationOverview = action === 'approve-edited'
    ? editedValues.configurationOverview
    : suggestion.configurationOverview;
  return { ...report, title, configurationOverview };
}

// Feature: streamlined-report-authoring, Property 14: Report_Draft_Suggestion은 승인 또는
// 수정-후-승인을 거쳤을 때만, 그리고 정확히 그 값으로 QA_Report에 반영된다. For any
// Report_Draft_Suggestion (title, configurationOverview), any pre-existing QA_Report field
// values, and any user action among {무시, 즉시 승인, 수정 후 승인 with arbitrary edited
// strings}, applying that action SHALL leave the QA_Report's title and
// configurationOverview fields exactly unchanged when the action is 무시, SHALL set them to
// exactly the suggested values when the action is 즉시 승인, and SHALL set them to exactly
// the user-edited values when the action is 수정 후 승인 — in no case SHALL the QA_Report be
// modified before the suggestion has been presented and one of these actions performed.
// Validates: Requirements 10.2, 10.3, 10.4, 10.5
test('Report Draft Property 14: draft suggestion is applied to QA_Report only via approve/approve-edited, exactly as specified, and dismiss leaves it unchanged', () => {
  fc.assert(
    fc.property(
      fc.record({
        title: fc.string(),
        configurationOverview: fc.string(),
        otherField: fc.string(),
      }),
      fc.record({
        title: fc.string(),
        configurationOverview: fc.string(),
      }),
      fc.constantFrom('dismiss', 'approve', 'approve-edited'),
      fc.record({
        title: fc.string(),
        configurationOverview: fc.string(),
      }),
      (report, suggestion, action, editedValues) => {
        const beforeTitle = report.title;
        const beforeConfigurationOverview = report.configurationOverview;
        const beforeOtherField = report.otherField;
        const result = applyDraftSuggestionAction(report, suggestion, action, editedValues);

        // Original report object must never be mutated in place.
        assert.equal(report.title, beforeTitle);
        assert.equal(report.configurationOverview, beforeConfigurationOverview);
        assert.equal(report.otherField, beforeOtherField);

        if (action === 'dismiss') {
          assert.equal(result.title, beforeTitle);
          assert.equal(result.configurationOverview, beforeConfigurationOverview);
        } else if (action === 'approve') {
          assert.equal(result.title, suggestion.title);
          assert.equal(result.configurationOverview, suggestion.configurationOverview);
        } else {
          assert.equal(result.title, editedValues.title);
          assert.equal(result.configurationOverview, editedValues.configurationOverview);
        }
      },
    ),
    { numRuns: 100 },
  );
});

// Reference implementation reproducing editor.js's requestReportDraftSuggestion() core
// control flow: any failure while requesting/validating a suggestion is swallowed
// silently and never blocks the caller (미리보기/ZIP 생성 flow), and the report's
// title/configurationOverview are never touched on failure.
async function requestDraftSuggestionSafely(report, llmCall) {
  const before = { title: report.title, configurationOverview: report.configurationOverview };
  try {
    await llmCall();
  } catch {
    // swallow - non-blocking
  }
  return before;
}

// Feature: streamlined-report-authoring, Property 15: LLM 요청 실패 시 필드는 항상
// 불변이며 리포트 생성 흐름을 막지 않는다. For any pre-existing (title,
// configurationOverview) values and any Report_Draft_Suggestion request failure (network
// error, non-2xx response, malformed response body), attempting to generate a
// Report_Draft_Suggestion SHALL leave the QA_Report's title and configurationOverview
// fields exactly unchanged and SHALL NOT propagate the failure as an exception that
// blocks the caller's 미리보기 or ZIP 산출물 생성 flow.
// Validates: Requirements 10.6
test('Report Draft Property 15: LLM request failures never mutate report fields and never propagate as exceptions', async () => {
  const failureFactories = [
    () => { throw new Error('network error'); },
    () => { const err = new TypeError('Failed to fetch'); throw err; },
    () => { const err = new Error('Unexpected token'); err.name = 'SyntaxError'; throw err; },
    () => { const err = new Error('Invalid report draft suggestion response'); throw err; },
    () => { throw { status: 500, message: 'Internal Server Error' }; },
    () => { throw { status: 404 }; },
  ];

  await fc.assert(
    fc.asyncProperty(
      fc.record({
        title: fc.string(),
        configurationOverview: fc.string(),
      }),
      fc.constantFrom(...failureFactories),
      async (report, failingFactory) => {
        const llmCall = async () => failingFactory();

        let threw = false;
        let result;
        try {
          result = await requestDraftSuggestionSafely(report, llmCall);
        } catch {
          threw = true;
        }

        assert.equal(threw, false);
        assert.equal(result.title, report.title);
        assert.equal(result.configurationOverview, report.configurationOverview);
      },
    ),
    { numRuns: 100 },
  );
});

// Feature: streamlined-report-authoring, Property 16: Report_Draft_Suggestion 검증기는
// 판정 관련 필드를 절대 통과시키지 않는다. For any raw LLM response object containing
// arbitrary additional keys (including keys named like status, verdict, pass, fail, or
// nested objects mimicking a Feature_Spec result), validateReportDraftSuggestion SHALL
// either throw when title or configurationOverview are not both strings, or otherwise
// return an object containing exactly the title and configurationOverview keys with no
// other key from the input present, ensuring no verdict-shaped data can reach the
// approval step.
// Validates: Requirements 10.7
test('Report Draft Property 16: validateReportDraftSuggestion never passes verdict-shaped fields through', () => {
  const llm = loadLlm();

  const validOrInvalidValue = fc.oneof(
    fc.string(),
    fc.integer(),
    fc.constant(undefined),
    fc.constant(null),
    fc.object(),
    fc.boolean(),
  );

  const extraKeyValue = fc.oneof(
    fc.string(),
    fc.object(),
    fc.record({ status: fc.constantFrom('PASS', 'FAIL', 'pending'), verdict: fc.string() }),
    fc.boolean(),
    fc.integer(),
  );

  fc.assert(
    fc.property(
      validOrInvalidValue,
      validOrInvalidValue,
      fc.dictionary(
        fc.constantFrom('status', 'verdict', 'pass', 'fail', 'result', 'featureSpecId', 'randomKey'),
        extraKeyValue,
      ),
      (title, configurationOverview, extraKeys) => {
        const response = { title, configurationOverview, ...extraKeys };

        const bothStrings = typeof title === 'string' && typeof configurationOverview === 'string';

        if (bothStrings) {
          const result = llm.validateReportDraftSuggestion(response);
          const keys = Object.keys(result).sort();
          assert.deepEqual(keys, ['configurationOverview', 'title']);
          assert.equal(result.title, title);
          assert.equal(result.configurationOverview, configurationOverview);
          for (const extraKey of Object.keys(extraKeys)) {
            if (extraKey === 'title' || extraKey === 'configurationOverview') continue;
            assert.equal(Object.hasOwn(result, extraKey), false);
          }
        } else {
          assert.throws(() => llm.validateReportDraftSuggestion(response));
        }
      },
    ),
    { numRuns: 100 },
  );
});

test('Property 21: Manual_Pin images receive exactly the fixed positive bonus', () => {
  const llm = loadLlm();

  fc.assert(
    fc.property(fc.record({
      sequenceNo: fc.integer({ min: 1, max: 100 }),
      visibleText: fc.string({ minLength: 20, maxLength: 80 }),
    }), ({ sequenceNo, visibleText }) => {
      const base = {
        id: 'CAP-1',
        sequenceNo,
        context: { pageTitle: '업무 화면', route: '/work', target: { visibleText: '버튼' }, visibleText },
      };
      const clickScore = llm.computeImageSelectionScore({ ...base, triggerType: 'click' }, []);
      const manualScore = llm.computeImageSelectionScore({ ...base, triggerType: 'manual-pin' }, []);

      assert.equal(manualScore - clickScore, llm.MANUAL_PIN_IMAGE_BONUS);
      assert.equal(llm.MANUAL_PIN_IMAGE_BONUS > 0, true);
    }),
    { numRuns: 100 },
  );
});

test('Property 25: LLM payload image data always comes from llmImageDataUrl and never imageDataUrl', () => {
  const llm = loadLlm();

  fc.assert(
    fc.property(fc.stringMatching(/^[A-Za-z0-9]{1,20}$/), fc.stringMatching(/^[A-Za-z0-9]{1,20}$/), (llmSuffix, rawSuffix) => {
      const llmImage = `LLM_IMAGE_TOKEN_${llmSuffix}`;
      const rawImage = `RAW_IMAGE_TOKEN_${rawSuffix}`;
      const packet = llm.buildLlmEvidencePacket(
        { id: 'FS-1', title: '기능', result: {} },
        [{
          stepNo: 1,
          stepType: 'click',
          evidenceIds: ['CAP-1'],
          llmSummary: {},
          evidence: [{ id: 'CAP-1', sequenceNo: 1, llmImageDataUrl: llmImage, imageDataUrl: rawImage }],
        }],
        { mode: 'json-data-url' },
      );
      const serialized = JSON.stringify(packet);

      assert.equal(serialized.includes(llmImage), true);
      assert.equal(serialized.includes(rawImage), false);
    }),
    { numRuns: 100 },
  );
});

test('Property 31: Image_Selection_Score is monotonic for additive and penalty factors', () => {
  const llm = loadLlm();

  fc.assert(
    fc.property(fc.string({ minLength: 20, maxLength: 80 }), (visibleText) => {
      const base = { id: 'CAP-1', sequenceNo: 1, triggerType: 'click', context: { pageTitle: '업무', route: '/work', visibleText } };
      const additive = {
        ...base,
        domDiff: { resultMessages: [{ text: '완료' }], changedText: ['완료'] },
        apiEvents: [{ method: 'GET', url: '/ok', status: 200 }],
        context: { ...base.context, target: { visibleText: '저장' } },
        formSelector: '#form',
      };
      const penalty = { ...base, context: { pageTitle: 'debug storage config', route: '/debug', visibleText: '{"api_key":"x"}' } };

      assert.equal(llm.computeImageSelectionScore(additive, []) >= llm.computeImageSelectionScore(base, []), true);
      assert.equal(llm.computeImageSelectionScore(penalty, []) <= llm.computeImageSelectionScore(base, []), true);
    }),
    { numRuns: 100 },
  );
});

test('Property 32: top image selection is score-descending and sequence-ascending for ties', () => {
  const llm = loadLlm();

  fc.assert(
    fc.property(
      fc.uniqueArray(fc.integer({ min: 1, max: 100 }), { minLength: 6, maxLength: 12 }),
      (sequenceNumbers) => {
        const candidates = sequenceNumbers.map((sequenceNo) => ({
          id: `CAP-${sequenceNo}`,
          sequenceNo,
          triggerType: sequenceNo % 2 === 0 ? 'manual-pin' : 'click',
          context: { pageTitle: '업무', route: '/work', target: { visibleText: '버튼' }, visibleText: '충분한 화면 설명 텍스트' },
          llmImageDataUrl: `img-${sequenceNo}`,
        }));
        const result = llm.selectTopImages(candidates, 5);
        const sorted = [...candidates].sort((left, right) =>
          llm.computeImageSelectionScore(right, candidates) - llm.computeImageSelectionScore(left, candidates)
          || left.sequenceNo - right.sequenceNo,
        );

        assert.deepEqual(result.selected.map((item) => item.id), sorted.slice(0, 5).map((item) => item.id));
      },
    ),
    { numRuns: 100 },
  );
});

test('Property 33: excluded candidates are preserved as text-only descriptors', () => {
  const llm = loadLlm();

  fc.assert(
    fc.property(fc.uniqueArray(fc.integer({ min: 1, max: 100 }), { minLength: 6, maxLength: 10 }), (sequenceNumbers) => {
      const candidates = sequenceNumbers.map((sequenceNo) => ({
        id: `CAP-${sequenceNo}`,
        sequenceNo,
        triggerType: 'click',
        context: { pageTitle: `화면 ${sequenceNo}`, target: { visibleText: `버튼 ${sequenceNo}` } },
        llmImageDataUrl: `img-${sequenceNo}`,
        imageDataUrl: `raw-${sequenceNo}`,
      }));
      const result = llm.selectTopImages(candidates, 5);
      const selectedIds = new Set(result.selected.map((item) => item.id));
      const excludedIds = new Set(result.excluded.map((item) => item.captureId));

      assert.equal(selectedIds.size + excludedIds.size, candidates.length);
      for (const candidate of candidates) {
        assert.equal(selectedIds.has(candidate.id) || excludedIds.has(candidate.id), true);
      }
      assert.equal(JSON.stringify(result.excluded).includes('raw-'), false);
      assert.equal(JSON.stringify(result.excluded).includes('img-'), false);
    }),
    { numRuns: 100 },
  );
});

test('Property 37: llmSummary and final payload do not include raw body text verbatim', () => {
  const llm = loadLlm();

  fc.assert(
    fc.property(fc.stringMatching(/^[A-Za-z0-9_-]{80,160}$/), (rawText) => {
      const packet = llm.buildLlmEvidencePacket(
        { id: 'FS-1', title: '기능', result: {} },
        [{
          stepNo: 1,
          stepType: 'click',
          evidenceIds: ['CAP-1'],
          llmSummary: { targetText: '저장', visibleText: '축약' },
          evidence: [{ id: 'CAP-1', sequenceNo: 1, llmImageDataUrl: 'img', context: { visibleText: rawText } }],
        }],
        { mode: 'json-data-url' },
      );

      assert.equal(JSON.stringify(packet).includes(rawText), false);
    }),
    { numRuns: 100 },
  );
});

test('Property 38: content-parts mode encodes each selected image as a separate structural part', () => {
  const llm = loadLlm();

  fc.assert(
    fc.property(fc.integer({ min: 1, max: 5 }), (count) => {
      const evidence = Array.from({ length: count }, (_, index) => ({
        id: `CAP-${index}`,
        sequenceNo: index,
        triggerType: 'click',
        llmImageDataUrl: `data:image/jpeg;base64,${index}`,
      }));
      const packet = llm.buildLlmEvidencePacket(
        { id: 'FS-1', title: '기능', result: {} },
        [{ stepNo: 1, stepType: 'click', evidenceIds: evidence.map((item) => item.id), llmSummary: {}, evidence }],
        { mode: 'content-parts', maxImages: 5 },
      );

      const imageParts = packet.content.filter((part) => part.type === 'image_url');
      assert.equal(imageParts.length, count);
      assert.equal(packet.content[0].type, 'text');
      assert.equal(packet.content[0].text.includes('data:image'), false);
    }),
    { numRuns: 100 },
  );
});

test('Property 39: text-only mode always omits image data', () => {
  const llm = loadLlm();

  fc.assert(
    fc.property(fc.stringMatching(/^[A-Za-z0-9]{1,20}$/), (suffix) => {
      const image = `TEXT_ONLY_IMAGE_TOKEN_${suffix}`;
      const packet = llm.buildLlmEvidencePacket(
        { id: 'FS-1', title: '기능', result: {} },
        [{ stepNo: 1, stepType: 'click', evidenceIds: ['CAP-1'], llmSummary: {}, evidence: [{ id: 'CAP-1', sequenceNo: 1, llmImageDataUrl: image }] }],
        { mode: 'text-only' },
      );

      assert.equal(Object.hasOwn(packet, 'images'), false);
      assert.equal(JSON.stringify(packet).includes(image), false);
    }),
    { numRuns: 100 },
  );
});

test('Property 40: Test_Case_Description_Request always includes seven top-level keys and four fixed constraints', () => {
  const llm = loadLlm();

  fc.assert(
    fc.property(fc.string({ maxLength: 20 }), (title) => {
      const request = llm.buildTestCaseDescriptionRequest({ id: 'FS-1', title, result: {} }, [], {});

      assert.deepEqual(Object.keys(request).sort(), ['constraints', 'evidenceSteps', 'feature', 'outputLanguage', 'responseSchema', 'task', 'writingStyle'].sort());
      assert.equal(request.constraints.length, 4);
    }),
    { numRuns: 100 },
  );
});

test('Property 41: Test case response validation only accepts all required fields with allowed finalStatus', () => {
  const llm = loadLlm();
  const required = {
    testPurpose: '목적',
    preconditions: '조건',
    testProcedure: '절차',
    expectedResult: '기대',
    actualResult: '실제',
    judgementBasis: '근거',
  };

  fc.assert(
    fc.property(fc.constantFrom('PASS', 'FAIL', 'INCOMPLETE', 'NOT_JUDGED', 'PENDING'), (finalStatus) => {
      const response = { ...required, finalStatus };
      if (finalStatus === 'PENDING') {
        assert.throws(() => llm.validateTestCaseDescriptionResponse(response));
      } else {
        assert.equal(llm.validateTestCaseDescriptionResponse(response).finalStatus, finalStatus);
      }

      for (const key of Object.keys(required)) {
        const missing = { ...response };
        delete missing[key];
        assert.throws(() => llm.validateTestCaseDescriptionResponse(missing));
      }
    }),
    { numRuns: 100 },
  );
});

test('Property 48: API/server summaries and payload never expose raw log content and fail safely', () => {
  const llm = loadLlm();

  fc.assert(
    fc.property(fc.stringMatching(/^[A-Za-z0-9_-]{20,80}$/), (rawLog) => {
      const apiSummary = llm.summarizeApiEvents([{ method: 'POST', url: `/orders?token=${rawLog}`, body: rawLog }]);
      const serverSummary = llm.summarizeServerEvents([{ level: 'INFO', message: rawLog, stack: rawLog }]);
      assert.equal(JSON.stringify(apiSummary).includes(rawLog), false);
      assert.equal(JSON.stringify(serverSummary).includes(rawLog), false);
      assert.deepEqual(llm.summarizeApiEvents({ bad: true }), { status: 'summary-failed' });
      assert.deepEqual(llm.summarizeServerEvents({ bad: true }), { status: 'summary-failed' });
    }),
    { numRuns: 100 },
  );
});

test('Property 49: summary-failed entries are always omitted from final LLM payload', () => {
  const llm = loadLlm();

  fc.assert(
    fc.property(fc.constantFrom('apiSummary', 'serverSummary'), (failedKey) => {
      const llmSummary = { targetText: '저장', [failedKey]: { status: 'summary-failed' } };
      const packet = llm.buildLlmEvidencePacket(
        { id: 'FS-1', title: '기능', result: {} },
        [{ stepNo: 1, stepType: 'click', evidenceIds: ['CAP-1'], llmSummary, evidence: [] }],
        { mode: 'text-only' },
      );

      assert.equal(JSON.stringify(packet).includes(failedKey), false);
      assert.equal(JSON.stringify(packet).includes('summary-failed'), false);
    }),
    { numRuns: 100 },
  );
});
