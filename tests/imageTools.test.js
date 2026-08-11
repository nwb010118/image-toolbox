const assert = require('assert');
const {
  formatBytes,
  isSupportedImageType,
  getOutputMimeType,
  calculateAspectRatioHeight,
  calculateAspectRatioWidth,
  resolveDimensions,
  resolveOutputMimeType,
  getExtensionForMimeType,
  isValidDimensionInput,
  clampDimensionsToMax,
  MAX_DIMENSION
} = require('../js/imageTools.js');

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

test('calculateAspectRatioHeight scales height proportionally to new width', () => {
  assert.strictEqual(calculateAspectRatioHeight(1000, 500, 400), 200);
});

test('calculateAspectRatioHeight rounds to nearest integer', () => {
  assert.strictEqual(calculateAspectRatioHeight(1000, 333, 700), 233);
});

test('calculateAspectRatioWidth scales width proportionally to new height', () => {
  assert.strictEqual(calculateAspectRatioWidth(1000, 500, 100), 200);
});

test('resolveDimensions keeps original size when neither dimension given', () => {
  const result = resolveDimensions(1000, 500, null, null);
  assert.deepStrictEqual(result, { width: 1000, height: 500 });
});

test('resolveDimensions uses both values as-is when both given (free stretch)', () => {
  const result = resolveDimensions(1000, 500, 300, 300);
  assert.deepStrictEqual(result, { width: 300, height: 300 });
});

test('resolveDimensions derives height from width when only width given', () => {
  const result = resolveDimensions(1000, 500, 400, null);
  assert.deepStrictEqual(result, { width: 400, height: 200 });
});

test('resolveDimensions derives width from height when only height given', () => {
  const result = resolveDimensions(1000, 500, null, 100);
  assert.deepStrictEqual(result, { width: 200, height: 100 });
});

test('resolveOutputMimeType passes through original type when format is "original"', () => {
  assert.strictEqual(resolveOutputMimeType('image/png', 'original'), 'image/png');
});

test('resolveOutputMimeType returns explicitly selected supported format', () => {
  assert.strictEqual(resolveOutputMimeType('image/png', 'image/jpeg'), 'image/jpeg');
});

test('resolveOutputMimeType returns null for unsupported explicit format', () => {
  assert.strictEqual(resolveOutputMimeType('image/png', 'image/gif'), null);
});

test('getExtensionForMimeType maps known mime types to extensions', () => {
  assert.strictEqual(getExtensionForMimeType('image/jpeg'), 'jpg');
  assert.strictEqual(getExtensionForMimeType('image/png'), 'png');
  assert.strictEqual(getExtensionForMimeType('image/webp'), 'webp');
});

test('getExtensionForMimeType falls back to jpg for unknown mime type', () => {
  assert.strictEqual(getExtensionForMimeType('image/gif'), 'jpg');
});

test('isValidDimensionInput accepts values within 1..MAX_DIMENSION', () => {
  assert.strictEqual(isValidDimensionInput(1), true);
  assert.strictEqual(isValidDimensionInput(MAX_DIMENSION), true);
  assert.strictEqual(isValidDimensionInput(1234), true);
});

test('isValidDimensionInput rejects out-of-range or non-numeric values', () => {
  assert.strictEqual(isValidDimensionInput(0), false);
  assert.strictEqual(isValidDimensionInput(-5), false);
  assert.strictEqual(isValidDimensionInput(MAX_DIMENSION + 1), false);
  assert.strictEqual(isValidDimensionInput(NaN), false);
});

test('clampDimensionsToMax returns unchanged dimensions when within range', () => {
  assert.deepStrictEqual(clampDimensionsToMax(1000, 500), { width: 1000, height: 500 });
});

test('clampDimensionsToMax scales down wide images to MAX_DIMENSION width', () => {
  assert.deepStrictEqual(clampDimensionsToMax(16000, 8000), { width: 8000, height: 4000 });
});

test('clampDimensionsToMax scales down tall images to MAX_DIMENSION height', () => {
  assert.deepStrictEqual(clampDimensionsToMax(4000, 16000), { width: 2000, height: 8000 });
});

test('clampDimensionsToMax scales down square oversized images', () => {
  assert.deepStrictEqual(clampDimensionsToMax(10000, 10000), { width: 8000, height: 8000 });
});

if (process.exitCode !== 1) {
  console.log('\n모든 테스트 통과');
}
