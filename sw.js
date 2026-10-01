// Offline support for image toolbox.
// Strategy: network first (so deploys are picked up immediately), cache as a fallback when offline.
// Keep CACHE in sync with OFFLINE_CACHE in js/privacyBadge.js.
var CACHE = 'itb-v2';
var PRECACHE = [
  './', 'index.html', 'upscale.html', 'pdf.html',
  'en/index.html', 'en/upscale.html', 'en/pdf.html',
  'css/style.css', 'css/site.css', 'css/toolStudio.css',
  'js/strings.js', 'js/privacyMeter.js', 'js/privacyBadge.js', 'js/imageTools.js', 'js/targetSize.js', 'js/pngQuantize.js',
  'js/exifGps.js', 'js/cropTools.js', 'js/heicLoader.js', 'js/modernEncoders.js', 'js/encodeWorker.js',
  'js/vendor/jsquash/jpeg/encode.js', 'js/vendor/jsquash/jpeg/meta.js', 'js/vendor/jsquash/jpeg/utils.js',
  'js/vendor/jsquash/jpeg/codec/enc/mozjpeg_enc.js', 'js/vendor/jsquash/jpeg/codec/enc/mozjpeg_enc.wasm',
  'js/vendor/jsquash/avif/encode.js', 'js/vendor/jsquash/avif/meta.js', 'js/vendor/jsquash/avif/utils.js',
  'js/vendor/jsquash/avif/codec/enc/avif_enc.js',
  'js/uploadUtil.js', 'js/shareUtil.js', 'js/workflowTools.js',
  'js/batchTools.js', 'js/app.js', 'js/upscaleTools.js', 'js/upscaleApp.js', 'js/pdfTools.js', 'js/pdfNavigation.js',
  'js/pdfApp.js', 'js/pdfConvertTools.js', 'js/pdfConvertApp.js', 'js/pdfExtraTools.js', 'js/pdfMergeApp.js', 'js/pdfShrinkApp.js',
  'favicon.svg', 'manifest.json', 'en/manifest.json', 'images/apple-touch-icon.png'
];
var CDN_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com'];

// Same-origin files are stored without their ?v= query so a new deploy replaces the old copy
// instead of piling up one entry per version.
function cacheKey(url) {
  if (url.origin !== self.location.origin) return url.href;
  return url.origin + url.pathname;
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // add one by one so a single missing file never blocks installation
      return Promise.all(PRECACHE.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function cacheable(url) {
  if (url.origin === self.location.origin) return true;
  return CDN_HOSTS.indexOf(url.hostname) !== -1;
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);
  if (!cacheable(url)) return;
  var key = cacheKey(url);

  event.respondWith(
    fetch(request).then(function (response) {
      if (response && (response.ok || response.type === 'opaque')) {
        var copy = response.clone();
        caches.open(CACHE).then(function (cache) { cache.put(key, copy); });
      }
      return response;
    }).catch(function () {
      return caches.match(key, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        if (request.mode === 'navigate') return caches.match('index.html', { ignoreSearch: true });
        return Response.error();
      });
    })
  );
});
