(function attachReport(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CaptureITReport = api;
})(globalThis, function createReportApi() {
  const DEFAULT_REPORT_TITLE = 'CaptureIT QA 보고서';
  // 문서 유형(항목 이름·칸·상태 이름). 편집기에서는 document-types.js를 먼저 불러 둔다.
  const DocumentTypes = typeof module === 'object' && module.exports && typeof require === 'function'
    ? require('./document-types.js')
    : globalThis.CaptureITDocumentTypes;
  const typeOf = (manifest) => DocumentTypes.documentType(manifest && manifest.documentType);

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function escapeMarkdown(value) {
    return String(value ?? '').replace(/([\\`*_[\]{}<>#+\-.!|])/g, '\\$1');
  }

  function overallStatus(features) {
    const statuses = features.map((feature) => feature.result.status);
    if (statuses.includes('FAIL')) return 'FAIL';
    if (!statuses.length || statuses.some((status) => status !== 'PASS')) return 'INCOMPLETE';
    return 'PASS';
  }

  function extensionFor(dataUrl) {
    const match = /^data:image\/(png|jpeg|webp);/i.exec(dataUrl || '');
    if (!match) return 'png';
    return match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  }

  function buildManifest(report, evidence) {
    const evidenceById = new Map(evidence.map((item) => [item.id, item]));
    const features = (report.features || []).map((feature) => {
      const selected = feature.result.evidenceIds
        .map((id) => evidenceById.get(id))
        .filter(Boolean)
        .map((item, index) => ({
          captureId: item.id,
          sessionId: item.sessionId || '',
          sequenceNo: item.sequenceNo,
          triggerType: item.triggerType,
          capturedAt: item.capturedAt,
          source: item.source || '',
          description: item.description || '',
          previousCaptureId: item.previousCaptureId || null,
          nextCaptureId: item.nextCaptureId || null,
          file: `assets/${feature.id}-${String(index + 1).padStart(3, '0')}.${extensionFor(item.imageDataUrl)}`,
          pageTitle: item.context && item.context.pageTitle || '',
          pageUrl: item.context && item.context.pageUrl || '',
          route: item.context && item.context.route || '',
          viewport: item.context && item.context.viewport || {},
          scroll: item.context && item.context.scroll || {},
          target: item.context && item.context.target || {},
          surroundingContext: item.context && item.context.surroundingContext || {},
          visibleText: item.context && item.context.visibleText || '',
        }));
      return {
        id: feature.id,
        title: feature.title,
        description: feature.description || '',
        result: {
          id: feature.result.id,
          verification: feature.result.verification || '',
          expectedResult: feature.result.expectedResult || '',
          actualResult: feature.result.actualResult || '',
          status: feature.result.status || null,
          evidence: selected,
        },
      };
    });

    return {
      schemaVersion: 1,
      // 추가 필드라 schemaVersion은 그대로다. 예전 뷰어는 이 값을 무시하고 QA 문서로 보여 준다.
      documentType: DocumentTypes.documentType(report.documentType).id,
      viewer: { primary: 'report.html', fallback: 'report.md' },
      report: {
        id: report.id,
        title: report.title || DEFAULT_REPORT_TITLE,
        projectName: report.projectName || '',
        author: report.author || '',
        changePurpose: report.changePurpose || '',
        changeSummary: report.changeSummary || '',
        configurationOverview: report.configurationOverview || '',
        createdAt: report.createdAt || '',
        updatedAt: report.updatedAt || '',
      },
      overallStatus: overallStatus(features),
      summary: {
        total: features.length,
        pass: features.filter((item) => item.result.status === 'PASS').length,
        fail: features.filter((item) => item.result.status === 'FAIL').length,
        incomplete: features.filter((item) => !item.result.status).length,
      },
      features,
    };
  }

  // 문서 양식(지면 모양). 마크업은 모두 같고 CSS만 다르다. 양식은 manifest에 기록하지 않는다(내용과 무관한 표현 선택).
  const REPORT_TEMPLATES = Object.freeze([
    { id: 'editorial', name: '에디토리얼', description: '제목 서체와 괘선, 그림 캡션. 읽는 문서용 기본 양식' },
    { id: 'formal', name: '공문서', description: '격자 표와 음영 머리칸, 가운데 제목. 결재·제출용' },
    { id: 'compact', name: '표 중심', description: '작은 글씨와 작은 그림. 케이스가 많을 때' },
    { id: 'gallery', name: '그림 중심', description: '화면을 크게 한 장씩. 리뷰·발표용' },
    { id: 'mono', name: '흑백 인쇄', description: '색과 채움 없이 검정만. 흑백 출력·팩스용' },
  ]);
  const DEFAULT_TEMPLATE = 'editorial';

  const TRIGGER_LABELS = {
    baseline: '시작 화면',
    navigation: '페이지 이동',
    'route-change': '화면 전환',
    click: '클릭 후 화면',
    submit: '제출 후 화면',
    'form-input': '입력',
    'manual-pin': '강조 캡처',
    'shortcut-context': '강조 캡처',
    'context-menu': '강조 캡처',
    'file-import': '불러온 이미지',
    'clipboard-paste': '붙여넣은 화면',
  };

  // 상태는 칩이 아니라 기호 + 글자로 표기한다. 색은 보조라 기호와 글자만으로도 구분된다.
  function statusMark(status, type = DocumentTypes.documentType('qa')) {
    const verdict = type.verdict;
    if (!verdict) return '';
    if (status === 'PASS') return `<span class="st st-pass">${escapeHtml(verdict.PASS)}</span>`;
    if (status === 'FAIL') return `<span class="st st-fail">${escapeHtml(verdict.FAIL)}</span>`;
    if (status === 'INCOMPLETE') return '<span class="st st-none">INCOMPLETE</span>';
    return `<span class="st st-none">${escapeHtml(verdict.none)}</span>`;
  }

  function dateOnly(value) {
    const text = String(value || '');
    return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : text;
  }

  function resolveTemplate(templateId) {
    return REPORT_TEMPLATES.some((item) => item.id === templateId) ? templateId : DEFAULT_TEMPLATE;
  }

  const BASE_CSS = `
:root{--ink:#1b1b1b;--muted:#6a6862;--faint:#9b978e;--rule:#1b1b1b;--hair:#dcd8cf;--paper:#fff;--tint:#f6f4ef;--pass:#1e6b40;--fail:#b3261e;--none:#6a6862;--mark:#d92d20;--serif:"Noto Serif KR","Nanum Myeongjo","AppleMyungjo","Batang",Georgia,serif;--sans:Pretendard,"Apple SD Gothic Neo","Malgun Gothic","Segoe UI",sans-serif;--head:var(--serif);--body:var(--sans);--size:15px;--measure:880px;--fig:240px}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:var(--size)/1.7 var(--body)}
main.doc{max-width:var(--measure);margin:0 auto;padding:56px 44px 80px}
.masthead{padding-bottom:18px;border-bottom:2px solid var(--rule)}.masthead .kicker{font-size:12px;letter-spacing:.14em;color:var(--muted)}
.masthead h1{margin:6px 0 6px;font:700 30px/1.3 var(--head)}.masthead p{margin:0;color:var(--muted);font-size:14px}.masthead p.meta{font-size:13px}
.tally{display:grid;grid-template-columns:repeat(4,1fr);margin:0;border-bottom:1px solid var(--hair)}.tally div{padding:14px 16px 12px;border-left:1px solid var(--hair)}.tally div:first-child{border-left:0;padding-left:0}
.tally dt{font-size:12px;color:var(--muted)}.tally dd{margin:2px 0 0;font:700 26px/1.1 var(--head);font-variant-numeric:tabular-nums}
.verdict-line{margin:14px 0 0}
.st{white-space:nowrap;font-weight:700;font-size:.9em;letter-spacing:.02em}.st::before{display:inline-block;width:1.15em}
.st-pass{color:var(--pass)}.st-pass::before{content:"✓"}.st-fail{color:var(--fail)}.st-fail::before{content:"✕"}.st-none{color:var(--none);font-weight:600}.st-none::before{content:"○"}
.overview,.sec{margin-top:36px}.overview>h2,.sec>h2{display:flex;align-items:baseline;gap:10px;margin:0 0 12px;font:700 19px/1.35 var(--head)}.no{color:var(--faint);font-weight:400}
table.t{width:100%;border-collapse:collapse;border-top:1.5px solid var(--rule);border-bottom:1.5px solid var(--rule)}
table.t th{padding:8px 12px 7px 0;border-bottom:1px solid var(--rule);text-align:left;font-size:12px;font-weight:600;color:var(--muted)}
table.t td{padding:9px 12px 9px 0;border-bottom:1px solid var(--hair);vertical-align:top}table.t tr:last-child td{border-bottom:0}
table.t .num{text-align:right;font-variant-numeric:tabular-nums}table.t .id{color:var(--muted);white-space:nowrap;font-variant-numeric:tabular-nums}
.entry{margin-top:28px;padding-top:18px;border-top:1px solid var(--hair)}.entry-head{display:flex;justify-content:space-between;align-items:baseline;gap:16px}
.entry-head h3{margin:0;font:700 17px/1.4 var(--head)}.entry-head h3 .no{margin-right:8px}.entry>p{margin:10px 0 0;white-space:pre-line}
dl.fields{display:grid;grid-template-columns:120px 1fr;margin:12px 0 0}dl.fields dt{padding:7px 0;border-top:1px solid var(--hair);font-size:13px;color:var(--muted)}
dl.fields dd{margin:0;padding:7px 0;border-top:1px solid var(--hair);white-space:pre-wrap}dl.fields dt:first-of-type,dl.fields dt:first-of-type+dd{border-top:0}
.figs{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--fig),1fr));gap:22px 18px;margin-top:18px}figure{margin:0}
figure img{display:block;width:100%;height:auto;border:1px solid var(--hair)}figcaption{margin-top:6px;font-size:12.5px;line-height:1.5;color:var(--muted)}figcaption b{margin-right:6px;color:var(--ink)}
.empty{color:var(--muted);font-size:14px}
@media (max-width:700px){main.doc{padding:28px 16px 56px}.tally{grid-template-columns:repeat(2,1fr)}.tally div:nth-child(3){border-left:0;padding-left:0}dl.fields{grid-template-columns:1fr}dl.fields dd{border-top:0;padding-top:0}}
@media print{main.doc{max-width:none;padding:0}.entry,figure{break-inside:avoid}a{color:inherit}}`;

  const TEMPLATE_CSS = {
    editorial: '',
    formal: `
:root{--body:var(--serif);--head:var(--serif);--rule:#1f2a44;--ink:#141a26;--muted:#4a5468;--hair:#9aa3b5;--size:14.5px}
.masthead{text-align:center;border-bottom:0;padding-bottom:0}.masthead h1{font-size:28px;padding:10px 0 12px;border-top:3px double var(--rule);border-bottom:3px double var(--rule);margin:10px 0 12px}
.tally{margin-top:22px;border:1px solid var(--rule)}.tally div{border-left:1px solid var(--rule);padding:10px 12px;text-align:center}.tally div:first-child{padding-left:12px}.tally dt{background:#eef0f5;margin:-10px -12px 8px;padding:6px 0;border-bottom:1px solid var(--rule);color:var(--ink);font-weight:700}
.overview>h2,.sec>h2{font-size:17px;border-left:4px solid var(--rule);padding-left:10px}
table.t{border:1px solid var(--rule)}table.t th{background:#eef0f5;color:var(--ink);font-weight:700;border:1px solid var(--rule);padding:7px 10px;text-align:center}table.t td{border:1px solid var(--hair);padding:7px 10px}
dl.fields{border:1px solid var(--rule)}dl.fields dt{background:#eef0f5;color:var(--ink);font-weight:700;padding:7px 10px;border-top:1px solid var(--hair);border-right:1px solid var(--rule)}dl.fields dd{padding:7px 10px;border-top:1px solid var(--hair)}
.entry{border-top:0}.entry-head h3{font-size:16px}figure img{border-color:var(--rule)}`,
    compact: `
:root{--head:var(--sans);--size:13px;--measure:1120px;--fig:150px}
main.doc{padding:32px 28px 48px}.masthead h1{font-size:22px}.tally dd{font-size:20px}.tally div{padding:8px 12px}
.overview,.sec{margin-top:22px}.overview>h2,.sec>h2{font-size:15px}table.t td,table.t th{padding:5px 10px 5px 0}
.entry{margin-top:14px;padding-top:10px}.entry-head h3{font-size:14px}dl.fields{grid-template-columns:96px 1fr 96px 1fr;column-gap:12px}dl.fields dt,dl.fields dd{padding:4px 0}dl.fields dt:nth-of-type(2),dl.fields dt:nth-of-type(2)+dd{border-top:0}
.figs{gap:10px;margin-top:10px}figcaption{font-size:11px}
@media (max-width:700px){dl.fields{grid-template-columns:1fr}}`,
    gallery: `
:root{--measure:1040px;--fig:100%}
.figs{grid-template-columns:1fr;gap:34px;margin-top:22px}figure img{border:0;box-shadow:0 0 0 1px var(--hair)}figcaption{font-size:14px;margin-top:10px}figcaption b{font-family:var(--head)}
.entry{margin-top:56px;padding-top:26px;border-top:2px solid var(--rule)}.entry-head h3{font-size:22px}dl.fields{max-width:680px}
@media print{.entry{break-before:page}}`,
    mono: `
:root{--pass:#000;--fail:#000;--none:#000;--muted:#3a3a3a;--faint:#6b6b6b;--hair:#9e9e9e;--mark:#000;--ink:#000;--rule:#000;--body:var(--serif)}
.st-fail{text-decoration:underline;text-decoration-thickness:2px}figure img{filter:grayscale(1);border-color:#000}
@page{size:A4;margin:18mm 16mm}`,
  };

  function renderHtml(manifest, options = {}) {
    const templateId = resolveTemplate(options.template);
    const docType = typeOf(manifest);
    const verdict = docType.verdict;
    const mark = (status) => statusMark(status, docType);
    const triggerLabel = (type) => TRIGGER_LABELS[type] || '화면';
    const resultRows = manifest.features.map((feature, index) => `
      <tr><td class="id">${index + 1}</td><td>${escapeHtml(feature.title)}</td>${verdict ? `<td>${mark(feature.result.status)}</td>` : ''}<td class="num">${feature.result.evidence.length}</td></tr>`).join('');
    const overviewItems = [
      ['변경 목적', manifest.report.changePurpose],
      ['수정 내용 요약', manifest.report.changeSummary],
      ['형상·체크아웃 개요', manifest.report.configurationOverview],
    ].filter(([, value]) => value);
    let sectionNo = 0;
    const nextNo = () => { sectionNo += 1; return sectionNo; };
    const overviewHtml = overviewItems.length
      ? `<section class="overview"><h2><span class="no">${nextNo()}</span>변경 개요</h2><dl class="fields">${overviewItems.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl></section>`
      : '';
    const resultsNo = nextNo();
    const detailsNo = nextNo();
    const heroSubtitle = manifest.report.author
      ? `${escapeHtml(manifest.report.projectName)} · ${escapeHtml(manifest.report.author)}`
      : escapeHtml(manifest.report.projectName);
    const featureHtml = manifest.features.map((feature, featureIndex) => {
      const entryNo = `${detailsNo}.${featureIndex + 1}`;
      const images = feature.result.evidence.map((item, imageIndex) => {
        const caption = [triggerLabel(item.triggerType), item.pageTitle, item.description].filter(Boolean).map(escapeHtml).join(' · ');
        return `
        <figure>
          <img src="${escapeHtml(item.file)}" alt="${escapeHtml(item.description || item.pageTitle || feature.title)}">
          <figcaption><b>그림 ${entryNo}-${imageIndex + 1}</b>${caption}</figcaption>
        </figure>`;
      }).join('');
      const fields = docType.fields.map((field) => [field.label, feature.result[field.key]]);
      return `
      <section class="feature entry">
        <div class="entry-head"><h3><span class="no">${entryNo}</span>${escapeHtml(feature.title)}</h3>${mark(feature.result.status)}</div>
        ${feature.description ? `<p>${escapeHtml(feature.description)}</p>` : ''}
        ${fields.length ? `<dl class="fields">${fields.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl>` : ''}
        <div class="figs">${images || '<p class="empty">선택된 증적이 없습니다.</p>'}</div>
      </section>`;
    }).join('');
    const overall = manifest.overallStatus;
    const qa = docType.id === 'qa' || docType.id === 'test';
    const verdictNote = !verdict ? '' : overall === 'FAIL'
      ? `${manifest.summary.total}건 중 ${manifest.summary.fail}건 ${qa ? '실패' : verdict.FAIL}`
      : overall === 'PASS'
        ? `${manifest.summary.total}건 모두 ${qa ? '통과' : verdict.PASS}`
        : `${verdict.none} ${manifest.summary.incomplete}건`;
    const tally = verdict
      ? `<dl class="tally"><div><dt>전체</dt><dd>${manifest.summary.total}</dd></div><div><dt>${escapeHtml(verdict.PASS)}</dt><dd>${manifest.summary.pass}</dd></div><div><dt>${escapeHtml(verdict.FAIL)}</dt><dd>${manifest.summary.fail}</dd></div><div><dt>${escapeHtml(verdict.none)}</dt><dd>${manifest.summary.incomplete}</dd></div></dl>
<p class="verdict-line">전체 결과 ${mark(overall)} — ${verdictNote}</p>`
      : `<dl class="tally"><div><dt>${escapeHtml(docType.item)}</dt><dd>${manifest.summary.total}</dd></div></dl>`;
    const columns = `<th>번호</th><th>${escapeHtml(docType.item)}</th>${verdict ? `<th>${escapeHtml(verdict.label)}</th>` : ''}<th class="num">증적</th>`;
    const columnCount = verdict ? 4 : 3;

    return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(manifest.report.title)}</title>
<style>${BASE_CSS}${TEMPLATE_CSS[templateId]}</style></head><body class="tpl-${templateId}"><main class="doc">
<header class="masthead"><div class="kicker">${escapeHtml(docType.reportKicker)}</div><h1>${escapeHtml(manifest.report.title)}</h1><p>${heroSubtitle}</p><p class="meta">작성 ${escapeHtml(dateOnly(manifest.report.createdAt))} · 갱신 ${escapeHtml(dateOnly(manifest.report.updatedAt))}</p></header>
${tally}
${overviewHtml}
<section class="results sec"><h2><span class="no">${resultsNo}</span>${verdict ? '결과 목록' : '목록'}</h2><table class="t"><thead><tr>${columns}</tr></thead><tbody>${resultRows || `<tr><td colspan="${columnCount}">${escapeHtml(docType.warningText.noItems)}</td></tr>`}</tbody></table></section>
<section class="sec details"><h2><span class="no">${detailsNo}</span>${escapeHtml(docType.item)}별 상세</h2>${featureHtml || `<p class="empty">${escapeHtml(docType.warningText.noItems)}</p>`}</section>
</main></body></html>`;
  }

  function renderMarkdown(manifest) {
    const docType = typeOf(manifest);
    const verdict = docType.verdict;
    const statusText = (status) => (verdict ? (status ? DocumentTypes.verdictLabel(docType, status) : 'INCOMPLETE') : '');
    const overviewItems = [
      ['변경 목적', manifest.report.changePurpose],
      ['수정 내용 요약', manifest.report.changeSummary],
      ['형상·체크아웃 개요', manifest.report.configurationOverview],
    ].filter(([, value]) => value);
    const overviewLines = overviewItems.length
      ? ['## 변경 개요', '', ...overviewItems.map(([label, value]) => `- ${label}: ${escapeMarkdown(value)}`), '']
      : [];
    const lines = [
      `# ${escapeMarkdown(manifest.report.title)}`,
      '',
      `- 프로젝트: ${escapeMarkdown(manifest.report.projectName)}`,
      `- 작성자: ${escapeMarkdown(manifest.report.author)}`,
      `- 작성일: ${escapeMarkdown(manifest.report.createdAt)}`,
      `- 갱신일: ${escapeMarkdown(manifest.report.updatedAt)}`,
      '',
      ...overviewLines,
      '## 전체 요약',
      '',
      ...(verdict
        ? [
          `- 전체 결과: **${manifest.overallStatus}**`,
          `- 전체 ${manifest.summary.total} / ${verdict.PASS} ${manifest.summary.pass} / ${verdict.FAIL} ${manifest.summary.fail} / ${verdict.none} ${manifest.summary.incomplete}`,
        ]
        : [`- ${docType.item} ${manifest.summary.total}개`]),
      '',
      `## ${verdict ? '결과 목록' : '목록'}`,
      '',
      verdict ? `| ID | ${docType.item} | ${verdict.label} | 증적 |` : `| ID | ${docType.item} | 증적 |`,
      verdict ? '|---|---|---|---:|' : '|---|---|---:|',
      ...manifest.features.map((feature) => (verdict
        ? `| ${escapeMarkdown(feature.id)} | ${escapeMarkdown(feature.title)} | ${statusText(feature.result.status)} | ${feature.result.evidence.length} |`
        : `| ${escapeMarkdown(feature.id)} | ${escapeMarkdown(feature.title)} | ${feature.result.evidence.length} |`)),
      '',
    ];
    for (const feature of manifest.features) {
      lines.push(`## ${escapeMarkdown(feature.id)} · ${escapeMarkdown(feature.title)}`, '');
      lines.push(escapeMarkdown(feature.description), '');
      if (verdict) lines.push(`- ${verdict.label}: **${statusText(feature.result.status)}**`);
      for (const field of docType.fields) lines.push(`- ${field.label}: ${escapeMarkdown(feature.result[field.key])}`);
      lines.push('');
      feature.result.evidence.forEach((item, index) => {
        lines.push(`### 증적 ${index + 1}`, '');
        lines.push(`![${escapeMarkdown(item.description || item.pageTitle || feature.title)}](${item.file})`, '');
        lines.push(`순서 #${item.sequenceNo} · ${escapeMarkdown(item.triggerType)} · ${escapeMarkdown(item.pageTitle)}`, '');
      });
    }
    return `${lines.join('\n').trim()}\n`;
  }

  return { buildManifest, renderHtml, renderMarkdown, DEFAULT_REPORT_TITLE, DEFAULT_TEMPLATE, REPORT_TEMPLATES };
});
