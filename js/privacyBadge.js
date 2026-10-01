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

  var offlineState = 'pending';
  function renderNet() {
    if (!navigator.onLine) {
      netLine.textContent = t('pmOffline');
    } else if (offlineState === 'ready') {
      netLine.textContent = t('pmOfflineReady');
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

  // Offline support: a service worker keeps the tool pages and libraries so they keep working without a connection.
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register(base + 'sw.js').then(function () {
      return navigator.serviceWorker.ready;
    }).then(function () {
      offlineState = 'ready';
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
