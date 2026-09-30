// PDF 변환 도구 - 이미지 → PDF, PDF → 이미지 이벤트 와이어링

var imgToPdfUploadArea = document.getElementById('imgToPdfUploadArea');
var imgToPdfFileInput = document.getElementById('imgToPdfFileInput');
var imgToPdfError = document.getElementById('imgToPdfError');
var imgToPdfFileList = document.getElementById('imgToPdfFileList');
var imgToPdfBtn = document.getElementById('imgToPdfBtn');
var imgToPdfDownloadBtn = document.getElementById('imgToPdfDownloadBtn');
var imgToPdfShareBtn = document.getElementById('imgToPdfShareBtn');
var imgToPdfShareStatus = document.getElementById('imgToPdfShareStatus');

var selectedImageFiles = [];
var lastPdfUrl = null;
var isBuildingPdf = false;
function invalidateImagePdf() {
  if (lastPdfUrl) URL.revokeObjectURL(lastPdfUrl);
  lastPdfUrl = null;
  imgToPdfDownloadBtn.hidden = true;
  imgToPdfDownloadBtn.removeAttribute('href');
  imgToPdfShareBtn.hidden = true;
  imgToPdfShareStatus.hidden = true;
}

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
  selectedImageFiles.forEach(function (file, index) {
    var li = document.createElement('li');
    li.textContent = file.name + ' (' + formatBytes(file.size) + ')';
    [['위', -1], ['아래', 1], ['삭제', 0]].forEach(function (action) {
      var button = document.createElement('button');
      button.type = 'button'; button.textContent = action[0];
      button.setAttribute('aria-label', file.name + ' ' + action[0]);
      button.disabled = isBuildingPdf || (action[1] === -1 && index === 0) || (action[1] === 1 && index === selectedImageFiles.length - 1);
      button.addEventListener('click', function () {
        if (isBuildingPdf) return;
        if (action[1] === 0) selectedImageFiles.splice(index, 1);
        else { var other = index + action[1]; var tmp = selectedImageFiles[other]; selectedImageFiles[other] = selectedImageFiles[index]; selectedImageFiles[index] = tmp; }
        invalidateImagePdf(); renderImgToPdfFileList(); imgToPdfBtn.hidden = selectedImageFiles.length === 0;
      });
      li.appendChild(button);
    });
    imgToPdfFileList.appendChild(li);
  });
}

function handleImageFiles(files) {
  if (isBuildingPdf) { showImgToPdfError('변환 중에는 파일 목록을 바꿀 수 없습니다.'); return; }
  clearImgToPdfError();
  if (!files || files.length === 0) {
    return;
  }

  if (!isValidImageCount(selectedImageFiles.length + files.length)) {
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

  invalidateImagePdf();
  selectedImageFiles = selectedImageFiles.concat(Array.prototype.slice.call(files));
  renderImgToPdfFileList();
  imgToPdfBtn.hidden = false;
}

wireFileUpload(imgToPdfUploadArea, imgToPdfFileInput, function (files) { handleImageFiles(files); });

window.addEventListener('paste', function (e) {
  var items = e.clipboardData && e.clipboardData.items;
  if (!items) {
    return;
  }
  var pastedImages = [];
  for (var i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image/') === 0) {
      var file = items[i].getAsFile();
      if (file) {
        pastedImages.push(file);
      }
    }
  }
  if (pastedImages.length > 0) {
    imgToPdfFileInput.value = '';
    handleImageFiles(pastedImages);
  }
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

  isBuildingPdf = true;
  renderImgToPdfFileList();
  imgToPdfBtn.disabled = true;
  imgToPdfBtn.textContent = '변환 중...';

  buildPdfFromImages(selectedImageFiles.slice())
    .then(function (blob) {
      if (lastPdfUrl) {
        URL.revokeObjectURL(lastPdfUrl);
      }
      lastPdfUrl = URL.createObjectURL(blob);
      imgToPdfDownloadBtn.href = lastPdfUrl;
      imgToPdfDownloadBtn.download = getPdfOutputFilename();
      imgToPdfDownloadBtn.hidden = false;
      imgToPdfShareBtn.hidden = false;
      imgToPdfShareStatus.hidden = true;
    })
    .catch(function (err) {
      showImgToPdfError(err.message);
    })
    .then(function () {
      isBuildingPdf = false;
      renderImgToPdfFileList();
      imgToPdfBtn.disabled = false;
      imgToPdfBtn.textContent = 'PDF로 변환';
    });
});

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

var pdfToImgUploadArea = document.getElementById('pdfToImgUploadArea');
var pdfToImgFileInput = document.getElementById('pdfToImgFileInput');
var pdfToImgError = document.getElementById('pdfToImgError');
var pdfToImgProgress = document.getElementById('pdfToImgProgress');
var pdfToImgPages = document.getElementById('pdfToImgPages');

var pdfPageUrls = [];
var isProcessingPdf = false;
var cancelPdfImages = false;
var pdfImageEntries = [];
var pdfImageScale = 1;
var pdfImagesCancel = document.getElementById('pdfImagesCancel');
var pdfZipDownload = document.getElementById('pdfZipDownload');
pdfImagesCancel.addEventListener('click', function () { cancelPdfImages = true; pdfImagesCancel.disabled = true; });
pdfZipDownload.addEventListener('click', function () {
  pdfZipDownload.disabled = true;
  createStoredZip(pdfImageEntries.slice()).then(function (blob) {
    var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = 'pdf-images.zip'; a.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }).catch(function (err) { showPdfToImgError(err.message); }).then(function () { pdfZipDownload.disabled = false; });
});

function showPdfToImgError(message) {
  pdfToImgError.textContent = message;
  pdfToImgError.hidden = false;
}

function clearPdfToImgError() {
  pdfToImgError.textContent = '';
  pdfToImgError.hidden = true;
}

function clearPdfPages() {
  pdfPageUrls.forEach(function (url) {
    URL.revokeObjectURL(url);
  });
  pdfPageUrls = [];
  pdfToImgPages.innerHTML = '';
  pdfImageEntries = [];
  pdfZipDownload.hidden = true;
}

function renderPdfPage(blob, pageNumber, baseName, totalPages) {
  var url = URL.createObjectURL(blob);
  pdfImageEntries.push({name: getPageImageFilename(baseName, pageNumber, totalPages), blob: blob});
  pdfPageUrls.push(url);

  var item = document.createElement('div');
  item.className = 'pdf-page-item';

  var img = document.createElement('img');
  img.src = url;
  img.alt = '페이지 ' + pageNumber + ' 미리보기';

  var link = document.createElement('a');
  link.className = 'btn';
  link.href = url;
  link.download = getPageImageFilename(baseName, pageNumber, totalPages);
  link.textContent = '페이지 ' + pageNumber + ' 다운로드';

  item.appendChild(img);
  item.appendChild(link);
  pdfToImgPages.appendChild(item);
}

function renderPdfPageToBlob(pdfDoc, pageNumber) {
  return pdfDoc.getPage(pageNumber).then(function (page) {
    var viewport = page.getViewport({ scale: pdfImageScale });
    if (viewport.width * viewport.height > 16000000) throw new Error('페이지 해상도가 너무 큽니다. 기본 해상도로 다시 시도해주세요.');
    var canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    var ctx = canvas.getContext('2d');
    if (!ctx) {
      return Promise.reject(new Error('2D 캔버스 컨텍스트를 생성할 수 없습니다.'));
    }
    return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () {
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) {
            reject(new Error('페이지 ' + pageNumber + ' 이미지를 만들지 못했습니다.'));
            return;
          }
          canvas.width = 0; canvas.height = 0; page.cleanup();
          resolve(blob);
        }, 'image/png');
      });
    });
  });
}

function processPdfFile(file) {
  clearPdfToImgError();
  clearPdfPages();
  pdfToImgProgress.hidden = false;
  pdfToImgProgress.textContent = 'PDF를 불러오는 중...';

  var baseName = getBaseFileName(file.name);
  var objectUrl = URL.createObjectURL(file);

  var loadedPdf;
  return pdfjsLib.getDocument(objectUrl).promise
    .catch(function () {
      URL.revokeObjectURL(objectUrl);
      throw new Error('PDF 파일을 읽을 수 없습니다.');
    })
    .then(function (pdfDoc) {
      loadedPdf = pdfDoc;
      URL.revokeObjectURL(objectUrl);

      if (!isValidPageCount(pdfDoc.numPages)) {
        throw new Error('PDF 페이지 수가 너무 많습니다 (최대 ' + MAX_PDF_PAGES + '페이지).');
      }

      var totalPages = pdfDoc.numPages;
      var pageNumbers = parsePageRange(document.getElementById('pdfPageStart').value, document.getElementById('pdfPageEnd').value, totalPages);

      return pageNumbers.reduce(function (promise, pageNumber) {
        return promise.then(function () {
          if (cancelPdfImages) throw new Error('작업을 중단했습니다. 생성된 페이지는 다운로드할 수 있습니다.');
          pdfToImgProgress.textContent = '처리 중... (' + pageNumber + '/' + totalPages + ')';
          return renderPdfPageToBlob(pdfDoc, pageNumber);
        }).then(function (blob) {
          renderPdfPage(blob, pageNumber, baseName, totalPages);
        });
      }, Promise.resolve());
    }).finally(function () { if (loadedPdf) return loadedPdf.destroy(); });
}

function handlePdfFile(file) {
  if (!file) {
    return;
  }
  clearPdfToImgError();

  if (!isValidPdfFile(file)) {
    showPdfToImgError('PDF 파일만 업로드할 수 있어요.');
    return;
  }
  if (!isValidFileSize(file.size)) {
    showPdfToImgError('파일이 너무 큽니다 (최대 20MB).');
    return;
  }
  if (typeof pdfjsLib === 'undefined') {
    showPdfToImgError('PDF 처리 기능을 불러오지 못했습니다. 인터넷 연결을 확인해주세요.');
    return;
  }
  if (isProcessingPdf) {
    showPdfToImgError('이전 PDF를 처리하는 중입니다. 완료된 후 다시 시도해주세요.');
    return;
  }

  isProcessingPdf = true;
  cancelPdfImages = false;
  pdfImageScale = Number(document.getElementById('pdfRenderScale').value);
  pdfImagesCancel.hidden = false; pdfImagesCancel.disabled = false;
  pdfZipDownload.hidden = true;
  ['pdfPageStart', 'pdfPageEnd', 'pdfRenderScale'].forEach(function (id) { document.getElementById(id).disabled = true; });

  processPdfFile(file)
    .then(function () {
      pdfToImgProgress.hidden = true;
    })
    .catch(function (err) {
      pdfToImgProgress.hidden = true;
      showPdfToImgError(err.message);
    })
    .then(function () {
      isProcessingPdf = false;
      pdfImagesCancel.hidden = true;
      pdfZipDownload.hidden = pdfImageEntries.length === 0;
      ['pdfPageStart', 'pdfPageEnd', 'pdfRenderScale'].forEach(function (id) { document.getElementById(id).disabled = false; });
    });
}

wireFileUpload(pdfToImgUploadArea, pdfToImgFileInput, function (files) { handlePdfFile(files[0]); });

wireShareButton(imgToPdfShareBtn, imgToPdfShareStatus, function () {
  return {
    title: 'image toolbox - 브라우저에서 바로 처리하는 PDF 변환',
    text: '사진을 서버에 올리지 않고 브라우저에서 무료로 PDF로 합치는 도구예요.',
    url: 'https://nwb010118.github.io/image-toolbox/pdf.html'
  };
});
