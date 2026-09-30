// Image upscaling tool - event wiring

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
var upscaleShareBtn = document.getElementById('upscaleShareBtn');
var upscaleShareStatus = document.getElementById('upscaleShareStatus');
var upscaleModeRadios = document.querySelectorAll('input[name="upscaleMode"]');

var UPSCALE_MODE_LABELS = LANG === 'en'
  ? { '2x': '2x', '4x': '4x', '1440p': '1440p', '4K': '4K' }
  : { '2x': '2배', '4x': '4배', '1440p': '1440p', '4K': '4K' };
var SHARE_URL = LANG === 'en'
  ? 'https://nwb010118.github.io/image-toolbox/en/upscale.html'
  : 'https://nwb010118.github.io/image-toolbox/upscale.html';

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
      reject(new Error(t('imageLoadFailedNamed', { name: file.name })));
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
    throw new Error(t('canvas2dUnavailable'));
  }
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

function updateUpscaleModeAvailability(width, height) {
  var disabledCurrentlyChecked = false;

  for (var i = 0; i < upscaleModeRadios.length; i++) {
    var radio = upscaleModeRadios[i];
    var mode = radio.value;

    if (!RESOLUTION_PRESETS[mode]) {
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
      note.textContent = t('modeUnreachableNote', { min: minLongEdge });
      note.hidden = false;
    }
  }

  if (disabledCurrentlyChecked) {
    document.querySelector('input[name="upscaleMode"][value="2x"]').checked = true;
  }
}

function handleUpscaleFile(file) {
  if (upscaleBtn.disabled) {
    showUpscaleError(t('busyCannotSelectNew'));
    return;
  }

  clearUpscaleError();
  upscaleControls.hidden = true;
  upscalePreviewArea.hidden = true;
  upscaleResultPreview.hidden = true;
  upscaleDownloadBtn.hidden = true;
  upscaleShareBtn.hidden = true;
  upscaleShareStatus.hidden = true;
  upscaleShareStatus.textContent = '';
  upscaleResultHeading.textContent = t('resultLabel');
  selectedUpscaleFile = null;
  selectedUpscaleDataUrl = null;
  selectedUpscaleWidth = null;
  selectedUpscaleHeight = null;

  if (!file) {
    return;
  }

  if (!isSupportedImageType(file.type)) {
    showUpscaleError(t('unsupportedFormatNamed', { name: file.name }));
    return;
  }
  if (!isValidFileSize(file.size)) {
    showUpscaleError(t('fileTooLargeNamed20MB', { name: file.name }));
    return;
  }

  loadImageFile(file)
    .then(function (img) {
      if (!isValidUpscaleDimensions(img.naturalWidth, img.naturalHeight)) {
        showUpscaleError(t('imageTooLarge', { max: MAX_UPSCALE_DIMENSION }));
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

window.addEventListener('paste', function (e) {
  var items = e.clipboardData && e.clipboardData.items;
  if (!items) {
    return;
  }
  for (var i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image/') === 0) {
      var file = items[i].getAsFile();
      if (file) {
        upscaleFileInput.value = '';
        handleUpscaleFile(file);
      }
      break;
    }
  }
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
        reject(new Error(t('canvas2dUnavailable')));
        return;
      }
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = function () {
      reject(new Error(t('upscaleResultImageFailed')));
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
    showUpscaleError(t('upscaleLibraryLoadFailed'));
    return;
  }

  var checkedRadio = document.querySelector('input[name="upscaleMode"]:checked');
  var mode = checkedRadio.value;
  var plan = getUpscalePlan(mode, selectedUpscaleWidth, selectedUpscaleHeight);

  if (!plan.reachable) {
    showUpscaleError(t('resolutionUnreachable'));
    return;
  }

  var runFileName = selectedUpscaleFile.name;

  upscaleBtn.disabled = true;
  upscaleBtn.textContent = t('processingEllipsis');
  upscaleProgress.textContent = t('processingPercent', { percent: 0 });
  upscaleProgress.hidden = false;
  upscaleResultPreview.hidden = true;
  upscaleDownloadBtn.hidden = true;

  if (!upscaler) {
    upscaler = new Upscaler({ model: ESRGANSlim2x });
  }

  runUpscalePasses(selectedUpscaleDataUrl, plan.aiPasses, function (fraction) {
    upscaleProgress.textContent = t('processingPercent', { percent: Math.round(fraction * 100) });
  })
    .then(function (resultDataUrl) {
      if (plan.targetLongEdge) {
        return resizeDataUrlToLongEdge(resultDataUrl, plan.targetLongEdge);
      }
      return resultDataUrl;
    })
    .then(function (finalDataUrl) {
      upscaleResultHeading.textContent = t('resultWithMode', { mode: UPSCALE_MODE_LABELS[mode] });
      upscaleResultPreview.src = finalDataUrl;
      upscaleResultPreview.hidden = false;
      upscaleDownloadBtn.href = finalDataUrl;
      upscaleDownloadBtn.download = getUpscaledFilename(runFileName, mode);
      upscaleDownloadBtn.hidden = false;
      upscaleShareBtn.hidden = false;
      upscaleShareStatus.hidden = true;
    })
    .catch(function (err) {
      console.error('Upscale failed:', err);
      showUpscaleError(t('upscaleFailed'));
    })
    .then(function () {
      upscaleBtn.disabled = false;
      upscaleBtn.textContent = t('upscaleButton');
      upscaleProgress.hidden = true;
    });
});

wireShareButton(upscaleShareBtn, upscaleShareStatus, function () {
  return {
    title: t('upscaleShareTitle'),
    text: t('upscaleShareText'),
    url: SHARE_URL
  };
});
