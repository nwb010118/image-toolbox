// PDF 변환 도구 - 이미지 → PDF, PDF → 이미지 이벤트 와이어링

var imgToPdfUploadArea = document.getElementById('imgToPdfUploadArea');
var imgToPdfFileInput = document.getElementById('imgToPdfFileInput');
var imgToPdfError = document.getElementById('imgToPdfError');
var imgToPdfFileList = document.getElementById('imgToPdfFileList');
var imgToPdfBtn = document.getElementById('imgToPdfBtn');
var imgToPdfDownloadBtn = document.getElementById('imgToPdfDownloadBtn');

var selectedImageFiles = [];
var lastPdfUrl = null;

function showImgToPdfError(message) {
  imgToPdfError.textContent = message;
  imgToPdfError.hidden = false;
}

function clearImgToPdfError() {
  imgToPdfError.textContent = '';
  imgToPdfError.hidden = true;
}

function renderImgToPdfFileList() {
  imgToPdfFileList.innerHTML = '';
  selectedImageFiles.forEach(function (file) {
    var li = document.createElement('li');
    li.textContent = file.name + ' (' + formatBytes(file.size) + ')';
    imgToPdfFileList.appendChild(li);
  });
}

function handleImageFiles(files) {
  clearImgToPdfError();
  imgToPdfBtn.hidden = true;
  imgToPdfDownloadBtn.hidden = true;
  selectedImageFiles = [];
  renderImgToPdfFileList();

  if (!files || files.length === 0) {
    return;
  }

  if (!isValidImageCount(files.length)) {
    showImgToPdfError('이미지는 최대 ' + MAX_IMAGE_COUNT + '장까지 선택할 수 있습니다.');
    return;
  }

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    if (!isSupportedImageType(file.type)) {
      showImgToPdfError('지원하지 않는 파일 형식입니다: ' + file.name + ' (JPG, PNG, WebP만 가능)');
      return;
    }
    if (!isValidFileSize(file.size)) {
      showImgToPdfError('파일이 너무 큽니다 (최대 20MB): ' + file.name);
      return;
    }
  }

  selectedImageFiles = Array.prototype.slice.call(files);
  renderImgToPdfFileList();
  imgToPdfBtn.hidden = false;
}

imgToPdfFileInput.addEventListener('change', function (e) {
  handleImageFiles(e.target.files);
});

imgToPdfUploadArea.addEventListener('click', function (e) {
  if (e.target !== imgToPdfFileInput) {
    imgToPdfFileInput.click();
  }
});

var imgToPdfDragCounter = 0;

imgToPdfUploadArea.addEventListener('dragenter', function (e) {
  e.preventDefault();
  imgToPdfDragCounter = imgToPdfDragCounter + 1;
  imgToPdfUploadArea.classList.add('drag-over');
});

imgToPdfUploadArea.addEventListener('dragover', function (e) {
  e.preventDefault();
});

imgToPdfUploadArea.addEventListener('dragleave', function () {
  imgToPdfDragCounter = imgToPdfDragCounter - 1;
  if (imgToPdfDragCounter <= 0) {
    imgToPdfDragCounter = 0;
    imgToPdfUploadArea.classList.remove('drag-over');
  }
});

imgToPdfUploadArea.addEventListener('drop', function (e) {
  e.preventDefault();
  imgToPdfDragCounter = 0;
  imgToPdfUploadArea.classList.remove('drag-over');
  imgToPdfFileInput.value = '';
  handleImageFiles(e.dataTransfer.files);
});

function imageFileToJpegDataUrl(file) {
  return new Promise(function (resolve, reject) {
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
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.92),
        width: canvas.width,
        height: canvas.height
      });
    };
    img.onerror = function () {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 불러올 수 없습니다: ' + file.name));
    };
    img.src = objectUrl;
  });
}

function buildPdfFromImages(files) {
  var doc = null;

  return files.reduce(function (promise, file, index) {
    return promise.then(function () {
      return imageFileToJpegDataUrl(file);
    }).then(function (converted) {
      var orientation = getPdfPageOrientation(converted.width, converted.height);
      if (index === 0) {
        doc = new jspdf.jsPDF({ orientation: orientation, unit: 'px', format: [converted.width, converted.height] });
      } else {
        doc.addPage([converted.width, converted.height], orientation);
      }
      doc.addImage(converted.dataUrl, 'JPEG', 0, 0, converted.width, converted.height);
    });
  }, Promise.resolve()).then(function () {
    return doc.output('blob');
  });
}

imgToPdfBtn.addEventListener('click', function () {
  if (selectedImageFiles.length === 0) {
    return;
  }
  clearImgToPdfError();

  if (typeof jspdf === 'undefined') {
    showImgToPdfError('PDF 처리 기능을 불러오지 못했습니다. 인터넷 연결을 확인해주세요.');
    return;
  }

  imgToPdfBtn.disabled = true;
  imgToPdfBtn.textContent = '변환 중...';

  buildPdfFromImages(selectedImageFiles)
    .then(function (blob) {
      if (lastPdfUrl) {
        URL.revokeObjectURL(lastPdfUrl);
      }
      lastPdfUrl = URL.createObjectURL(blob);
      imgToPdfDownloadBtn.href = lastPdfUrl;
      imgToPdfDownloadBtn.download = getPdfOutputFilename();
      imgToPdfDownloadBtn.hidden = false;
    })
    .catch(function (err) {
      showImgToPdfError(err.message);
    })
    .then(function () {
      imgToPdfBtn.disabled = false;
      imgToPdfBtn.textContent = 'PDF로 변환';
    });
});
