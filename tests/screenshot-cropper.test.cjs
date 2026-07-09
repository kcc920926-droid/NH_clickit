const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '../extension/shared/screenshot-cropper.js');

function loadCropper() {
  assert.equal(fs.existsSync(modulePath), true, 'screenshot-cropper module should exist');
  delete require.cache[modulePath];
  return require(modulePath);
}

test('selectCropRegion returns full_screenshot_resized for empty candidates', () => {
  const cropper = loadCropper();

  const selected = cropper.selectCropRegion([], { width: 1440, height: 900 });

  assert.deepEqual(selected, {
    cropType: 'full_screenshot_resized',
    region: { x: 0, y: 0, width: 1440, height: 900 },
  });
});

test('renderCrop draws the selected region and returns jpeg data URL', async () => {
  const cropper = loadCropper();
  const drawCalls = [];
  const canvas = {
    width: 0,
    height: 0,
    getContext(type) {
      assert.equal(type, '2d');
      return {
        drawImage(...args) {
          drawCalls.push(args);
        },
      };
    },
    toDataURL(type, quality) {
      assert.equal(type, 'image/jpeg');
      assert.equal(quality, 0.82);
      return 'data:image/jpeg;base64,crop';
    },
  };

  const result = await cropper.renderCrop(
    'data:image/png;base64,source',
    { cropType: 'target_context_crop', region: { x: 10, y: 20, width: 300, height: 200 } },
    {
      loadImage: async () => ({ naturalWidth: 800, naturalHeight: 600 }),
      createCanvas: () => canvas,
    },
  );

  assert.equal(result, 'data:image/jpeg;base64,crop');
  assert.equal(canvas.width, 300);
  assert.equal(canvas.height, 200);
  assert.deepEqual(drawCalls[0], [{ naturalWidth: 800, naturalHeight: 600 }, 10, 20, 300, 200, 0, 0, 300, 200]);
});
