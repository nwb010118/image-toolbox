const assert = require('assert');
const { MAX_BATCH_FILES, getBatchOutputName } = require('../js/batchTools.js');

function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); } catch (err) { console.error('FAIL: ' + name); console.error(err.message); process.exitCode = 1; }
}

test('MAX_BATCH_FILES is 10', function () {
  assert.strictEqual(MAX_BATCH_FILES, 10);
});

test('getBatchOutputName swaps the extension and adds -compressed', function () {
  assert.strictEqual(getBatchOutputName('photo.png', 'jpg', {}), 'photo-compressed.jpg');
});

test('getBatchOutputName keeps dots inside the base name and handles names without extension', function () {
  assert.strictEqual(getBatchOutputName('my.photo.final.jpeg', 'webp', {}), 'my.photo.final-compressed.webp');
  assert.strictEqual(getBatchOutputName('noext', 'jpg', {}), 'noext-compressed.jpg');
});

test('getBatchOutputName de-duplicates names case-insensitively so a ZIP never has clashing entries', function () {
  var used = {};
  assert.strictEqual(getBatchOutputName('a.png', 'jpg', used), 'a-compressed.jpg');
  assert.strictEqual(getBatchOutputName('a.webp', 'jpg', used), 'a-compressed-2.jpg');
  assert.strictEqual(getBatchOutputName('A.PNG', 'jpg', used), 'A-compressed-3.jpg');
});

test('getBatchOutputName keeps Korean file names intact', function () {
  assert.strictEqual(getBatchOutputName('한글 사진.png', 'jpg', {}), '한글 사진-compressed.jpg');
});
