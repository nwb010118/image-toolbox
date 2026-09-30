const assert = require('assert');
const { STRINGS, resolveString } = require('../js/strings');

function test(name, fn) {
  try {
    fn();
    console.log('PASS: ' + name);
  } catch (err) {
    console.error('FAIL: ' + name);
    console.error(err.message);
    process.exitCode = 1;
  }
}

test('every string key has both ko and en translations', function () {
  Object.keys(STRINGS).forEach(function (key) {
    var entry = STRINGS[key];
    assert.ok(typeof entry.ko === 'string' && entry.ko.length > 0, key + ' missing ko text');
    assert.ok(typeof entry.en === 'string' && entry.en.length > 0, key + ' missing en text');
  });
});

test('resolveString returns the ko text for lang=ko', function () {
  assert.strictEqual(resolveString('chooseFile', null, 'ko'), '파일 선택');
});

test('resolveString returns the en text for lang=en', function () {
  assert.strictEqual(resolveString('chooseFile', null, 'en'), 'Choose File');
});

test('resolveString substitutes a single {placeholder}', function () {
  assert.strictEqual(resolveString('originalSizeLabel', { size: '1.2 MB' }, 'ko'), '원본 크기: 1.2 MB');
  assert.strictEqual(resolveString('originalSizeLabel', { size: '1.2 MB' }, 'en'), 'Original size: 1.2 MB');
});

test('resolveString substitutes multiple {placeholders}', function () {
  assert.strictEqual(
    resolveString('processingPageProgress', { current: 2, total: 5 }, 'en'),
    'Processing... (2/5)'
  );
  assert.strictEqual(
    resolveString('processingPageProgress', { current: 2, total: 5 }, 'ko'),
    '처리 중... (2/5)'
  );
});

test('resolveString falls back to the key itself for an unknown key', function () {
  assert.strictEqual(resolveString('doesNotExist', null, 'en'), 'doesNotExist');
});

test('resolveString falls back to ko text when en is somehow missing', function () {
  var backupEn = STRINGS.chooseFile.en;
  delete STRINGS.chooseFile.en;
  assert.strictEqual(resolveString('chooseFile', null, 'en'), '파일 선택');
  STRINGS.chooseFile.en = backupEn;
});
