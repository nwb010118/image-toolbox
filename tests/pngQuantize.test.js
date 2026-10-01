const assert = require('assert');
const zlib = require('zlib');
const { quantizeRGBA, encodeIndexedPng, crc32, bitDepthFor } = require('../js/pngQuantize.js');

function test(name, fn) {
  Promise.resolve().then(fn).then(
    function () { console.log('PASS: ' + name); },
    function (err) { console.error('FAIL: ' + name); console.error(err.stack || err.message); process.exitCode = 1; }
  );
}

// Minimal PNG reader for indexed images (filter type 0 only).
function readPng(bytes) {
  const sig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  sig.forEach(function (b, i) { assert.strictEqual(bytes[i], b, 'bad PNG signature'); });
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 8;
  const out = { chunks: [], idat: [] };
  while (pos < bytes.length) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
    const data = bytes.subarray(pos + 8, pos + 8 + len);
    const crc = view.getUint32(pos + 8 + len);
    assert.strictEqual(crc32(bytes.subarray(pos + 4, pos + 8 + len)), crc, 'CRC mismatch in ' + type);
    out.chunks.push(type);
    if (type === 'IHDR') {
      const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
      out.width = dv.getUint32(0); out.height = dv.getUint32(4); out.bitDepth = data[8]; out.colorType = data[9];
    }
    if (type === 'PLTE') out.plte = data;
    if (type === 'tRNS') out.trns = data;
    if (type === 'IDAT') out.idat.push(data);
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(out.idat.map(function (d) { return Buffer.from(d); })));
  const bytesPerRow = Math.ceil(out.width * out.bitDepth / 8);
  assert.strictEqual(raw.length, (bytesPerRow + 1) * out.height, 'unexpected raw length');
  const indices = new Uint8Array(out.width * out.height);
  const perByte = 8 / out.bitDepth;
  for (let y = 0; y < out.height; y++) {
    assert.strictEqual(raw[y * (bytesPerRow + 1)], 0, 'filter type must be 0');
    for (let x = 0; x < out.width; x++) {
      const base = y * (bytesPerRow + 1) + 1;
      if (out.bitDepth === 8) {
        indices[y * out.width + x] = raw[base + x];
      } else {
        const byte = raw[base + Math.floor(x / perByte)];
        const shift = 8 - out.bitDepth * ((x % perByte) + 1);
        indices[y * out.width + x] = (byte >> shift) & ((1 << out.bitDepth) - 1);
      }
    }
  }
  out.indices = indices;
  return out;
}

function makeImage(w, h, fn) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = fn(x, y);
    const o = (y * w + x) * 4;
    data[o] = px[0]; data[o + 1] = px[1]; data[o + 2] = px[2]; data[o + 3] = px[3] === undefined ? 255 : px[3];
  }
  return data;
}

test('crc32 matches the known check value', function () {
  assert.strictEqual(crc32(Buffer.from('123456789')), 0xCBF43926);
});

test('bitDepthFor picks the smallest valid PNG bit depth', function () {
  assert.strictEqual(bitDepthFor(2), 1);
  assert.strictEqual(bitDepthFor(3), 2);
  assert.strictEqual(bitDepthFor(4), 2);
  assert.strictEqual(bitDepthFor(5), 4);
  assert.strictEqual(bitDepthFor(16), 4);
  assert.strictEqual(bitDepthFor(17), 8);
  assert.strictEqual(bitDepthFor(256), 8);
});

test('a 3-colour image quantizes to exactly those colours and round-trips through the PNG encoder', function () {
  const colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255]];
  const w = 37, h = 9; // odd width exercises packed-row padding
  const data = makeImage(w, h, function (x, y) { return colors[(x + y) % 3]; });
  const q = quantizeRGBA(data, w, h, 16, false);
  assert.strictEqual(q.palette.length, 3);
  return encodeIndexedPng(q).then(function (bytes) {
    const png = readPng(bytes);
    assert.strictEqual(png.width, w);
    assert.strictEqual(png.height, h);
    assert.strictEqual(png.colorType, 3);
    assert.strictEqual(png.bitDepth, 2);
    assert.deepStrictEqual(Array.from(png.indices), Array.from(q.indices));
    // decoded colours equal the source colours
    for (let i = 0; i < w * h; i++) {
      const p = png.indices[i];
      const rgb = [png.plte[p * 3], png.plte[p * 3 + 1], png.plte[p * 3 + 2]];
      const o = i * 4;
      assert.deepStrictEqual(rgb, [data[o], data[o + 1], data[o + 2]]);
    }
  });
});

test('palette never exceeds maxColors and image error stays small for a gradient', function () {
  const w = 64, h = 64;
  const data = makeImage(w, h, function (x, y) { return [x * 4, y * 4, (x + y) * 2]; });
  [256, 64, 16].forEach(function (max) {
    const q = quantizeRGBA(data, w, h, max, false);
    assert.ok(q.palette.length <= max, 'palette too big for ' + max);
    let total = 0;
    for (let i = 0; i < w * h; i++) {
      const p = q.palette[q.indices[i]];
      const o = i * 4;
      total += Math.abs(p[0] - data[o]) + Math.abs(p[1] - data[o + 1]) + Math.abs(p[2] - data[o + 2]);
    }
    const mean = total / (w * h * 3);
    const limit = max === 256 ? 6 : max === 64 ? 14 : 30;
    assert.ok(mean < limit, 'mean error ' + mean.toFixed(1) + ' too high for ' + max + ' colours');
  });
});

test('fewer colours produce a smaller PNG', function () {
  const w = 96, h = 96;
  const data = makeImage(w, h, function (x, y) { return [(x * 7) % 256, (y * 5) % 256, ((x + y) * 3) % 256]; });
  return Promise.all([256, 32, 8].map(function (m) {
    return encodeIndexedPng(quantizeRGBA(data, w, h, m, false));
  })).then(function (sizes) {
    assert.ok(sizes[0].length > sizes[1].length, '256 -> 32 should shrink');
    assert.ok(sizes[1].length > sizes[2].length, '32 -> 8 should shrink');
  });
});

test('transparency survives: tRNS chunk written and fully transparent pixels stay transparent', function () {
  const w = 20, h = 20;
  const data = makeImage(w, h, function (x, y) { return x < 10 ? [200, 30, 30, 255] : [0, 0, 0, 0]; });
  const q = quantizeRGBA(data, w, h, 8, false);
  return encodeIndexedPng(q).then(function (bytes) {
    const png = readPng(bytes);
    assert.ok(png.chunks.indexOf('tRNS') !== -1, 'tRNS missing');
    for (let i = 0; i < w * h; i++) {
      const p = png.indices[i];
      const alpha = p < png.trns.length ? png.trns[p] : 255;
      const x = i % w;
      assert.strictEqual(alpha, x < 10 ? 255 : 0, 'alpha wrong at pixel ' + i);
    }
  });
});

test('opaque images do not get a tRNS chunk', function () {
  const data = makeImage(8, 8, function (x) { return [x * 30, 10, 10]; });
  return encodeIndexedPng(quantizeRGBA(data, 8, 8, 16, false)).then(function (bytes) {
    assert.strictEqual(readPng(bytes).chunks.indexOf('tRNS'), -1);
  });
});

test('dithering keeps palette valid and decodes correctly', function () {
  const w = 40, h = 40;
  const data = makeImage(w, h, function (x, y) { return [x * 6, 120, y * 6]; });
  const q = quantizeRGBA(data, w, h, 8, true);
  assert.ok(q.palette.length <= 8);
  return encodeIndexedPng(q).then(function (bytes) {
    assert.deepStrictEqual(Array.from(readPng(bytes).indices), Array.from(q.indices));
  });
});
