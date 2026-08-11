(function (exports) {
  var MAX_FILE_SIZE = 20 * 1024 * 1024;
  var MAX_IMAGE_COUNT = 50;
  var MAX_PDF_PAGES = 300;

  function isValidFileSize(bytes) {
    return typeof bytes === 'number' && !isNaN(bytes) && bytes > 0 && bytes <= MAX_FILE_SIZE;
  }

  function isValidImageCount(count) {
    return typeof count === 'number' && !isNaN(count) && count >= 1 && count <= MAX_IMAGE_COUNT;
  }

  function isValidPageCount(count) {
    return typeof count === 'number' && !isNaN(count) && count >= 1 && count <= MAX_PDF_PAGES;
  }

  function isValidPdfFile(file) {
    if (!file) {
      return false;
    }
    if (file.type === 'application/pdf') {
      return true;
    }
    return typeof file.name === 'string' && file.name.toLowerCase().slice(-4) === '.pdf';
  }

  function getPdfOutputFilename() {
    return 'images.pdf';
  }

  function getBaseFileName(fileName) {
    var lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 ? fileName : fileName.slice(0, lastDot);
  }

  function getPageImageFilename(baseName, pageNumber, totalPages) {
    var digits = String(totalPages).length;
    var padded = String(pageNumber);
    while (padded.length < digits) {
      padded = '0' + padded;
    }
    return baseName + '-page-' + padded + '.png';
  }

  function getPdfPageOrientation(width, height) {
    return width >= height ? 'l' : 'p';
  }

  exports.MAX_FILE_SIZE = MAX_FILE_SIZE;
  exports.MAX_IMAGE_COUNT = MAX_IMAGE_COUNT;
  exports.MAX_PDF_PAGES = MAX_PDF_PAGES;
  exports.isValidFileSize = isValidFileSize;
  exports.isValidImageCount = isValidImageCount;
  exports.isValidPageCount = isValidPageCount;
  exports.isValidPdfFile = isValidPdfFile;
  exports.getPdfOutputFilename = getPdfOutputFilename;
  exports.getBaseFileName = getBaseFileName;
  exports.getPageImageFilename = getPageImageFilename;
  exports.getPdfPageOrientation = getPdfPageOrientation;
})(typeof module !== 'undefined' ? module.exports : window);
