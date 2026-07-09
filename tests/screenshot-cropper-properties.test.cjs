const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fc = require('fast-check');

const modulePath = path.resolve(__dirname, '../extension/shared/screenshot-cropper.js');

function loadCropper() {
  assert.equal(fs.existsSync(modulePath), true, 'screenshot-cropper module should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

const cropTypes = [
  'result_context_crop',
  'form_context_crop',
  'target_context_crop',
  'container_context_crop',
  'manual_pin_crop',
  'full_screenshot_resized',
];

function bboxArbitrary() {
  return fc.record({
    x: fc.integer({ min: -100, max: 1800 }),
    y: fc.integer({ min: -100, max: 1200 }),
    width: fc.integer({ min: 1, max: 1800 }),
    height: fc.integer({ min: 1, max: 1200 }),
  });
}

function successfulRenderDeps(dataUrl = 'data:image/jpeg;base64,next') {
  return {
    loadImage: async () => ({}),
    createCanvas: () => ({
      getContext: () => ({ drawImage() {} }),
      toDataURL: () => dataUrl,
    }),
  };
}

test('Property 14: result candidates always take highest crop priority', () => {
  const cropper = loadCropper();

  fc.assert(
    fc.property(
      fc.record({
        x: fc.integer({ min: 200, max: 400 }),
        y: fc.integer({ min: 200, max: 300 }),
        width: fc.integer({ min: 500, max: 700 }),
        height: fc.integer({ min: 300, max: 500 }),
      }),
      (bbox) => {
        const selected = cropper.selectCropRegion(
          [
            { type: 'target_context_crop', bbox: { x: 20, y: 20, width: 300, height: 200 } },
            { type: 'result_context_crop', bbox },
            { type: 'container_context_crop', bbox: { x: 0, y: 0, width: 1600, height: 1200 } },
          ],
          { width: 1800, height: 1400 },
        );

        assert.equal(selected.cropType, 'result_context_crop');
        assert.equal(selected.region.x, bbox.x - 140);
        assert.equal(selected.region.y, bbox.y - 140);
      },
    ),
    { numRuns: 100 },
  );
});

test('Property 26: crop padding is exactly 140px before clamping', () => {
  const cropper = loadCropper();

  fc.assert(
    fc.property(
      fc.record({
        x: fc.integer({ min: 300, max: 500 }),
        y: fc.integer({ min: 300, max: 500 }),
        width: fc.integer({ min: 600, max: 800 }),
        height: fc.integer({ min: 300, max: 500 }),
      }),
      (bbox) => {
        const selected = cropper.selectCropRegion([{ type: 'target_context_crop', bbox }], { width: 2000, height: 1600 });

        assert.equal(selected.region.x, bbox.x - 140);
        assert.equal(selected.region.width, bbox.width + 280);
      },
    ),
    { numRuns: 100 },
  );
});

test('Property 27: crop region is at least the minimum size when viewport allows it', () => {
  const cropper = loadCropper();

  fc.assert(
    fc.property(
      fc.record({
        viewportWidth: fc.integer({ min: 100, max: 1600 }),
        viewportHeight: fc.integer({ min: 100, max: 1200 }),
      }),
      ({ viewportWidth, viewportHeight }) => {
        const selected = cropper.selectCropRegion(
          [{ type: 'target_context_crop', bbox: { x: 10, y: 10, width: 20, height: 20 } }],
          { width: viewportWidth, height: viewportHeight },
        );

        assert.equal(selected.region.width >= Math.min(760, viewportWidth), true);
        assert.equal(selected.region.height >= Math.min(480, viewportHeight), true);
      },
    ),
    { numRuns: 100 },
  );
});

test('Property 28: crop region respects max size and longest-side limit', () => {
  const cropper = loadCropper();

  fc.assert(
    fc.property(bboxArbitrary(), (bbox) => {
      const selected = cropper.selectCropRegion([{ type: 'container_context_crop', bbox }], { width: 2600, height: 2000 });

      assert.equal(selected.region.width <= 1280, true);
      assert.equal(selected.region.height <= 900, true);
      assert.equal(Math.max(selected.region.width, selected.region.height) <= 1280, true);
    }),
    { numRuns: 100 },
  );
});

test('Property 29: crop region always remains inside viewport bounds', () => {
  const cropper = loadCropper();

  fc.assert(
    fc.property(bboxArbitrary(), (bbox) => {
      const viewport = { width: 1000, height: 800 };
      const selected = cropper.selectCropRegion([{ type: 'target_context_crop', bbox }], viewport);

      assert.equal(selected.region.x >= 0, true);
      assert.equal(selected.region.y >= 0, true);
      assert.equal(selected.region.x + selected.region.width <= viewport.width, true);
      assert.equal(selected.region.y + selected.region.height <= viewport.height, true);
    }),
    { numRuns: 100 },
  );
});

test('Property 30: cropType always belongs to the six-value enum', () => {
  const cropper = loadCropper();

  fc.assert(
    fc.property(fc.array(fc.record({ type: fc.constantFrom(...cropTypes), bbox: bboxArbitrary() }), { maxLength: 4 }), (candidates) => {
      const selected = cropper.selectCropRegion(candidates, { width: 1200, height: 900 });

      assert.equal(cropTypes.includes(selected.cropType), true);
    }),
    { numRuns: 100 },
  );
});

test('Property 23: ensureLlmImage and ensureDocImage only modify their target image fields', async () => {
  const cropper = loadCropper();

  await fc.assert(
    fc.asyncProperty(fc.constantFrom('llm', 'doc'), async (target) => {
      const evidence = {
        id: 'CAP-1',
        triggerType: 'click',
        imageDataUrl: 'data:image/png;base64,source',
        thumbnailDataUrl: 'thumb',
        llmImageDataUrl: 'old-llm',
        docImageDataUrl: 'old-doc',
        imageMeta: { previous: true },
      };
      const input = {
        targetContext: { bbox: { x: 10, y: 10, width: 120, height: 80 } },
        viewport: { width: 1000, height: 800 },
        ...successfulRenderDeps(`new-${target}`),
      };

      if (target === 'llm') {
        await cropper.ensureLlmImage(evidence, input);
        assert.equal(evidence.llmImageDataUrl, 'new-llm');
        assert.equal(evidence.docImageDataUrl, 'old-doc');
      } else {
        await cropper.ensureDocImage(evidence, input);
        assert.equal(evidence.docImageDataUrl, 'new-doc');
        assert.equal(evidence.llmImageDataUrl, 'old-llm');
      }
      assert.equal(evidence.thumbnailDataUrl, 'thumb');
      assert.equal(evidence.imageDataUrl, 'data:image/png;base64,source');
      assert.equal(evidence.imageMeta.previous, true);
      assert.equal(cropTypes.includes(evidence.imageMeta.cropType), true);
    }),
    { numRuns: 20 },
  );
});

test('Property 24: image rendering failure never partially writes the target field', async () => {
  const cropper = loadCropper();

  await fc.assert(
    fc.asyncProperty(fc.constantFrom('llm', 'doc'), async (target) => {
      const evidence = {
        id: 'CAP-1',
        triggerType: 'click',
        imageDataUrl: 'data:image/png;base64,source',
        llmImageDataUrl: 'old-llm',
        docImageDataUrl: 'old-doc',
        imageMeta: { previous: true },
      };
      const input = {
        targetContext: { bbox: { x: 10, y: 10, width: 120, height: 80 } },
        viewport: { width: 1000, height: 800 },
        loadImage: async () => {
          throw new Error('render failed');
        },
        createCanvas: () => null,
      };

      await assert.rejects(
        () => target === 'llm' ? cropper.ensureLlmImage(evidence, input) : cropper.ensureDocImage(evidence, input),
        /render failed/,
      );
      assert.equal(evidence.llmImageDataUrl, 'old-llm');
      assert.equal(evidence.docImageDataUrl, 'old-doc');
      assert.deepEqual(evidence.imageMeta, { previous: true });
    }),
    { numRuns: 20 },
  );
});
