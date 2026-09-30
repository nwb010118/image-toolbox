var selectedFile = null;

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
  if (!selectedFile) {
    pngSizeHint.hidden = true;
    return;
  }
  var outputMimeType = resolveOutputMimeType(selectedFile.type, formatSelect.value);
  pngSizeHint.hidden = outputMimeType !== 'image/png';
}

function handleFile(file) {
  if (compressBtn.disabled) { showError(t('busyFileChange')); return; }
  if (originalPreview.src && originalPreview.src.indexOf('blob:') === 0) URL.revokeObjectURL(originalPreview.src);
  clearError();
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

wireFileUpload(uploadArea, fileInput, function (files) { handleFile(files[0]); });

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
