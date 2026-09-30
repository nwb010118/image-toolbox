(function (exports) {
  var LANG = (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang === 'en')
    ? 'en'
    : 'ko';

  var STRINGS = {
    canvas2dUnavailable: { ko: '2D 캔버스 컨텍스트를 생성할 수 없습니다.', en: 'Could not create a 2D canvas context.' },
    unsupportedFormatGeneric: { ko: '지원하지 않는 파일 형식입니다.', en: 'This file format is not supported.' },
    imageProcessingFailed: { ko: '이미지 처리에 실패했습니다.', en: 'Image processing failed.' },
    imageLoadFailedGeneric: { ko: '이미지를 불러올 수 없습니다.', en: 'Could not load the image.' },
    dropImageHere: { ko: '이미지를 여기에 놓으세요', en: 'Drop your image here' },
    chooseFile: { ko: '파일 선택', en: 'Choose File' },
    unsupportedImageUpload: { ko: '지원하지 않는 파일 형식입니다. JPG, PNG, WebP 파일만 업로드할 수 있어요.', en: 'This file format is not supported. Only JPG, PNG, and WebP files can be uploaded.' },
    fileTooLarge20MB: { ko: '파일이 너무 큽니다 (최대 20MB). 더 작은 파일을 선택해주세요.', en: 'The file is too large (max 20MB). Please choose a smaller file.' },
    originalSizeLabel: { ko: '원본 크기: {size}', en: 'Original size: {size}' },
    chooseAnotherImage: { ko: '다른 이미지 선택', en: 'Choose Another Image' },
    imageLoadFailedChooseAnother: { ko: '이미지를 불러올 수 없습니다. 다른 파일을 선택해주세요.', en: 'Could not load the image. Please choose a different file.' },
    dimensionsMustBeNumbers: { ko: '가로/세로 값은 숫자로 입력해주세요.', en: 'Width and height must be numbers.' },
    dimensionsOutOfRange: { ko: '가로/세로 값은 1~{max}px 사이여야 합니다.', en: 'Width and height must be between 1 and {max}px.' },
    processingEllipsis: { ko: '처리 중...', en: 'Processing...' },
    resultSizeLabel: { ko: '결과 크기: {size} ({width}×{height})', en: 'Result size: {size} ({width}×{height})' },
    applyButton: { ko: '적용하기', en: 'Apply' },
    compressShareTitle: { ko: 'image toolbox - 브라우저에서 바로 처리하는 이미지 압축', en: 'image toolbox - Compress images right in your browser' },
    compressShareText: { ko: '사진을 서버에 올리지 않고 브라우저에서 무료로 압축·변환하는 도구예요.', en: 'Compress and convert your photos for free, right in your browser — no uploads.' },
    imageLoadFailedNamed: { ko: '이미지를 불러올 수 없습니다: {name}', en: 'Could not load the image: {name}' },
    resultLabel: { ko: '결과', en: 'Result' },
    modeUnreachableNote: { ko: '이 이미지로는 도달할 수 없어요 (긴 변 최소 {min}px 필요)', en: 'This resolution isn\'t reachable with this image (needs a long edge of at least {min}px)' },
    busyCannotSelectNew: { ko: '처리 중에는 새 이미지를 선택할 수 없습니다. 완료 후 다시 시도해주세요.', en: 'You can\'t choose a new image while processing. Please try again after it finishes.' },
    unsupportedFormatNamed: { ko: '지원하지 않는 파일 형식입니다: {name} (JPG, PNG, WebP만 가능)', en: 'This file format is not supported: {name} (only JPG, PNG, WebP allowed)' },
    fileTooLargeNamed20MB: { ko: '파일이 너무 큽니다 (최대 20MB): {name}', en: 'The file is too large (max 20MB): {name}' },
    imageTooLarge: { ko: '이미지가 너무 큽니다 (가로/세로 각각 최대 {max}px). 이미지 압축 도구에서 먼저 크기를 줄여주세요.', en: 'The image is too large (max {max}px on each side). Please shrink it first with the image compressor.' },
    upscaleLibraryLoadFailed: { ko: '업스케일링 기능을 불러오지 못했습니다. 인터넷 연결을 확인해주세요.', en: 'Could not load the upscaling engine. Please check your internet connection.' },
    resolutionUnreachable: { ko: '이 이미지로는 선택한 해상도에 도달할 수 없습니다.', en: 'This image can\'t reach the selected resolution.' },
    processingPercent: { ko: '처리 중... ({percent}%)', en: 'Processing... ({percent}%)' },
    resultWithMode: { ko: '결과 ({mode})', en: 'Result ({mode})' },
    upscaleFailed: { ko: '업스케일링 중 오류가 발생했습니다. 다른 이미지로 다시 시도해주세요.', en: 'Something went wrong while upscaling. Please try again with a different image.' },
    upscaleButton: { ko: '확대하기', en: 'Upscale' },
    upscaleShareTitle: { ko: 'image toolbox - 브라우저에서 바로 처리하는 AI 업스케일링', en: 'image toolbox - AI upscaling right in your browser' },
    upscaleShareText: { ko: '사진을 서버에 올리지 않고 브라우저에서 무료로 AI 업스케일링하는 도구예요.', en: 'Upscale your photos with AI for free, right in your browser — no uploads.' },
    upscaleResultImageFailed: { ko: '업스케일 결과 이미지를 불러올 수 없습니다.', en: 'Could not load the upscaled result image.' },
    tooManyImages: { ko: '이미지는 최대 {max}장까지 선택할 수 있습니다.', en: 'You can select up to {max} images.' },
    pdfLibraryLoadFailed: { ko: 'PDF 처리 기능을 불러오지 못했습니다. 인터넷 연결을 확인해주세요.', en: 'Could not load the PDF engine. Please check your internet connection.' },
    convertingEllipsis: { ko: '변환 중...', en: 'Converting...' },
    convertToPdfButton: { ko: 'PDF로 변환', en: 'Convert to PDF' },
    pageAltLabel: { ko: '페이지 {n} 미리보기', en: 'Page {n} preview' },
    pageDownloadLabel: { ko: '페이지 {n} 다운로드', en: 'Download page {n}' },
    pageImageFailed: { ko: '페이지 {n} 이미지를 만들지 못했습니다.', en: 'Could not create the image for page {n}.' },
    loadingPdf: { ko: 'PDF를 불러오는 중...', en: 'Loading PDF...' },
    pdfReadFailed: { ko: 'PDF 파일을 읽을 수 없습니다.', en: 'Could not read the PDF file.' },
    tooManyPages: { ko: 'PDF 페이지 수가 너무 많습니다 (최대 {max}페이지).', en: 'The PDF has too many pages (max {max} pages).' },
    processingPageProgress: { ko: '처리 중... ({current}/{total})', en: 'Processing... ({current}/{total})' },
    pdfOnlyUpload: { ko: 'PDF 파일만 업로드할 수 있어요.', en: 'Only PDF files can be uploaded.' },
    fileTooLarge20MBGeneric: { ko: '파일이 너무 큽니다 (최대 20MB).', en: 'The file is too large (max 20MB).' },
    pdfBusy: { ko: '이전 PDF를 처리하는 중입니다. 완료된 후 다시 시도해주세요.', en: 'A PDF is still being processed. Please try again once it finishes.' },
    pdfShareTitle: { ko: 'image toolbox - 브라우저에서 바로 처리하는 PDF 변환', en: 'image toolbox - Convert PDFs right in your browser' },
    imgToPdfShareText: { ko: '사진을 서버에 올리지 않고 브라우저에서 무료로 PDF로 합치는 도구예요.', en: 'Combine your photos into a PDF for free, right in your browser — no uploads.' },
    convertBusy: { ko: '변환이 진행 중입니다. 완료된 후 다시 시도해주세요.', en: 'A conversion is already in progress. Please try again once it finishes.' },
    readingTextProgress: { ko: '텍스트를 읽는 중... ({current}/{total})', en: 'Reading text... ({current}/{total})' },
    scannedPdfNoText: { ko: '이 PDF는 텍스트가 없는 스캔본으로 보입니다. PPT 변환을 이용해주세요.', en: 'This PDF appears to be a scanned document with no text layer. Please use the PowerPoint conversion instead.' },
    busyFileChange: { ko: '처리 중에는 파일을 바꿀 수 없습니다. 완료 후 다시 선택해주세요.', en: "You can't change the file while it's being processed. Please choose again once it finishes." },
    busyListChange: { ko: '변환 중에는 파일 목록을 바꿀 수 없습니다.', en: "You can't change the file list while a conversion is running." },
    moveUp: { ko: '위', en: 'Up' },
    moveDown: { ko: '아래', en: 'Down' },
    removeItem: { ko: '삭제', en: 'Remove' },
    pageResolutionTooLarge: { ko: '페이지 해상도가 너무 큽니다. 기본 해상도로 다시 시도해주세요.', en: 'This page is too large to render at that resolution. Please try again at the default resolution.' },
    pdfCancelled: { ko: '작업을 중단했습니다. 생성된 페이지는 다운로드할 수 있습니다.', en: 'Stopped. You can still download the pages generated so far.' },
    docCancelled: { ko: '문서 변환을 중단했습니다.', en: 'Document conversion was stopped.' },
    pageRangeInvalid: { ko: '페이지 범위를 확인해주세요 (1~{total}).', en: 'Please check the page range (1–{total}).' },
    pageRangeTooMany: { ko: '한 번에 최대 50페이지를 선택해주세요.', en: 'Please select at most 50 pages at a time.' },
    unsupportedConvertFormat: { ko: '지원하지 않는 형식입니다: {format}', en: 'This format is not supported: {format}' },
    documentLibraryLoadFailed: { ko: '문서 변환 기능을 불러오지 못했습니다. 인터넷 연결을 확인해주세요.', en: 'Could not load the document conversion engine. Please check your internet connection.' },
    pptPageLimitExceeded: { ko: 'PowerPoint 변환은 메모리 보호를 위해 최대 {max}페이지까지 지원합니다. 더 많은 페이지는 PDF를 나눠서 변환해주세요.', en: 'To protect memory, PowerPoint conversion supports up to {max} pages. Please split the PDF for longer documents.' },
    convertButton: { ko: '변환하기', en: 'Convert' },
    pdfConvertShareText: { ko: '사진을 서버에 올리지 않고 브라우저에서 무료로 PDF를 Word/PPT/Excel로 바꾸는 도구예요.', en: 'Convert PDFs to Word, PowerPoint, or Excel for free, right in your browser — no uploads.' },
    linkCopied: { ko: '링크가 복사되었습니다.', en: 'Link copied to clipboard.' }
  };

  function resolveString(key, params, lang) {
    var entry = STRINGS[key];
    var str = entry ? (entry[lang] || entry.ko) : key;
    if (params) {
      Object.keys(params).forEach(function (paramKey) {
        str = str.split('{' + paramKey + '}').join(params[paramKey]);
      });
    }
    return str;
  }

  function t(key, params) {
    return resolveString(key, params, LANG);
  }

  exports.STRINGS = STRINGS;
  exports.LANG = LANG;
  exports.t = t;
  exports.resolveString = resolveString;
})(typeof module !== 'undefined' ? module.exports : window);
