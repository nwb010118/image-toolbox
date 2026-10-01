const assert = require('assert');
const t = require('../js/pdfExtraTools.js');

function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); } catch (err) { console.error('FAIL: ' + name); console.error(err.message); process.exitCode = 1; }
}

test('filenames', function () {
  assert.strictEqual(t.getMergedPdfFilename(), 'merged.pdf');
  assert.strictEqual(t.getShrunkPdfFilename('scan.PDF'), 'scan-compressed.pdf');
  assert.strictEqual(t.getShrunkPdfFilename('한글 문서.pdf'), '한글 문서-compressed.pdf');
  assert.strictEqual(t.getShrunkPdfFilename('noext'), 'noext-compressed.pdf');
});

test('merge limits: count and total size', function () {
  assert.strictEqual(t.canAddMergeFile(0, 0, { size: 1000 }), null);
  assert.strictEqual(t.canAddMergeFile(t.MAX_MERGE_FILES, 0, { size: 1 }), 'count');
  assert.strictEqual(t.canAddMergeFile(2, t.MAX_MERGE_TOTAL_BYTES - 10, { size: 11 }), 'size');
  assert.strictEqual(t.canAddMergeFile(2, t.MAX_MERGE_TOTAL_BYTES - 10, { size: 10 }), null);
});

test('shrink presets get smaller as the preset gets smaller', function () {
  assert.ok(t.SHRINK_PRESETS.high.scale > t.SHRINK_PRESETS.balanced.scale);
  assert.ok(t.SHRINK_PRESETS.balanced.scale > t.SHRINK_PRESETS.small.scale);
  assert.ok(t.SHRINK_PRESETS.high.quality > t.SHRINK_PRESETS.small.quality);
  assert.ok(Math.abs(t.SHRINK_PRESETS.high.scale - 150 / 72) < 1e-9);
});

test('planPageRender keeps A4 at 150 dpi unchanged and caps huge pages', function () {
  const a4 = t.planPageRender(595, 842, 150 / 72);
  assert.strictEqual(a4.width, Math.round(595 * 150 / 72));
  assert.ok(a4.width * a4.height < t.MAX_RENDER_PIXELS);
  const poster = t.planPageRender(5000, 5000, 2);
  assert.ok(poster.width * poster.height <= t.MAX_RENDER_PIXELS * 1.001);
  assert.ok(poster.scale < 2);
});
