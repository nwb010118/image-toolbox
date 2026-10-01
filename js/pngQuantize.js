(function (exports) {
  var MAX_SAMPLES = 200000;

  // ---- palette building (median cut on RGBA) ----------------------------------

  function collectSamples(data, pixelCount) {
    var step = Math.max(1, Math.floor(pixelCount / MAX_SAMPLES));
    var samples = [];
    for (var i = 0; i < pixelCount; i += step) {
      var o = i * 4;
      samples.push(o);
    }
    return samples;
  }

  function boxRanges(data, offsets, from, to) {
    var min = [255, 255, 255, 255];
    var max = [0, 0, 0, 0];
    for (var i = from; i < to; i++) {
      var o = offsets[i];
      for (var c = 0; c < 4; c++) {
        var v = data[o + c];
        if (v < min[c]) min[c] = v;
        if (v > max[c]) max[c] = v;
      }
    }
    return { min: min, max: max };
  }

  // Exact palette when the image already has few colours (screenshots, logos). Returns null if it has more.
  function exactPalette(data, pixelCount, maxColors) {
    var seen = Object.create(null);
    var list = [];
    for (var i = 0; i < pixelCount; i++) {
      var o = i * 4;
      var a = data[o + 3];
      var key = a === 0 ? 0 : ((data[o] << 24) | (data[o + 1] << 16) | (data[o + 2] << 8) | a) >>> 0;
      if (seen[key] === undefined) {
        if (list.length >= maxColors) return null;
        seen[key] = list.length;
        list.push(a === 0 ? [0, 0, 0, 0] : [data[o], data[o + 1], data[o + 2], a]);
      }
    }
    return list;
  }

  function dedupePalette(palette) {
    var seen = Object.create(null);
    var out = [];
    palette.forEach(function (p) {
      var key = p.join(',');
      if (!seen[key]) { seen[key] = true; out.push(p); }
    });
    return out;
  }

  function buildPalette(data, pixelCount, maxColors) {
    var exact = exactPalette(data, pixelCount, maxColors);
    if (exact) return exact;
    var offsets = collectSamples(data, pixelCount);
    var boxes = [{ from: 0, to: offsets.length }];

    while (boxes.length < maxColors) {
      // pick the box with the largest spread that still has more than one sample
      var bestIndex = -1;
      var bestScore = -1;
      var bestChannel = 0;
      for (var b = 0; b < boxes.length; b++) {
        var box = boxes[b];
        if (box.to - box.from < 2) continue;
        var r = boxRanges(data, offsets, box.from, box.to);
        for (var c = 0; c < 4; c++) {
          var spread = (r.max[c] - r.min[c]) * (c === 3 ? 1.0 : 1.0);
          var score = spread * Math.sqrt(box.to - box.from);
          if (spread > 0 && score > bestScore) {
            bestScore = score;
            bestIndex = b;
            bestChannel = c;
          }
        }
      }
      if (bestIndex === -1) break;

      var target = boxes[bestIndex];
      var ch = bestChannel;
      var slice = offsets.slice(target.from, target.to);
      slice.sort(function (a, b2) { return data[a + ch] - data[b2 + ch]; });
      for (var k = 0; k < slice.length; k++) offsets[target.from + k] = slice[k];
      var mid = target.from + (slice.length >> 1);
      boxes.splice(bestIndex, 1, { from: target.from, to: mid }, { from: mid, to: target.to });
    }

    var palette = [];
    for (var j = 0; j < boxes.length; j++) {
      var bx = boxes[j];
      var sum = [0, 0, 0, 0];
      var n = bx.to - bx.from;
      if (n <= 0) continue;
      for (var i = bx.from; i < bx.to; i++) {
        var off = offsets[i];
        sum[0] += data[off]; sum[1] += data[off + 1]; sum[2] += data[off + 2]; sum[3] += data[off + 3];
      }
      palette.push([Math.round(sum[0] / n), Math.round(sum[1] / n), Math.round(sum[2] / n), Math.round(sum[3] / n)]);
    }
    palette = dedupePalette(palette);
    if (palette.length === 0) palette.push([0, 0, 0, 0]);
    return palette;
  }

  // ---- mapping pixels to palette ------------------------------------------------

  function nearestIndex(palette, r, g, b, a) {
    var best = 0;
    var bestDist = Infinity;
    for (var i = 0; i < palette.length; i++) {
      var p = palette[i];
      var da = a - p[3];
      var dist;
      if (a === 0 && p[3] === 0) {
        dist = 0;
      } else {
        var dr = r - p[0];
        var dg = g - p[1];
        var db = b - p[2];
        dist = dr * dr + dg * dg + db * db + da * da * 3;
      }
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
        if (dist === 0) break;
      }
    }
    return best;
  }

  function quantizeRGBA(data, width, height, maxColors, dither) {
    var pixelCount = width * height;
    maxColors = Math.max(2, Math.min(256, maxColors | 0));
    var palette = buildPalette(data, pixelCount, maxColors);
    var indices = new Uint8Array(pixelCount);
    var cache = new Int16Array(1 << 22).fill(-1); // r6 g6 b6 a4

    function lookup(r, g, b, a) {
      var key = ((r >> 2) << 16) | ((g >> 2) << 10) | ((b >> 2) << 4) | (a >> 4);
      var hit = cache[key];
      if (hit !== -1) return hit;
      var idx = nearestIndex(palette, r, g, b, a);
      cache[key] = idx;
      return idx;
    }

    if (!dither) {
      for (var i = 0; i < pixelCount; i++) {
        var o = i * 4;
        indices[i] = lookup(data[o], data[o + 1], data[o + 2], data[o + 3]);
      }
    } else {
      var errCur = new Float32Array((width + 2) * 3);
      var errNext = new Float32Array((width + 2) * 3);
      for (var y = 0; y < height; y++) {
        errNext.fill(0);
        for (var x = 0; x < width; x++) {
          var p = (y * width + x) * 4;
          var a = data[p + 3];
          var e = (x + 1) * 3;
          var r = Math.max(0, Math.min(255, data[p] + errCur[e]));
          var g = Math.max(0, Math.min(255, data[p + 1] + errCur[e + 1]));
          var b = Math.max(0, Math.min(255, data[p + 2] + errCur[e + 2]));
          var idx = lookup(r | 0, g | 0, b | 0, a);
          indices[y * width + x] = idx;
          if (a > 0) {
            var pal = palette[idx];
            var er = r - pal[0];
            var eg = g - pal[1];
            var eb = b - pal[2];
            errCur[e + 3] += er * 7 / 16; errCur[e + 4] += eg * 7 / 16; errCur[e + 5] += eb * 7 / 16;
            errNext[e - 3] += er * 3 / 16; errNext[e - 2] += eg * 3 / 16; errNext[e - 1] += eb * 3 / 16;
            errNext[e] += er * 5 / 16; errNext[e + 1] += eg * 5 / 16; errNext[e + 2] += eb * 5 / 16;
            errNext[e + 3] += er / 16; errNext[e + 4] += eg / 16; errNext[e + 5] += eb / 16;
          }
        }
        var swap = errCur; errCur = errNext; errNext = swap;
      }
    }

    return { palette: palette, indices: indices, width: width, height: height };
  }

  // ---- PNG encoding -----------------------------------------------------------------

  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function makeChunk(type, data) {
    var chunk = new Uint8Array(12 + data.length);
    var view = new DataView(chunk.buffer);
    view.setUint32(0, data.length);
    for (var i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
    chunk.set(data, 8);
    view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
    return chunk;
  }

  function bitDepthFor(colorCount) {
    if (colorCount <= 2) return 1;
    if (colorCount <= 4) return 2;
    if (colorCount <= 16) return 4;
    return 8;
  }

  // Packs palette indices into PNG scanlines (filter type 0) at the given bit depth.
  function packScanlines(indices, width, height, bitDepth) {
    var bytesPerRow = Math.ceil(width * bitDepth / 8);
    var raw = new Uint8Array((bytesPerRow + 1) * height);
    var perByte = 8 / bitDepth;
    for (var y = 0; y < height; y++) {
      var rowStart = y * (bytesPerRow + 1);
      raw[rowStart] = 0;
      for (var x = 0; x < width; x++) {
        var v = indices[y * width + x];
        if (bitDepth === 8) {
          raw[rowStart + 1 + x] = v;
        } else {
          var byteIndex = rowStart + 1 + Math.floor(x / perByte);
          var shift = 8 - bitDepth * ((x % perByte) + 1);
          raw[byteIndex] |= v << shift;
        }
      }
    }
    return raw;
  }

  function concat(parts) {
    var total = 0;
    parts.forEach(function (p) { total += p.length; });
    var out = new Uint8Array(total);
    var offset = 0;
    parts.forEach(function (p) { out.set(p, offset); offset += p.length; });
    return out;
  }

  function streamToBytes(readable) {
    return new Response(readable).arrayBuffer().then(function (buf) { return new Uint8Array(buf); });
  }

  function deflate(bytes) {
    if (typeof CompressionStream === 'undefined') {
      return Promise.reject(new Error('CompressionStream is not available'));
    }
    var stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
    return streamToBytes(stream);
  }

  function encodeIndexedPng(quantized) {
    var palette = quantized.palette;
    var width = quantized.width;
    var height = quantized.height;
    var bitDepth = bitDepthFor(palette.length);

    var plte = new Uint8Array(palette.length * 3);
    var hasAlpha = false;
    var trns = new Uint8Array(palette.length);
    for (var i = 0; i < palette.length; i++) {
      plte[i * 3] = palette[i][0];
      plte[i * 3 + 1] = palette[i][1];
      plte[i * 3 + 2] = palette[i][2];
      trns[i] = palette[i][3];
      if (palette[i][3] !== 255) hasAlpha = true;
    }

    var ihdr = new Uint8Array(13);
    var view = new DataView(ihdr.buffer);
    view.setUint32(0, width);
    view.setUint32(4, height);
    ihdr[8] = bitDepth;
    ihdr[9] = 3; // indexed color
    ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

    var raw = packScanlines(quantized.indices, width, height, bitDepth);
    return deflate(raw).then(function (idat) {
      var parts = [
        new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        makeChunk('IHDR', ihdr),
        makeChunk('PLTE', plte)
      ];
      if (hasAlpha) {
        var end = trns.length;
        while (end > 0 && trns[end - 1] === 255) end--; // trailing opaque entries may be omitted
        parts.push(makeChunk('tRNS', trns.subarray(0, end)));
      }
      parts.push(makeChunk('IDAT', idat));
      parts.push(makeChunk('IEND', new Uint8Array(0)));
      return concat(parts);
    });
  }

  function quantizeCanvasToPngBlob(canvas, maxColors, dither) {
    var ctx = canvas.getContext('2d');
    var image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var q = quantizeRGBA(image.data, canvas.width, canvas.height, maxColors, dither);
    return encodeIndexedPng(q).then(function (bytes) {
      return new Blob([bytes], { type: 'image/png' });
    });
  }

  exports.quantizeRGBA = quantizeRGBA;
  exports.encodeIndexedPng = encodeIndexedPng;
  exports.quantizeCanvasToPngBlob = quantizeCanvasToPngBlob;
  exports.crc32 = crc32;
  exports.bitDepthFor = bitDepthFor;
})(typeof module !== 'undefined' ? module.exports : window);
