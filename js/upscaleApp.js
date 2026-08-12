// 이미지 업스케일링 도구 - 이벤트 와이어링

var upscaleUploadArea = document.getElementById('upscaleUploadArea');
var upscaleFileInput = document.getElementById('upscaleFileInput');
var upscaleError = document.getElementById('upscaleError');
var upscaleControls = document.getElementById('upscaleControls');
var upscaleBtn = document.getElementById('upscaleBtn');
var upscaleProgress = document.getElementById('upscaleProgress');
var upscalePreviewArea = document.getElementById('upscalePreviewArea');
var upscaleOriginalPreview = document.getElementById('upscaleOriginalPreview');
var upscaleOriginalSize = document.getElementById('upscaleOriginalSize');
var upscaleResultHeading = document.getElementById('upscaleResultHeading');
var upscaleResultPreview = document.getElementById('upscaleResultPreview');
var upscaleDownloadBtn = document.getElementById('upscaleDownloadBtn');
var upscaleModeRadios = document.querySelectorAll('input[name="upscaleMode"]');

var UPSCALE_MODE_LABELS = { '2x': '2배', '4x': '4배', '1440p': '1440p', '4K': '4K' };

var selectedUpscaleFile = null;
var selectedUpscaleDataUrl = null;
var selectedUpscaleWidth = null;
var selectedUpscaleHeight = null;
var upscaler = null;

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

function updateUpscaleModeAvailability(width, height) {
  var disabledCurrentlyChecked = false;

  for (var i = 0; i < upscaleModeRadios.length; i++) {
    var radio = upscaleModeRadios[i];
    var mode = radio.value;

    if (mode === '2x' || mode === '4x') {
      continue;
    }

    var reachable = isReachable(mode, width, height);
    radio.disabled = !reachable;
    if (!reachable && radio.checked) {
      disabledCurrentlyChecked = true;
    }

    var note = document.getElementById('upscaleNote' + mode);
    if (reachable) {
      note.hidden = true;
      note.textContent = '';
    } else {
      var minLongEdge = Math.ceil(RESOLUTION_PRESETS[mode] / MAX_AI_SCALE);
      note.textContent = '이 이미지로는 도달할 수 없어요 (긴 변 최소 ' + minLongEdge + 'px 필요)';
      note.hidden = false;
    }
  }

  if (disabledCurrentlyChecked) {
    document.querySelector('input[name="upscaleMode"][value="2x"]').checked = true;
  }
}

function handleUpscaleFile(file) {
  clearUpscaleError();
  upscaleControls.hidden = true;
  upscalePreviewArea.hidden = true;
  upscaleResultPreview.hidden = true;
  upscaleDownloadBtn.hidden = true;
  selectedUpscaleFile = null;
  selectedUpscaleDataUrl = null;
  selectedUpscaleWidth = null;
  selectedUpscaleHeight = null;

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
      selectedUpscaleWidth = img.naturalWidth;
      selectedUpscaleHeight = img.naturalHeight;

      upscaleOriginalPreview.src = selectedUpscaleDataUrl;
      upscaleOriginalSize.textContent = img.naturalWidth + ' × ' + img.naturalHeight + ' · ' + formatBytes(file.size);
      upscalePreviewArea.hidden = false;
      updateUpscaleModeAvailability(img.naturalWidth, img.naturalHeight);
      upscaleControls.hidden = false;
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

function chainOneUpscalePass(chain, passIndex, passCount, onProgress) {
  return chain.then(function (inputDataUrl) {
    return upscaler.upscale(inputDataUrl, {
      patchSize: 128,
      padding: 2,
      progress: function (amount) {
        onProgress((passIndex + amount) / passCount);
      }
    });
  });
}

function runUpscalePasses(dataUrl, passCount, onProgress) {
  var chain = Promise.resolve(dataUrl);
  for (var i = 0; i < passCount; i++) {
    chain = chainOneUpscalePass(chain, i, passCount, onProgress);
  }
  return chain;
}

function resizeDataUrlToLongEdge(dataUrl, targetLongEdge) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () {
      var scale = targetLongEdge / Math.max(img.naturalWidth, img.naturalHeight);
      var targetWidth = Math.round(img.naturalWidth * scale);
      var targetHeight = Math.round(img.naturalHeight * scale);
      var canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      var ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('2D 캔버스 컨텍스트를 생성할 수 없습니다.'));
        return;
      }
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = function () {
      reject(new Error('업스케일 결과 이미지를 불러올 수 없습니다.'));
    };
    img.src = dataUrl;
  });
}

upscaleBtn.addEventListener('click', function () {
  if (!selectedUpscaleDataUrl) {
    return;
  }
  clearUpscaleError();

  if (typeof Upscaler === 'undefined' || typeof ESRGANSlim2x === 'undefined') {
    showUpscaleError('업스케일링 기능을 불러오지 못했습니다. 인터넷 연결을 확인해주세요.');
    return;
  }

  var checkedRadio = document.querySelector('input[name="upscaleMode"]:checked');
  var mode = checkedRadio.value;
  var plan = getUpscalePlan(mode, selectedUpscaleWidth, selectedUpscaleHeight);

  upscaleBtn.disabled = true;
  upscaleBtn.textContent = '처리 중...';
  upscaleProgress.textContent = '처리 중... (0%)';
  upscaleProgress.hidden = false;
  upscaleResultPreview.hidden = true;
  upscaleDownloadBtn.hidden = true;

  if (!upscaler) {
    upscaler = new Upscaler({ model: ESRGANSlim2x });
  }

  runUpscalePasses(selectedUpscaleDataUrl, plan.aiPasses, function (fraction) {
    upscaleProgress.textContent = '처리 중... (' + Math.round(fraction * 100) + '%)';
  })
    .then(function (resultDataUrl) {
      if (plan.targetLongEdge) {
        return resizeDataUrlToLongEdge(resultDataUrl, plan.targetLongEdge);
      }
      return resultDataUrl;
    })
    .then(function (finalDataUrl) {
      upscaleResultHeading.textContent = '결과 (' + UPSCALE_MODE_LABELS[mode] + ')';
      upscaleResultPreview.src = finalDataUrl;
      upscaleResultPreview.hidden = false;
      upscaleDownloadBtn.href = finalDataUrl;
      upscaleDownloadBtn.download = getUpscaledFilename(selectedUpscaleFile.name, mode);
      upscaleDownloadBtn.hidden = false;
    })
    .catch(function (err) {
      console.error('Upscale failed:', err);
      showUpscaleError('업스케일링 중 오류가 발생했습니다. 다른 이미지로 다시 시도해주세요.');
    })
    .then(function () {
      upscaleBtn.disabled = false;
      upscaleBtn.textContent = '확대하기';
      upscaleProgress.hidden = true;
    });
});
