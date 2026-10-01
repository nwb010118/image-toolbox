const assert = require('assert');
const { fitToTargetSize, parseTargetBytes, QUALITY_LEVELS, PALETTE_LEVELS, MIN_SCALE } = require('../js/targetSize.js');

function test(name, fn) {
  Promise.resolve().then(fn).then(
    function () { console.log('PASS: ' + name); },
    function (err) { console.error('FAIL: ' + name); console.error(err.message); process.exitCode = 1; }
  );
}

// Fake encoder: size grows with level and with scale^2.
function fakeEncoder(basePerUnit) {
  var calls = [];
  var fn = function (level, scale) {
    calls.push({ level: level, scale: scale });
    return Promise.resolve({ size: Math.round(basePerUnit * level * scale * scale) });
  };
  fn.calls = calls;
  return fn;
}

test('parseTargetBytes converts KB and MB and rejects bad input', function () {
  assert.strictEqual(parseTargetBytes('200', 'KB'), 204800);
  assert.strictEqual(parseTargetBytes('1.5', 'MB'), 1572864);
  assert.strictEqual(parseTargetBytes('0', 'KB'), null);
  assert.strictEqual(parseTargetBytes('abc', 'KB'), null);
  assert.strictEqual(parseTargetBytes('', 'KB'), null);
});

test('picks the highest quality that fits (not just any quality that fits)', function () {
  var enc = fakeEncoder(1000000); // size = 1,000,000 * level
  return fitToTargetSize(enc, 520000).then(function (r) {
    assert.strictEqual(r.fit, true);
    assert.strictEqual(r.scale, 1);
    assert.strictEqual(r.level, 0.5);
    assert.ok(r.blob.size <= 520000);
    // the next higher level really would not have fit
    assert.ok(1000000 * 0.55 > 520000);
  });
});

test('uses binary search, not a linear scan', function () {
  var enc = fakeEncoder(1000000);
  return fitToTargetSize(enc, 520000).then(function () {
    assert.ok(enc.calls.length <= 7, 'expected <= 7 encodes, got ' + enc.calls.length);
  });
});

test('returns full quality when the original already fits', function () {
  var enc = fakeEncoder(1000);
  return fitToTargetSize(enc, 5000).then(function (r) {
    assert.strictEqual(r.fit, true);
    assert.strictEqual(r.level, 1);
    assert.strictEqual(r.scale, 1);
  });
});

test('downscales when even the lowest quality is too large', function () {
  var enc = fakeEncoder(10000000); // lowest level 0.1 -> 1,000,000
  return fitToTargetSize(enc, 400000).then(function (r) {
    assert.strictEqual(r.fit, true);
    assert.ok(r.scale < 1);
    assert.ok(r.blob.size <= 400000);
  });
});

test('gives up gracefully (fit=false) when the target is unreachable', function () {
  var enc = fakeEncoder(100000000);
  return fitToTargetSize(enc, 10).then(function (r) {
    assert.strictEqual(r.fit, false);
    assert.ok(r.blob);
    assert.ok(r.scale >= MIN_SCALE * 0.85 - 1e-9 || r.scale >= MIN_SCALE);
  });
});

test('respects allowDownscale=false', function () {
  var enc = fakeEncoder(10000000);
  return fitToTargetSize(enc, 400000, { allowDownscale: false }).then(function (r) {
    assert.strictEqual(r.fit, false);
    assert.strictEqual(r.scale, 1);
  });
});

test('works with palette levels for PNG', function () {
  var enc = fakeEncoder(2560); // size = 2560 * colors -> 256 colors = 655,360
  return fitToTargetSize(enc, 200000, { levels: PALETTE_LEVELS }).then(function (r) {
    assert.strictEqual(r.fit, true);
    assert.strictEqual(r.level, 64);
  });
});

test('level tables are ordered from highest to lowest fidelity', function () {
  for (var i = 1; i < QUALITY_LEVELS.length; i++) assert.ok(QUALITY_LEVELS[i] < QUALITY_LEVELS[i - 1]);
  for (var j = 1; j < PALETTE_LEVELS.length; j++) assert.ok(PALETTE_LEVELS[j] < PALETTE_LEVELS[j - 1]);
});

test('prefers shrinking pixels over dropping to very low quality', function () {
  var enc = fakeEncoder(2000000); // size = 2,000,000 * level * scale^2
  var preferred = QUALITY_LEVELS.filter(function (q) { return q >= 0.4; });
  return fitToTargetSize(enc, 300000, { preferredLevels: preferred }).then(function (r) {
    assert.strictEqual(r.fit, true);
    assert.ok(r.level >= 0.4, 'quality fell to ' + r.level);
    assert.ok(r.scale < 1, 'expected a smaller pixel size');
  });
});

test('falls back to very low quality only when the smallest size still does not fit', function () {
  var enc = fakeEncoder(100000000); // far too big even at the smallest scale and 0.4 quality
  var preferred = QUALITY_LEVELS.filter(function (q) { return q >= 0.4; });
  return fitToTargetSize(enc, 300000, { preferredLevels: preferred }).then(function (r) {
    assert.ok(r.level < 0.4 || r.fit === false);
    assert.ok(r.scale <= 0.35);
  });
});
