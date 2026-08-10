const assert = require('assert');
const { formatBytes, isSupportedImageType, getOutputMimeType } = require('../js/imageTools.js');

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

test('formatBytes formats bytes under 1024 as B', () => {
  assert.strictEqual(formatBytes(500), '500 B');
});

test('formatBytes formats kilobytes with one decimal', () => {
  assert.strictEqual(formatBytes(2048), '2.0 KB');
});

test('formatBytes formats megabytes with one decimal', () => {
  assert.strictEqual(formatBytes(3 * 1024 * 1024), '3.0 MB');
});

test('isSupportedImageType accepts jpeg, png, webp', () => {
  assert.strictEqual(isSupportedImageType('image/jpeg'), true);
  assert.strictEqual(isSupportedImageType('image/png'), true);
  assert.strictEqual(isSupportedImageType('image/webp'), true);
});

test('isSupportedImageType rejects unsupported types', () => {
  assert.strictEqual(isSupportedImageType('image/gif'), false);
  assert.strictEqual(isSupportedImageType('application/pdf'), false);
});

test('getOutputMimeType returns the same type for supported input', () => {
  assert.strictEqual(getOutputMimeType('image/jpeg'), 'image/jpeg');
  assert.strictEqual(getOutputMimeType('image/webp'), 'image/webp');
});

test('getOutputMimeType returns null for unsupported input', () => {
  assert.strictEqual(getOutputMimeType('image/gif'), null);
});

if (process.exitCode !== 1) {
  console.log('\n모든 테스트 통과');
}
