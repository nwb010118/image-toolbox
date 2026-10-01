(function (exports) {
  var MIN_SCALE = 0.25;
  var SCALE_STEP = 0.85;

  // Highest-fidelity level first. JPEG/WebP use quality, PNG uses palette size.
  var QUALITY_LEVELS = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1];
  var PALETTE_LEVELS = [256, 192, 128, 96, 64, 48, 32, 24, 16, 8];

  function parseTargetBytes(value, unit) {
    var n = Number(value);
    if (!isFinite(n) || n <= 0) return null;
    var factor = unit === 'MB' ? 1024 * 1024 : 1024;
    return Math.round(n * factor);
  }

  // Finds the highest-fidelity level whose output fits in targetBytes.
  // encode(level, scale) -> Promise<Blob>. Level size is assumed to shrink as the index grows.
  function searchLevels(encode, levels, scale, targetBytes) {
    var lo = 0;
    var hi = levels.length - 1;
    var best = null;
    var lowest = null;

    function step() {
      if (lo > hi) return Promise.resolve(best || { fit: false, blob: lowest, level: levels[levels.length - 1] });
      var mid = (lo + hi) >> 1;
      return encode(levels[mid], scale).then(function (blob) {
        if (mid === levels.length - 1) lowest = blob;
        if (blob.size <= targetBytes) {
          best = { fit: true, blob: blob, level: levels[mid] };
          hi = mid - 1; // try higher fidelity (smaller index)
        } else {
          lo = mid + 1;
        }
        return step();
      });
    }

    return step().then(function (result) {
      if (result.fit || result.blob) return result;
      // lowest level never evaluated (search ended before reaching it)
      return encode(levels[levels.length - 1], scale).then(function (blob) {
        return { fit: blob.size <= targetBytes, blob: blob, level: levels[levels.length - 1] };
      });
    });
  }

  // Looks for the best result in two phases:
  // 1. keep fidelity reasonable (preferredLevels) and shrink the pixel size step by step;
  // 2. only if even the smallest size doesn't fit, allow every level (very low quality) as a last resort.
  function fitToTargetSize(encode, targetBytes, options) {
    options = options || {};
    var levels = options.levels || QUALITY_LEVELS;
    var preferred = options.preferredLevels && options.preferredLevels.length ? options.preferredLevels : levels;
    var allowDownscale = options.allowDownscale !== false;
    var scale = 1;
    var attempts = 0;

    function phaseOne() {
      attempts++;
      return searchLevels(encode, preferred, scale, targetBytes).then(function (result) {
        result.scale = scale;
        if (result.fit || !allowDownscale) return result;
        var next = scale * SCALE_STEP;
        if (next < MIN_SCALE) return result;
        scale = next;
        return phaseOne();
      });
    }

    return phaseOne().then(function (result) {
      if (result.fit || preferred === levels) {
        result.attempts = attempts;
        return result;
      }
      attempts++;
      return searchLevels(encode, levels, scale, targetBytes).then(function (last) {
        last.scale = scale;
        last.attempts = attempts;
        return last;
      });
    });
  }

  exports.QUALITY_LEVELS = QUALITY_LEVELS;
  exports.PALETTE_LEVELS = PALETTE_LEVELS;
  exports.MIN_SCALE = MIN_SCALE;
  exports.parseTargetBytes = parseTargetBytes;
  exports.fitToTargetSize = fitToTargetSize;
})(typeof module !== 'undefined' ? module.exports : window);
