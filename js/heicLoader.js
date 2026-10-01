(function (exports) {
  var HEIC2ANY_SRC = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
  var HEIC2ANY_SRI = 'sha384-OTofQ0MEeiSgh62havBcemCIK0gqj809wX6UA0uPISNMRnR6NZyCdGzX3SbLrgwL';
  var loadPromise = null;

  function isHeicFile(file) {
    if (!file) return false;
    var type = (file.type || '').toLowerCase();
    if (type === 'image/heic' || type === 'image/heif' || type === 'image/heic-sequence' || type === 'image/heif-sequence') return true;
    return /\.(heic|heif)$/i.test(file.name || '');
  }

  function toJpegName(name) {
    var dot = name.lastIndexOf('.');
    return (dot > 0 ? name.slice(0, dot) : name) + '.jpg';
  }

  // The converter is ~1.3 MB, so it is only downloaded the first time a HEIC file is chosen.
  function loadConverter() {
    if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
    if (window.heic2any) return Promise.resolve(window.heic2any);
    if (loadPromise) return loadPromise;
    loadPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = HEIC2ANY_SRC;
      script.integrity = HEIC2ANY_SRI;
      script.crossOrigin = 'anonymous';
      script.onload = function () { window.heic2any ? resolve(window.heic2any) : reject(new Error('heic2any missing')); };
      script.onerror = function () { loadPromise = null; reject(new Error('heic2any load failed')); };
      document.head.appendChild(script);
    });
    return loadPromise;
  }

  function convertHeicToJpeg(file) {
    return loadConverter().then(function (heic2any) {
      return heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    }).then(function (result) {
      var blob = Array.isArray(result) ? result[0] : result;
      return new File([blob], toJpegName(file.name || 'photo.heic'), { type: 'image/jpeg', lastModified: Date.now() });
    });
  }

  exports.isHeicFile = isHeicFile;
  exports.toJpegName = toJpegName;
  exports.convertHeicToJpeg = convertHeicToJpeg;
})(typeof module !== 'undefined' ? module.exports : window);
