function compressImage(file, quality) {
  return new Promise(function (resolve, reject) {
    var outputType = getOutputMimeType(file.type);
    if (!outputType) {
      reject(new Error('지원하지 않는 파일 형식입니다.'));
      return;
    }

    var img = new Image();
    var objectUrl = URL.createObjectURL(file);

    img.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        function (blob) {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error('이미지 압축에 실패했습니다.'));
            return;
          }
          resolve({ blob: blob, url: URL.createObjectURL(blob) });
        },
        outputType,
        quality
      );
    };

    img.onerror = function () {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 불러올 수 없습니다.'));
    };

    img.src = objectUrl;
  });
}
