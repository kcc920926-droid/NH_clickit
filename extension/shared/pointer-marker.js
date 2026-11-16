(function attachPointerMarker(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CaptureITPointerMarker = api;
})(globalThis, function createPointerMarkerApi() {
  // 클릭한 곳 표시: 클릭 후 화면을 찍을 때 누른 자리에 표시를 그려 넣는다.
  // 설정은 chrome.storage.local의 pointerMarker에 { enabled, shape, color, size }로 둔다.
  const SHAPES = Object.freeze([
    { id: 'ring', name: '원' },
    { id: 'dot', name: '점' },
    { id: 'arrow', name: '화살표' },
    { id: 'crosshair', name: '십자' },
  ]);
  const COLORS = Object.freeze([
    { id: 'red', name: '빨강', value: '#e53935' },
    { id: 'blue', name: '파랑', value: '#1e63e9' },
    { id: 'yellow', name: '노랑', value: '#f5b400' },
    { id: 'black', name: '검정', value: '#111111' },
  ]);
  const SIZES = Object.freeze([
    { id: 'small', name: '작게', scale: 0.75 },
    { id: 'medium', name: '보통', scale: 1 },
    { id: 'large', name: '크게', scale: 1.5 },
  ]);
  const DEFAULT_SETTINGS = Object.freeze({ enabled: false, shape: 'ring', color: 'red', size: 'medium' });

  function normalizeSettings(value) {
    const settings = { ...DEFAULT_SETTINGS, ...(value || {}) };
    if (!SHAPES.some((item) => item.id === settings.shape)) settings.shape = DEFAULT_SETTINGS.shape;
    if (!COLORS.some((item) => item.id === settings.color)) settings.color = DEFAULT_SETTINGS.color;
    if (!SIZES.some((item) => item.id === settings.size)) settings.size = DEFAULT_SETTINGS.size;
    settings.enabled = Boolean(settings.enabled);
    return settings;
  }

  // ctx: CanvasRenderingContext2D 또는 OffscreenCanvasRenderingContext2D. (x, y)는 이미지 픽셀 좌표.
  // pixelScale: 화면 1 CSS 픽셀이 이미지 몇 픽셀인지(고배율 화면이면 2 등).
  function drawMarker(ctx, x, y, settings, pixelScale = 1) {
    const { shape, color, size } = normalizeSettings(settings);
    const colorValue = COLORS.find((item) => item.id === color).value;
    const unit = SIZES.find((item) => item.id === size).scale * pixelScale;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (shape === 'ring') {
      ctx.beginPath();
      ctx.arc(x, y, 18 * unit, 0, Math.PI * 2);
      ctx.lineWidth = 7 * unit;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.stroke();
      ctx.lineWidth = 4 * unit;
      ctx.strokeStyle = colorValue;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 3 * unit, 0, Math.PI * 2);
      ctx.fillStyle = colorValue;
      ctx.fill();
    } else if (shape === 'dot') {
      ctx.beginPath();
      ctx.arc(x, y, 14 * unit, 0, Math.PI * 2);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = colorValue;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2.5 * unit;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    } else if (shape === 'arrow') {
      // 끝이 (x, y)를 가리키는 마우스 화살표
      const points = [[0, 0], [0, 26], [7, 20], [12, 31], [17, 29], [12, 18], [21, 18]];
      ctx.beginPath();
      points.forEach(([px, py], index) => {
        const tx = x + px * unit;
        const ty = y + py * unit;
        if (index === 0) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty);
      });
      ctx.closePath();
      ctx.lineWidth = 3 * unit;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.fillStyle = colorValue;
      ctx.fill();
    } else {
      // crosshair: 가운데를 비운 십자와 작은 원
      const gap = 5 * unit;
      const arm = 20 * unit;
      const segments = [[x - arm, y, x - gap, y], [x + gap, y, x + arm, y], [x, y - arm, x, y - gap], [x, y + gap, x, y + arm]];
      for (const [width, style] of [[6 * unit, 'rgba(255,255,255,0.9)'], [3 * unit, colorValue]]) {
        ctx.lineWidth = width;
        ctx.strokeStyle = style;
        ctx.beginPath();
        for (const [x1, y1, x2, y2] of segments) {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(x, y, 11 * unit, 0, Math.PI * 2);
      ctx.lineWidth = 2 * unit;
      ctx.strokeStyle = colorValue;
      ctx.stroke();
    }
    ctx.restore();
  }

  // 클릭 위치(CSS 픽셀, 화면 왼쪽 위 기준)를 이미지 픽셀로 바꾼다. 화면 밖이면 null.
  function imagePoint(pointer, viewport, imageSize) {
    if (!pointer || !viewport || !imageSize) return null;
    const viewportWidth = Number(viewport.width) || 0;
    const viewportHeight = Number(viewport.height) || 0;
    if (viewportWidth <= 0 || viewportHeight <= 0) return null;
    const x = Number(pointer.x);
    const y = Number(pointer.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > viewportWidth || y > viewportHeight) return null;
    const scaleX = imageSize.width / viewportWidth;
    const scaleY = imageSize.height / viewportHeight;
    return { x: x * scaleX, y: y * scaleY, pixelScale: scaleX };
  }

  function bytesToBase64(bytes) {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }
    return btoa(binary);
  }

  // 서비스 워커(OffscreenCanvas)에서 data URL 이미지에 표시를 그려 새 data URL을 돌려준다.
  // 그릴 수 없으면(설정 꺼짐, 좌표 없음, 화면 밖) 원래 이미지를 그대로 돌려준다.
  async function markImageDataUrl(dataUrl, pointer, viewport, settings) {
    const normalized = normalizeSettings(settings);
    if (!normalized.enabled || !pointer || typeof OffscreenCanvas !== 'function') return dataUrl;
    const blob = await (await fetch(dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    try {
      const point = imagePoint(pointer, viewport, { width: bitmap.width, height: bitmap.height });
      if (!point) return dataUrl;
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      drawMarker(ctx, point.x, point.y, normalized, point.pixelScale);
      const marked = await canvas.convertToBlob({ type: blob.type || 'image/png' });
      const bytes = new Uint8Array(await marked.arrayBuffer());
      return `data:${marked.type};base64,${bytesToBase64(bytes)}`;
    } finally {
      if (typeof bitmap.close === 'function') bitmap.close();
    }
  }

  return { COLORS, DEFAULT_SETTINGS, SHAPES, SIZES, drawMarker, imagePoint, markImageDataUrl, normalizeSettings };
});
