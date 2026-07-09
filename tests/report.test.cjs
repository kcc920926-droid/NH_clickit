const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '../extension/shared/report.js');

function loadReport() {
  assert.equal(fs.existsSync(modulePath), true, 'report module should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

function sampleInput() {
  return {
    report: {
      id: 'REPORT-1',
      title: '<script>alert(1)</script> 주문 QA',
      projectName: 'CaptureIT',
      author: 'Tester',
      changePurpose: '주문 승인 검증',
      changeSummary: '승인 버튼과 상태 배지를 변경함',
      configurationOverview: 'release/2026-07 체크아웃',
      createdAt: '2026-07-06T00:00:00.000Z',
      updatedAt: '2026-07-06T01:00:00.000Z',
      features: [{
        id: 'FS-001',
        title: '주문 승인',
        description: '주문 상태 변경',
        result: {
          verification: '승인 버튼 클릭',
          expectedResult: '승인 완료 표시',
          actualResult: '승인 완료 표시됨',
          status: 'PASS',
          evidenceIds: ['CAP-2', 'CAP-1'],
        },
      }],
    },
    evidence: [
      {
        id: 'CAP-1',
        sessionId: 'SESSION-1',
        sequenceNo: 1,
        triggerType: 'click',
        capturedAt: '2026-07-06T00:00:00.000Z',
        imageDataUrl: 'data:image/png;base64,AAAA',
        previousCaptureId: null,
        nextCaptureId: 'CAP-2',
        source: 'web-capture',
        description: '승인 전',
        context: { pageTitle: '주문 목록', pageUrl: 'https://internal/orders', viewport: { width: 1440, height: 900 }, visibleText: '주문 승인' },
      },
      {
        id: 'CAP-2',
        sessionId: 'SESSION-1',
        sequenceNo: 2,
        triggerType: 'route-change',
        capturedAt: '2026-07-06T00:00:01.000Z',
        imageDataUrl: 'data:image/png;base64,BBBB',
        previousCaptureId: 'CAP-1',
        nextCaptureId: null,
        source: 'web-capture',
        context: { pageTitle: '주문 상세', pageUrl: 'https://internal/orders/1' },
      },
    ],
  };
}

test('HTML and Markdown preserve the same user-selected evidence order', () => {
  const report = loadReport();
  const input = sampleInput();
  const manifest = report.buildManifest(input.report, input.evidence);
  const html = report.renderHtml(manifest);
  const markdown = report.renderMarkdown(manifest);

  assert.deepEqual(manifest.features[0].result.evidence.map((item) => item.captureId), ['CAP-2', 'CAP-1']);
  assert.match(html, /assets\/FS-001-001\.png/);
  assert.match(html, /assets\/FS-001-002\.png/);
  assert.match(markdown, /assets\/FS-001-001\.png/);
  assert.match(markdown, /assets\/FS-001-002\.png/);
  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.equal(html.includes('<script'), false);
  assert.match(html, /변경 개요/);
  assert.match(html, /승인 버튼과 상태 배지를 변경함/);
  assert.match(html, /결과 목록/);
  assert.match(markdown, /release\/2026\\\-07 체크아웃/);
});

test('manifest retains capture sequence, trigger, and page context', () => {
  const report = loadReport();
  const input = sampleInput();
  const manifest = report.buildManifest(input.report, input.evidence);
  const first = manifest.features[0].result.evidence[0];

  assert.equal(manifest.overallStatus, 'PASS');
  assert.equal(first.sequenceNo, 2);
  assert.equal(first.triggerType, 'route-change');
  assert.equal(first.sessionId, 'SESSION-1');
  assert.equal(first.previousCaptureId, 'CAP-1');
  assert.equal(first.pageTitle, '주문 상세');
  assert.equal(first.pageUrl, 'https://internal/orders/1');
});

test('overview section is omitted when changePurpose/changeSummary/configurationOverview are all empty', () => {
  const report = loadReport();
  const input = sampleInput();
  const emptyOverviewReport = {
    ...input.report,
    changePurpose: '',
    changeSummary: '',
    configurationOverview: '',
  };
  const manifest = report.buildManifest(emptyOverviewReport, input.evidence);
  const html = report.renderHtml(manifest);
  const markdown = report.renderMarkdown(manifest);

  assert.equal(html.includes('<section class="overview">'), false);
  assert.equal(markdown.includes('## 변경 개요'), false);
});
