const assert = require('assert');
const {
  isValidFileSize,
  isValidUpscaleDimensions,
  getUpscaledFilename,
  getUpscalePlan,
  isReachable,
  MAX_FILE_SIZE,
  MAX_UPSCALE_DIMENSION,
  MAX_AI_PASSES,
  MAX_AI_SCALE,
  RESOLUTION_PRESETS
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

test('RESOLUTION_PRESETS has 1440p and 4K long-edge targets', () => {
  assert.strictEqual(RESOLUTION_PRESETS['1440p'], 2560);
  assert.strictEqual(RESOLUTION_PRESETS['4K'], 3840);
});

test('MAX_AI_PASSES is 2 and MAX_AI_SCALE is 4', () => {
  assert.strictEqual(MAX_AI_PASSES, 2);
  assert.strictEqual(MAX_AI_SCALE, 4);
});

test('getUpscalePlan for 2x mode needs exactly 1 AI pass and no final resize', () => {
  var plan = getUpscalePlan('2x', 500, 300);
  assert.strictEqual(plan.reachable, true);
  assert.strictEqual(plan.aiPasses, 1);
  assert.strictEqual(plan.targetLongEdge, null);
});

test('getUpscalePlan for 4x mode needs exactly 2 AI passes and no final resize', () => {
  var plan = getUpscalePlan('4x', 500, 300);
  assert.strictEqual(plan.reachable, true);
  assert.strictEqual(plan.aiPasses, 2);
  assert.strictEqual(plan.targetLongEdge, null);
});

test('getUpscalePlan for 1440p uses 1 AI pass when 1 pass already reaches target', () => {
  var plan = getUpscalePlan('1440p', 1280, 960);
  assert.strictEqual(plan.reachable, true);
  assert.strictEqual(plan.aiPasses, 1);
  assert.strictEqual(plan.targetLongEdge, 2560);
});

test('getUpscalePlan for 1440p uses 2 AI passes when 1 pass is not enough', () => {
  var plan = getUpscalePlan('1440p', 1000, 750);
  assert.strictEqual(plan.reachable, true);
  assert.strictEqual(plan.aiPasses, 2);
  assert.strictEqual(plan.targetLongEdge, 2560);
});

test('getUpscalePlan for 1440p is unreachable below 640px long edge', () => {
  var reachablePlan = getUpscalePlan('1440p', 640, 480);
  assert.strictEqual(reachablePlan.reachable, true);
  var unreachablePlan = getUpscalePlan('1440p', 639, 480);
  assert.strictEqual(unreachablePlan.reachable, false);
  assert.strictEqual(unreachablePlan.aiPasses, null);
});

test('getUpscalePlan for 4K is unreachable below 960px long edge', () => {
  var reachablePlan = getUpscalePlan('4K', 960, 540);
  assert.strictEqual(reachablePlan.reachable, true);
  var unreachablePlan = getUpscalePlan('4K', 959, 540);
  assert.strictEqual(unreachablePlan.reachable, false);
});

test('getUpscalePlan for 4K at max input size (1000px) needs 2 AI passes', () => {
  var plan = getUpscalePlan('4K', 1000, 1000);
  assert.strictEqual(plan.reachable, true);
  assert.strictEqual(plan.aiPasses, 2);
});

test('isReachable mirrors getUpscalePlan.reachable', () => {
  assert.strictEqual(isReachable('1440p', 640, 480), true);
  assert.strictEqual(isReachable('1440p', 639, 480), false);
  assert.strictEqual(isReachable('2x', 10, 10), true);
});

test('getUpscaledFilename appends the mode suffix and forces .png extension', () => {
  assert.strictEqual(getUpscaledFilename('photo.jpg', '2x'), 'photo-2x.png');
  assert.strictEqual(getUpscaledFilename('photo.png', '4x'), 'photo-4x.png');
  assert.strictEqual(getUpscaledFilename('a.b.jpg', '1440p'), 'a.b-1440p.png');
  assert.strictEqual(getUpscaledFilename('noext', '4K'), 'noext-4K.png');
});

if (process.exitCode !== 1) {
  console.log('\n모든 테스트 통과');
}
