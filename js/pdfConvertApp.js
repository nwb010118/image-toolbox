// PDF to document conversion (PPT/Word/Excel) - event wiring

var pdfConvertUploadArea = document.getElementById('pdfConvertUploadArea');
var pdfConvertFileInput = document.getElementById('pdfConvertFileInput');
var pdfConvertError = document.getElementById('pdfConvertError');
var pdfConvertControls = document.getElementById('pdfConvertControls');
var pdfConvertBtn = document.getElementById('pdfConvertBtn');
var pdfConvertProgress = document.getElementById('pdfConvertProgress');
var pdfConvertDownloadBtn = document.getElementById('pdfConvertDownloadBtn');
var pdfConvertShareBtn = document.getElementById('pdfConvertShareBtn');
var pdfConvertShareStatus = document.getElementById('pdfConvertShareStatus');

var PDF_CONVERT_SHARE_URL = LANG === 'en'
  ? 'https://nwb010118.github.io/image-toolbox/en/pdf.html'
  : 'https://nwb010118.github.io/image-toolbox/pdf.html';

var selectedPdfConvertFile = null;
var lastPdfConvertUrl = null;
var isConvertingPdf = false;
var cancelPdfDocument = false;
var pdfDocumentCancel = document.getElementById('pdfDocumentCancel');
pdfDocumentCancel.addEventListener('click', function () { cancelPdfDocument = true; pdfDocumentCancel.disabled = true; });
function checkDocumentCancellation() { if (cancelPdfDocument) throw new Error(t('docCancelled')); }

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
  if (isConvertingPdf) {
    showPdfConvertError(t('convertBusy'));
    return;
  }
  pdfConvertControls.hidden = true;
  pdfConvertDownloadBtn.hidden = true;
  pdfConvertShareBtn.hidden = true;
  pdfConvertShareStatus.hidden = true;
  pdfConvertShareStatus.textContent = '';
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
    showPdfConvertError(t('pdfOnlyUpload'));
    return;
  }
  if (!isValidFileSize(file.size)) {
    showPdfConvertError(t('fileTooLarge20MBGeneric'));
    return;
  }

  selectedPdfConvertFile = file;
  pdfConvertControls.hidden = false;
}

wireFileUpload(pdfConvertUploadArea, pdfConvertFileInput, function (files) { handlePdfConvertFile(files[0]); });

function renderPdfConvertPageToImage(pdfDoc, pageNumber, renderScale) {
  return pdfDoc.getPage(pageNumber).then(function (page) {
    var basePt = page.getViewport({ scale: 1 });
    var viewport = page.getViewport({ scale: renderScale });
    var canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    var ctx = canvas.getContext('2d');
    if (!ctx) {
      return Promise.reject(new Error(t('canvas2dUnavailable')));
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
      checkDocumentCancellation();
      pdfConvertProgress.textContent = t('processingPageProgress', { current: pageNumber, total: totalPages });
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

function extractPdfConvertPageLines(pdfDoc, pageNumber) {
  return pdfDoc.getPage(pageNumber).then(function (page) {
    return page.getTextContent();
  }).then(function (textContent) {
    var items = textContent.items.map(function (item) {
      return { str: item.str, x: item.transform[4], y: item.transform[5] };
    });
    return groupTextItemsIntoLines(items, LINE_Y_TOLERANCE);
  });
}

function extractPdfConvertPagesLines(pdfDoc, totalPages) {
  var pageNumbers = [];
  for (var i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }
  var pagesLines = [];

  return pageNumbers.reduce(function (promise, pageNumber) {
    return promise.then(function () {
      checkDocumentCancellation();
      pdfConvertProgress.textContent = t('readingTextProgress', { current: pageNumber, total: totalPages });
      return extractPdfConvertPageLines(pdfDoc, pageNumber);
    }).then(function (lines) {
      pagesLines.push(lines);
    });
  }, Promise.resolve()).then(function () {
    return pagesLines;
  });
}

function convertPdfToDocx(pagesLines) {
  var docChildren = [];

  pagesLines.forEach(function (lines, pageIndex) {
    var paragraphs = groupLinesIntoParagraphs(lines, PARAGRAPH_GAP_THRESHOLD);
    paragraphs.forEach(function (text, paragraphIndex) {
      docChildren.push(new docx.Paragraph({
        children: [new docx.TextRun(text)],
        pageBreakBefore: paragraphIndex === 0 && pageIndex > 0
      }));
    });
  });

  var doc = new docx.Document({
    sections: [{ properties: {}, children: docChildren }]
  });

  return docx.Packer.toBlob(doc);
}

function convertPdfToXlsx(pagesLines) {
  var rows = [];

  pagesLines.forEach(function (lines, pageIndex) {
    if (pageIndex > 0) {
      rows.push(['']);
    }
    lines.forEach(function (line) {
      rows.push([line.text]);
    });
  });

  var worksheet = XLSX.utils.aoa_to_sheet(rows);
  var workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  var arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([arrayBuffer], { type: 'application/octet-stream' });
}

function runPdfConversion(pdfDoc, totalPages, format) {
  if (format === 'ppt') {
    return convertPdfToPptx(pdfDoc, totalPages);
  }
  if (format === 'word' || format === 'excel') {
    return extractPdfConvertPagesLines(pdfDoc, totalPages).then(function (pagesLines) {
      if (!hasSubstantialText(concatenatePagesLinesText(pagesLines))) {
        throw new Error(t('scannedPdfNoText'));
      }
      if (format === 'word') {
        return convertPdfToDocx(pagesLines);
      }
      return convertPdfToXlsx(pagesLines);
    });
  }
  return Promise.reject(new Error(t('unsupportedConvertFormat', { format: format })));
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
    showPdfConvertError(t('documentLibraryLoadFailed'));
    return;
  }

  isConvertingPdf = true;
  cancelPdfDocument = false;
  pdfDocumentCancel.hidden = false; pdfDocumentCancel.disabled = false;
  pdfConvertBtn.disabled = true;
  pdfConvertBtn.textContent = t('convertingEllipsis');
  pdfConvertProgress.hidden = false;
  pdfConvertProgress.textContent = t('loadingPdf');
  pdfConvertDownloadBtn.hidden = true;

  var baseName = getBaseFileName(selectedPdfConvertFile.name);
  var objectUrl = URL.createObjectURL(selectedPdfConvertFile);

  var loadedDocument;
  pdfjsLib.getDocument(objectUrl).promise
    .catch(function (err) {
      URL.revokeObjectURL(objectUrl);
      throw new Error(t(err && err.name === 'PasswordException' ? 'pdfPasswordProtected' : 'pdfReadFailed'));
    })
    .then(function (pdfDoc) {
      loadedDocument = pdfDoc;
      checkDocumentCancellation();
      URL.revokeObjectURL(objectUrl);

      if (!isValidPageCount(pdfDoc.numPages)) {
        throw new Error(t('tooManyPages', { max: MAX_PDF_PAGES }));
      }
      if (format === 'ppt' && pdfDoc.numPages > MAX_PPT_CONVERSION_PAGES) {
        throw new Error(t('pptPageLimitExceeded', { max: MAX_PPT_CONVERSION_PAGES }));
      }

      return runPdfConversion(pdfDoc, pdfDoc.numPages, format);
    })
    .then(function (blob) {
      checkDocumentCancellation();
      if (lastPdfConvertUrl) {
        URL.revokeObjectURL(lastPdfConvertUrl);
      }
      lastPdfConvertUrl = URL.createObjectURL(blob);
      pdfConvertDownloadBtn.href = lastPdfConvertUrl;
      pdfConvertDownloadBtn.download = getConvertedFilename(baseName, format);
      pdfConvertDownloadBtn.hidden = false;
      pdfConvertShareBtn.hidden = false;
      pdfConvertShareStatus.hidden = true;
    })
    .catch(function (err) {
      showPdfConvertError(err.message);
    })
    .then(function () {
      if (loadedDocument) loadedDocument.destroy();
      URL.revokeObjectURL(objectUrl);
      isConvertingPdf = false;
      pdfDocumentCancel.hidden = true;
      pdfConvertBtn.disabled = false;
      pdfConvertBtn.textContent = t('convertButton');
      pdfConvertProgress.hidden = true;
    });
});

wireShareButton(pdfConvertShareBtn, pdfConvertShareStatus, function () {
  return {
    title: t('pdfShareTitle'),
    text: t('pdfConvertShareText'),
    url: PDF_CONVERT_SHARE_URL
  };
});
