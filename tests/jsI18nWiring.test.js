const fs = require('fs');
const path = require('path');
const assert = require('assert');

function test(name, fn) {
  try {
    fn();
    console.log('PASS: ' + name);
  } catch (err) {
    console.error('FAIL: ' + name);
    console.error(err.message);
    process.exitCode = 1;
  }
}

function readRepoFile(relPath) {
  return fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
}

var OLD_LITERALS_BY_FILE = {
  'js/app.js': [
    '이미지를 여기에 놓으세요',
    '지원하지 않는 파일 형식입니다. JPG, PNG, WebP 파일만 업로드할 수 있어요.'
  ],
  'js/upscaleApp.js': [
    '이 이미지로는 도달할 수 없어요 (긴 변 최소 ',
    '업스케일링 기능을 불러오지 못했습니다. 인터넷 연결을 확인해주세요.'
  ],
  'js/pdfApp.js': [
    '이미지는 최대 ',
    'PDF 파일을 읽을 수 없습니다.'
  ],
  'js/pdfConvertApp.js': [
    '변환이 진행 중입니다. 완료된 후 다시 시도해주세요.',
    '이 PDF는 텍스트가 없는 스캔본으로 보입니다. PPT 변환을 이용해주세요.'
  ],
  'js/shareUtil.js': [
    '링크가 복사되었습니다.'
  ]
};

Object.keys(OLD_LITERALS_BY_FILE).forEach(function (file) {
  test(file + ' no longer hardcodes its old Korean literals', function () {
    var code = readRepoFile(file);
    OLD_LITERALS_BY_FILE[file].forEach(function (literal) {
      assert.ok(!code.includes("'" + literal + "'"), file + ' still hardcodes: ' + literal);
    });
  });
});

['js/app.js', 'js/upscaleApp.js', 'js/pdfApp.js', 'js/pdfConvertApp.js', 'js/shareUtil.js'].forEach(function (file) {
  test(file + ' calls t(...)', function () {
    var code = readRepoFile(file);
    assert.ok(/\bt\(['"]/.test(code), file + ' does not call t(...)');
  });
});

var APP_SCRIPT_BY_PAGE = {
  'index.html': 'src="js/app.js"',
  'upscale.html': 'src="js/upscaleApp.js"',
  'pdf.html': 'src="js/pdfApp.js"',
  'en/index.html': 'src="../js/app.js"',
  'en/upscale.html': 'src="../js/upscaleApp.js"',
  'en/pdf.html': 'src="../js/pdfApp.js"'
};

Object.keys(APP_SCRIPT_BY_PAGE).forEach(function (page) {
  test(page + ' loads js/strings.js before ' + APP_SCRIPT_BY_PAGE[page], function () {
    var html = readRepoFile(page);
    var stringsSrc = page.indexOf('en/') === 0 ? 'src="../js/strings.js"' : 'src="js/strings.js"';
    var stringsIndex = html.indexOf(stringsSrc);
    var appIndex = html.indexOf(APP_SCRIPT_BY_PAGE[page]);
    assert.ok(stringsIndex !== -1, page + ' missing js/strings.js script tag');
    assert.ok(appIndex !== -1, page + ' missing ' + APP_SCRIPT_BY_PAGE[page]);
    assert.ok(stringsIndex < appIndex, page + ' loads js/strings.js after its app script');
  });
});
