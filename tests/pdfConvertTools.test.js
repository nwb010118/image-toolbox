const assert = require('assert');
const {
  hasSubstantialText,
  groupTextItemsIntoLines,
  groupLinesIntoParagraphs,
  concatenatePagesLinesText,
  getConvertedFilename,
  MIN_TEXT_LENGTH_FOR_CONVERSION,
  LINE_Y_TOLERANCE,
  PARAGRAPH_GAP_THRESHOLD
} = require('../js/pdfConvertTools.js');

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

test('MIN_TEXT_LENGTH_FOR_CONVERSION is 20', () => {
  assert.strictEqual(MIN_TEXT_LENGTH_FOR_CONVERSION, 20);
});

test('hasSubstantialText accepts text at/above the threshold', () => {
  assert.strictEqual(hasSubstantialText('a'.repeat(MIN_TEXT_LENGTH_FOR_CONVERSION)), true);
  assert.strictEqual(hasSubstantialText('a'.repeat(100)), true);
});

test('hasSubstantialText rejects text below the threshold', () => {
  assert.strictEqual(hasSubstantialText('a'.repeat(MIN_TEXT_LENGTH_FOR_CONVERSION - 1)), false);
  assert.strictEqual(hasSubstantialText(''), false);
  assert.strictEqual(hasSubstantialText('   '), false);
});

test('hasSubstantialText rejects non-string input', () => {
  assert.strictEqual(hasSubstantialText(null), false);
  assert.strictEqual(hasSubstantialText(undefined), false);
});

test('groupTextItemsIntoLines groups items with the same y into one line', () => {
  const items = [
    { str: 'Hello', x: 10, y: 700 },
    { str: 'World', x: 60, y: 700 }
  ];
  const lines = groupTextItemsIntoLines(items, LINE_Y_TOLERANCE);
  assert.deepStrictEqual(lines, [{ y: 700, text: 'Hello World' }]);
});

test('groupTextItemsIntoLines starts a new line when y differs beyond tolerance', () => {
  const items = [
    { str: 'Hello', x: 10, y: 700 },
    { str: 'Next', x: 10, y: 650 }
  ];
  const lines = groupTextItemsIntoLines(items, LINE_Y_TOLERANCE);
  assert.deepStrictEqual(lines, [
    { y: 700, text: 'Hello' },
    { y: 650, text: 'Next' }
  ]);
});

test('groupTextItemsIntoLines groups items within the y tolerance', () => {
  const items = [
    { str: 'Hello', x: 10, y: 700 },
    { str: 'World', x: 60, y: 701 }
  ];
  const lines = groupTextItemsIntoLines(items, 3);
  assert.deepStrictEqual(lines, [{ y: 700, text: 'Hello World' }]);
});

test('groupTextItemsIntoLines filters out lines that are empty after trimming', () => {
  const items = [
    { str: '   ', x: 10, y: 700 },
    { str: 'Real text', x: 10, y: 650 }
  ];
  const lines = groupTextItemsIntoLines(items, LINE_Y_TOLERANCE);
  assert.deepStrictEqual(lines, [{ y: 650, text: 'Real text' }]);
});

test('groupTextItemsIntoLines returns an empty array for no items', () => {
  assert.deepStrictEqual(groupTextItemsIntoLines([], LINE_Y_TOLERANCE), []);
});

test('groupLinesIntoParagraphs merges lines within the gap threshold', () => {
  const lines = [
    { y: 700, text: 'a' },
    { y: 688, text: 'b' },
    { y: 600, text: 'c' }
  ];
  assert.deepStrictEqual(groupLinesIntoParagraphs(lines, 20), ['a b', 'c']);
});

test('groupLinesIntoParagraphs returns an empty array for no lines', () => {
  assert.deepStrictEqual(groupLinesIntoParagraphs([], PARAGRAPH_GAP_THRESHOLD), []);
});

test('concatenatePagesLinesText joins all lines across all pages with spaces', () => {
  const pagesLines = [
    [{ y: 700, text: 'Hello' }],
    [{ y: 700, text: 'World' }]
  ];
  assert.strictEqual(concatenatePagesLinesText(pagesLines), 'Hello World');
});

test('concatenatePagesLinesText returns an empty string for no pages', () => {
  assert.strictEqual(concatenatePagesLinesText([]), '');
});

test('getConvertedFilename appends the correct extension per format', () => {
  assert.strictEqual(getConvertedFilename('report', 'ppt'), 'report.pptx');
  assert.strictEqual(getConvertedFilename('report', 'word'), 'report.docx');
  assert.strictEqual(getConvertedFilename('report', 'excel'), 'report.xlsx');
});

test('getConvertedFilename throws for an unknown format', () => {
  assert.throws(() => getConvertedFilename('report', 'unknown'));
});

if (process.exitCode !== 1) {
  console.log('\n모든 테스트 통과');
}
