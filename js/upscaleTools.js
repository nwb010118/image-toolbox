(function (exports) {
  var MAX_FILE_SIZE = 20 * 1024 * 1024;
  var MAX_UPSCALE_DIMENSION = 1000;
  var AI_PASS_SCALE = 2; // 모델 1회 호출은 정확히 2배로 확대한다
  var MAX_AI_PASSES = 2; // 최대 2회 체이닝 (= 최대 4배)
  var MAX_AI_SCALE = Math.pow(AI_PASS_SCALE, MAX_AI_PASSES); // 4
  var RESOLUTION_PRESETS = { '1440p': 2560, '4K': 3840 }; // 긴 변 기준 목표 px
  var FILENAME_SUFFIXES = { '2x': '-2x', '4x': '-4x', '1440p': '-1440p', '4K': '-4K' };

  function isValidFileSize(bytes) {
    return typeof bytes === 'number' && !isNaN(bytes) && bytes > 0 && bytes <= MAX_FILE_SIZE;
  }

  function isValidUpscaleDimensions(width, height) {
    return typeof width === 'number' && !isNaN(width) && width >= 1 && width <= MAX_UPSCALE_DIMENSION &&
      typeof height === 'number' && !isNaN(height) && height >= 1 && height <= MAX_UPSCALE_DIMENSION;
  }

  function getUpscalePlan(mode, width, height) {
    if (mode === '2x') {
      return { reachable: true, aiPasses: 1, targetLongEdge: null };
    }
    if (mode === '4x') {
      return { reachable: true, aiPasses: 2, targetLongEdge: null };
    }

    var target = RESOLUTION_PRESETS[mode];
    var longEdge = Math.max(width, height);
    var requiredScale = target / longEdge;

    if (requiredScale <= AI_PASS_SCALE) {
      return { reachable: true, aiPasses: 1, targetLongEdge: target };
    }
    if (requiredScale <= MAX_AI_SCALE) {
      return { reachable: true, aiPasses: 2, targetLongEdge: target };
    }
    return { reachable: false, aiPasses: null, targetLongEdge: target };
  }

  function isReachable(mode, width, height) {
    return getUpscalePlan(mode, width, height).reachable;
  }

  function getUpscaledFilename(originalFileName, mode) {
    var lastDot = originalFileName.lastIndexOf('.');
    var base = lastDot === -1 ? originalFileName : originalFileName.slice(0, lastDot);
    return base + FILENAME_SUFFIXES[mode] + '.png';
  }

  exports.MAX_FILE_SIZE = MAX_FILE_SIZE;
  exports.MAX_UPSCALE_DIMENSION = MAX_UPSCALE_DIMENSION;
  exports.MAX_AI_PASSES = MAX_AI_PASSES;
  exports.MAX_AI_SCALE = MAX_AI_SCALE;
  exports.RESOLUTION_PRESETS = RESOLUTION_PRESETS;
  exports.isValidFileSize = isValidFileSize;
  exports.isValidUpscaleDimensions = isValidUpscaleDimensions;
  exports.getUpscalePlan = getUpscalePlan;
  exports.isReachable = isReachable;
  exports.getUpscaledFilename = getUpscaledFilename;
})(typeof module !== 'undefined' ? module.exports : window);
