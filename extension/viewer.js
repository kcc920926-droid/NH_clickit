(function initializeViewerPage() {
  const input = document.getElementById('package-input');
  const dropZone = document.getElementById('drop-zone');
  const emptyState = document.getElementById('empty-state');
  const message = document.getElementById('viewer-message');
  const frame = document.getElementById('report-frame');
  const decoder = new TextDecoder();

  function mimeFor(name) {
    if (name.endsWith('.png')) return 'image/png';
    if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
    if (name.endsWith('.webp')) return 'image/webp';
    return 'application/octet-stream';
  }

  function bytesDataUrl(bytes, mime) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return `data:${mime};base64,${btoa(binary)}`;
  }

  function safeDocument(html, entries) {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(CaptureITViewer.sanitizeHtmlString(html), 'text/html');
    for (const element of parsed.querySelectorAll('*')) {
      for (const attribute of [...element.attributes]) {
        if (attribute.name.toLowerCase().startsWith('on')) element.removeAttribute(attribute.name);
      }
    }
    for (const image of parsed.images) {
      const path = image.getAttribute('src');
      if (path && entries.has(path)) image.src = bytesDataUrl(entries.get(path), mimeFor(path));
      else image.removeAttribute('src');
    }
    for (const link of parsed.querySelectorAll('a[href]')) link.removeAttribute('href');
    return `<!doctype html>${parsed.documentElement.outerHTML}`;
  }

  async function openPackage(file) {
    message.textContent = 'ZIP 검증 중…';
    const entries = await CaptureITZip.readZip(file);
    if (!entries.has('manifest.json')) throw new Error('manifest.json이 없습니다.');
    const manifest = JSON.parse(decoder.decode(entries.get('manifest.json')));
    CaptureITViewer.validatePackage(manifest, new Set(entries.keys()));
    const entry = CaptureITViewer.chooseEntry(new Set(entries.keys()));
    if (!entry) throw new Error('report.html 또는 report.md가 없습니다.');
    let html;
    if (entry === 'report.html') html = safeDocument(decoder.decode(entries.get(entry)), entries);
    else html = safeDocument(`<!doctype html><html lang="ko"><head><meta charset="utf-8"></head><body>${CaptureITViewer.renderMarkdown(decoder.decode(entries.get(entry)))}</body></html>`, entries);
    frame.srcdoc = html;
    frame.hidden = false;
    emptyState.hidden = true;
    message.textContent = `${file.name} · ${entry} 읽기 전용 표시`;
  }

  input.addEventListener('change', () => {
    if (input.files[0]) openPackage(input.files[0]).catch((error) => { message.textContent = error.message; });
  });
  for (const eventName of ['dragenter', 'dragover']) {
    dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.add('dragging'); });
  }
  for (const eventName of ['dragleave', 'drop']) {
    dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.remove('dragging'); });
  }
  dropZone.addEventListener('drop', (event) => {
    const file = event.dataTransfer.files[0];
    if (file) openPackage(file).catch((error) => { message.textContent = error.message; });
  });
})();
