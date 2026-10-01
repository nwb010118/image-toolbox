(function (exports) {
  var MAX_MERGE_FILES = 10;
  var MAX_MERGE_TOTAL_BYTES = 100 * 1024 * 1024;
  var MAX_SHRINK_PAGES = 50;
  var MAX_RENDER_PIXELS = 16000000;

  // scale is relative to 72 dpi (PDF points). 150 dpi = 2.083, 110 dpi = 1.528, 80 dpi = 1.111.
  var SHRINK_PRESETS = {
    high: { dpi: 150, scale: 150 / 72, quality: 0.8 },
    balanced: { dpi: 110, scale: 110 / 72, quality: 0.7 },
    small: { dpi: 80, scale: 80 / 72, quality: 0.55 }
  };

  function getBaseName(fileName) {
    var dot = fileName.lastIndexOf('.');
    return dot > 0 ? fileName.slice(0, dot) : fileName;
  }

  function getMergedPdfFilename() {
    return 'merged.pdf';
  }

  function getShrunkPdfFilename(fileName) {
    return getBaseName(fileName) + '-compressed.pdf';
  }

  function canAddMergeFile(currentCount, currentBytes, file) {
    if (currentCount + 1 > MAX_MERGE_FILES) return 'count';
    if (currentBytes + file.size > MAX_MERGE_TOTAL_BYTES) return 'size';
    return null;
  }

  // Render size for one page. Never exceeds MAX_RENDER_PIXELS (the scale is reduced instead).
  function planPageRender(pageWidthPt, pageHeightPt, scale) {
    var s = scale;
    var pixels = pageWidthPt * s * pageHeightPt * s;
    if (pixels > MAX_RENDER_PIXELS) {
      s = Math.sqrt(MAX_RENDER_PIXELS / (pageWidthPt * pageHeightPt));
    }
    return { scale: s, width: Math.max(1, Math.round(pageWidthPt * s)), height: Math.max(1, Math.round(pageHeightPt * s)) };
  }

  exports.MAX_MERGE_FILES = MAX_MERGE_FILES;
  exports.MAX_MERGE_TOTAL_BYTES = MAX_MERGE_TOTAL_BYTES;
  exports.MAX_SHRINK_PAGES = MAX_SHRINK_PAGES;
  exports.MAX_RENDER_PIXELS = MAX_RENDER_PIXELS;
  exports.SHRINK_PRESETS = SHRINK_PRESETS;
  exports.getMergedPdfFilename = getMergedPdfFilename;
  exports.getShrunkPdfFilename = getShrunkPdfFilename;
  exports.canAddMergeFile = canAddMergeFile;
  exports.planPageRender = planPageRender;
})(typeof module !== 'undefined' ? module.exports : window);
