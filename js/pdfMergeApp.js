// Merge several PDF files into one (pdf-lib). Everything stays in the browser.
(function () {
  var area = document.getElementById('mergePdfUploadArea');
  var input = document.getElementById('mergePdfFileInput');
  var errorBox = document.getElementById('mergePdfError');
  var list = document.getElementById('mergePdfFileList');
  var mergeBtn = document.getElementById('mergePdfBtn');
  var progress = document.getElementById('mergePdfProgress');
  var downloadBtn = document.getElementById('mergePdfDownloadBtn');
  var note = document.getElementById('mergePdfNote');
  if (!area || !input) return;

  var files = [];
  var busy = false;
  var lastUrl = null;

  function showError(message) { errorBox.textContent = message; errorBox.hidden = false; }
  function clearError() { errorBox.textContent = ''; errorBox.hidden = true; }

  function invalidate() {
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    lastUrl = null;
    downloadBtn.hidden = true;
    downloadBtn.removeAttribute('href');
    note.hidden = true;
  }

  function totalBytes() {
    return files.reduce(function (sum, f) { return sum + f.size; }, 0);
  }

  function render() {
    list.innerHTML = '';
    files.forEach(function (file, index) {
      var li = document.createElement('li');
      li.textContent = file.name + ' (' + formatBytes(file.size) + ')';
      [[t('moveUp'), -1], [t('moveDown'), 1], [t('removeItem'), 0]].forEach(function (action) {
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = action[0];
        button.setAttribute('aria-label', file.name + ' ' + action[0]);
        button.disabled = busy || (action[1] === -1 && index === 0) || (action[1] === 1 && index === files.length - 1);
        button.addEventListener('click', function () {
          if (busy) return;
          if (action[1] === 0) {
            files.splice(index, 1);
          } else {
            var other = index + action[1];
            var tmp = files[other]; files[other] = files[index]; files[index] = tmp;
          }
          invalidate();
          render();
        });
        li.appendChild(button);
      });
      list.appendChild(li);
    });
    mergeBtn.hidden = files.length === 0;
  }

  function addFiles(incoming) {
    if (busy) { showError(t('busyListChange')); return; }
    clearError();
    invalidate();
    for (var i = 0; i < incoming.length; i++) {
      var file = incoming[i];
      if (!isValidPdfFile(file)) { showError(t('pdfOnlyUpload')); return; }
      if (!isValidFileSize(file.size)) { showError(t('fileTooLarge20MBGeneric')); return; }
      var problem = canAddMergeFile(files.length, totalBytes(), file);
      if (problem === 'count') { showError(t('pdfMergeTooMany', { max: MAX_MERGE_FILES })); break; }
      if (problem === 'size') { showError(t('pdfMergeTooBig', { max: Math.round(MAX_MERGE_TOTAL_BYTES / 1048576) })); break; }
      files.push(file);
    }
    render();
  }

  async function merge() {
    if (busy) return;
    clearError();
    invalidate();
    if (files.length < 2) { showError(t('pdfMergeNeedTwo')); return; }
    if (typeof PDFLib === 'undefined') { showError(t('pdfLibraryLoadFailed')); return; }

    busy = true;
    mergeBtn.disabled = true;
    mergeBtn.textContent = t('convertingEllipsis');
    progress.hidden = false;
    render();
    try {
      var out = await PDFLib.PDFDocument.create();
      var pageCount = 0;
      for (var i = 0; i < files.length; i++) {
        progress.textContent = t('pdfMergeProgress', { current: i + 1, total: files.length });
        var bytes = await files[i].arrayBuffer();
        var src;
        try {
          src = await PDFLib.PDFDocument.load(bytes);
        } catch (e) {
          var encrypted = /encrypt/i.test(String(e && e.message));
          throw new Error(t(encrypted ? 'pdfMergeEncrypted' : 'pdfMergeReadFailed', { name: files[i].name }));
        }
        var pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach(function (page) { out.addPage(page); });
        pageCount += pages.length;
      }
      var merged = await out.save();
      var blob = new Blob([merged], { type: 'application/pdf' });
      lastUrl = URL.createObjectURL(blob);
      downloadBtn.href = lastUrl;
      downloadBtn.download = getMergedPdfFilename();
      downloadBtn.hidden = false;
      note.textContent = t('pdfMergeDone', { files: files.length, pages: pageCount, size: formatBytes(blob.size) });
      note.hidden = false;
    } catch (err) {
      showError(err.message);
    }
    progress.hidden = true;
    busy = false;
    mergeBtn.disabled = false;
    mergeBtn.textContent = t('pdfMergeButton');
    render();
  }

  wireFileUpload(area, input, addFiles);
  mergeBtn.addEventListener('click', merge);
})();
