const assert = require('assert');
const {describeSizeChange} = require('../js/imageTools');
const cases = [
  ['reduction', 10240, 2048, '약 80.0% 감소 · 8.0 KB 절약'],
  ['increase', 1024, 2048, '약 100.0% 증가 · 1.0 KB 증가'],
  ['unchanged', 1024, 1024, '용량 변화 없음'],
  ['zero input', 0, 1024, '원본 용량을 비교할 수 없습니다.'],
  ['tiny reduction', 100000, 99999, '약 0.1% 미만 감소 · 1 B 절약']
];
for (const [name, original, result, expected] of cases) {
  assert.strictEqual(describeSizeChange(original, result), expected);
  console.log('PASS: size change ' + name);
}
