(function attachReport(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CaptureITReport = api;
})(globalThis, function createReportApi() {
  const DEFAULT_REPORT_TITLE = 'CaptureIT QA 보고서';

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

  function statusClass(status) {
    return status === 'PASS' ? 'pass' : status === 'FAIL' ? 'fail' : 'incomplete';
  }

  function renderHtml(manifest) {
    const resultRows = manifest.features.map((feature) => `
      <tr><td>${escapeHtml(feature.id)}</td><td>${escapeHtml(feature.title)}</td><td><span class="badge ${statusClass(feature.result.status)}">${escapeHtml(feature.result.status || 'INCOMPLETE')}</span></td><td>${feature.result.evidence.length}</td></tr>`).join('');
    const overviewItems = [
      ['변경 목적', manifest.report.changePurpose],
      ['수정 내용 요약', manifest.report.changeSummary],
      ['형상·체크아웃 개요', manifest.report.configurationOverview],
    ].filter(([, value]) => value);
    const overviewHtml = overviewItems.length
      ? `<section class="overview"><h2>변경 개요</h2><dl>${overviewItems.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl></section>`
      : '';
    const heroSubtitle = manifest.report.author
      ? `${escapeHtml(manifest.report.projectName)} · ${escapeHtml(manifest.report.author)}`
      : escapeHtml(manifest.report.projectName);
    const featureHtml = manifest.features.map((feature) => {
      const images = feature.result.evidence.map((item) => `
        <figure>
          <img src="${escapeHtml(item.file)}" alt="${escapeHtml(item.description || item.pageTitle || feature.title)}">
          <figcaption>#${item.sequenceNo} · ${escapeHtml(item.triggerType)} · ${escapeHtml(item.pageTitle)}${item.description ? ` · ${escapeHtml(item.description)}` : ''}</figcaption>
        </figure>`).join('');
      return `
      <section class="feature">
        <header><h2>${escapeHtml(feature.id)} · ${escapeHtml(feature.title)}</h2><span class="badge ${statusClass(feature.result.status)}">${escapeHtml(feature.result.status || 'INCOMPLETE')}</span></header>
        <p>${escapeHtml(feature.description)}</p>
        <dl>
          <div><dt>검증 내용</dt><dd>${escapeHtml(feature.result.verification)}</dd></div>
          <div><dt>기대 결과</dt><dd>${escapeHtml(feature.result.expectedResult)}</dd></div>
          <div><dt>실제 결과</dt><dd>${escapeHtml(feature.result.actualResult)}</dd></div>
        </dl>
        <div class="evidence">${images || '<p class="empty">선택된 증적이 없습니다.</p>'}</div>
      </section>`;
    }).join('');

    return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(manifest.report.title)}</title>
<style>
:root{font-family:"Segoe UI",sans-serif;color:#172033;background:#f4f6f9}*{box-sizing:border-box}body{margin:0}main{max-width:1120px;margin:auto;padding:32px}.hero,.overview,.results,.feature{background:#fff;border:1px solid #dbe2ec;border-radius:16px;padding:24px;margin-bottom:18px}.hero{background:#0f172a;color:#fff}.hero h1{margin:0 0 8px}.meta{color:#cbd5e1}.summary{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}.metric{background:#1e293b;border-radius:10px;padding:12px 16px}.overview h2,.results h2{margin-top:0}.overview dl{display:grid;gap:8px}.feature header{display:flex;align-items:center;justify-content:space-between;gap:12px}.feature h2{font-size:19px}.badge{display:inline-flex;border-radius:999px;padding:6px 10px;font-weight:800}.pass{color:#166534;background:#dcfce7}.fail{color:#991b1b;background:#fee2e2}.incomplete{color:#475569;background:#e2e8f0}dl{display:grid;gap:8px}dl div{display:grid;grid-template-columns:140px 1fr;gap:12px;padding:10px;background:#f8fafc;border-radius:8px}dt{font-weight:800}dd{margin:0;white-space:pre-wrap}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #e2e8f0;text-align:left}th{color:#64748b;font-size:12px}.evidence{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin-top:18px}figure{margin:0;border:1px solid #dbe2ec;border-radius:10px;overflow:hidden}img{display:block;width:100%;height:auto}figcaption{padding:9px;color:#64748b;font-size:12px}.empty{color:#64748b}@media print{body{background:#fff}main{max-width:none;padding:0}.hero,.overview,.results,.feature{box-shadow:none}.feature{break-inside:avoid}}
</style></head><body><main>
<section class="hero"><h1>${escapeHtml(manifest.report.title)}</h1><p>${heroSubtitle}</p><p class="meta">작성 ${escapeHtml(manifest.report.createdAt)} · 갱신 ${escapeHtml(manifest.report.updatedAt)}</p><div class="summary"><div class="metric">전체 ${manifest.summary.total}</div><div class="metric">PASS ${manifest.summary.pass}</div><div class="metric">FAIL ${manifest.summary.fail}</div><div class="metric">미판정 ${manifest.summary.incomplete}</div><div class="metric">전체 결과 ${manifest.overallStatus}</div></div></section>
${overviewHtml}
<section class="results"><h2>결과 목록</h2><table><thead><tr><th>ID</th><th>기능명</th><th>판정</th><th>증적</th></tr></thead><tbody>${resultRows || '<tr><td colspan="4">기능 명세가 없습니다.</td></tr>'}</tbody></table></section>
${featureHtml}
</main></body></html>`;
  }

  function renderMarkdown(manifest) {
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
      `- 전체 결과: **${manifest.overallStatus}**`,
      `- 전체 ${manifest.summary.total} / PASS ${manifest.summary.pass} / FAIL ${manifest.summary.fail} / 미판정 ${manifest.summary.incomplete}`,
      '',
      '## 결과 목록',
      '',
      '| ID | 기능명 | 판정 | 증적 |',
      '|---|---|---|---:|',
      ...manifest.features.map((feature) => `| ${escapeMarkdown(feature.id)} | ${escapeMarkdown(feature.title)} | ${feature.result.status || 'INCOMPLETE'} | ${feature.result.evidence.length} |`),
      '',
    ];
    for (const feature of manifest.features) {
      lines.push(`## ${escapeMarkdown(feature.id)} · ${escapeMarkdown(feature.title)}`, '');
      lines.push(escapeMarkdown(feature.description), '');
      lines.push(`- 판정: **${feature.result.status || 'INCOMPLETE'}**`);
      lines.push(`- 검증 내용: ${escapeMarkdown(feature.result.verification)}`);
      lines.push(`- 기대 결과: ${escapeMarkdown(feature.result.expectedResult)}`);
      lines.push(`- 실제 결과: ${escapeMarkdown(feature.result.actualResult)}`, '');
      feature.result.evidence.forEach((item, index) => {
        lines.push(`### 증적 ${index + 1}`, '');
        lines.push(`![${escapeMarkdown(item.description || item.pageTitle || feature.title)}](${item.file})`, '');
        lines.push(`순서 #${item.sequenceNo} · ${escapeMarkdown(item.triggerType)} · ${escapeMarkdown(item.pageTitle)}`, '');
      });
    }
    return `${lines.join('\n').trim()}\n`;
  }

  return { buildManifest, renderHtml, renderMarkdown, DEFAULT_REPORT_TITLE };
});
