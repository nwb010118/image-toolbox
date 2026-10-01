const assert = require('assert');
const { computeCoverCrop, fitInside, PRESETS, getPreset } = require('../js/cropTools.js');

function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); } catch (err) { console.error('FAIL: ' + name); console.error(err.message); process.exitCode = 1; }
}

function close(a, b) { return Math.abs(a - b) < 1e-6; }

test('wide source cropped to a tall target keeps full height and centres horizontally', function () {
  const c = computeCoverCrop(4000, 3000, 1080, 1350, 0.5, 0.5);
  assert.ok(close(c.sh, 3000));
  assert.ok(close(c.sw, 3000 * 1080 / 1350));
  assert.ok(close(c.sx, (4000 - c.sw) / 2));
  assert.ok(close(c.sy, 0));
});

test('tall source cropped to a wide target keeps full width', function () {
  const c = computeCoverCrop(3000, 4000, 1300, 885, 0.5, 0.5);
  assert.ok(close(c.sw, 3000));
  assert.ok(close(c.sh, 3000 * 885 / 1300));
});

test('crop rectangle always has the target aspect ratio and stays inside the source', function () {
  [[4000, 3000], [3000, 4000], [1000, 1000], [641, 480]].forEach(function (src) {
    PRESETS.filter(function (p) { return p.width; }).forEach(function (p) {
      [0, 0.25, 0.5, 1].forEach(function (pos) {
        const c = computeCoverCrop(src[0], src[1], p.width, p.height, pos, pos);
        assert.ok(close(c.sw / c.sh, p.width / p.height), 'ratio ' + p.id);
        assert.ok(c.sx >= -1e-9 && c.sy >= -1e-9);
        assert.ok(c.sx + c.sw <= src[0] + 1e-6 && c.sy + c.sh <= src[1] + 1e-6);
      });
    });
  });
});

test('position slider moves the crop window to the edges', function () {
  const left = computeCoverCrop(4000, 3000, 1000, 1000, 0, 0.5);
  const right = computeCoverCrop(4000, 3000, 1000, 1000, 1, 0.5);
  assert.ok(close(left.sx, 0));
  assert.ok(close(right.sx + right.sw, 4000));
});

test('same-ratio source needs no crop', function () {
  const c = computeCoverCrop(2160, 2700, 1080, 1350, 0.5, 0.5);
  assert.ok(close(c.sx, 0) && close(c.sy, 0) && close(c.sw, 2160) && close(c.sh, 2700));
});

test('fitInside never upsizes and keeps ratio', function () {
  assert.deepStrictEqual(fitInside(800, 600, 1600), { width: 800, height: 600 });
  assert.deepStrictEqual(fitInside(4000, 3000, 1600), { width: 1600, height: 1200 });
  assert.deepStrictEqual(fitInside(3000, 4000, 1600), { width: 1200, height: 1600 });
});

test('presets have unique ids, bilingual labels, and valid sizes', function () {
  const ids = {};
  PRESETS.forEach(function (p) {
    assert.ok(!ids[p.id], 'duplicate id ' + p.id);
    ids[p.id] = true;
    assert.ok(p.ko && p.en);
    assert.ok((p.width && p.height) || p.longEdge, 'preset needs a size: ' + p.id);
    assert.ok(!p.width || (p.width <= 8000 && p.height <= 8000));
  });
  assert.strictEqual(getPreset('id-photo').width, 413);
  assert.strictEqual(getPreset('id-photo').height, 531);
  assert.strictEqual(getPreset('nope'), null);
});

test('preset figures match the figures published in the guides', function () {
  assert.strictEqual(getPreset('instagram-feed').width + 'x' + getPreset('instagram-feed').height, '1080x1350');
  assert.strictEqual(getPreset('naver-thumb').width + 'x' + getPreset('naver-thumb').height, '1300x885');
  assert.strictEqual(getPreset('youtube-thumb').width + 'x' + getPreset('youtube-thumb').height, '3840x2160');
  assert.strictEqual(getPreset('youtube-thumb').maxBytes, 2 * 1024 * 1024);
});
