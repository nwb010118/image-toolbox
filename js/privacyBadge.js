(function () {
  var box = document.getElementById('privacyMeter');
  var base = LANG === 'en' ? '../' : '';

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  var countLine = el('p', 'privacy-meter-count');
  var netLine = el('p', 'privacy-meter-net');

  function renderCount() {
    var stats = window.PrivacyMeter ? window.PrivacyMeter.getStats() : { binaryUploads: 0 };
    countLine.textContent = t('pmCount', { n: stats.binaryUploads });
    countLine.classList.toggle('privacy-meter-alert', stats.binaryUploads > 0);
  }

  // Keep in sync with CACHE in sw.js.
  var OFFLINE_CACHE = 'itb-v2';
  var isCompressPage = !!document.getElementById('formatSelect');
  var offlineState = 'pending';
  function renderNet() {
    if (!navigator.onLine) {
      netLine.textContent = t('pmOffline');
    } else if (offlineState === 'ready') {
      netLine.textContent = t(isCompressPage ? 'pmOfflineReadyCompress' : 'pmOfflineReady');
    } else if (offlineState === 'partial') {
      netLine.textContent = t('pmOfflinePartial');
    } else if (offlineState === 'unsupported') {
      netLine.textContent = t('pmOfflineUnsupported');
    } else {
      netLine.textContent = t('pmOfflinePreparing');
    }
  }

  if (box) {
    var details = el('details', 'privacy-meter-how');
    details.appendChild(el('summary', '', t('pmHowTitle')));
    var steps = el('ol');
    ['pmStep1', 'pmStep2', 'pmStep3'].forEach(function (key) { steps.appendChild(el('li', '', t(key))); });
    details.appendChild(steps);
    details.appendChild(el('p', 'privacy-meter-note', t('pmNote')));

    box.appendChild(countLine);
    box.appendChild(netLine);
    box.appendChild(details);

    renderCount();
    renderNet();
    if (window.PrivacyMeter) window.PrivacyMeter.onChange(renderCount);
    window.addEventListener('online', renderNet);
    window.addEventListener('offline', renderNet);
  }

  // Libraries this page needs that the service worker does not precache: the page's CDN scripts
  // (on a first visit they load before the service worker takes control) plus files fetched only on use.
  function offlineAssets() {
    var urls = Array.prototype.map.call(document.querySelectorAll('script[src^="https://"]'), function (s) { return s.src; })
      .filter(function (src) { return src.indexOf('googlesyndication') === -1; });
    if (document.getElementById('upscaleFileInput')) {
      urls.push('https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-slim@1.0.0/models/x2/model.json',
        'https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-slim@1.0.0/models/x2/group1-shard1of1.bin');
    }
    if (document.getElementById('mergePdfFileInput')) {
      urls.push('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js');
    }
    return urls;
  }

  function warmOfflineCache() {
    if (!window.caches) return Promise.resolve(true);
    return caches.open(OFFLINE_CACHE).then(function (cache) {
      return Promise.all(offlineAssets().map(function (url) {
        var add = function () { return cache.add(new Request(url, { mode: 'cors' })); };
        var stored = function () { return cache.match(url).then(Boolean); };
        return stored().then(function (hit) {
          if (hit) return true;
          // The service worker may be writing the same file at the same moment; check again, then retry once.
          return add().then(function () { return true; }, function () {
            return stored().then(function (now) { return now || add().then(function () { return true; }, function () { return false; }); });
          });
        });
      }));
    }).then(function (results) {
      return results.every(Boolean);
    }, function () { return false; });
  }

  // Offline support: a service worker keeps the tool pages and libraries so they keep working without a connection.
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register(base + 'sw.js').then(function () {
      return navigator.serviceWorker.ready;
    }).then(function () {
      return box ? warmOfflineCache() : true;
    }).then(function (complete) {
      offlineState = complete ? 'ready' : 'partial';
      renderNet();
    }).catch(function () {
      offlineState = 'unsupported';
      renderNet();
    });
  } else {
    offlineState = 'unsupported';
    renderNet();
  }
})();
