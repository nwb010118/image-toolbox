(function (exports) {
  var MAX_BATCH_FILES = 10;

  function getBatchOutputName(originalName, extension, usedNames) {
    var dot = originalName.lastIndexOf('.');
    var base = dot > 0 ? originalName.slice(0, dot) : originalName;
    var name = base + '-compressed.' + extension;
    var n = 2;
    while (usedNames[name.toLowerCase()]) {
      name = base + '-compressed-' + n + '.' + extension;
      n++;
    }
    usedNames[name.toLowerCase()] = true;
    return name;
  }

  exports.MAX_BATCH_FILES = MAX_BATCH_FILES;
  exports.getBatchOutputName = getBatchOutputName;
})(typeof module !== 'undefined' ? module.exports : window);
