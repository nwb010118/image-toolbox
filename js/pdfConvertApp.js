// PDF → 문서 변환 (PPT/Word/Excel) 이벤트 와이어링

var pdfConvertUploadArea = document.getElementById('pdfConvertUploadArea');
var pdfConvertFileInput = document.getElementById('pdfConvertFileInput');
var pdfConvertError = document.getElementById('pdfConvertError');
var pdfConvertControls = document.getElementById('pdfConvertControls');
var pdfConvertBtn = document.getElementById('pdfConvertBtn');
var pdfConvertProgress = document.getElementById('pdfConvertProgress');
var pdfConvertDownloadBtn = document.getElementById('pdfConvertDownloadBtn');

var selectedPdfConvertFile = null;
var lastPdfConvertUrl = null;
var isConvertingPdf = false;

function showPdfConvertError(message) {
  pdfConvertError.textContent = message;
  pdfConvertError.hidden = false;
}

function clearPdfConvertError() {
  pdfConvertError.textContent = '';
  pdfConvertError.hidden = true;
}

function getSelectedPdfConvertFormat() {
  return document.querySelector('input[name="pdfConvertFormat"]:checked').value;
}

function handlePdfConvertFile(file) {
  clearPdfConvertError();
  pdfConvertControls.hidden = true;
  pdfConvertDownloadBtn.hidden = true;
  if (lastPdfConvertUrl) {
    URL.revokeObjectURL(lastPdfConvertUrl);
    lastPdfConvertUrl = null;
  }
  pdfConvertDownloadBtn.removeAttribute('href');
  selectedPdfConvertFile = null;

  if (!file) {
    return;
  }

  if (!isValidPdfFile(file)) {
    showPdfConvertError('PDF 파일만 업로드할 수 있어요.');
    return;
  }
  if (!isValidFileSize(file.size)) {
    showPdfConvertError('파일이 너무 큽니다 (최대 20MB).');
    return;
  }

  selectedPdfConvertFile = file;
  pdfConvertControls.hidden = false;
}

pdfConvertFileInput.addEventListener('change', function (e) {
  handlePdfConvertFile(e.target.files[0]);
});

pdfConvertUploadArea.addEventListener('click', function (e) {
  if (e.target !== pdfConvertFileInput) {
    pdfConvertFileInput.click();
  }
});

var pdfConvertDragCounter = 0;

pdfConvertUploadArea.addEventListener('dragenter', function (e) {
  e.preventDefault();
  pdfConvertDragCounter = pdfConvertDragCounter + 1;
  pdfConvertUploadArea.classList.add('drag-over');
});

pdfConvertUploadArea.addEventListener('dragover', function (e) {
  e.preventDefault();
});

pdfConvertUploadArea.addEventListener('dragleave', function () {
  pdfConvertDragCounter = pdfConvertDragCounter - 1;
  if (pdfConvertDragCounter <= 0) {
    pdfConvertDragCounter = 0;
    pdfConvertUploadArea.classList.remove('drag-over');
  }
});

pdfConvertUploadArea.addEventListener('drop', function (e) {
  e.preventDefault();
  pdfConvertDragCounter = 0;
  pdfConvertUploadArea.classList.remove('drag-over');
  pdfConvertFileInput.value = '';
  handlePdfConvertFile(e.dataTransfer.files[0]);
});

function renderPdfConvertPageToImage(pdfDoc, pageNumber, renderScale) {
  return pdfDoc.getPage(pageNumber).then(function (page) {
    var basePt = page.getViewport({ scale: 1 });
    var viewport = page.getViewport({ scale: renderScale });
    var canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    var ctx = canvas.getContext('2d');
    if (!ctx) {
      return Promise.reject(new Error('2D 캔버스 컨텍스트를 생성할 수 없습니다.'));
    }
    return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () {
      return {
        dataUrl: canvas.toDataURL('image/png'),
        widthIn: basePt.width / 72,
        heightIn: basePt.height / 72
      };
    });
  });
}

function convertPdfToPptx(pdfDoc, totalPages) {
  var pptx = new PptxGenJS();
  var pageNumbers = [];
  for (var i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return pageNumbers.reduce(function (promise, pageNumber) {
    return promise.then(function () {
      pdfConvertProgress.textContent = '처리 중... (' + pageNumber + '/' + totalPages + ')';
      return renderPdfConvertPageToImage(pdfDoc, pageNumber, 2);
    }).then(function (page) {
      if (pageNumber === 1) {
        pptx.defineLayout({ name: 'PDF_CONVERT_LAYOUT', width: page.widthIn, height: page.heightIn });
        pptx.layout = 'PDF_CONVERT_LAYOUT';
      }
      var slide = pptx.addSlide();
      slide.addImage({ data: page.dataUrl, x: 0, y: 0, w: page.widthIn, h: page.heightIn });
    });
  }, Promise.resolve()).then(function () {
    return pptx.write({ outputType: 'blob' });
  });
}

function runPdfConversion(pdfDoc, totalPages, format) {
  if (format === 'ppt') {
    return convertPdfToPptx(pdfDoc, totalPages);
  }
  return Promise.reject(new Error('아직 지원하지 않는 형식입니다: ' + format));
}

function isPdfConvertLibraryLoaded(format) {
  if (format === 'ppt') {
    return typeof PptxGenJS !== 'undefined';
  }
  if (format === 'word') {
    return typeof docx !== 'undefined';
  }
  if (format === 'excel') {
    return typeof XLSX !== 'undefined';
  }
  return false;
}

pdfConvertBtn.addEventListener('click', function () {
  if (!selectedPdfConvertFile || isConvertingPdf) {
    return;
  }
  clearPdfConvertError();

  var format = getSelectedPdfConvertFormat();

  if (typeof pdfjsLib === 'undefined' || !isPdfConvertLibraryLoaded(format)) {
    showPdfConvertError('문서 변환 기능을 불러오지 못했습니다. 인터넷 연결을 확인해주세요.');
    return;
  }

  isConvertingPdf = true;
  pdfConvertBtn.disabled = true;
  pdfConvertBtn.textContent = '변환 중...';
  pdfConvertProgress.hidden = false;
  pdfConvertProgress.textContent = 'PDF를 불러오는 중...';
  pdfConvertDownloadBtn.hidden = true;

  var baseName = getBaseFileName(selectedPdfConvertFile.name);
  var objectUrl = URL.createObjectURL(selectedPdfConvertFile);

  pdfjsLib.getDocument(objectUrl).promise
    .catch(function () {
      URL.revokeObjectURL(objectUrl);
      throw new Error('PDF 파일을 읽을 수 없습니다.');
    })
    .then(function (pdfDoc) {
      URL.revokeObjectURL(objectUrl);

      if (!isValidPageCount(pdfDoc.numPages)) {
        throw new Error('PDF 페이지 수가 너무 많습니다 (최대 ' + MAX_PDF_PAGES + '페이지).');
      }

      return runPdfConversion(pdfDoc, pdfDoc.numPages, format);
    })
    .then(function (blob) {
      if (lastPdfConvertUrl) {
        URL.revokeObjectURL(lastPdfConvertUrl);
      }
      lastPdfConvertUrl = URL.createObjectURL(blob);
      pdfConvertDownloadBtn.href = lastPdfConvertUrl;
      pdfConvertDownloadBtn.download = getConvertedFilename(baseName, format);
      pdfConvertDownloadBtn.hidden = false;
    })
    .catch(function (err) {
      showPdfConvertError(err.message);
    })
    .then(function () {
      isConvertingPdf = false;
      pdfConvertBtn.disabled = false;
      pdfConvertBtn.textContent = '변환하기';
      pdfConvertProgress.hidden = true;
    });
});
