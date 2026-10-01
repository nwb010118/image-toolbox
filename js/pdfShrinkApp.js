// Shrink a scanned / photo-heavy PDF by re-rendering each page as a JPEG (pdf.js + jsPDF). Runs in the browser.
(function () {
  var area = document.getElementById('shrinkPdfUploadArea');
  var input = document.getElementById('shrinkPdfFileInput');
  var errorBox = document.getElementById('shrinkPdfError');
  var progress = document.getElementById('shrinkPdfProgress');
  var cancelBtn = document.getElementById('shrinkPdfCancel');
  var downloadBtn = document.getElementById('shrinkPdfDownloadBtn');
  var note = document.getElementById('shrinkPdfNote');
  var presetSelect = document.getElementById('shrinkPreset');
  if (!area || !input) return;

  var busy = false;
  var cancelled = false;
  var lastUrl = null;

  function showError(message) { errorBox.textContent = message; errorBox.hidden = false; }
  function clearError() { errorBox.textContent = ''; errorBox.hidden = true; }

  function reset() {
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    lastUrl = null;
    downloadBtn.hidden = true;
    downloadBtn.removeAttribute('href');
    note.hidden = true;
    note.classList.remove('compress-warning');
  }

  function renderPage(pdfDoc, pageNumber, preset) {
    return pdfDoc.getPage(pageNumber).then(function (page) {
      var base = page.getViewport({ scale: 1 });
      var plan = planPageRender(base.width, base.height, preset.scale);
      var viewport = page.getViewport({ scale: plan.scale });
      var canvas = document.createElement('canvas');
      canvas.width = plan.width;
      canvas.height = plan.height;
      var ctx = canvas.getContext('2d');
      if (!ctx) throw new Error(t('canvas2dUnavailable'));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () {
        var data = canvas.toDataURL('image/jpeg', preset.quality);
        canvas.width = 0; canvas.height = 0;
        page.cleanup();
        return { data: data, width: base.width, height: base.height };
      });
    });
  }

  async function run(file) {
    var preset = SHRINK_PRESETS[presetSelect.value] || SHRINK_PRESETS.balanced;
    var objectUrl = URL.createObjectURL(file);
    var pdfDoc = null;
    try {
      progress.textContent = t('loadingPdf');
      try {
        pdfDoc = await pdfjsLib.getDocument(objectUrl).promise;
      } catch (e) {
        throw new Error(t('pdfReadFailed'));
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      var total = pdfDoc.numPages;
      if (total > MAX_SHRINK_PAGES) throw new Error(t('pdfShrinkTooManyPages', { max: MAX_SHRINK_PAGES }));

      var doc = null;
      for (var n = 1; n <= total; n++) {
        if (cancelled) throw new Error(t('pdfShrinkCancelled'));
        progress.textContent = t('processingPageProgress', { current: n, total: total });
        var page = await renderPage(pdfDoc, n, preset);
        var orientation = getPdfPageOrientation(page.width, page.height);
        if (!doc) {
          doc = new jspdf.jsPDF({ orientation: orientation, unit: 'pt', format: [page.width, page.height], compress: true });
        } else {
          doc.addPage([page.width, page.height], orientation);
        }
        doc.addImage(page.data, 'JPEG', 0, 0, page.width, page.height, undefined, 'FAST');
      }
      var blob = doc.output('blob');
      lastUrl = URL.createObjectURL(blob);
      downloadBtn.href = lastUrl;
      downloadBtn.download = getShrunkPdfFilename(file.name);
      downloadBtn.hidden = false;

      var smaller = blob.size < file.size;
      note.textContent = smaller
        ? t('pdfShrinkDone', { before: formatBytes(file.size), after: formatBytes(blob.size), change: describeSizeChange(file.size, blob.size, LANG) })
        : t('pdfShrinkBigger', { before: formatBytes(file.size), after: formatBytes(blob.size) });
      note.classList.toggle('compress-warning', !smaller);
      note.hidden = false;
    } finally {
      if (pdfDoc) pdfDoc.destroy();
    }
  }

  function handleFile(file) {
    if (!file) return;
    clearError();
    if (busy) { showError(t('pdfBusy')); return; }
    if (!isValidPdfFile(file)) { showError(t('pdfOnlyUpload')); return; }
    if (!isValidFileSize(file.size)) { showError(t('fileTooLarge20MBGeneric')); return; }
    if (typeof pdfjsLib === 'undefined' || typeof jspdf === 'undefined') { showError(t('pdfLibraryLoadFailed')); return; }

    reset();
    busy = true;
    cancelled = false;
    presetSelect.disabled = true;
    progress.hidden = false;
    cancelBtn.hidden = false;
    cancelBtn.disabled = false;
    run(file).catch(function (err) {
      showError(err.message);
    }).then(function () {
      busy = false;
      presetSelect.disabled = false;
      progress.hidden = true;
      cancelBtn.hidden = true;
    });
  }

  cancelBtn.addEventListener('click', function () { cancelled = true; cancelBtn.disabled = true; });
  wireFileUpload(area, input, function (files) { handleFile(files[0]); });
})();
