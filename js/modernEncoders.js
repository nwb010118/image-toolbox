(function (exports) {
  var scriptUrl = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : '';
  var worker = null;
  var pending = {};
  var nextId = 1;

  function failAll(message) {
    Object.keys(pending).forEach(function (id) {
      pending[id].reject(new Error(message));
      delete pending[id];
    });
    worker = null;
  }

  function getWorker() {
    if (worker) return worker;
    worker = new Worker(new URL('encodeWorker.js', scriptUrl), { type: 'module' });
    worker.onmessage = function (event) {
      var entry = pending[event.data.id];
      if (!entry) return;
      delete pending[event.data.id];
      if (event.data.error) entry.reject(new Error(event.data.error));
      else entry.resolve(event.data.buffer);
    };
    worker.onerror = function () { failAll('encoder worker failed'); };
    return worker;
  }

  function isSupported() {
    return typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined' && !!scriptUrl;
  }

  // kind: 'jpeg' (MozJPEG) or 'avif'. quality is 0..1. Returns a Blob.
  function encodeCanvas(kind, canvas, quality, speed) {
    return new Promise(function (resolve, reject) {
      try {
        var ctx = canvas.getContext('2d');
        var image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var id = nextId++;
        pending[id] = {
          resolve: function (buffer) {
            resolve(new Blob([buffer], { type: kind === 'jpeg' ? 'image/jpeg' : 'image/avif' }));
          },
          reject: reject
        };
        getWorker().postMessage({
          id: id,
          kind: kind,
          width: canvas.width,
          height: canvas.height,
          buffer: image.data.buffer,
          quality: Math.max(1, Math.min(100, Math.round(quality * 100))),
          speed: speed || 7
        }, [image.data.buffer]);
      } catch (err) {
        reject(err);
      }
    });
  }

  exports.ModernEncoders = { isSupported: isSupported, encodeCanvas: encodeCanvas };
})(typeof module !== 'undefined' ? module.exports : window);
