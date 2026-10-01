const assert = require('assert');
const { inspectJpegMetadata } = require('../js/exifGps.js');

function test(name, fn) {
  try { fn(); console.log('PASS: ' + name); } catch (err) { console.error('FAIL: ' + name); console.error(err.message); process.exitCode = 1; }
}

// Builds a tiny JPEG with an APP1/EXIF segment. withGps adds an IFD0 GPSInfo pointer + a GPS IFD with 1 tag.
function buildJpeg(opts) {
  const little = opts.little !== false;
  const w16 = function (v) { return little ? [v & 255, v >> 8] : [v >> 8, v & 255]; };
  const w32 = function (v) { return little ? [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255] : [(v >>> 24) & 255, (v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const tiff = [].concat(little ? [0x49, 0x49] : [0x4D, 0x4D], w16(42), w32(8));
  if (opts.withGps) {
    // IFD0 at offset 8: 1 entry (0x8825 GPSInfo, LONG, count 1, value=offset of GPS IFD = 26)
    tiff.push.apply(tiff, [].concat(w16(1), w16(0x8825), w16(4), w32(1), w32(26), w32(0)));
    // GPS IFD at 26: 1 entry (0x0001 GPSLatitudeRef, ASCII, 2, 'N')
    tiff.push.apply(tiff, [].concat(w16(1), w16(1), w16(2), w32(2), [0x4E, 0, 0, 0], w32(0)));
  } else {
    tiff.push.apply(tiff, [].concat(w16(1), w16(0x010F), w16(2), w32(2), [0x41, 0, 0, 0], w32(0)));
  }
  const exif = [0x45, 0x78, 0x69, 0x66, 0, 0].concat(tiff);
  const segLen = exif.length + 2;
  const bytes = [0xFF, 0xD8, 0xFF, 0xE1, segLen >> 8, segLen & 255].concat(exif, [0xFF, 0xDA, 0, 2, 0xFF, 0xD9]);
  return new Uint8Array(bytes).buffer;
}

test('detects GPS in little-endian EXIF', function () {
  const r = inspectJpegMetadata(buildJpeg({ withGps: true }));
  assert.deepStrictEqual(r, { isJpeg: true, hasExif: true, hasGps: true });
});

test('detects GPS in big-endian EXIF', function () {
  assert.strictEqual(inspectJpegMetadata(buildJpeg({ withGps: true, little: false })).hasGps, true);
});

test('EXIF without GPS reports hasExif only', function () {
  const r = inspectJpegMetadata(buildJpeg({ withGps: false }));
  assert.deepStrictEqual(r, { isJpeg: true, hasExif: true, hasGps: false });
});

test('JPEG with no EXIF segment', function () {
  const r = inspectJpegMetadata(new Uint8Array([0xFF, 0xD8, 0xFF, 0xDA, 0, 2, 0xFF, 0xD9]).buffer);
  assert.deepStrictEqual(r, { isJpeg: true, hasExif: false, hasGps: false });
});

test('non-JPEG and truncated input are handled safely', function () {
  assert.strictEqual(inspectJpegMetadata(new Uint8Array([0x89, 0x50, 0x4E, 0x47]).buffer).isJpeg, false);
  assert.strictEqual(inspectJpegMetadata(new Uint8Array([]).buffer).isJpeg, false);
  const truncated = buildJpeg({ withGps: true }).slice(0, 30);
  assert.doesNotThrow(function () { inspectJpegMetadata(truncated); });
});
