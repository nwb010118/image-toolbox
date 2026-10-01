(function (exports) {
  // Looks for an EXIF GPS block in a JPEG. Re-encoding through a canvas drops all metadata,
  // so this is only used to tell the user what was in the original file.
  function inspectJpegMetadata(buffer) {
    var bytes = new Uint8Array(buffer);
    var result = { isJpeg: false, hasExif: false, hasGps: false };
    if (bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) return result;
    result.isJpeg = true;

    var pos = 2;
    while (pos + 4 <= bytes.length) {
      if (bytes[pos] !== 0xFF) break;
      var marker = bytes[pos + 1];
      if (marker === 0xDA || marker === 0xD9) break; // start of scan / end of image
      var length = (bytes[pos + 2] << 8) | bytes[pos + 3];
      if (length < 2) break;
      if (marker === 0xE1 && isExifHeader(bytes, pos + 4)) {
        result.hasExif = true;
        result.hasGps = tiffHasGps(bytes, pos + 10, pos + 2 + length);
        break;
      }
      pos += 2 + length;
    }
    return result;
  }

  function isExifHeader(bytes, at) {
    return bytes[at] === 0x45 && bytes[at + 1] === 0x78 && bytes[at + 2] === 0x69 &&
      bytes[at + 3] === 0x66 && bytes[at + 4] === 0 && bytes[at + 5] === 0;
  }

  function tiffHasGps(bytes, tiffStart, limit) {
    if (tiffStart + 8 > limit) return false;
    var little;
    if (bytes[tiffStart] === 0x49 && bytes[tiffStart + 1] === 0x49) little = true;
    else if (bytes[tiffStart] === 0x4D && bytes[tiffStart + 1] === 0x4D) little = false;
    else return false;

    function u16(at) {
      return little ? (bytes[at] | (bytes[at + 1] << 8)) : ((bytes[at] << 8) | bytes[at + 1]);
    }
    function u32(at) {
      return little
        ? (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0
        : ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;
    }

    var ifd0 = tiffStart + u32(tiffStart + 4);
    if (ifd0 + 2 > limit) return false;
    var count = u16(ifd0);
    for (var i = 0; i < count; i++) {
      var entry = ifd0 + 2 + i * 12;
      if (entry + 12 > limit) return false;
      if (u16(entry) === 0x8825) {
        var gpsIfd = tiffStart + u32(entry + 8);
        if (gpsIfd + 2 > limit) return false;
        return u16(gpsIfd) > 0; // GPS IFD with at least one tag
      }
    }
    return false;
  }

  exports.inspectJpegMetadata = inspectJpegMetadata;
})(typeof module !== 'undefined' ? module.exports : window);
