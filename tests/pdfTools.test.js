const assert = require('assert');
const {
  isValidFileSize,
  isValidImageCount,
  isValidPageCount,
  isValidPdfFile,
  getPdfOutputFilename,
  getBaseFileName,
  getPageImageFilename,
  getPdfPageOrientation,
  MAX_FILE_SIZE,
  MAX_IMAGE_COUNT,
  MAX_PDF_PAGES
} = require('../js/pdfTools.js');

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

test('isValidFileSize accepts sizes within range', () => {
  assert.strictEqual(isValidFileSize(1), true);
  assert.strictEqual(isValidFileSize(MAX_FILE_SIZE), true);
});

test('isValidFileSize rejects zero, negative, or over-limit sizes', () => {
  assert.strictEqual(isValidFileSize(0), false);
  assert.strictEqual(isValidFileSize(-5), false);
  assert.strictEqual(isValidFileSize(MAX_FILE_SIZE + 1), false);
});

test('isValidImageCount accepts 1..MAX_IMAGE_COUNT', () => {
  assert.strictEqual(isValidImageCount(1), true);
  assert.strictEqual(isValidImageCount(MAX_IMAGE_COUNT), true);
});

test('isValidImageCount rejects 0 or over-limit counts', () => {
  assert.strictEqual(isValidImageCount(0), false);
  assert.strictEqual(isValidImageCount(MAX_IMAGE_COUNT + 1), false);
});

test('isValidPageCount accepts 1..MAX_PDF_PAGES', () => {
  assert.strictEqual(isValidPageCount(1), true);
  assert.strictEqual(isValidPageCount(MAX_PDF_PAGES), true);
});

test('isValidPageCount rejects 0 or over-limit counts', () => {
  assert.strictEqual(isValidPageCount(0), false);
  assert.strictEqual(isValidPageCount(MAX_PDF_PAGES + 1), false);
});

test('isValidPdfFile accepts application/pdf mime type', () => {
  assert.strictEqual(isValidPdfFile({ type: 'application/pdf', name: 'report.pdf' }), true);
});

test('isValidPdfFile accepts .pdf extension when mime type is empty', () => {
  assert.strictEqual(isValidPdfFile({ type: '', name: 'REPORT.PDF' }), true);
});

test('isValidPdfFile rejects non-PDF files', () => {
  assert.strictEqual(isValidPdfFile({ type: 'image/png', name: 'photo.png' }), false);
});

test('isValidPdfFile rejects null/undefined', () => {
  assert.strictEqual(isValidPdfFile(null), false);
  assert.strictEqual(isValidPdfFile(undefined), false);
});

test('getPdfOutputFilename returns a fixed name', () => {
  assert.strictEqual(getPdfOutputFilename(), 'images.pdf');
});

test('getBaseFileName strips the last extension', () => {
  assert.strictEqual(getBaseFileName('report.pdf'), 'report');
  assert.strictEqual(getBaseFileName('a.b.pdf'), 'a.b');
  assert.strictEqual(getBaseFileName('noext'), 'noext');
});

test('getPageImageFilename pads page numbers to match total page digit count', () => {
  assert.strictEqual(getPageImageFilename('doc', 1, 5), 'doc-page-1.png');
  assert.strictEqual(getPageImageFilename('doc', 3, 12), 'doc-page-03.png');
  assert.strictEqual(getPageImageFilename('doc', 7, 125), 'doc-page-007.png');
});

test('getPdfPageOrientation returns landscape for wide or square images', () => {
  assert.strictEqual(getPdfPageOrientation(1000, 500), 'l');
  assert.strictEqual(getPdfPageOrientation(500, 500), 'l');
});

test('getPdfPageOrientation returns portrait for tall images', () => {
  assert.strictEqual(getPdfPageOrientation(500, 1000), 'p');
});

if (process.exitCode !== 1) {
  console.log('\n모든 테스트 통과');
}
