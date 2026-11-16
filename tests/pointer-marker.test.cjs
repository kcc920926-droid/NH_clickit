const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const marker = require('../extension/shared/pointer-marker.js');
const read = (relative) => fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8');

test('클릭 표시는 기본으로 꺼져 있고, 모르는 값은 기본값으로 바꾼다', () => {
  assert.deepEqual(marker.normalizeSettings(null), { enabled: false, shape: 'ring', color: 'red', size: 'medium' });
  assert.deepEqual(marker.normalizeSettings({ enabled: 1, shape: 'star', color: 'pink', size: 'huge' }), { enabled: true, shape: 'ring', color: 'red', size: 'medium' });
  assert.deepEqual(marker.SHAPES.map((item) => item.id), ['ring', 'dot', 'arrow', 'crosshair']);
});

test('클릭 위치(CSS 픽셀)를 고해상도 화면의 이미지 픽셀로 바꾸고, 화면 밖이면 그리지 않는다', () => {
  assert.deepEqual(marker.imagePoint({ x: 100, y: 50 }, { width: 1280, height: 800 }, { width: 2560, height: 1600 }), { x: 200, y: 100, pixelScale: 2 });
  assert.equal(marker.imagePoint({ x: 1300, y: 50 }, { width: 1280, height: 800 }, { width: 1280, height: 800 }), null);
  assert.equal(marker.imagePoint(null, { width: 1280, height: 800 }, { width: 1280, height: 800 }), null);
});

test('모양마다 실제로 그린다', () => {
  for (const shape of marker.SHAPES) {
    const calls = [];
    const ctx = new Proxy({}, {
      get: (target, key) => (key in target ? target[key] : (...args) => calls.push([key, ...args])),
      set: (target, key, value) => { target[key] = value; return true; },
    });
    marker.drawMarker(ctx, 10, 10, { shape: shape.id, color: 'blue', size: 'large' }, 2);
    assert.ok(calls.some(([name]) => name === 'stroke' || name === 'fill'), shape.id);
  }
});

test('클릭 캡처에만 위치를 붙이고, 설정이 켜져 있을 때 서비스 워커가 화면에 그려 넣는다', () => {
  const content = read('extension/content.js');
  assert.match(content, /lastPointer = topPointFromEvent\(event\);/);
  assert.match(content, /if \(triggerType !== 'click' \|\| !pointer \|\| Date\.now\(\) - pointer\.at > 10000\) return null;/);
  assert.match(content, /while \(win !== win\.top\) \{/, 'iframe 안 클릭은 최상위 화면 기준으로 바꾼다');
  const background = read('extension/background.js');
  assert.match(background, /import '\.\/shared\/pointer-marker\.js';/);
  assert.match(background, /captureVisible: async \(request\) => markClickPoint\(await captureVisibleGuarded\(targetTabId, captureOptions\), request\)/);
  assert.match(background, /pointer: message\.pointer \|\| null,/);
  assert.match(background, /const \{ pointerMarker \} = await chrome\.storage\.local\.get\('pointerMarker'\);/);
  const html = read('extension/editor.html');
  for (const id of ['open-capture-settings', 'capture-settings-dialog', 'pointer-enabled', 'pointer-shapes', 'pointer-colors', 'pointer-sizes', 'pointer-preview']) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
});
