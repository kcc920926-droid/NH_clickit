const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cropper = require('../extension/shared/screenshot-cropper.js');
const stepBuilder = require('../extension/shared/evidence-step-builder.js');
const viewer = require('../extension/shared/viewer.js');
const zip = require('../extension/shared/zip.js');
const llm = require('../extension/shared/llm.js');

const editorSource = fs.readFileSync(path.resolve(__dirname, '../extension/editor.js'), 'utf8');

function fakeCanvasFactory(calls) {
  return (width, height) => ({
    width,
    height,
    getContext: () => ({ drawImage: (...args) => calls.push(args) }),
    toDataURL: () => (width > 0 && height > 0 ? 'data:image/jpeg;base64,AAAA' : 'data:,'),
  });
}

test('고해상도 화면(기기 픽셀 2배)에서는 자를 영역을 이미지 픽셀로 바꿔 자른다', async () => {
  const calls = [];
  const result = await cropper.renderCrop('data:image/png;base64,SRC', { region: { x: 100, y: 50, width: 400, height: 300 } }, {
    loadImage: async () => ({ naturalWidth: 2560, naturalHeight: 1600 }),
    createCanvas: fakeCanvasFactory(calls),
    viewport: { width: 1280, height: 800 },
  });
  assert.equal(result, 'data:image/jpeg;base64,AAAA');
  assert.deepEqual(calls[0].slice(1, 5), [200, 100, 800, 600], '원본에서 2배 좌표로 잘라야 한다');
});

test('자를 영역이 비면 빈 이미지(data:,) 대신 원본을 돌려준다', async () => {
  const result = await cropper.renderCrop('data:image/png;base64,SRC', { region: { x: 0, y: 0, width: 0, height: 0 } }, {
    loadImage: async () => ({ naturalWidth: 1280, naturalHeight: 800 }),
    createCanvas: fakeCanvasFactory([]),
    viewport: { width: 0, height: 0 },
  });
  assert.equal(result, 'data:image/png;base64,SRC');
});

test('녹화와 붙여넣기처럼 순번이 따로인 묶음이 섞여도 수집 시각 순으로 단계를 만든다', () => {
  const steps = stepBuilder.buildEvidenceSteps([
    { id: 'P1', sessionId: 'PASTE', sequenceNo: 1, triggerType: 'clipboard-paste', capturedAt: '2026-11-16T10:05:00Z', context: { pageTitle: '붙여넣은 화면' } },
    { id: 'R1', sessionId: 'REC', sequenceNo: 1, triggerType: 'baseline', capturedAt: '2026-11-16T10:00:00Z', context: { pageTitle: '목록' } },
    { id: 'R2', sessionId: 'REC', sequenceNo: 2, triggerType: 'click', capturedAt: '2026-11-16T10:01:00Z', context: { pageTitle: '목록' } },
  ]);
  const order = steps.flatMap((step) => step.evidenceIds);
  assert.deepEqual(order, ['R1', 'R2', 'P1']);
});

test('QA 뷰어는 Markdown 보고서의 이스케이프 역슬래시를 보이지 않게 한다', () => {
  const html = viewer.renderMarkdown('작성 2026\\-11\\-16 · 결과 \\(PASS\\)');
  assert.equal(html, '<p>작성 2026-11-16 · 결과 (PASS)</p>');
});

test('다시 묶은 ZIP은 한국어로 원인을 알려준다', async () => {
  const bytes = new Uint8Array(30 + 1);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(8, 8, true); // deflate
  view.setUint32(18, 1, true);
  view.setUint32(22, 2, true);
  view.setUint16(26, 1, true);
  bytes[30] = 'a'.charCodeAt(0);
  await assert.rejects(() => zip.readZip(bytes), /원래 ZIP을 그대로 여세요/);
});

test('보고서 초안 요청은 테스트케이스마다 이미지를 몇 장까지만 보낸다', () => {
  const evidence = Array.from({ length: 8 }, (_, index) => ({ id: `E${index}`, sequenceNo: index + 1, thumbnailDataUrl: 'data:image/jpeg;base64,AA', context: {} }));
  const request = llm.buildReportDraftRequest({}, [{ feature: { id: 'F1', title: 't' }, evidence }]);
  assert.equal(request.features[0].evidence.length, 3);
});

test('자동 AI 기능은 연결이 확인된 뒤에만 돌고, AI 호출은 시간 제한이 있다', () => {
  assert.match(editorSource, /function autoRunAiPipelineForFeature\(feature\) \{\s*\n\s*if \(!llmReady\) return;/);
  assert.match(editorSource, /function autoRequestSessionTitleForSession\(sessionId\) \{\s*\n\s*if \(!sessionId \|\| !llmReady\) return;/);
  assert.match(editorSource, /async function requestReportDraftSuggestion\(options = \{\}\) \{[\s\S]*?if \(!llmReady\) throw new Error\(/);
  assert.match(editorSource, /AbortSignal\.timeout\(LLM_TIMEOUT_MS\)/);
  assert.match(editorSource, /await setLlmReady\(Boolean\(summary\.ok\)\)/, '연결 테스트 결과로 자동 AI 기능을 켜고 끈다');
  const exportBody = editorSource.slice(editorSource.indexOf('async function exportReport()'), editorSource.indexOf('async function exportEvidenceOnly()'));
  assert.doesNotMatch(exportBody, /requestReportDraftSuggestion/, 'ZIP을 만든 뒤에 초안 제안 창을 띄우지 않는다');
});

test('ZIP 저장은 실제 저장(또는 취소)을 기다리고, 제목과 시각으로 파일 이름을 짓는다', () => {
  assert.match(editorSource, /const result = await waitForDownload\(downloadId\);/);
  assert.match(editorSource, /result\.error === 'USER_CANCELED'/);
  assert.match(editorSource, /saveZip\(archive, exportFilename\(docType\(\)\.zipSuffix\), 'report'\)/, '파일 이름도 목적을 따른다(QA결과, 테스트결과서, PoC기록, 화면설명서)');
  assert.doesNotMatch(editorSource, /\$\{report\.id\}-qa-result\.zip/);
});

test('증적은 보고서별로 보여주고, 보고서를 지우면 그 사진도 지운다', () => {
  assert.match(editorSource, /async function loadReportEvidence\(\)/);
  assert.match(editorSource, /return all\.filter\(\(item\) => item\.reportId === report\.id\);/);
  const removeBody = editorSource.slice(editorSource.indexOf('async function removeReport()'), editorSource.indexOf('async function addFeature()'));
  assert.match(removeBody, /CaptureITStorage\.deleteEvidence\(evidence\.id\)/);
  assert.match(editorSource, /reportId: report && report\.id \|\| null,\s*\n\s*tabId: tab && tab\.id,/, '녹화를 시작할 때 보고서 id를 넘긴다');
});

test('QA 뷰어는 증적만 ZIP을 열고, 받은 HTML이 외부 주소를 불러오지 못하게 한다', () => {
  const page = fs.readFileSync(path.resolve(__dirname, '../extension/viewer.js'), 'utf8');
  assert.match(page, /manifest\.kind === 'evidence-only'/);
  assert.match(page, /parsed\.querySelectorAll\('link'\)\) external\.remove\(\)/);
  assert.match(editorSource, /kind: 'evidence-only',/);
});

test('AI 답이 출력 한도에 걸리면 한도를 늘려 한 번만 다시 요청한다', () => {
  const start = editorSource.indexOf('function postLlm(payload, options = {})');
  const body = editorSource.slice(start, editorSource.indexOf('\n  }\n', start));
  assert.match(body, /sendLlmRequest\(body, settings, CaptureITLlm\.DEFAULT_MAX_TOKENS, onStatus\)/);
  assert.match(body, /if \(!error\.outputLimit\) throw error;[\s\S]*?return sendLlmRequest\(body, settings, CaptureITLlm\.RETRY_MAX_TOKENS, onStatus\);/);
});

test('AI 보고서 초안은 버튼을 눌렀을 때만 요청한다(미리보기마다 창이 불쑥 뜨던 문제)', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../extension/editor.html'), 'utf8');
  const preview = editorSource.slice(editorSource.indexOf('async function previewReport()'), editorSource.indexOf('const REPORT_INFO_FIELDS'));
  assert.doesNotMatch(preview, /requestReportDraftSuggestion\(/, '미리보기는 AI를 부르지 않는다');
  const callers = [...editorSource.matchAll(/requestReportDraftSuggestion\(/g)].length;
  assert.equal(callers, 2, '정의 하나와 버튼 핸들러 하나뿐');
  assert.match(editorSource, /elements\.suggestReportDraft\.addEventListener\('click', \(\) => withBusy\(elements\.suggestReportDraft,/);
  const reportInfo = html.match(/<details id="report-info"[\s\S]*?<\/details>/)[0];
  assert.match(reportInfo, /id="suggest-report-draft"/);
});
