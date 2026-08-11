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
var compressWarning = document.getElementById('compressWarning');
var downloadBtn = document.getElementById('downloadBtn');

var resizeWidth = document.getElementById('resizeWidth');
var resizeHeight = document.getElementById('resizeHeight');
var maintainAspectRatio = document.getElementById('maintainAspectRatio');
var formatSelect = document.getElementById('formatSelect');

var originalImageWidth = 0;
var originalImageHeight = 0;

var MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function compressImage(file, quality) {
  return new Promise(function (resolve, reject) {
    var outputType = getOutputMimeType(file.type);
    if (!outputType) {
      reject(new Error('지원하지 않는 파일 형식입니다.'));
      return;
    }

    var img = new Image();
    var objectUrl = URL.createObjectURL(file);

    img.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      var ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('2D 캔버스 컨텍스트를 생성할 수 없습니다.'));
        return;
      }
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        function (blob) {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error('이미지 압축에 실패했습니다.'));
            return;
          }
          resolve({ blob: blob, url: URL.createObjectURL(blob) });
        },
        outputType,
        quality
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

function handleFile(file) {
  clearError();
  controls.hidden = true;
  previewArea.hidden = true;
  selectedFile = null;
  originalImageWidth = 0;
  originalImageHeight = 0;
  resizeWidth.value = '';
  resizeHeight.value = '';

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
  controls.hidden = false;
  previewArea.hidden = false;
  compressedPreview.src = '';
  compressedSize.textContent = '';
  compressWarning.hidden = true;
  downloadBtn.hidden = true;
}

originalPreview.addEventListener('load', function () {
  if (!selectedFile) {
    return;
  }
  originalImageWidth = originalPreview.naturalWidth;
  originalImageHeight = originalPreview.naturalHeight;
  resizeWidth.value = originalImageWidth;
  resizeHeight.value = originalImageHeight;
});

fileInput.addEventListener('change', function (e) {
  handleFile(e.target.files[0]);
});

uploadArea.addEventListener('click', function (e) {
  if (e.target !== fileInput) {
    fileInput.click();
  }
});

var dragCounter = 0;

uploadArea.addEventListener('dragenter', function (e) {
  e.preventDefault();
  dragCounter = dragCounter + 1;
  uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragover', function (e) {
  e.preventDefault();
});

uploadArea.addEventListener('dragleave', function () {
  dragCounter = dragCounter - 1;
  if (dragCounter <= 0) {
    dragCounter = 0;
    uploadArea.classList.remove('drag-over');
  }
});

uploadArea.addEventListener('drop', function (e) {
  e.preventDefault();
  dragCounter = 0;
  uploadArea.classList.remove('drag-over');
  var file = e.dataTransfer.files[0];
  fileInput.value = '';
  handleFile(file);
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
  compressBtn.disabled = true;
  compressBtn.textContent = '압축 중...';

  var quality = Number(qualitySlider.value) / 100;

  compressImage(selectedFile, quality)
    .then(function (result) {
      compressedPreview.src = result.url;
      compressedSize.textContent = '압축 크기: ' + formatBytes(result.blob.size);
      compressWarning.hidden = result.blob.size <= selectedFile.size;
      downloadBtn.href = result.url;

      var extension = selectedFile.type === 'image/png' ? 'png' : (selectedFile.type === 'image/webp' ? 'webp' : 'jpg');
      downloadBtn.download = 'compressed-image.' + extension;
      downloadBtn.hidden = false;
    })
    .catch(function (err) {
      showError(err.message);
    })
    .then(function () {
      compressBtn.disabled = false;
      compressBtn.textContent = '압축하기';
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
