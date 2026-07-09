const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fc = require('fast-check');

const modulePath = path.resolve(__dirname, '../extension/shared/report.js');

function loadReport() {
  assert.equal(fs.existsSync(modulePath), true, 'report module should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

// Safe alphabet with no HTML/Markdown special characters so raw string
// comparisons against escaped output remain valid without re-implementing
// escapeHtml/escapeMarkdown in the test.
const safeChar = fc.constantFrom('a', 'b', 'c', '1', '2', '가', '나', '다', ' ');
const nonEmptySafeString = fc
  .array(safeChar, { minLength: 1, maxLength: 12 })
  .map((chars) => chars.join(''));
const emptyOrNonEmptySafeString = fc.oneof(fc.constant(''), nonEmptySafeString);

function baseReportFields(overrides) {
  return {
    id: 'REPORT-1',
    title: '',
    projectName: '',
    author: '',
    changePurpose: '',
    changeSummary: '',
    configurationOverview: '',
    features: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T01:00:00.000Z',
    ...overrides,
  };
}

// Feature: streamlined-report-authoring, Property 5: manifest 생성은 식별 정보의 존재 여부와 무관하게 항상 성공하고 6개 필드를 모두 포함한다
// For any QA_Report with any combination of empty-string and non-empty values for title, projectName, author,
// changePurpose, changeSummary, and configurationOverview, buildManifest SHALL complete without throwing and its
// report object SHALL contain all six fields with defined (non-undefined) values, and renderHtml/renderMarkdown
// applied to that manifest SHALL also complete without throwing.
// Validates: Requirements 7.1, 7.2, 4.1, 4.2
test('Report Property 5: manifest generation always succeeds and includes all six identification fields', () => {
  const { buildManifest, renderHtml, renderMarkdown } = loadReport();

  fc.assert(
    fc.property(
      emptyOrNonEmptySafeString,
      emptyOrNonEmptySafeString,
      emptyOrNonEmptySafeString,
      emptyOrNonEmptySafeString,
      emptyOrNonEmptySafeString,
      emptyOrNonEmptySafeString,
      (title, projectName, author, changePurpose, changeSummary, configurationOverview) => {
        const report = baseReportFields({
          title,
          projectName,
          author,
          changePurpose,
          changeSummary,
          configurationOverview,
        });

        const manifest = buildManifest(report, []);

        const sixFields = ['title', 'projectName', 'author', 'changePurpose', 'changeSummary', 'configurationOverview'];
        for (const field of sixFields) {
          assert.equal(field in manifest.report, true);
          assert.equal(manifest.report[field] === undefined, false);
          assert.equal(typeof manifest.report[field], 'string');
        }

        assert.doesNotThrow(() => renderHtml(manifest));
        assert.doesNotThrow(() => renderMarkdown(manifest));
      },
    ),
    { numRuns: 100 },
  );
});

// Feature: streamlined-report-authoring, Property 6: 변경 개요 섹션의 존재와 내용은 HTML과 Markdown 사이에 항상 일치한다
// For any combination of empty-string or non-empty values for changePurpose, changeSummary, and
// configurationOverview, the 변경 개요 섹션 SHALL appear in the rendered HTML if and only if it appears in the
// rendered Markdown, if and only if at least one of the three fields is non-empty; and when present, both outputs
// SHALL contain exactly the non-empty fields' labels and values and none of the empty fields.
// Validates: Requirements 7.3, 7.4, 7.5
test('Report Property 6: overview section presence and content always match between HTML and Markdown', () => {
  const { buildManifest, renderHtml, renderMarkdown } = loadReport();

  fc.assert(
    fc.property(
      emptyOrNonEmptySafeString,
      emptyOrNonEmptySafeString,
      emptyOrNonEmptySafeString,
      (changePurpose, changeSummary, configurationOverview) => {
        const report = baseReportFields({
          title: '보고서',
          projectName: '프로젝트',
          author: '작성자',
          changePurpose,
          changeSummary,
          configurationOverview,
        });

        const manifest = buildManifest(report, []);
        const html = renderHtml(manifest);
        const markdown = renderMarkdown(manifest);

        const hasHtmlSection = html.includes('<section class="overview">');
        const hasMdSection = markdown.includes('## 변경 개요');
        const anyNonEmpty = Boolean(changePurpose || changeSummary || configurationOverview);

        assert.equal(hasHtmlSection, anyNonEmpty);
        assert.equal(hasMdSection, anyNonEmpty);

        const fields = [
          ['변경 목적', changePurpose],
          ['수정 내용 요약', changeSummary],
          ['형상·체크아웃 개요', configurationOverview],
        ];

        for (const [label, value] of fields) {
          if (value) {
            assert.equal(html.includes(label), true);
            assert.equal(html.includes(value), true);
            assert.equal(markdown.includes(label), true);
            assert.equal(markdown.includes(value), true);
          } else {
            assert.equal(html.includes(label), false);
            assert.equal(markdown.includes(label), false);
          }
        }
      },
    ),
    { numRuns: 100 },
  );
});

const evidenceFlags = fc.record({
  hasSessionId: fc.boolean(),
  hasSource: fc.boolean(),
  hasDescription: fc.boolean(),
  hasPrev: fc.boolean(),
  hasNext: fc.boolean(),
  hasContext: fc.boolean(),
  hasPageTitle: fc.boolean(),
  hasPageUrl: fc.boolean(),
  hasRoute: fc.boolean(),
  hasViewport: fc.boolean(),
  hasScroll: fc.boolean(),
  hasTarget: fc.boolean(),
  hasSurrounding: fc.boolean(),
  hasVisibleText: fc.boolean(),
});

function buildEvidenceFromFlags(flags, index) {
  const context = flags.hasContext
    ? {
        ...(flags.hasPageTitle ? { pageTitle: 'PT' } : {}),
        ...(flags.hasPageUrl ? { pageUrl: 'https://internal/x' } : {}),
        ...(flags.hasRoute ? { route: '/r' } : {}),
        ...(flags.hasViewport ? { viewport: { width: 100, height: 200 } } : {}),
        ...(flags.hasScroll ? { scroll: { x: 1, y: 2 } } : {}),
        ...(flags.hasTarget ? { target: { tag: 'div' } } : {}),
        ...(flags.hasSurrounding ? { surroundingContext: { text: 's' } } : {}),
        ...(flags.hasVisibleText ? { visibleText: 'vt' } : {}),
      }
    : undefined;

  return {
    id: `EV-${index}`,
    sessionId: flags.hasSessionId ? 'SESSION-1' : undefined,
    sequenceNo: index + 1,
    triggerType: 'click',
    capturedAt: '2026-01-01T00:00:00.000Z',
    imageDataUrl: 'data:image/png;base64,AAAA',
    source: flags.hasSource ? 'web-capture' : undefined,
    description: flags.hasDescription ? 'desc' : undefined,
    previousCaptureId: flags.hasPrev ? 'EV-prev' : undefined,
    nextCaptureId: flags.hasNext ? 'EV-next' : undefined,
    context,
  };
}

// Feature: streamlined-report-authoring, Property 7: Evidence 필드는 매핑 경로와 무관하게 manifest에서 항상 보존된다
// For any array of Evidence items with any combination of present/absent optional sub-fields (description, source,
// previousCaptureId, nextCaptureId, and context sub-fields), regardless of whether their featureSpecId was set via
// single mapping, batch mapping, or Capture_Session_Set-level mapping, buildManifest's per-evidence output SHALL
// always include the id, sessionId, sequenceNo, triggerType, capturedAt, source, description, previousCaptureId,
// nextCaptureId, file, and context sub-fields, defaulting any missing optional value rather than omitting the key.
// Validates: Requirements 7.6
test('Report Property 7: evidence fields are always preserved in manifest output regardless of optional sub-field presence', () => {
  const { buildManifest } = loadReport();

  fc.assert(
    fc.property(fc.array(evidenceFlags, { minLength: 1, maxLength: 5 }), (flagsArray) => {
      const evidence = flagsArray.map((flags, index) => buildEvidenceFromFlags(flags, index));

      const report = baseReportFields({
        title: '보고서',
        projectName: '프로젝트',
        author: '작성자',
        features: [
          {
            id: 'FS-1',
            title: 'Feature',
            description: '',
            result: {
              id: 'RES-1',
              verification: '',
              expectedResult: '',
              actualResult: '',
              status: null,
              evidenceIds: evidence.map((item) => item.id),
            },
          },
        ],
      });

      const manifest = buildManifest(report, evidence);
      const outputEvidence = manifest.features[0].result.evidence;

      assert.equal(outputEvidence.length, evidence.length);

      const requiredKeys = [
        'captureId',
        'sessionId',
        'sequenceNo',
        'triggerType',
        'capturedAt',
        'source',
        'description',
        'previousCaptureId',
        'nextCaptureId',
        'file',
        'pageTitle',
        'pageUrl',
        'route',
        'viewport',
        'scroll',
        'target',
        'surroundingContext',
        'visibleText',
      ];

      for (const item of outputEvidence) {
        for (const key of requiredKeys) {
          assert.equal(key in item, true, `expected key ${key} to be present`);
          assert.equal(item[key] === undefined, false, `expected key ${key} to be defined`);
        }
      }
    }),
    { numRuns: 100 },
  );
});

// Feature: streamlined-report-authoring, Property 8: 보고서명이 비면 세 산출물 모두 동일한 기본 보고서명을 일관되게 표시한다
// For any QA_Report where title is either the empty string or a random non-empty string, the manifest.json title
// field, the rendered HTML title/heading, and the rendered Markdown H1 SHALL all display the same fixed 기본
// 보고서명 string when title is empty, and SHALL all display the exact provided title when it is non-empty.
// Validates: Requirements 7.7
test('Report Property 8: empty title consistently falls back to the same default report title across all three outputs', () => {
  const { buildManifest, renderHtml, renderMarkdown, DEFAULT_REPORT_TITLE } = loadReport();

  fc.assert(
    fc.property(emptyOrNonEmptySafeString, (title) => {
      const report = baseReportFields({
        title,
        projectName: '프로젝트',
        author: '작성자',
      });

      const manifest = buildManifest(report, []);
      const html = renderHtml(manifest);
      const markdown = renderMarkdown(manifest);

      const expectedTitle = title || DEFAULT_REPORT_TITLE;

      assert.equal(manifest.report.title, expectedTitle);
      assert.equal(html.includes(`<title>${expectedTitle}</title>`), true);
      assert.equal(html.includes(`<h1>${expectedTitle}</h1>`), true);

      const firstLine = markdown.split('\n')[0];
      assert.equal(firstLine, `# ${expectedTitle}`);
    }),
    { numRuns: 100 },
  );
});

// Feature: streamlined-report-authoring, Property 9: 작성자가 비면 플레이스홀더 없이 항상 빈 값으로 렌더링된다
// For any QA_Report where author is either the empty string or a random non-empty string, the rendered HTML and
// Markdown author display areas SHALL contain exactly the raw author value with no placeholder text substituted
// when it is empty, for every generated case.
// Validates: Requirements 7.8
test('Report Property 9: empty author renders with no placeholder text in either HTML or Markdown', () => {
  const { buildManifest, renderHtml, renderMarkdown } = loadReport();
  const projectName = '프로젝트';

  fc.assert(
    fc.property(emptyOrNonEmptySafeString, (author) => {
      const report = baseReportFields({
        title: '보고서',
        projectName,
        author,
      });

      const manifest = buildManifest(report, []);
      const html = renderHtml(manifest);
      const markdown = renderMarkdown(manifest);

      if (author) {
        assert.equal(html.includes(`<p>${projectName} · ${author}</p>`), true);
      } else {
        assert.equal(html.includes(`<p>${projectName}</p>`), true);
        assert.equal(html.includes(`${projectName} · `), false);
      }

      assert.equal(markdown.includes(`- 작성자: ${author}\n`), true);
    }),
    { numRuns: 100 },
  );
});
