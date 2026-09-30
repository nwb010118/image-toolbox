function wireFileUpload(area, input, handleFiles) {
  input.addEventListener('change', function (e) { handleFiles(e.target.files); input.value = ''; });
  area.addEventListener('click', function (e) { if (e.target !== input) input.click(); });
  var depth = 0;
  area.addEventListener('dragenter', function (e) { e.preventDefault(); depth++; area.classList.add('drag-over'); });
  area.addEventListener('dragover', function (e) { e.preventDefault(); });
  area.addEventListener('dragleave', function () { depth = Math.max(0, depth - 1); if (!depth) area.classList.remove('drag-over'); });
  area.addEventListener('drop', function (e) { e.preventDefault(); depth = 0; area.classList.remove('drag-over'); input.value = ''; handleFiles(e.dataTransfer.files); });
}
