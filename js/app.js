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

function processImage(file, options) {
  return new Promise(function (resolve, reject) {
    if (!options.outputMimeType) {
      reject(new Error('지원하지 않는 파일 형식입니다.'));
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
        reject(new Error('2D 캔버스 컨텍스트를 생성할 수 없습니다.'));
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
            reject(new Error('이미지 처리에 실패했습니다.'));
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
      reject(new Error('이미지를 불러올 수 없습니다.'));
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
  if (compressBtn.disabled) { showError('처리 중에는 파일을 바꿀 수 없습니다. 완료 후 다시 선택해주세요.'); return; }
  if (originalPreview.src && originalPreview.src.indexOf('blob:') === 0) URL.revokeObjectURL(originalPreview.src);
  clearError();
  compressionSavings.hidden = true;
  compressionSavings.textContent = '';
  uploadArea.classList.remove('has-file');
  uploadHeading.textContent = '이미지를 여기에 놓으세요';
  uploadButton.textContent = '파일 선택';
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
    showError('지원하지 않는 파일 형식입니다. JPG, PNG, WebP 파일만 업로드할 수 있어요.');
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    showError('파일이 너무 큽니다 (최대 20MB). 더 작은 파일을 선택해주세요.');
    return;
  }

  selectedFile = file;
  originalPreview.src = URL.createObjectURL(file);
  originalSize.textContent = '원본 크기: ' + formatBytes(file.size);
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
  uploadButton.textContent = '다른 이미지 선택';
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
  showError('이미지를 불러올 수 없습니다. 다른 파일을 선택해주세요.');
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
    showError('가로/세로 값은 숫자로 입력해주세요.');
    return;
  }
  if ((widthInput !== null && !isValidDimensionInput(widthInput)) || (heightInput !== null && !isValidDimensionInput(heightInput))) {
    showError('가로/세로 값은 1~' + MAX_DIMENSION + 'px 사이여야 합니다.');
    return;
  }

  var resolved = resolveDimensions(originalImageWidth, originalImageHeight, widthInput, heightInput);
  if (!isValidDimensionInput(resolved.width) || !isValidDimensionInput(resolved.height)) {
    showError('가로/세로 값은 1~' + MAX_DIMENSION + 'px 사이여야 합니다.');
    return;
  }

  var outputMimeType = resolveOutputMimeType(selectedFile.type, formatSelect.value);

  compressBtn.disabled = true;
  compressBtn.textContent = '처리 중...';

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
      compressedSize.textContent = '결과 크기: ' + formatBytes(result.blob.size) + ' (' + result.width + '×' + result.height + ')';
      compressionSavings.textContent = describeSizeChange(runFile.size, result.blob.size);
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
      compressBtn.textContent = '적용하기';
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
    title: 'image toolbox - 브라우저에서 바로 처리하는 이미지 압축',
    text: '사진을 서버에 올리지 않고 브라우저에서 무료로 압축·변환하는 도구예요.',
    url: 'https://nwb010118.github.io/image-toolbox/'
  };
});
