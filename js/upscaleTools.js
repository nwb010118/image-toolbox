(function (exports) {
  var MAX_FILE_SIZE = 20 * 1024 * 1024;
  var MAX_UPSCALE_DIMENSION = 1000;

  function isValidFileSize(bytes) {
    return typeof bytes === 'number' && !isNaN(bytes) && bytes > 0 && bytes <= MAX_FILE_SIZE;
  }

  function isValidUpscaleDimensions(width, height) {
    return typeof width === 'number' && !isNaN(width) && width >= 1 && width <= MAX_UPSCALE_DIMENSION &&
      typeof height === 'number' && !isNaN(height) && height >= 1 && height <= MAX_UPSCALE_DIMENSION;
  }

  function getUpscaledFilename(originalFileName) {
    var lastDot = originalFileName.lastIndexOf('.');
    var base = lastDot === -1 ? originalFileName : originalFileName.slice(0, lastDot);
    return base + '-2x.png';
  }

  exports.MAX_FILE_SIZE = MAX_FILE_SIZE;
  exports.MAX_UPSCALE_DIMENSION = MAX_UPSCALE_DIMENSION;
  exports.isValidFileSize = isValidFileSize;
  exports.isValidUpscaleDimensions = isValidUpscaleDimensions;
  exports.getUpscaledFilename = getUpscaledFilename;
})(typeof module !== 'undefined' ? module.exports : window);
