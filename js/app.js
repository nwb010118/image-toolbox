var selectedFile = null;
var selectedMeta = null;
var batchFiles = [];
var batchResults = [];
var batchGpsCount = 0;
var converting = false;
var activePreset = null;

var uploadArea = document.getElementById('uploadArea');
var fileInput = document.getElementById('fileInput');
var errorMessage = document.getElementById('errorMessage');
var controls = document.getElementById('controls');
var qualitySlider = document.getElementById('qualitySlider');
var qualityValue = document.getElementById('qualityValue');
var qualityFields = document.getElementById('qualityFields');
var compressBtn = document.getElementById('compressBtn');
var previewArea = document.getElementById('previewArea');
var originalPreview = document.getElementById('originalPreview');
var compressedPreview = document.getElementById('compressedPreview');
var originalSize = document.getElementById('originalSize');
var compressedSize = document.getElementById('compressedSize');
var compressionSavings = document.getElementById('compressionSavings');
var targetNote = document.getElementById('targetNote');
var metaNotice = document.getElementById('metaNotice');
var uploadHeading = uploadArea.querySelector('.upload-heading');
var uploadButton = uploadArea.querySelector('.upload-btn');
var compressWarning = document.getElementById('compressWarning');
var downloadBtn = document.getElementById('downloadBtn');
var pngSizeHint = document.getElementById('pngSizeHint');
var pngOptions = document.getElementById('pngOptions');
var pngColors = document.getElementById('pngColors');
var pngDither = document.getElementById('pngDither');
var shareBtn = document.getElementById('shareBtn');
var shareStatus = document.getElementById('shareStatus');

var presetSelect = document.getElementById('presetSelect');
var presetNote = document.getElementById('presetNote');
var modeQuality = document.getElementById('modeQuality');
var modeTarget = document.getElementById('modeTarget');
var targetFields = document.getElementById('targetFields');
var targetSizeInput = document.getElementById('targetSize');
var targetUnit = document.getElementById('targetUnit');
var fitGroup = document.getElementById('fitGroup');
var fitSelect = document.getElementById('fitSelect');
var cropX = document.getElementById('cropX');
var cropY = document.getElementById('cropY');

var resizeWidth = document.getElementById('resizeWidth');
var resizeHeight = document.getElementById('resizeHeight');
var maintainAspectRatio = document.getElementById('maintainAspectRatio');
var resizeFields = document.getElementById('resizeFields');
var batchArea = document.getElementById('batchArea');
var batchNote = document.getElementById('batchNote');
var batchList = document.getElementById('batchList');
var batchProgress = document.getElementById('batchProgress');
var batchSummary = document.getElementById('batchSummary');
var batchZipBtn = document.getElementById('batchZipBtn');
var formatSelect = document.getElementById('formatSelect');

var originalImageWidth = 0;
var originalImageHeight = 0;
var lastResultUrl = null;

var MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
var SHARE_URL = LANG === 'en'
  ? 'https://nwb010118.github.io/image-toolbox/en/index.html'
  : 'https://nwb010118.github.io/image-toolbox/';

// AVIF and MozJPEG are encoded by WebAssembly encoders bundled with the site (see js/modernEncoders.js).
var MODERN_ENCODERS = typeof window !== 'undefined' && window.ModernEncoders ? window.ModernEncoders.isSupported() : false;
var AVIF_ENCODE_SUPPORTED = MODERN_ENCODERS;

// ---- image pipeline -------------------------------------------------------

function loadImage(file) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    var objectUrl = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = function () {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(t('imageLoadFailedGeneric')));
    };
    img.src = objectUrl;
  });
}

function drawToCanvas(img, dimensions, scale, options) {
  var width = Math.max(1, Math.round(dimensions.width * scale));
  var height = Math.max(1, Math.round(dimensions.height * scale));
  var canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  var ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error(t('canvas2dUnavailable'));
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (options.outputMimeType === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  var wantsCover = options.fitMode === 'cover'
    && typeof options.targetWidth === 'number' && typeof options.targetHeight === 'number';
  if (wantsCover) {
    var crop = computeCoverCrop(img.naturalWidth, img.naturalHeight, width, height, options.cropX, options.cropY);
    ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height);
  } else {
    ctx.drawImage(img, 0, 0, width, height);
  }
  return canvas;
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise(function (resolve, reject) {
    canvas.toBlob(function (blob) {
      if (!blob) {
        reject(new Error(t('imageProcessingFailed')));
        return;
      }
      resolve(blob);
    }, mimeType, quality);
  });
}

// Memory guards: the encoders copy the pixel data (RGBA = 4 bytes per pixel) and work on top of it.
var MAX_PNG_QUANTIZE_PIXELS = 25000000;
var MAX_AVIF_PIXELS = 12600000;

function encodeCanvas(canvas, mimeType, level, options) {
  var pixels = canvas.width * canvas.height;
  if (mimeType === 'image/png') {
    var colors = typeof level === 'number' ? level : options.pngColors;
    if (!colors) {
      return canvasToBlob(canvas, 'image/png');
    }
    if (pixels > MAX_PNG_QUANTIZE_PIXELS) {
      options.notice = 'pngSkippedLarge';
      return canvasToBlob(canvas, 'image/png');
    }
    return quantizeCanvasToPngBlob(canvas, colors, options.dither).catch(function () {
      return canvasToBlob(canvas, 'image/png');
    });
  }
  if (mimeType === 'image/avif') {
    if (pixels > MAX_AVIF_PIXELS) {
      return Promise.reject(new Error(t('avifTooLarge')));
    }
    return window.ModernEncoders.encodeCanvas('avif', canvas, level);
  }
  if (mimeType === 'image/jpeg' && MODERN_ENCODERS) {
    // MozJPEG gives a smaller file than the browser's built-in JPEG encoder at the same quality value.
    return window.ModernEncoders.encodeCanvas('jpeg', canvas, level).catch(function () {
      return canvasToBlob(canvas, mimeType, level);
    });
  }
  return canvasToBlob(canvas, mimeType, level);
}

function processImage(file, options) {
  if (!options.outputMimeType) {
    return Promise.reject(new Error(t('unsupportedFormatGeneric')));
  }

  options.notice = null;
  return loadImage(file).then(function (img) {
    var dimensions = options.longEdge
      ? fitInside(img.naturalWidth, img.naturalHeight, options.longEdge)
      : resolveDimensions(img.naturalWidth, img.naturalHeight, options.targetWidth, options.targetHeight);
    var isPng = options.outputMimeType === 'image/png';

    var cachedScale = null;
    var cachedCanvas = null;
    function canvasFor(scale) {
      if (cachedScale !== scale) {
        cachedCanvas = drawToCanvas(img, dimensions, scale, options);
        cachedScale = scale;
      }
      return cachedCanvas;
    }

    function finish(blob, info) {
      var canvas = canvasFor(info.scale);
      return {
        blob: blob,
        url: URL.createObjectURL(blob),
        width: canvas.width,
        height: canvas.height,
        info: info
      };
    }

    if (options.targetBytes) {
      var levels = isPng
        ? PALETTE_LEVELS.filter(function (n) { return !options.pngColors || n <= options.pngColors; })
        : QUALITY_LEVELS;
      // Keep the image looking decent: shrink the pixel size before dropping to very low quality / very few colours.
      var preferredLevels = levels.filter(function (n) { return isPng ? n >= 32 : n >= 0.4; });
      return fitToTargetSize(function (level, scale) {
        return encodeCanvas(canvasFor(scale), options.outputMimeType, level, options);
      }, options.targetBytes, { levels: levels, preferredLevels: preferredLevels }).then(function (found) {
        return finish(found.blob, { targeted: true, fit: found.fit, level: found.level, scale: found.scale, isPng: isPng, notice: options.notice });
      });
    }

    var level = isPng ? options.pngColors : options.quality;
    return encodeCanvas(canvasFor(1), options.outputMimeType, level, options).then(function (blob) {
      return finish(blob, { targeted: false, fit: true, level: level, scale: 1, isPng: isPng, notice: options.notice });
    });
  });
}

// ---- helpers ------------------------------------------------------------------

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.textContent = '';
  errorMessage.hidden = true;
}

function resolveOutputType(sourceType) {
  var type = resolveOutputMimeType(sourceType, formatSelect.value);
  if (type === 'image/avif' && !AVIF_ENCODE_SUPPORTED) {
    return 'image/webp';
  }
  return type;
}

function isTargetMode() {
  return !!(modeTarget && modeTarget.checked);
}

function updateModeVisibility() {
  var target = isTargetMode();
  targetFields.hidden = !target;
  // The quality slider only applies to JPG/WebP/AVIF output in "set the quality" mode.
  qualityFields.hidden = target || isPngOutput();
}

function isPngOutput() {
  var probe = selectedFile || batchFiles[0];
  if (!probe) {
    return false;
  }
  return resolveOutputType(probe.type) === 'image/png';
}

function updatePngSizeHint() {
  var png = isPngOutput();
  pngOptions.hidden = !png;
  pngSizeHint.hidden = !(png && Number(pngColors.value) === 0 && !isTargetMode());
  updateModeVisibility();
}

function readCompressOptions() {
  var options = {
    quality: Number(qualitySlider.value) / 100,
    pngColors: Number(pngColors.value),
    dither: !!pngDither.checked,
    targetBytes: null,
    fitMode: fitSelect.value,
    cropX: Number(cropX.value) / 100,
    cropY: Number(cropY.value) / 100
  };
  if (isTargetMode()) {
    options.targetBytes = parseTargetBytes(targetSizeInput.value, targetUnit.value);
    if (!options.targetBytes) {
      throw new Error(t('targetInvalid'));
    }
  }
  return options;
}

function describeLevel(info) {
  var parts = [];
  parts.push(info.isPng
    ? t('targetDetailColors', { n: info.level })
    : t('targetDetailQuality', { q: Math.round(info.level * 100) }));
  if (info.scale < 1) {
    parts.push(t('targetDetailScale', { p: Math.round(info.scale * 100) }));
  }
  return parts.join(', ');
}

function showTargetNote(result, targetBytes) {
  var parts = [];
  if (result.info.targeted) {
    var targetText = formatBytes(targetBytes);
    parts.push(result.info.fit
      ? t('targetFit', { target: targetText, detail: describeLevel(result.info) })
      : t('targetMiss', { target: targetText, size: formatBytes(result.blob.size) }));
  }
  if (result.info.notice) {
    parts.push(t(result.info.notice));
  }
  targetNote.textContent = parts.join(' ');
  targetNote.hidden = parts.length === 0;
}

function showMetaNotice(meta) {
  if (meta && meta.hasGps) {
    metaNotice.textContent = t('metaGpsRemoved');
  } else if (meta && meta.hasExif) {
    metaNotice.textContent = t('metaExifRemoved');
  } else {
    metaNotice.textContent = t('metaNone');
  }
  metaNotice.hidden = false;
}

function inspectFileMeta(file) {
  if (file.type !== 'image/jpeg' || typeof file.slice !== 'function') {
    return Promise.resolve({ isJpeg: false, hasExif: false, hasGps: false });
  }
  return file.slice(0, 262144).arrayBuffer().then(inspectJpegMetadata).catch(function () {
    return { isJpeg: false, hasExif: false, hasGps: false };
  });
}

// ---- presets & fit controls ---------------------------------------------------

function populatePresets() {
  if (!presetSelect || !presetSelect.appendChild || typeof document.createElement !== 'function') {
    return;
  }
  PRESETS.forEach(function (preset) {
    var option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset[LANG] || preset.ko;
    presetSelect.appendChild(option);
  });
  if (AVIF_ENCODE_SUPPORTED) {
    var avif = document.createElement('option');
    avif.value = 'image/avif';
    avif.textContent = t('avifOption');
    formatSelect.appendChild(avif);
  }
}

function setTargetFieldsFromBytes(bytes) {
  if (bytes >= 1024 * 1024 && bytes % (1024 * 1024) === 0) {
    targetSizeInput.value = String(bytes / (1024 * 1024));
    targetUnit.value = 'MB';
  } else {
    targetSizeInput.value = String(Math.round(bytes / 1024));
    targetUnit.value = 'KB';
  }
}

function updateFitVisibility() {
  var w = Number(resizeWidth.value);
  var h = Number(resizeHeight.value);
  var singleVisible = batchFiles.length === 0 && w > 0 && h > 0 && originalImageWidth > 0 && originalImageHeight > 0;
  var mismatch = singleVisible && Math.abs((w / h) / (originalImageWidth / originalImageHeight) - 1) > 0.01;
  var batchPreset = batchFiles.length > 0 && activePreset && activePreset.width;
  fitGroup.hidden = !(mismatch || batchPreset);
  document.getElementById('cropPosition').hidden = fitSelect.value !== 'cover';
}

function clearPreset() {
  activePreset = null;
  presetSelect.value = '';
  presetNote.hidden = true;
  presetNote.textContent = '';
}

function applyPreset(id) {
  var preset = getPreset(id);
  if (!preset) {
    clearPreset();
    updateFitVisibility();
    return;
  }
  activePreset = preset;
  var name = preset[LANG] || preset.ko;

  if (preset.maxBytes) {
    modeTarget.checked = true;
    setTargetFieldsFromBytes(preset.maxBytes);
  }
  if (preset.mime) {
    formatSelect.value = preset.mime;
  }
  if (batchFiles.length === 0 && originalImageWidth > 0) {
    if (preset.width) {
      maintainAspectRatio.checked = false;
      resizeWidth.value = preset.width;
      resizeHeight.value = preset.height;
      fitSelect.value = 'cover';
    } else if (preset.longEdge) {
      var fitted = fitInside(originalImageWidth, originalImageHeight, preset.longEdge);
      resizeWidth.value = fitted.width;
      resizeHeight.value = fitted.height;
    }
  } else if (preset.width) {
    fitSelect.value = 'cover';
  }
  presetNote.textContent = preset.longEdge && !preset.width
    ? t('presetLongEdge', { name: name, edge: preset.longEdge })
    : t('presetApplied', { name: name });
  presetNote.hidden = false;
  updateModeVisibility();
  updatePngSizeHint();
  updateFitVisibility();
}

// ---- file handling ------------------------------------------------------------

function handleFile(file) {
  if (compressBtn.disabled) { showError(t('busyFileChange')); return; }
  if (originalPreview.src && originalPreview.src.indexOf('blob:') === 0) URL.revokeObjectURL(originalPreview.src);
  clearError();
  resetBatch();
  compressionSavings.hidden = true;
  compressionSavings.textContent = '';
  targetNote.hidden = true;
  metaNotice.hidden = true;
  uploadArea.classList.remove('has-file');
  uploadHeading.textContent = t('dropImageHere');
  uploadButton.textContent = t('chooseFile');
  controls.hidden = true;
  previewArea.hidden = true;
  selectedFile = null;
  selectedMeta = null;
  originalImageWidth = 0;
  originalImageHeight = 0;
  resizeWidth.value = '';
  resizeHeight.value = '';
  clearPreset();
  fitGroup.hidden = true;
  pngSizeHint.hidden = true;
  shareBtn.hidden = true;
  shareStatus.hidden = true;
  shareStatus.textContent = '';
  if (lastResultUrl) {
    URL.revokeObjectURL(lastResultUrl);
    lastResultUrl = null;
  }

  if (!file) {
    return;
  }

  if (!isSupportedImageType(file.type)) {
    showError(t('unsupportedImageUpload'));
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    showError(t('fileTooLarge20MB'));
    return;
  }

  selectedFile = file;
  inspectFileMeta(file).then(function (meta) {
    if (selectedFile === file) selectedMeta = meta;
  });
  originalPreview.src = URL.createObjectURL(file);
  originalSize.textContent = t('originalSizeLabel', { size: formatBytes(file.size) });
  // Show editing controls only after the image has decoded.
  previewArea.hidden = false;
  compressedPreview.src = '';
  compressedSize.textContent = '';
  compressWarning.hidden = true;
  downloadBtn.hidden = true;
  updateModeVisibility();
  updatePngSizeHint();
}

function resetBatch() {
  batchResults.forEach(function (r) { URL.revokeObjectURL(r.url); });
  batchResults = [];
  batchFiles = [];
  batchGpsCount = 0;
  batchList.innerHTML = '';
  batchArea.hidden = true;
  batchProgress.hidden = true;
  batchProgress.textContent = '';
  batchSummary.hidden = true;
  batchSummary.textContent = '';
  batchZipBtn.hidden = true;
  resizeFields.hidden = false;
}

// Converts any HEIC/HEIF photos to JPEG first, then continues with the normal flow.
function prepareFiles(list) {
  if (!list.some(isHeicFile)) {
    return Promise.resolve({ files: list, error: '' });
  }
  converting = true;
  uploadArea.classList.add('is-busy');
  var total = list.filter(isHeicFile).length;
  var done = 0;
  var failed = [];
  var out = [];
  return list.reduce(function (promise, file) {
    return promise.then(function () {
      if (!isHeicFile(file)) {
        out.push(file);
        return null;
      }
      uploadHeading.textContent = t('heicConverting', { current: done + 1, total: total });
      return convertHeicToJpeg(file).then(function (jpeg) {
        out.push(jpeg);
      }, function () {
        failed.push(file.name);
      }).then(function () { done++; });
    });
  }, Promise.resolve()).then(function () {
    converting = false;
    uploadArea.classList.remove('is-busy');
    return { files: out, error: failed.length > 0 ? t('heicFailed', { name: failed.join(', ') }) : '' };
  });
}

function handleFiles(files) {
  var list = Array.prototype.slice.call(files || []);
  if (compressBtn.disabled || converting) { showError(t('busyFileChange')); return; }
  prepareFiles(list).then(function (prepared) {
    if (prepared.files.length === 0 && list.length > 0) {
      uploadHeading.textContent = t('dropImageHere');
    } else {
      routeFiles(prepared.files);
    }
    if (prepared.error) {
      showError(prepared.error);
    }
  });
}

function routeFiles(list) {
  if (list.length <= 1) {
    handleFile(list[0]);
    return;
  }
  handleBatch(list);
}

function handleBatch(list) {
  if (compressBtn.disabled) { showError(t('busyFileChange')); return; }
  handleFile(null);

  var accepted = [];
  var skipped = 0;
  list.forEach(function (file) {
    if (isSupportedImageType(file.type) && file.size <= MAX_FILE_SIZE && accepted.length < MAX_BATCH_FILES) {
      accepted.push(file);
    } else {
      skipped++;
    }
  });

  if (accepted.length === 0) {
    showError(t('batchNoValidFiles'));
    return;
  }
  if (skipped > 0) {
    showError(t('batchSkipped', { count: skipped, max: MAX_BATCH_FILES }));
  }

  batchFiles = accepted;
  uploadHeading.textContent = t('batchSelected', { n: accepted.length });
  uploadHeading.title = '';
  uploadButton.textContent = t('chooseAnotherImage');
  uploadArea.classList.add('has-file');
  resizeFields.hidden = true;
  batchArea.hidden = false;
  accepted.forEach(function (file) {
    var li = document.createElement('li');
    li.textContent = file.name + ' (' + formatBytes(file.size) + ')';
    batchList.appendChild(li);
  });
  Promise.all(accepted.map(inspectFileMeta)).then(function (metas) {
    if (batchFiles !== accepted) return;
    batchGpsCount = metas.filter(function (m) { return m.hasGps; }).length;
  });
  updateModeVisibility();
  updatePngSizeHint();
  updateFitVisibility();
  controls.hidden = false;
  controls.focus({ preventScroll: true });
  controls.scrollIntoView({ behavior: 'instant', block: 'start' });
}

function addBatchRow(file, result, name, error) {
  var li = document.createElement('li');
  var label = document.createElement('span');
  if (error) {
    label.textContent = file.name + ' — ' + t('batchItemFailed', { reason: error.message });
    li.appendChild(label);
  } else {
    label.textContent = name + ' — ' + formatBytes(file.size) + ' → ' + formatBytes(result.blob.size) + ' · ' + describeSizeChange(file.size, result.blob.size, LANG);
    var link = document.createElement('a');
    link.className = 'btn btn-outline';
    link.href = result.url;
    link.download = name;
    link.textContent = t('batchDownload');
    li.appendChild(label);
    li.appendChild(document.createTextNode(' '));
    li.appendChild(link);
  }
  batchList.appendChild(li);
}

function batchOptionsFor(base, file) {
  var options = {
    quality: base.quality,
    pngColors: base.pngColors,
    dither: base.dither,
    targetBytes: base.targetBytes,
    fitMode: base.fitMode,
    cropX: base.cropX,
    cropY: base.cropY,
    targetWidth: null,
    targetHeight: null,
    longEdge: null,
    outputMimeType: resolveOutputType(file.type)
  };
  if (activePreset && activePreset.width) {
    options.targetWidth = activePreset.width;
    options.targetHeight = activePreset.height;
  } else if (activePreset && activePreset.longEdge) {
    options.longEdge = activePreset.longEdge;
  }
  return options;
}

function runBatch() {
  clearError();
  var base;
  try {
    base = readCompressOptions();
  } catch (err) {
    showError(err.message);
    return;
  }
  batchResults.forEach(function (r) { URL.revokeObjectURL(r.url); });
  batchResults = [];
  batchList.innerHTML = '';
  batchZipBtn.hidden = true;
  batchSummary.hidden = true;

  var files = batchFiles.slice();
  var usedNames = {};
  var totalBefore = 0;
  var totalAfter = 0;

  compressBtn.disabled = true;
  compressBtn.textContent = t('processingEllipsis');
  batchProgress.hidden = false;

  files.reduce(function (promise, file, index) {
    return promise.then(function () {
      batchProgress.textContent = t('batchProgress', { current: index + 1, total: files.length });
      return processImage(file, batchOptionsFor(base, file)).then(function (result) {
        var name = getBatchOutputName(file.name, getExtensionForMimeType(result.blob.type), usedNames);
        batchResults.push({ name: name, blob: result.blob, url: result.url });
        totalBefore += file.size;
        totalAfter += result.blob.size;
        addBatchRow(file, result, name, null);
      }, function (err) {
        addBatchRow(file, null, null, err);
      });
    });
  }, Promise.resolve())
    .then(function () {
      batchProgress.hidden = true;
      var summary = batchResults.length > 0
        ? t('batchSummary', { done: batchResults.length, total: files.length, change: describeSizeChange(totalBefore, totalAfter, LANG) })
        : t('batchSummaryNone', { done: 0, total: files.length });
      if (batchResults.length > 0 && batchGpsCount > 0) {
        summary += ' · ' + t('batchGpsRemoved', { n: batchGpsCount });
      }
      batchSummary.textContent = summary;
      batchSummary.hidden = false;
      batchZipBtn.hidden = batchResults.length === 0;
    })
    .then(function () {
      compressBtn.disabled = false;
      compressBtn.textContent = t('applyButton');
    });
}

batchZipBtn.addEventListener('click', function () {
  createStoredZip(batchResults.map(function (r) { return { name: r.name, blob: r.blob }; }))
    .then(function (zip) {
      var url = URL.createObjectURL(zip);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'compressed-images.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    })
    .catch(function (err) { showError(err.message); });
});

originalPreview.addEventListener('load', function () {
  if (!selectedFile) {
    return;
  }
  originalImageWidth = originalPreview.naturalWidth;
  originalImageHeight = originalPreview.naturalHeight;

  var prefill = clampDimensionsToMax(originalImageWidth, originalImageHeight);
  resizeWidth.value = prefill.width;
  resizeHeight.value = prefill.height;
  uploadHeading.textContent = selectedFile.name;
  uploadHeading.title = selectedFile.name;
  uploadButton.textContent = t('chooseAnotherImage');
  uploadArea.classList.add('has-file');
  controls.hidden = false;
  updateFitVisibility();
  controls.focus({ preventScroll: true });
  controls.scrollIntoView({ behavior: 'instant', block: 'start' });
});

originalPreview.addEventListener('error', function () {
  if (!selectedFile) return;
  selectedFile = null;
  controls.hidden = true;
  previewArea.hidden = true;
  showError(t('imageLoadFailedChooseAnother'));
});

wireFileUpload(uploadArea, fileInput, handleFiles);

window.addEventListener('paste', function (e) {
  var items = e.clipboardData && e.clipboardData.items;
  if (!items) {
    return;
  }
  for (var i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image/') === 0) {
      var file = items[i].getAsFile();
      if (file) {
        fileInput.value = '';
        handleFile(file);
      }
      break;
    }
  }
});

qualitySlider.addEventListener('input', function () {
  qualityValue.textContent = qualitySlider.value;
});

compressBtn.addEventListener('click', function () {
  if (batchFiles.length > 0) {
    runBatch();
    return;
  }
  if (!selectedFile) {
    return;
  }
  clearError();
  compressWarning.hidden = true;
  targetNote.hidden = true;

  var widthInput = readDimensionInput(resizeWidth);
  var heightInput = readDimensionInput(resizeHeight);

  if ((widthInput !== null && isNaN(widthInput)) || (heightInput !== null && isNaN(heightInput))) {
    showError(t('dimensionsMustBeNumbers'));
    return;
  }
  if ((widthInput !== null && !isValidDimensionInput(widthInput)) || (heightInput !== null && !isValidDimensionInput(heightInput))) {
    showError(t('dimensionsOutOfRange', { max: MAX_DIMENSION }));
    return;
  }

  var resolved = resolveDimensions(originalImageWidth, originalImageHeight, widthInput, heightInput);
  if (!isValidDimensionInput(resolved.width) || !isValidDimensionInput(resolved.height)) {
    showError(t('dimensionsOutOfRange', { max: MAX_DIMENSION }));
    return;
  }

  var options;
  try {
    options = readCompressOptions();
  } catch (err) {
    showError(err.message);
    return;
  }
  options.targetWidth = widthInput;
  options.targetHeight = heightInput;
  options.outputMimeType = resolveOutputType(selectedFile.type);

  compressBtn.disabled = true;
  compressBtn.textContent = options.outputMimeType === 'image/avif' ? t('avifWorking') : t('processingEllipsis');

  var runFile = selectedFile;
  var runMeta = selectedMeta;
  processImage(runFile, options)
    .then(function (result) {
      if (lastResultUrl) {
        URL.revokeObjectURL(lastResultUrl);
      }
      lastResultUrl = result.url;
      compressedPreview.src = result.url;
      compressedSize.textContent = t('resultSizeLabel', { size: formatBytes(result.blob.size), width: result.width, height: result.height });
      compressionSavings.textContent = describeSizeChange(runFile.size, result.blob.size, LANG);
      compressionSavings.classList.toggle('size-increased', result.blob.size > runFile.size);
      compressionSavings.hidden = false;
      showTargetNote(result, options.targetBytes);
      showMetaNotice(runMeta);
      compressWarning.hidden = result.blob.size <= runFile.size;
      downloadBtn.href = result.url;
      downloadBtn.download = 'processed-image.' + getExtensionForMimeType(result.blob.type);
      downloadBtn.hidden = false;
      shareBtn.hidden = false;
      shareStatus.hidden = true;
    })
    .catch(function (err) {
      showError(err.message);
    })
    .then(function () {
      compressBtn.disabled = false;
      compressBtn.textContent = t('applyButton');
    });
});

function readDimensionInput(inputEl) {
  var raw = inputEl.value.trim();
  if (raw === '') {
    return null;
  }
  var num = Number(raw);
  return isNaN(num) ? NaN : num;
}

resizeWidth.addEventListener('input', function () {
  if (maintainAspectRatio.checked && originalImageWidth && originalImageHeight) {
    var w = Number(resizeWidth.value);
    if (w && !isNaN(w)) {
      resizeHeight.value = calculateAspectRatioHeight(originalImageWidth, originalImageHeight, w);
    }
  }
  updateFitVisibility();
});

resizeHeight.addEventListener('input', function () {
  if (maintainAspectRatio.checked && originalImageWidth && originalImageHeight) {
    var h = Number(resizeHeight.value);
    if (h && !isNaN(h)) {
      resizeWidth.value = calculateAspectRatioWidth(originalImageWidth, originalImageHeight, h);
    }
  }
  updateFitVisibility();
});

formatSelect.addEventListener('change', function () {
  updateModeVisibility();
  updatePngSizeHint();
});
pngColors.addEventListener('change', updatePngSizeHint);
modeQuality.addEventListener('change', function () { updateModeVisibility(); updatePngSizeHint(); });
modeTarget.addEventListener('change', function () { updateModeVisibility(); updatePngSizeHint(); });
fitSelect.addEventListener('change', updateFitVisibility);
presetSelect.addEventListener('change', function () { applyPreset(presetSelect.value); });

populatePresets();

wireShareButton(shareBtn, shareStatus, function () {
  return {
    title: t('compressShareTitle'),
    text: t('compressShareText'),
    url: SHARE_URL
  };
});
