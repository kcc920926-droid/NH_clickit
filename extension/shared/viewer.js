(function attachViewer(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CaptureITViewer = api;
})(globalThis, function createViewerApi() {
  function chooseEntry(names) {
    if (names.has('report.html')) return 'report.html';
    if (names.has('report.md')) return 'report.md';
    return null;
  }

  function validatePackage(manifest, names) {
    if (!manifest || manifest.schemaVersion !== 1 || !manifest.report || !Array.isArray(manifest.features)) {
      throw new Error('지원하지 않는 manifest 형식입니다.');
    }
    for (const feature of manifest.features) {
      if (!feature || typeof feature.id !== 'string' || !feature.result || !Array.isArray(feature.result.evidence)) {
        throw new Error('기능 결과 구조가 올바르지 않습니다.');
      }
      for (const evidence of feature.result.evidence) {
        const file = evidence && evidence.file;
        if (typeof file !== 'string' || !/^assets\/[A-Za-z0-9._-]+$/.test(file) || file.includes('..')) {
          throw new Error(`위험한 증적 경로입니다: ${file || '(없음)'}`);
        }
        if (!names.has(file)) throw new Error(`누락된 증적 파일입니다: ${file}`);
      }
    }
    return true;
  }

  function sanitizeHtmlString(html) {
    return String(html)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
      .replace(/<\/?(?:iframe|object|embed|base|meta)\b[^>]*>/gi, '')
      .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/\s+(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '')
      .replace(/@import\s+[^;]+;/gi, '');
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function renderMarkdown(markdown) {
    const lines = String(markdown).split(/\r?\n/);
    return lines.map((line) => {
      const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line);
      if (image) return `<p><img alt="${escapeHtml(image[1])}" src="${escapeHtml(image[2])}"></p>`;
      const heading = /^(#{1,6})\s+(.+)$/.exec(line);
      if (heading) return `<h${heading[1].length}>${escapeHtml(heading[2])}</h${heading[1].length}>`;
      if (/^-\s+/.test(line)) return `<p>• ${escapeHtml(line.slice(2))}</p>`;
      return line ? `<p>${escapeHtml(line)}</p>` : '';
    }).join('\n');
  }

  return {
    chooseEntry,
    renderMarkdown,
    sanitizeHtmlString,
    validatePackage,
  };
});
