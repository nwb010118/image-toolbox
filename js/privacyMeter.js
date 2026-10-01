(function (exports) {
  // Counts requests that carry file-like (binary) bodies. If this tool ever uploaded an image,
  // it would have to go through fetch / XMLHttpRequest / sendBeacon with a Blob, File, ArrayBuffer or FormData.
  function isBinaryBody(body) {
    if (body === null || body === undefined) return false;
    if (typeof body === 'string') return false;
    if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return false;
    if (typeof Blob !== 'undefined' && body instanceof Blob) return true;
    if (typeof ArrayBuffer !== 'undefined' && (body instanceof ArrayBuffer || ArrayBuffer.isView(body))) return true;
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      var found = false;
      body.forEach(function (value) {
        if (typeof Blob !== 'undefined' && value instanceof Blob) found = true;
      });
      return found;
    }
    return false;
  }

  function bodySize(body) {
    if (typeof Blob !== 'undefined' && body instanceof Blob) return body.size;
    if (body && typeof body.byteLength === 'number') return body.byteLength;
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      var total = 0;
      body.forEach(function (value) { if (typeof Blob !== 'undefined' && value instanceof Blob) total += value.size; });
      return total;
    }
    return 0;
  }

  var stats = { binaryUploads: 0, binaryBytes: 0 };
  var listeners = [];

  function record(body) {
    if (!isBinaryBody(body)) return;
    stats.binaryUploads += 1;
    stats.binaryBytes += bodySize(body);
    listeners.forEach(function (fn) { fn(stats); });
  }

  function install(win) {
    if (!win || win.__privacyMeterInstalled) return;
    win.__privacyMeterInstalled = true;

    if (typeof win.fetch === 'function') {
      var originalFetch = win.fetch;
      win.fetch = function (input, init) {
        if (init && init.body) record(init.body);
        else if (typeof Request !== 'undefined' && input instanceof Request && input.method !== 'GET' && input.method !== 'HEAD') record(new Blob([]));
        return originalFetch.apply(this, arguments);
      };
    }
    if (win.XMLHttpRequest) {
      var originalSend = win.XMLHttpRequest.prototype.send;
      win.XMLHttpRequest.prototype.send = function (body) {
        record(body);
        return originalSend.apply(this, arguments);
      };
    }
    if (win.navigator && typeof win.navigator.sendBeacon === 'function') {
      var originalBeacon = win.navigator.sendBeacon;
      win.navigator.sendBeacon = function (url, data) {
        record(data);
        return originalBeacon.apply(this, arguments);
      };
    }
  }

  function onChange(fn) { listeners.push(fn); }
  function getStats() { return { binaryUploads: stats.binaryUploads, binaryBytes: stats.binaryBytes }; }
  function reset() { stats.binaryUploads = 0; stats.binaryBytes = 0; }

  exports.PrivacyMeter = { isBinaryBody: isBinaryBody, install: install, onChange: onChange, getStats: getStats, reset: reset, _record: record };
})(typeof module !== 'undefined' ? module.exports : window);

if (typeof window !== 'undefined') {
  window.PrivacyMeter.install(window);
}
