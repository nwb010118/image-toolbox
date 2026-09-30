var selectedFile = null;
var batchFiles = [];
var batchResults = [];

var uploadArea = document.getElementById('uploadArea');
var fileInput = document.getElementById('fileInput');
var errorMessage = document.getElementById('errorMessage');
var controls = document.getElementById('controls');
var qualitySlider = document.getElementById('qualitySlider');
var qualityValue = document.getElementById('qualityValue');
var compressBtn = document.getElementById('compressBtn');
var previewArea = document.getElementById('previewArea');
var originalPreview = document.getElementById('originalPreview');
var compressedPreview = document.getElementById('compressedPreview');
var originalSize = document.getElementById('originalSize');
var compressedSize = document.getElementById('compressedSize');
var compressionSavings = document.getElementById('compressionSavings');
var uploadHeading = uploadArea.querySelector('.upload-heading');
var uploadButton = uploadArea.querySelector('.upload-btn');
var compressWarning = document.getElementById('compressWarning');
var downloadBtn = document.getElementById('downloadBtn');
var pngSizeHint = document.getElementById('pngSizeHint');
var shareBtn = document.getElementById('shareBtn');
var shareStatus = document.getElementById('shareStatus');

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

function processImage(file, options) {
  return new Promise(function (resolve, reject) {
    if (!options.outputMimeType) {
      reject(new Error(t('unsupportedFormatGeneric')));
      return;
    }

    var img = new Image();
    var objectUrl = URL.createObjectURL(file);

    img.onload = function () {
      var dimensions = resolveDimensions(img.naturalWidth, img.naturalHeight, options.targetWidth, options.targetHeight);

      var canvas = document.createElement('canvas');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      var ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(t('canvas2dUnavailable')));
        return;
      }

      if (options.outputMimeType === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);

      canvas.toBlob(
        function (blob) {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error(t('imageProcessingFailed')));
            return;
          }
          resolve({ blob: blob, url: URL.createObjectURL(blob), width: dimensions.width, height: dimensions.height });
        },
        options.outputMimeType,
        options.quality
      );
    };

    img.onerror = function () {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(t('imageLoadFailedGeneric')));
    };

    img.src = objectUrl;
  });
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.textContent = '';
  errorMessage.hidden = true;
}

function updatePngSizeHint() {
  var probe = selectedFile || batchFiles[0];
  if (!probe) {
    pngSizeHint.hidden = true;
    return;
  }
  var outputMimeType = resolveOutputMimeType(probe.type, formatSelect.value);
  pngSizeHint.hidden = outputMimeType !== 'image/png';
}

function handleFile(file) {
  if (compressBtn.disabled) { showError(t('busyFileChange')); return; }
  if (originalPreview.src && originalPreview.src.indexOf('blob:') === 0) URL.revokeObjectURL(originalPreview.src);
  clearError();
  resetBatch();
  compressionSavings.hidden = true;
  compressionSavings.textContent = '';
  uploadArea.classList.remove('has-file');
  uploadHeading.textContent = t('dropImageHere');
  uploadButton.textContent = t('chooseFile');
  controls.hidden = true;
  previewArea.hidden = true;
  selectedFile = null;
  originalImageWidth = 0;
  originalImageHeight = 0;
  resizeWidth.value = '';
  resizeHeight.value = '';
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
  originalPreview.src = URL.createObjectURL(file);
  originalSize.textContent = t('originalSizeLabel', { size: formatBytes(file.size) });
  // Show editing controls only after the image has decoded.
  previewArea.hidden = false;
  compressedPreview.src = '';
  compressedSize.textContent = '';
  compressWarning.hidden = true;
  downloadBtn.hidden = true;
  updatePngSizeHint();
}

function resetBatch() {
  batchResults.forEach(function (r) { URL.revokeObjectURL(r.url); });
  batchResults = [];
  batchFiles = [];
  batchList.innerHTML = '';
  batchArea.hidden = true;
  batchProgress.hidden = true;
  batchProgress.textContent = '';
  batchSummary.hidden = true;
  batchSummary.textContent = '';
  batchZipBtn.hidden = true;
  resizeFields.hidden = false;
}

function handleFiles(files) {
  var list = Array.prototype.slice.call(files || []);
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
  updatePngSizeHint();
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

function runBatch() {
  clearError();
  batchResults.forEach(function (r) { URL.revokeObjectURL(r.url); });
  batchResults = [];
  batchList.innerHTML = '';
  batchZipBtn.hidden = true;
  batchSummary.hidden = true;

  var files = batchFiles.slice();
  var quality = Number(qualitySlider.value) / 100;
  var usedNames = {};
  var totalBefore = 0;
  var totalAfter = 0;

  compressBtn.disabled = true;
  compressBtn.textContent = t('processingEllipsis');
  batchProgress.hidden = false;

  files.reduce(function (promise, file, index) {
    return promise.then(function () {
      batchProgress.textContent = t('batchProgress', { current: index + 1, total: files.length });
      return processImage(file, {
        quality: quality,
        targetWidth: null,
        targetHeight: null,
        outputMimeType: resolveOutputMimeType(file.type, formatSelect.value)
      }).then(function (result) {
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
      batchSummary.textContent = batchResults.length > 0
        ? t('batchSummary', { done: batchResults.length, total: files.length, change: describeSizeChange(totalBefore, totalAfter, LANG) })
        : t('batchSummaryNone', { done: 0, total: files.length });
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

  var outputMimeType = resolveOutputMimeType(selectedFile.type, formatSelect.value);

  compressBtn.disabled = true;
  compressBtn.textContent = t('processingEllipsis');

  var quality = Number(qualitySlider.value) / 100;

  var runFile = selectedFile;
  processImage(runFile, {
    quality: quality,
    targetWidth: widthInput,
    targetHeight: heightInput,
    outputMimeType: outputMimeType
  })
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
  if (!maintainAspectRatio.checked || !originalImageWidth || !originalImageHeight) {
    return;
  }
  var w = Number(resizeWidth.value);
  if (!w || isNaN(w)) {
    return;
  }
  resizeHeight.value = calculateAspectRatioHeight(originalImageWidth, originalImageHeight, w);
});

resizeHeight.addEventListener('input', function () {
  if (!maintainAspectRatio.checked || !originalImageWidth || !originalImageHeight) {
    return;
  }
  var h = Number(resizeHeight.value);
  if (!h || isNaN(h)) {
    return;
  }
  resizeWidth.value = calculateAspectRatioWidth(originalImageWidth, originalImageHeight, h);
});

formatSelect.addEventListener('change', updatePngSizeHint);

wireShareButton(shareBtn, shareStatus, function () {
  return {
    title: t('compressShareTitle'),
    text: t('compressShareText'),
    url: SHARE_URL
  };
});
