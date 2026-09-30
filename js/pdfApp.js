// PDF tools - image to PDF and PDF to image event wiring

var imgToPdfUploadArea = document.getElementById('imgToPdfUploadArea');
var imgToPdfFileInput = document.getElementById('imgToPdfFileInput');
var imgToPdfError = document.getElementById('imgToPdfError');
var imgToPdfFileList = document.getElementById('imgToPdfFileList');
var imgToPdfBtn = document.getElementById('imgToPdfBtn');
var imgToPdfDownloadBtn = document.getElementById('imgToPdfDownloadBtn');
var imgToPdfShareBtn = document.getElementById('imgToPdfShareBtn');
var imgToPdfShareStatus = document.getElementById('imgToPdfShareStatus');

var PDF_SHARE_URL = LANG === 'en'
  ? 'https://nwb010118.github.io/image-toolbox/en/pdf.html'
  : 'https://nwb010118.github.io/image-toolbox/pdf.html';

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
  imgToPdfShareBtn.hidden = true;
  imgToPdfShareStatus.hidden = true;
  imgToPdfShareStatus.textContent = '';
  if (lastPdfUrl) {
    URL.revokeObjectURL(lastPdfUrl);
    lastPdfUrl = null;
  }
  imgToPdfDownloadBtn.removeAttribute('href');
  selectedImageFiles = [];
  renderImgToPdfFileList();

  if (!files || files.length === 0) {
    return;
  }

  if (!isValidImageCount(files.length)) {
    showImgToPdfError(t('tooManyImages', { max: MAX_IMAGE_COUNT }));
    return;
  }

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    if (!isSupportedImageType(file.type)) {
      showImgToPdfError(t('unsupportedFormatNamed', { name: file.name }));
      return;
    }
    if (!isValidFileSize(file.size)) {
      showImgToPdfError(t('fileTooLargeNamed20MB', { name: file.name }));
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
        reject(new Error(t('canvas2dUnavailable')));
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
      reject(new Error(t('imageLoadFailedNamed', { name: file.name })));
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
    showImgToPdfError(t('pdfLibraryLoadFailed'));
    return;
  }

  imgToPdfBtn.disabled = true;
  imgToPdfBtn.textContent = t('convertingEllipsis');

  buildPdfFromImages(selectedImageFiles)
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
      imgToPdfBtn.disabled = false;
      imgToPdfBtn.textContent = t('convertToPdfButton');
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
}

function renderPdfPage(blob, pageNumber, baseName, totalPages) {
  var url = URL.createObjectURL(blob);
  pdfPageUrls.push(url);

  var item = document.createElement('div');
  item.className = 'pdf-page-item';

  var img = document.createElement('img');
  img.src = url;
  img.alt = t('pageAltLabel', { n: pageNumber });

  var link = document.createElement('a');
  link.className = 'btn';
  link.href = url;
  link.download = getPageImageFilename(baseName, pageNumber, totalPages);
  link.textContent = t('pageDownloadLabel', { n: pageNumber });

  item.appendChild(img);
  item.appendChild(link);
  pdfToImgPages.appendChild(item);
}

function renderPdfPageToBlob(pdfDoc, pageNumber) {
  return pdfDoc.getPage(pageNumber).then(function (page) {
    var viewport = page.getViewport({ scale: 2 });
    var canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    var ctx = canvas.getContext('2d');
    if (!ctx) {
      return Promise.reject(new Error(t('canvas2dUnavailable')));
    }
    return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () {
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) {
            reject(new Error(t('pageImageFailed', { n: pageNumber })));
            return;
          }
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
  pdfToImgProgress.textContent = t('loadingPdf');

  var baseName = getBaseFileName(file.name);
  var objectUrl = URL.createObjectURL(file);

  return pdfjsLib.getDocument(objectUrl).promise
    .catch(function () {
      URL.revokeObjectURL(objectUrl);
      throw new Error(t('pdfReadFailed'));
    })
    .then(function (pdfDoc) {
      URL.revokeObjectURL(objectUrl);

      if (!isValidPageCount(pdfDoc.numPages)) {
        throw new Error(t('tooManyPages', { max: MAX_PDF_PAGES }));
      }

      var totalPages = pdfDoc.numPages;
      var pageNumbers = [];
      for (var i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }

      return pageNumbers.reduce(function (promise, pageNumber) {
        return promise.then(function () {
          pdfToImgProgress.textContent = t('processingPageProgress', { current: pageNumber, total: totalPages });
          return renderPdfPageToBlob(pdfDoc, pageNumber);
        }).then(function (blob) {
          renderPdfPage(blob, pageNumber, baseName, totalPages);
        });
      }, Promise.resolve());
    });
}

function handlePdfFile(file) {
  if (!file) {
    return;
  }
  clearPdfToImgError();

  if (!isValidPdfFile(file)) {
    showPdfToImgError(t('pdfOnlyUpload'));
    return;
  }
  if (!isValidFileSize(file.size)) {
    showPdfToImgError(t('fileTooLarge20MBGeneric'));
    return;
  }
  if (typeof pdfjsLib === 'undefined') {
    showPdfToImgError(t('pdfLibraryLoadFailed'));
    return;
  }
  if (isProcessingPdf) {
    showPdfToImgError(t('pdfBusy'));
    return;
  }

  isProcessingPdf = true;

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
    });
}

pdfToImgFileInput.addEventListener('change', function (e) {
  handlePdfFile(e.target.files[0]);
});

pdfToImgUploadArea.addEventListener('click', function (e) {
  if (e.target !== pdfToImgFileInput) {
    pdfToImgFileInput.click();
  }
});

var pdfToImgDragCounter = 0;

pdfToImgUploadArea.addEventListener('dragenter', function (e) {
  e.preventDefault();
  pdfToImgDragCounter = pdfToImgDragCounter + 1;
  pdfToImgUploadArea.classList.add('drag-over');
});

pdfToImgUploadArea.addEventListener('dragover', function (e) {
  e.preventDefault();
});

pdfToImgUploadArea.addEventListener('dragleave', function () {
  pdfToImgDragCounter = pdfToImgDragCounter - 1;
  if (pdfToImgDragCounter <= 0) {
    pdfToImgDragCounter = 0;
    pdfToImgUploadArea.classList.remove('drag-over');
  }
});

pdfToImgUploadArea.addEventListener('drop', function (e) {
  e.preventDefault();
  pdfToImgDragCounter = 0;
  pdfToImgUploadArea.classList.remove('drag-over');
  pdfToImgFileInput.value = '';
  handlePdfFile(e.dataTransfer.files[0]);
});

wireShareButton(imgToPdfShareBtn, imgToPdfShareStatus, function () {
  return {
    title: t('pdfShareTitle'),
    text: t('imgToPdfShareText'),
    url: PDF_SHARE_URL
  };
});
