const assert = require('assert');
const { PrivacyMeter } = require('../js/privacyMeter.js');
const { isHeicFile, toJpegName } = require('../js/heicLoader.js');

function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); } catch (err) { console.error('FAIL: ' + name); console.error(err.message); process.exitCode = 1; }
}

test('binary bodies are detected, text bodies are not', function () {
  assert.strictEqual(PrivacyMeter.isBinaryBody(new Blob(['x'])), true);
  assert.strictEqual(PrivacyMeter.isBinaryBody(new ArrayBuffer(4)), true);
  assert.strictEqual(PrivacyMeter.isBinaryBody(new Uint8Array(4)), true);
  assert.strictEqual(PrivacyMeter.isBinaryBody('{"a":1}'), false);
  assert.strictEqual(PrivacyMeter.isBinaryBody(new URLSearchParams('a=1')), false);
  assert.strictEqual(PrivacyMeter.isBinaryBody(null), false);
  assert.strictEqual(PrivacyMeter.isBinaryBody(undefined), false);
});

test('FormData counts only when it contains a file/blob', function () {
  const textOnly = new FormData();
  textOnly.append('a', 'b');
  assert.strictEqual(PrivacyMeter.isBinaryBody(textOnly), false);
  const withFile = new FormData();
  withFile.append('file', new Blob(['abc']), 'a.png');
  assert.strictEqual(PrivacyMeter.isBinaryBody(withFile), true);
});

test('stats count binary uploads and bytes, ignore text, and can be reset', function () {
  PrivacyMeter.reset();
  PrivacyMeter._record('analytics ping');
  assert.strictEqual(PrivacyMeter.getStats().binaryUploads, 0);
  PrivacyMeter._record(new Blob([new Uint8Array(100)]));
  PrivacyMeter._record(new Uint8Array(28));
  assert.deepStrictEqual(PrivacyMeter.getStats(), { binaryUploads: 2, binaryBytes: 128 });
  PrivacyMeter.reset();
  assert.deepStrictEqual(PrivacyMeter.getStats(), { binaryUploads: 0, binaryBytes: 0 });
});

test('install wraps fetch and records a binary body but leaves GET untouched', function () {
  PrivacyMeter.reset();
  let called = 0;
  const fakeWin = {
    fetch: function () { called++; return Promise.resolve({}); },
    navigator: { sendBeacon: function () { return true; } },
    XMLHttpRequest: function () {}
  };
  fakeWin.XMLHttpRequest.prototype.send = function () { called++; };
  PrivacyMeter.install(fakeWin);
  fakeWin.fetch('https://x.test/a');
  fakeWin.fetch('https://x.test/a', { method: 'POST', body: new Blob(['img']) });
  fakeWin.navigator.sendBeacon('https://x.test/b', new Blob(['img']));
  new fakeWin.XMLHttpRequest().send(new Uint8Array(10));
  assert.strictEqual(called, 3); // fetch x2 + xhr; beacon is stubbed separately
  assert.strictEqual(PrivacyMeter.getStats().binaryUploads, 3);
  PrivacyMeter.reset();
});

test('isHeicFile recognises HEIC by mime type or extension (Windows often reports an empty type)', function () {
  assert.strictEqual(isHeicFile({ type: 'image/heic', name: 'a.heic' }), true);
  assert.strictEqual(isHeicFile({ type: 'image/heif', name: 'a' }), true);
  assert.strictEqual(isHeicFile({ type: '', name: 'IMG_0001.HEIC' }), true);
  assert.strictEqual(isHeicFile({ type: '', name: 'IMG_0001.heif' }), true);
  assert.strictEqual(isHeicFile({ type: 'image/jpeg', name: 'a.jpg' }), false);
  assert.strictEqual(isHeicFile(null), false);
});

test('toJpegName swaps the extension', function () {
  assert.strictEqual(toJpegName('IMG_0001.HEIC'), 'IMG_0001.jpg');
  assert.strictEqual(toJpegName('한글.heic'), '한글.jpg');
  assert.strictEqual(toJpegName('noext'), 'noext.jpg');
});
