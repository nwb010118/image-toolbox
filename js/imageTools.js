(function (exports) {
  function formatBytes(bytes) {
    if (bytes < 1024) {
      return bytes + ' B';
    }
    var units = ['KB', 'MB', 'GB'];
    var value = bytes / 1024;
    var unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value = value / 1024;
      unitIndex = unitIndex + 1;
    }
    return value.toFixed(1) + ' ' + units[unitIndex];
  }

  var SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  function isSupportedImageType(mimeType) {
    return SUPPORTED_TYPES.indexOf(mimeType) !== -1;
  }

  function getOutputMimeType(mimeType) {
    return isSupportedImageType(mimeType) ? mimeType : null;
  }

  var MAX_DIMENSION = 8000;

  function calculateAspectRatioHeight(originalWidth, originalHeight, newWidth) {
    return Math.max(1, Math.round((newWidth * originalHeight) / originalWidth));
  }

  function calculateAspectRatioWidth(originalWidth, originalHeight, newHeight) {
    return Math.max(1, Math.round((newHeight * originalWidth) / originalHeight));
  }

  function resolveDimensions(originalWidth, originalHeight, inputWidth, inputHeight) {
    var hasWidth = typeof inputWidth === 'number' && !isNaN(inputWidth) && inputWidth > 0;
    var hasHeight = typeof inputHeight === 'number' && !isNaN(inputHeight) && inputHeight > 0;

    if (!hasWidth && !hasHeight) {
      return { width: originalWidth, height: originalHeight };
    }
    if (hasWidth && hasHeight) {
      return { width: Math.round(inputWidth), height: Math.round(inputHeight) };
    }
    if (hasWidth) {
      return {
        width: Math.round(inputWidth),
        height: calculateAspectRatioHeight(originalWidth, originalHeight, inputWidth)
      };
    }
    return {
      width: calculateAspectRatioWidth(originalWidth, originalHeight, inputHeight),
      height: Math.round(inputHeight)
    };
  }

  function resolveOutputMimeType(originalMimeType, selectedFormat) {
    if (!selectedFormat || selectedFormat === 'original') {
      return getOutputMimeType(originalMimeType);
    }
    return isSupportedImageType(selectedFormat) ? selectedFormat : null;
  }

  var EXTENSIONS_BY_MIME_TYPE = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };

  function getExtensionForMimeType(mimeType) {
    return EXTENSIONS_BY_MIME_TYPE[mimeType] || 'jpg';
  }

  function isValidDimensionInput(value) {
    return typeof value === 'number' && !isNaN(value) && value >= 1 && value <= MAX_DIMENSION;
  }

  exports.formatBytes = formatBytes;
  exports.isSupportedImageType = isSupportedImageType;
  exports.getOutputMimeType = getOutputMimeType;
  exports.MAX_DIMENSION = MAX_DIMENSION;
  exports.calculateAspectRatioHeight = calculateAspectRatioHeight;
  exports.calculateAspectRatioWidth = calculateAspectRatioWidth;
  exports.resolveDimensions = resolveDimensions;
  exports.resolveOutputMimeType = resolveOutputMimeType;
  exports.getExtensionForMimeType = getExtensionForMimeType;
  exports.isValidDimensionInput = isValidDimensionInput;
})(typeof module !== 'undefined' ? module.exports : window);
