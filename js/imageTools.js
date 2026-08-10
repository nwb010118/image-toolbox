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

  exports.formatBytes = formatBytes;
  exports.isSupportedImageType = isSupportedImageType;
  exports.getOutputMimeType = getOutputMimeType;
})(typeof module !== 'undefined' ? module.exports : window);
