// 이미지 업스케일링 도구 - 이벤트 와이어링

var upscaleUploadArea = document.getElementById('upscaleUploadArea');
var upscaleFileInput = document.getElementById('upscaleFileInput');
var upscaleError = document.getElementById('upscaleError');
var upscaleBtn = document.getElementById('upscaleBtn');
var upscaleProgress = document.getElementById('upscaleProgress');
var upscalePreviewArea = document.getElementById('upscalePreviewArea');
var upscaleOriginalPreview = document.getElementById('upscaleOriginalPreview');
var upscaleOriginalSize = document.getElementById('upscaleOriginalSize');
var upscaleResultPreview = document.getElementById('upscaleResultPreview');
var upscaleDownloadBtn = document.getElementById('upscaleDownloadBtn');

var selectedUpscaleFile = null;
var selectedUpscaleDataUrl = null;

function showUpscaleError(message) {
  upscaleError.textContent = message;
  upscaleError.hidden = false;
}

function clearUpscaleError() {
  upscaleError.textContent = '';
  upscaleError.hidden = true;
}

function loadImageFile(file) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    var objectUrl = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = function () {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 불러올 수 없습니다: ' + file.name));
    };
    img.src = objectUrl;
  });
}

function imageToDataUrl(img) {
  var canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  var ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D 캔버스 컨텍스트를 생성할 수 없습니다.');
  }
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

function handleUpscaleFile(file) {
  clearUpscaleError();
  upscaleBtn.hidden = true;
  upscalePreviewArea.hidden = true;
  upscaleResultPreview.hidden = true;
  upscaleDownloadBtn.hidden = true;
  selectedUpscaleFile = null;
  selectedUpscaleDataUrl = null;

  if (!file) {
    return;
  }

  if (!isSupportedImageType(file.type)) {
    showUpscaleError('지원하지 않는 파일 형식입니다: ' + file.name + ' (JPG, PNG, WebP만 가능)');
    return;
  }
  if (!isValidFileSize(file.size)) {
    showUpscaleError('파일이 너무 큽니다 (최대 20MB): ' + file.name);
    return;
  }

  loadImageFile(file)
    .then(function (img) {
      if (!isValidUpscaleDimensions(img.naturalWidth, img.naturalHeight)) {
        showUpscaleError('이미지가 너무 큽니다 (가로/세로 각각 최대 ' + MAX_UPSCALE_DIMENSION + 'px). 이미지 압축 도구에서 먼저 크기를 줄여주세요.');
        return;
      }

      selectedUpscaleFile = file;
      selectedUpscaleDataUrl = imageToDataUrl(img);

      upscaleOriginalPreview.src = selectedUpscaleDataUrl;
      upscaleOriginalSize.textContent = img.naturalWidth + ' × ' + img.naturalHeight + ' · ' + formatBytes(file.size);
      upscalePreviewArea.hidden = false;
      upscaleBtn.hidden = false;
    })
    .catch(function (err) {
      showUpscaleError(err.message);
    });
}

upscaleFileInput.addEventListener('change', function (e) {
  handleUpscaleFile(e.target.files[0]);
});

upscaleUploadArea.addEventListener('click', function (e) {
  if (e.target !== upscaleFileInput) {
    upscaleFileInput.click();
  }
});

var upscaleDragCounter = 0;

upscaleUploadArea.addEventListener('dragenter', function (e) {
  e.preventDefault();
  upscaleDragCounter = upscaleDragCounter + 1;
  upscaleUploadArea.classList.add('drag-over');
});

upscaleUploadArea.addEventListener('dragover', function (e) {
  e.preventDefault();
});

upscaleUploadArea.addEventListener('dragleave', function () {
  upscaleDragCounter = upscaleDragCounter - 1;
  if (upscaleDragCounter <= 0) {
    upscaleDragCounter = 0;
    upscaleUploadArea.classList.remove('drag-over');
  }
});

upscaleUploadArea.addEventListener('drop', function (e) {
  e.preventDefault();
  upscaleDragCounter = 0;
  upscaleUploadArea.classList.remove('drag-over');
  upscaleFileInput.value = '';
  handleUpscaleFile(e.dataTransfer.files[0]);
});

upscaleBtn.addEventListener('click', function () {
  if (!selectedUpscaleDataUrl) {
    return;
  }
  clearUpscaleError();

  if (typeof Upscaler === 'undefined' || typeof ESRGANSlim2x === 'undefined') {
    showUpscaleError('업스케일링 기능을 불러오지 못했습니다. 인터넷 연결을 확인해주세요.');
    return;
  }

  upscaleBtn.disabled = true;
  upscaleBtn.textContent = '처리 중...';
  upscaleProgress.hidden = false;
  upscaleResultPreview.hidden = true;
  upscaleDownloadBtn.hidden = true;

  var upscaler = new Upscaler({ model: ESRGANSlim2x });

  upscaler.upscale(selectedUpscaleDataUrl)
    .then(function (resultDataUrl) {
      upscaleResultPreview.src = resultDataUrl;
      upscaleResultPreview.hidden = false;
      upscaleDownloadBtn.href = resultDataUrl;
      upscaleDownloadBtn.download = getUpscaledFilename(selectedUpscaleFile.name);
      upscaleDownloadBtn.hidden = false;
    })
    .catch(function (err) {
      showUpscaleError('업스케일링 중 오류가 발생했습니다: ' + (err && err.message ? err.message : String(err)));
    })
    .then(function () {
      upscaleBtn.disabled = false;
      upscaleBtn.textContent = '2배로 확대';
      upscaleProgress.hidden = true;
    });
});
