(function attachScreenshotCropper(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.CaptureITScreenshotCropper = api;
})(globalThis, function createScreenshotCropperApi() {
  const DEFAULT_OPTIONS = Object.freeze({
    padding: 140,
    minWidth: 760,
    minHeight: 480,
    maxWidth: 1280,
    maxHeight: 900,
  });
  const CROP_TYPES = Object.freeze([
    'result_context_crop',
    'form_context_crop',
    'target_context_crop',
    'container_context_crop',
    'manual_pin_crop',
    'full_screenshot_resized',
  ]);
  const TYPE_PRIORITY = Object.freeze({
    manual_pin_crop: 0,
    result_context_crop: 1,
    form_context_crop: 2,
    target_context_crop: 3,
    container_context_crop: 4,
  });

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizeViewport(viewport) {
    return {
      width: Math.max(0, Number(viewport && viewport.width || 0)),
      height: Math.max(0, Number(viewport && viewport.height || 0)),
    };
  }

  function normalizeBbox(bbox) {
    return {
      x: Number(bbox && bbox.x || 0),
      y: Number(bbox && bbox.y || 0),
      width: Math.max(1, Number(bbox && bbox.width || 1)),
      height: Math.max(1, Number(bbox && bbox.height || 1)),
    };
  }

  function selectCandidate(regionCandidates) {
    return [...regionCandidates]
      .filter((candidate) => candidate && candidate.bbox && TYPE_PRIORITY[candidate.type] !== undefined)
      .sort((left, right) => TYPE_PRIORITY[left.type] - TYPE_PRIORITY[right.type])[0] || null;
  }

  function cropFromBbox(candidate, viewport, options) {
    const bbox = normalizeBbox(candidate.bbox);
    const paddedWidth = bbox.width + options.padding * 2;
    const paddedHeight = bbox.height + options.padding * 2;
    let width = Math.min(Math.max(paddedWidth, options.minWidth), options.maxWidth, viewport.width);
    let height = Math.min(Math.max(paddedHeight, options.minHeight), options.maxHeight, viewport.height);
    width = Math.max(0, width);
    height = Math.max(0, height);

    let x = bbox.x - options.padding;
    let y = bbox.y - options.padding;
    if (width !== paddedWidth) {
      x = bbox.x + bbox.width / 2 - width / 2;
    }
    if (height !== paddedHeight) {
      y = bbox.y + bbox.height / 2 - height / 2;
    }

    return {
      x: Math.round(clamp(x, 0, Math.max(0, viewport.width - width))),
      y: Math.round(clamp(y, 0, Math.max(0, viewport.height - height))),
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  function selectCropRegion(regionCandidates = [], viewportInput = {}, optionOverrides = {}) {
    const viewport = normalizeViewport(viewportInput);
    const options = { ...DEFAULT_OPTIONS, ...optionOverrides };
    const candidate = selectCandidate(regionCandidates);
    if (!candidate) {
      return {
        cropType: 'full_screenshot_resized',
        region: { x: 0, y: 0, width: viewport.width, height: viewport.height },
      };
    }
    return {
      cropType: candidate.type,
      region: cropFromBbox(candidate, viewport, options),
    };
  }

  function defaultLoadImage(sourceImageDataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Image load failed'));
      image.src = sourceImageDataUrl;
    });
  }

  function defaultCreateCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  async function renderCrop(sourceImageDataUrl, selection, dependencies = {}) {
    const loadImage = dependencies.loadImage || defaultLoadImage;
    const createCanvas = dependencies.createCanvas || defaultCreateCanvas;
    const image = await loadImage(sourceImageDataUrl);
    const { x, y, width, height } = selection.region;
    const canvas = createCanvas(width, height);
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.drawImage(image, x, y, width, height, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.82);
  }

  function hasBbox(context) {
    return context && context.bbox && Number(context.bbox.width) > 0 && Number(context.bbox.height) > 0;
  }

  function buildRegionCandidates(evidence, options) {
    if (evidence && evidence.triggerType === 'manual-pin' && hasBbox(options.targetContext)) {
      return [{ type: 'manual_pin_crop', bbox: options.targetContext.bbox }];
    }

    const candidates = [];
    for (const entry of options.domDiff && options.domDiff.candidateResultElements || []) {
      if (hasBbox(entry)) candidates.push({ type: 'result_context_crop', bbox: entry.bbox });
    }
    if (hasBbox(options.containerContext) && options.containerContext.type === 'form') {
      candidates.push({ type: 'form_context_crop', bbox: options.containerContext.bbox });
    }
    if (hasBbox(options.targetContext)) {
      candidates.push({ type: 'target_context_crop', bbox: options.targetContext.bbox });
    }
    if (hasBbox(options.containerContext)) {
      candidates.push({ type: 'container_context_crop', bbox: options.containerContext.bbox });
    }
    return candidates;
  }

  function sourceImageOf(evidence) {
    return evidence.imageDataUrl || evidence.fullImageDataUrl || evidence.screenshotDataUrl || evidence.thumbnailDataUrl;
  }

  async function ensureImageField(evidence, fieldName, options = {}) {
    const selection = selectCropRegion(buildRegionCandidates(evidence, options), options.viewport || {});
    const dataUrl = await renderCrop(sourceImageOf(evidence), selection, options);
    evidence[fieldName] = dataUrl;
    evidence.imageMeta = {
      ...(evidence.imageMeta || {}),
      cropType: selection.cropType,
    };
    return evidence;
  }

  function ensureLlmImage(evidence, options = {}) {
    return ensureImageField(evidence, 'llmImageDataUrl', options);
  }

  function ensureDocImage(evidence, options = {}) {
    return ensureImageField(evidence, 'docImageDataUrl', options);
  }

  return {
    CROP_TYPES,
    ensureDocImage,
    ensureLlmImage,
    renderCrop,
    selectCropRegion,
  };
});
