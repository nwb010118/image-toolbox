(function (exports) {
  function msg(key, fallback, params) {
    return typeof t === 'function' ? t(key, params) : fallback;
  }
  function parsePageRange(start, end, total) {
    var first = Number(start || 1), last = end === '' ? total : Number(end);
    if (!Number.isInteger(first) || !Number.isInteger(last) || first < 1 || last < first || last > total) throw new Error(msg('pageRangeInvalid', '페이지 범위를 확인해주세요 (1~' + total + ').', { total: total }));
    if (last - first + 1 > 50) throw new Error(msg('pageRangeTooMany', '한 번에 최대 50페이지를 선택해주세요.'));
    return Array.from({ length: last - first + 1 }, function (_, i) { return first + i; });
  }
  // Store already-compressed PNG bytes in a standard ZIP without another dependency.
  function crc32(bytes) {
    var crc = -1;
    bytes.forEach(function (byte) { crc ^= byte; for (var i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); });
    return (crc ^ -1) >>> 0;
  }
  async function createStoredZip(entries) {
    var parts = [], central = [], offset = 0, centralSize = 0;
    for (var entry of entries) {
      var name = new TextEncoder().encode(entry.name);
      var bytes = new Uint8Array(await entry.blob.arrayBuffer());
      var checksum = crc32(bytes);
      var header = new Uint8Array(30 + name.length), view = new DataView(header.buffer);
      view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x800, true);
      view.setUint16(12, 33, true); view.setUint32(14, checksum, true); view.setUint32(18, bytes.length, true); view.setUint32(22, bytes.length, true); view.setUint16(26, name.length, true); header.set(name, 30);
      var dir = new Uint8Array(46 + name.length), dv = new DataView(dir.buffer);
      dv.setUint32(0, 0x02014b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 20, true); dv.setUint16(8, 0x800, true); dv.setUint16(14, 33, true);
      dv.setUint32(16, checksum, true); dv.setUint32(20, bytes.length, true); dv.setUint32(24, bytes.length, true); dv.setUint16(28, name.length, true); dv.setUint32(42, offset, true); dir.set(name, 46);
      parts.push(header, bytes); central.push(dir); centralSize += dir.length; offset += header.length + bytes.length;
    }
    var end = new Uint8Array(22), ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true); ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [end]), {type: 'application/zip'});
  }
  exports.parsePageRange = parsePageRange;
  exports.createStoredZip = createStoredZip;
})(typeof module !== 'undefined' ? module.exports : window);
