// Runs the WebAssembly encoders (MozJPEG, AVIF) off the main thread so the page stays responsive.
var encoders = {};

function load(kind) {
  if (!encoders[kind]) {
    encoders[kind] = import(kind === 'jpeg' ? './vendor/jsquash/jpeg/encode.js' : './vendor/jsquash/avif/encode.js');
  }
  return encoders[kind];
}

self.onmessage = function (event) {
  var msg = event.data;
  load(msg.kind).then(function (mod) {
    var image = { data: new Uint8ClampedArray(msg.buffer), width: msg.width, height: msg.height };
    var options = msg.kind === 'jpeg' ? { quality: msg.quality } : { quality: msg.quality, speed: msg.speed };
    return mod.default(image, options);
  }).then(function (out) {
    self.postMessage({ id: msg.id, buffer: out }, [out]);
  }).catch(function (err) {
    self.postMessage({ id: msg.id, error: String((err && err.message) || err) });
  });
};
