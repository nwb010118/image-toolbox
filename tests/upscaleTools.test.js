const assert = require('assert');
const {
  isValidFileSize,
  isValidUpscaleDimensions,
  getUpscaledFilename,
  MAX_FILE_SIZE,
  MAX_UPSCALE_DIMENSION
} = require('../js/upscaleTools.js');

function test(name, fn) {
  try {
    fn();
    console.log('PASS: ' + name);
  } catch (err) {
    console.error('FAIL: ' + name);
    console.error(err);
    process.exitCode = 1;
  }
}

test('MAX_FILE_SIZE is 20MB', () => {
  assert.strictEqual(MAX_FILE_SIZE, 20 * 1024 * 1024);
});

test('MAX_UPSCALE_DIMENSION is 1000', () => {
  assert.strictEqual(MAX_UPSCALE_DIMENSION, 1000);
});

test('isValidFileSize accepts sizes within range', () => {
  assert.strictEqual(isValidFileSize(1), true);
  assert.strictEqual(isValidFileSize(MAX_FILE_SIZE), true);
});

test('isValidFileSize rejects zero, negative, or over-limit sizes', () => {
  assert.strictEqual(isValidFileSize(0), false);
  assert.strictEqual(isValidFileSize(-5), false);
  assert.strictEqual(isValidFileSize(MAX_FILE_SIZE + 1), false);
});

test('isValidUpscaleDimensions accepts dimensions within 1..1000', () => {
  assert.strictEqual(isValidUpscaleDimensions(1, 1), true);
  assert.strictEqual(isValidUpscaleDimensions(1000, 1000), true);
  assert.strictEqual(isValidUpscaleDimensions(640, 480), true);
});

test('isValidUpscaleDimensions rejects zero, negative, or over-limit dimensions', () => {
  assert.strictEqual(isValidUpscaleDimensions(0, 500), false);
  assert.strictEqual(isValidUpscaleDimensions(500, 0), false);
  assert.strictEqual(isValidUpscaleDimensions(1001, 500), false);
  assert.strictEqual(isValidUpscaleDimensions(500, 1001), false);
  assert.strictEqual(isValidUpscaleDimensions(-1, 500), false);
});

test('getUpscaledFilename appends -2x and forces .png extension', () => {
  assert.strictEqual(getUpscaledFilename('photo.jpg'), 'photo-2x.png');
  assert.strictEqual(getUpscaledFilename('photo.png'), 'photo-2x.png');
  assert.strictEqual(getUpscaledFilename('a.b.jpg'), 'a.b-2x.png');
  assert.strictEqual(getUpscaledFilename('noext'), 'noext-2x.png');
});

if (process.exitCode !== 1) {
  console.log('\n모든 테스트 통과');
}
