# PDF 변환 기능 (이미지 ↔ PDF) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 별도 페이지(`pdf.html`)에서 여러 이미지를 하나의 PDF로 합치고, PDF의 각 페이지를 PNG 이미지로 추출하는 기능을 제공한다.

**Architecture:** 기존 이미지 도구와 동일하게 빌드 도구 없는 순수 HTML/CSS/JavaScript 정적 페이지를 유지한다. 다만 브라우저에 PDF 네이티브 처리 API가 없으므로 이 기능에 한해 pdf.js(PDF 렌더링)와 jsPDF(PDF 생성)를 CDN `<script>` 태그로 불러온다. 순수 계산/검증 로직은 `js/pdfTools.js`에 두고 Node로 유닛테스트하며, DOM 이벤트와 pdf.js/jsPDF/canvas 연동은 `js/pdfApp.js`에서 그 함수들을 소비한다. `pdf.html`은 기존 `js/imageTools.js`도 함께 불러와 `formatBytes`, `isSupportedImageType`을 재사용한다. `index.html`(이미지 압축 도구)은 상단 링크 한 줄만 추가되고 그 외에는 전혀 수정되지 않는다 — PDF 라이브러리는 `pdf.html`에서만 로드된다.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES5 문법 위주), Canvas API, File API, pdf.js 3.11.174 (CDN, UMD 빌드), jsPDF 2.5.1 (CDN, UMD 빌드). 빌드 도구 없음. 테스트는 Node.js 내장 `assert` 모듈만 사용.

## Global Constraints

- 순수 HTML/CSS/JavaScript로만 작성한다. 빌드 도구(webpack/vite 등)를 사용하지 않는다. (스펙: 기술 스택)
- pdf.js, jsPDF 외의 외부 라이브러리는 추가하지 않는다. 두 라이브러리는 특정 버전으로 CDN URL에 고정한다 ("latest" 금지). (스펙: 기술 스택)
  - pdf.js: `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js` (본체), `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js` (워커)
  - jsPDF: `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`
- pdf.js/jsPDF는 `pdf.html`에서만 로드한다. `index.html`은 상단 링크 1줄 외에 변경하지 않는다. (스펙: 네비게이션 — 이미지 도구 방문자가 불필요한 라이브러리를 받지 않도록)
- 이미지 파일은 절대 서버로 전송하지 않는다. 모든 처리는 브라우저 내부에서만 이루어진다. (스펙: 기술 스택 — 서버 전송 없음 원칙)
- 이미지 → PDF: 페이지 순서는 업로드(선택)한 순서 그대로 사용한다. 재정렬 UI는 만들지 않는다. (스펙: 범위)
- 이미지 → PDF: 각 이미지는 원본 픽셀 크기 그대로 PDF 페이지에 배치한다 (여백/레터박스 없음). (스펙: 핵심 기능)
- PDF → 이미지: 출력 포맷은 PNG로 고정한다. 페이지별 개별 다운로드 버튼만 제공하고 ZIP으로 묶지 않는다. (스펙: 범위)
- 파일당 최대 20MB (기존 이미지 도구와 동일한 제한값, `MAX_FILE_SIZE`로 재정의). 이미지 → PDF는 최대 50장, PDF → 이미지는 최대 300페이지로 제한한다 (구현 안전장치, 스펙에 명시되지 않음 — 브라우저 메모리 보호 목적).

---

## File Structure

- `js/pdfTools.js` (신규) — 파일 유효성 검사, 개수 제한 검사, 파일명 생성 등 순수 함수
- `tests/pdfTools.test.js` (신규) — 위 함수들에 대한 Node 기반 단위 테스트
- `pdf.html` (신규) — PDF 변환 페이지 마크업. pdf.js/jsPDF CDN 스크립트, `js/imageTools.js`, `js/pdfTools.js`, `js/pdfApp.js` 로드
- `css/style.css` (수정) — `pdf.html` 전용 스타일(파일 목록, 페이지 썸네일, 진행 표시, 상단 네비게이션 링크) 추가
- `js/pdfApp.js` (신규) — DOM 이벤트 와이어링, pdf.js/jsPDF 호출, canvas 렌더링
- `index.html` (수정) — 상단에 `pdf.html`로 가는 링크 한 줄 추가

---

### Task 1: PDF 관련 순수 함수 (`js/pdfTools.js`)

**Files:**
- Create: `js/pdfTools.js`
- Create: `tests/pdfTools.test.js`

**Interfaces:**
- Consumes: 없음 (독립적인 순수 함수 모음)
- Produces: `isValidFileSize(bytes): boolean`, `isValidImageCount(count): boolean`, `isValidPageCount(count): boolean`, `isValidPdfFile(file): boolean`, `getPdfOutputFilename(): string`, `getBaseFileName(fileName): string`, `getPageImageFilename(baseName, pageNumber, totalPages): string`, `getPdfPageOrientation(width, height): 'l' | 'p'`, `MAX_FILE_SIZE: number`, `MAX_IMAGE_COUNT: number`, `MAX_PDF_PAGES: number`
  - Task 3, 4에서 `js/pdfApp.js`가 이 함수들을 전역으로 가져다 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/pdfTools.test.js` 파일을 새로 만든다:

```js
const assert = require('assert');
const {
  isValidFileSize,
  isValidImageCount,
  isValidPageCount,
  isValidPdfFile,
  getPdfOutputFilename,
  getBaseFileName,
  getPageImageFilename,
  getPdfPageOrientation,
  MAX_FILE_SIZE,
  MAX_IMAGE_COUNT,
  MAX_PDF_PAGES
} = require('../js/pdfTools.js');

function test(name, fn) {
  try {
    fn();
    console.log('PASS: ' + name);
  } catch (err) {
    console.error('FAIL: ' + name);
    console.error(err);
    process.exitCode = 1;
  }
}

test('MAX_FILE_SIZE is 20MB', () => {
  assert.strictEqual(MAX_FILE_SIZE, 20 * 1024 * 1024);
});

test('isValidFileSize accepts sizes within range', () => {
  assert.strictEqual(isValidFileSize(1), true);
  assert.strictEqual(isValidFileSize(MAX_FILE_SIZE), true);
});

test('isValidFileSize rejects zero, negative, or over-limit sizes', () => {
  assert.strictEqual(isValidFileSize(0), false);
  assert.strictEqual(isValidFileSize(-5), false);
  assert.strictEqual(isValidFileSize(MAX_FILE_SIZE + 1), false);
});

test('isValidImageCount accepts 1..MAX_IMAGE_COUNT', () => {
  assert.strictEqual(isValidImageCount(1), true);
  assert.strictEqual(isValidImageCount(MAX_IMAGE_COUNT), true);
});

test('isValidImageCount rejects 0 or over-limit counts', () => {
  assert.strictEqual(isValidImageCount(0), false);
  assert.strictEqual(isValidImageCount(MAX_IMAGE_COUNT + 1), false);
});

test('isValidPageCount accepts 1..MAX_PDF_PAGES', () => {
  assert.strictEqual(isValidPageCount(1), true);
  assert.strictEqual(isValidPageCount(MAX_PDF_PAGES), true);
});

test('isValidPageCount rejects 0 or over-limit counts', () => {
  assert.strictEqual(isValidPageCount(0), false);
  assert.strictEqual(isValidPageCount(MAX_PDF_PAGES + 1), false);
});

test('isValidPdfFile accepts application/pdf mime type', () => {
  assert.strictEqual(isValidPdfFile({ type: 'application/pdf', name: 'report.pdf' }), true);
});

test('isValidPdfFile accepts .pdf extension when mime type is empty', () => {
  assert.strictEqual(isValidPdfFile({ type: '', name: 'REPORT.PDF' }), true);
});

test('isValidPdfFile rejects non-PDF files', () => {
  assert.strictEqual(isValidPdfFile({ type: 'image/png', name: 'photo.png' }), false);
});

test('isValidPdfFile rejects null/undefined', () => {
  assert.strictEqual(isValidPdfFile(null), false);
  assert.strictEqual(isValidPdfFile(undefined), false);
});

test('getPdfOutputFilename returns a fixed name', () => {
  assert.strictEqual(getPdfOutputFilename(), 'images.pdf');
});

test('getBaseFileName strips the last extension', () => {
  assert.strictEqual(getBaseFileName('report.pdf'), 'report');
  assert.strictEqual(getBaseFileName('a.b.pdf'), 'a.b');
  assert.strictEqual(getBaseFileName('noext'), 'noext');
});

test('getPageImageFilename pads page numbers to match total page digit count', () => {
  assert.strictEqual(getPageImageFilename('doc', 1, 5), 'doc-page-1.png');
  assert.strictEqual(getPageImageFilename('doc', 3, 12), 'doc-page-03.png');
  assert.strictEqual(getPageImageFilename('doc', 7, 125), 'doc-page-007.png');
});

test('getPdfPageOrientation returns landscape for wide or square images', () => {
  assert.strictEqual(getPdfPageOrientation(1000, 500), 'l');
  assert.strictEqual(getPdfPageOrientation(500, 500), 'l');
});

test('getPdfPageOrientation returns portrait for tall images', () => {
  assert.strictEqual(getPdfPageOrientation(500, 1000), 'p');
});

if (process.exitCode !== 1) {
  console.log('\n모든 테스트 통과');
}
```

- [ ] **Step 2: 테스트 실행해서 실패하는지 확인**

Run: `node tests/pdfTools.test.js`
Expected: `Cannot find module '../js/pdfTools.js'` 에러로 실패

- [ ] **Step 3: 구현 작성**

`js/pdfTools.js` 파일을 새로 만든다:

```js
(function (exports) {
  var MAX_FILE_SIZE = 20 * 1024 * 1024;
  var MAX_IMAGE_COUNT = 50;
  var MAX_PDF_PAGES = 300;

  function isValidFileSize(bytes) {
    return typeof bytes === 'number' && !isNaN(bytes) && bytes > 0 && bytes <= MAX_FILE_SIZE;
  }

  function isValidImageCount(count) {
    return typeof count === 'number' && !isNaN(count) && count >= 1 && count <= MAX_IMAGE_COUNT;
  }

  function isValidPageCount(count) {
    return typeof count === 'number' && !isNaN(count) && count >= 1 && count <= MAX_PDF_PAGES;
  }

  function isValidPdfFile(file) {
    if (!file) {
      return false;
    }
    if (file.type === 'application/pdf') {
      return true;
    }
    return typeof file.name === 'string' && file.name.toLowerCase().slice(-4) === '.pdf';
  }

  function getPdfOutputFilename() {
    return 'images.pdf';
  }

  function getBaseFileName(fileName) {
    var lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 ? fileName : fileName.slice(0, lastDot);
  }

  function getPageImageFilename(baseName, pageNumber, totalPages) {
    var digits = String(totalPages).length;
    var padded = String(pageNumber);
    while (padded.length < digits) {
      padded = '0' + padded;
    }
    return baseName + '-page-' + padded + '.png';
  }

  function getPdfPageOrientation(width, height) {
    return width >= height ? 'l' : 'p';
  }

  exports.MAX_FILE_SIZE = MAX_FILE_SIZE;
  exports.MAX_IMAGE_COUNT = MAX_IMAGE_COUNT;
  exports.MAX_PDF_PAGES = MAX_PDF_PAGES;
  exports.isValidFileSize = isValidFileSize;
  exports.isValidImageCount = isValidImageCount;
  exports.isValidPageCount = isValidPageCount;
  exports.isValidPdfFile = isValidPdfFile;
  exports.getPdfOutputFilename = getPdfOutputFilename;
  exports.getBaseFileName = getBaseFileName;
  exports.getPageImageFilename = getPageImageFilename;
  exports.getPdfPageOrientation = getPdfPageOrientation;
})(typeof module !== 'undefined' ? module.exports : window);
```

- [ ] **Step 4: 테스트 실행해서 통과하는지 확인**

Run: `node tests/pdfTools.test.js`
Expected: 모든 테스트가 `PASS`로 출력되고, 마지막 줄에 `모든 테스트 통과` 출력, exit code 0

- [ ] **Step 5: 커밋**

```bash
git add js/pdfTools.js tests/pdfTools.test.js
git commit -m "Add PDF validation and filename pure functions"
```

---

### Task 2: `pdf.html` 마크업, 스타일, 홈 링크

**Files:**
- Create: `pdf.html`
- Create: `js/pdfApp.js` (빈 파일, 헤더 주석만)
- Modify: `css/style.css`
- Modify: `index.html`

**Interfaces:**
- Produces: 아래 `id`를 가진 DOM 엘리먼트. Task 3, 4에서 그대로 참조한다.
  - 이미지 → PDF: `imgToPdfUploadArea`, `imgToPdfFileInput`, `imgToPdfError`, `imgToPdfFileList`, `imgToPdfBtn`, `imgToPdfDownloadBtn`
  - PDF → 이미지: `pdfToImgUploadArea`, `pdfToImgFileInput`, `pdfToImgError`, `pdfToImgProgress`, `pdfToImgPages`

- [ ] **Step 1: `pdf.html` 생성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PDF 변환 도구 - 이미지를 PDF로, PDF를 이미지로</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <main class="container">
    <h1>PDF 변환 도구</h1>
    <p class="subtitle">사진이 서버로 전송되지 않고, 이 브라우저 안에서만 처리됩니다.</p>
    <p class="tool-nav"><a href="index.html">← 이미지 압축 도구</a></p>

    <section class="pdf-section">
      <h2>이미지 → PDF</h2>
      <section class="upload-area" id="imgToPdfUploadArea">
        <input type="file" id="imgToPdfFileInput" class="visually-hidden" accept="image/jpeg,image/png,image/webp" multiple>
        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3v12"></path>
          <path d="M7 8l5-5 5 5"></path>
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path>
        </svg>
        <button type="button" class="upload-btn">파일 선택 (여러 장 가능)</button>
        <p class="upload-hint">또는 파일을 이 영역에 끌어다 놓으세요</p>
        <p class="upload-formats">JPG, PNG, WebP 지원 · 파일당 최대 20MB · 최대 50장</p>
        <div id="imgToPdfError" class="error-message" hidden></div>
      </section>

      <ul id="imgToPdfFileList" class="file-list"></ul>

      <button id="imgToPdfBtn" hidden>PDF로 변환</button>
      <a id="imgToPdfDownloadBtn" class="btn" href="#" download="images.pdf" hidden>PDF 다운로드</a>
    </section>

    <section class="pdf-section">
      <h2>PDF → 이미지</h2>
      <section class="upload-area" id="pdfToImgUploadArea">
        <input type="file" id="pdfToImgFileInput" class="visually-hidden" accept="application/pdf,.pdf">
        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3v12"></path>
          <path d="M7 8l5-5 5 5"></path>
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path>
        </svg>
        <button type="button" class="upload-btn">PDF 파일 선택</button>
        <p class="upload-hint">또는 파일을 이 영역에 끌어다 놓으세요</p>
        <p class="upload-formats">PDF 지원 · 최대 20MB · 최대 300페이지</p>
        <div id="pdfToImgError" class="error-message" hidden></div>
      </section>

      <p id="pdfToImgProgress" class="pdf-progress" hidden></p>
      <div id="pdfToImgPages" class="pdf-page-list"></div>
    </section>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="js/imageTools.js"></script>
  <script src="js/pdfTools.js"></script>
  <script src="js/pdfApp.js"></script>
</body>
</html>
```

- [ ] **Step 2: 빈 `js/pdfApp.js` 생성**

```js
// PDF 변환 도구 - 이미지 → PDF, PDF → 이미지 이벤트 와이어링
```

- [ ] **Step 3: `index.html`에 링크 추가**

`index.html`의 `<p class="subtitle">...</p>` 바로 다음 줄에 추가:

```html
    <p class="tool-nav"><a href="pdf.html">PDF 변환 도구 →</a></p>
```

- [ ] **Step 4: `css/style.css`에 스타일 추가**

기존의 아래 줄을 찾아:

```css
button, #downloadBtn {
```

다음으로 교체 (`.btn` 클래스 추가):

```css
button, #downloadBtn, .btn {
```

파일 맨 아래에 추가:

```css
.tool-nav {
  margin: 0 0 20px;
}

.tool-nav a {
  color: #0071e3;
  text-decoration: none;
  font-size: 14px;
}

.pdf-section {
  margin-bottom: 32px;
}

.pdf-section h2 {
  font-size: 20px;
  margin-bottom: 12px;
}

.file-list {
  list-style: none;
  padding: 0;
  margin: 12px 0;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.file-list:empty {
  display: none;
}

.file-list li {
  padding: 10px 16px;
  border-bottom: 1px solid #eee;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
}

.file-list li:last-child {
  border-bottom: none;
}

.pdf-progress {
  color: #6e6e73;
  font-size: 14px;
  margin: 12px 0;
}

.pdf-page-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.pdf-page-item {
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  width: 160px;
  text-align: center;
}

.pdf-page-item img {
  max-width: 100%;
  border-radius: 8px;
  display: block;
  margin-bottom: 8px;
  border: 1px solid #eee;
}

.pdf-page-item a {
  font-size: 13px;
  padding: 6px 12px;
}
```

- [ ] **Step 5: 수동 확인**

`index.html`을 브라우저로 열어 "PDF 변환 도구 →" 링크가 보이고 클릭하면 `pdf.html`로 이동하는지 확인한다.
`pdf.html`을 열어서 확인한다.
Expected:
- "이미지 → PDF"와 "PDF → 이미지" 두 섹션과 각각의 업로드 영역이 보인다
- "← 이미지 압축 도구" 링크가 보이고 클릭하면 `index.html`로 돌아간다
- 개발자 도구 콘솔(F12)에 pdf.js/jsPDF 로드 에러가 없다 (`typeof pdfjsLib`, `typeof jspdf`가 콘솔에서 `"object"`로 나온다)
- 아직 `js/pdfApp.js`에 로직이 없으므로 파일을 선택해도 아무 동작이 없다 — 이 단계에서는 정상

- [ ] **Step 6: 커밋**

```bash
git add pdf.html js/pdfApp.js css/style.css index.html
git commit -m "Add PDF tool page markup, styles, and home page link"
```

---

### Task 3: 이미지 → PDF 로직 (`js/pdfApp.js`)

**Files:**
- Modify: `js/pdfApp.js`

**Interfaces:**
- Consumes: `formatBytes`, `isSupportedImageType` (Task 1 이전부터 존재하는 `js/imageTools.js`), `isValidFileSize`, `isValidImageCount`, `getPdfOutputFilename`, `getPdfPageOrientation`, `MAX_IMAGE_COUNT` (Task 1의 `js/pdfTools.js`), Task 2의 `imgToPdf*` DOM 요소, 전역 `jspdf.jsPDF` (CDN)
- Produces: 없음 (이 페이지의 종단 기능)

- [ ] **Step 1: `js/pdfApp.js`에 이미지 → PDF 로직 추가**

`js/pdfApp.js` 맨 아래에 추가:

```js
var imgToPdfUploadArea = document.getElementById('imgToPdfUploadArea');
var imgToPdfFileInput = document.getElementById('imgToPdfFileInput');
var imgToPdfError = document.getElementById('imgToPdfError');
var imgToPdfFileList = document.getElementById('imgToPdfFileList');
var imgToPdfBtn = document.getElementById('imgToPdfBtn');
var imgToPdfDownloadBtn = document.getElementById('imgToPdfDownloadBtn');

var selectedImageFiles = [];
var lastPdfUrl = null;

function showImgToPdfError(message) {
  imgToPdfError.textContent = message;
  imgToPdfError.hidden = false;
}

function clearImgToPdfError() {
  imgToPdfError.textContent = '';
  imgToPdfError.hidden = true;
}

function renderImgToPdfFileList() {
  imgToPdfFileList.innerHTML = '';
  selectedImageFiles.forEach(function (file) {
    var li = document.createElement('li');
    li.textContent = file.name + ' (' + formatBytes(file.size) + ')';
    imgToPdfFileList.appendChild(li);
  });
}

function handleImageFiles(files) {
  clearImgToPdfError();
  imgToPdfBtn.hidden = true;
  imgToPdfDownloadBtn.hidden = true;
  selectedImageFiles = [];
  renderImgToPdfFileList();

  if (!files || files.length === 0) {
    return;
  }

  if (!isValidImageCount(files.length)) {
    showImgToPdfError('이미지는 최대 ' + MAX_IMAGE_COUNT + '장까지 선택할 수 있습니다.');
    return;
  }

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    if (!isSupportedImageType(file.type)) {
      showImgToPdfError('지원하지 않는 파일 형식입니다: ' + file.name + ' (JPG, PNG, WebP만 가능)');
      return;
    }
    if (!isValidFileSize(file.size)) {
      showImgToPdfError('파일이 너무 큽니다 (최대 20MB): ' + file.name);
      return;
    }
  }

  selectedImageFiles = Array.prototype.slice.call(files);
  renderImgToPdfFileList();
  imgToPdfBtn.hidden = false;
}

imgToPdfFileInput.addEventListener('change', function (e) {
  handleImageFiles(e.target.files);
});

imgToPdfUploadArea.addEventListener('click', function (e) {
  if (e.target !== imgToPdfFileInput) {
    imgToPdfFileInput.click();
  }
});

var imgToPdfDragCounter = 0;

imgToPdfUploadArea.addEventListener('dragenter', function (e) {
  e.preventDefault();
  imgToPdfDragCounter = imgToPdfDragCounter + 1;
  imgToPdfUploadArea.classList.add('drag-over');
});

imgToPdfUploadArea.addEventListener('dragover', function (e) {
  e.preventDefault();
});

imgToPdfUploadArea.addEventListener('dragleave', function () {
  imgToPdfDragCounter = imgToPdfDragCounter - 1;
  if (imgToPdfDragCounter <= 0) {
    imgToPdfDragCounter = 0;
    imgToPdfUploadArea.classList.remove('drag-over');
  }
});

imgToPdfUploadArea.addEventListener('drop', function (e) {
  e.preventDefault();
  imgToPdfDragCounter = 0;
  imgToPdfUploadArea.classList.remove('drag-over');
  imgToPdfFileInput.value = '';
  handleImageFiles(e.dataTransfer.files);
});

function imageFileToJpegDataUrl(file) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    var objectUrl = URL.createObjectURL(file);
    img.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      var ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('2D 캔버스 컨텍스트를 생성할 수 없습니다.'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.92),
        width: canvas.width,
        height: canvas.height
      });
    };
    img.onerror = function () {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 불러올 수 없습니다: ' + file.name));
    };
    img.src = objectUrl;
  });
}

function buildPdfFromImages(files) {
  var doc = null;

  return files.reduce(function (promise, file, index) {
    return promise.then(function () {
      return imageFileToJpegDataUrl(file);
    }).then(function (converted) {
      var orientation = getPdfPageOrientation(converted.width, converted.height);
      if (index === 0) {
        doc = new jspdf.jsPDF({ orientation: orientation, unit: 'px', format: [converted.width, converted.height] });
      } else {
        doc.addPage([converted.width, converted.height], orientation);
      }
      doc.addImage(converted.dataUrl, 'JPEG', 0, 0, converted.width, converted.height);
    });
  }, Promise.resolve()).then(function () {
    return doc.output('blob');
  });
}

imgToPdfBtn.addEventListener('click', function () {
  if (selectedImageFiles.length === 0) {
    return;
  }
  clearImgToPdfError();

  if (typeof jspdf === 'undefined') {
    showImgToPdfError('PDF 처리 기능을 불러오지 못했습니다. 인터넷 연결을 확인해주세요.');
    return;
  }

  imgToPdfBtn.disabled = true;
  imgToPdfBtn.textContent = '변환 중...';

  buildPdfFromImages(selectedImageFiles)
    .then(function (blob) {
      if (lastPdfUrl) {
        URL.revokeObjectURL(lastPdfUrl);
      }
      lastPdfUrl = URL.createObjectURL(blob);
      imgToPdfDownloadBtn.href = lastPdfUrl;
      imgToPdfDownloadBtn.download = getPdfOutputFilename();
      imgToPdfDownloadBtn.hidden = false;
    })
    .catch(function (err) {
      showImgToPdfError(err.message);
    })
    .then(function () {
      imgToPdfBtn.disabled = false;
      imgToPdfBtn.textContent = 'PDF로 변환';
    });
});
```

- [ ] **Step 2: 브라우저에서 수동 검증**

`pdf.html`을 새로고침해서 연다.
Expected 체크리스트:
- JPG/PNG/WebP 이미지 3~4장을 선택하면 파일명·크기 목록이 뜨고 "PDF로 변환" 버튼이 나타난다
- "PDF로 변환" 클릭 → 잠시 후 "PDF 다운로드" 버튼이 나타나고, 클릭하면 `images.pdf`가 다운로드된다
- 받은 PDF를 열어보면 페이지 수가 선택한 이미지 수와 같고, 선택한 순서대로 페이지가 구성되어 있으며, 각 페이지 크기가 해당 이미지의 가로세로 비율과 일치한다
- 투명 배경 PNG를 포함해 변환하면 PDF 안에서 투명 부분이 흰색으로 나온다 (검은색이 아님)
- 51장을 선택하면 "이미지는 최대 50장까지 선택할 수 있습니다." 에러가 뜨고 진행되지 않는다
- 지원하지 않는 파일(GIF 등)을 섞어서 선택하면 어떤 파일이 문제인지 에러 메시지로 안내되고 진행되지 않는다
- "PDF로 변환"을 두 번 연속 누르면 이전 PDF 다운로드 blob URL이 해제되고 새 PDF로 교체된다 (개발자 도구에서 이전 blob URL이 더 이상 유효하지 않음을 확인)

- [ ] **Step 3: 커밋**

```bash
git add js/pdfApp.js
git commit -m "Implement image-to-PDF conversion"
```

---

### Task 4: PDF → 이미지 로직 (`js/pdfApp.js`)

**Files:**
- Modify: `js/pdfApp.js`

**Interfaces:**
- Consumes: `isValidPdfFile`, `isValidFileSize`, `isValidPageCount`, `getBaseFileName`, `getPageImageFilename`, `MAX_PDF_PAGES` (Task 1의 `js/pdfTools.js`), Task 2의 `pdfToImg*` DOM 요소, 전역 `pdfjsLib` (CDN)
- Produces: 없음 (이 페이지의 종단 기능)

- [ ] **Step 1: `js/pdfApp.js`에 PDF → 이미지 로직 추가**

`js/pdfApp.js` 맨 아래에 추가:

```js
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

var pdfToImgUploadArea = document.getElementById('pdfToImgUploadArea');
var pdfToImgFileInput = document.getElementById('pdfToImgFileInput');
var pdfToImgError = document.getElementById('pdfToImgError');
var pdfToImgProgress = document.getElementById('pdfToImgProgress');
var pdfToImgPages = document.getElementById('pdfToImgPages');

var pdfPageUrls = [];

function showPdfToImgError(message) {
  pdfToImgError.textContent = message;
  pdfToImgError.hidden = false;
}

function clearPdfToImgError() {
  pdfToImgError.textContent = '';
  pdfToImgError.hidden = true;
}

function clearPdfPages() {
  pdfPageUrls.forEach(function (url) {
    URL.revokeObjectURL(url);
  });
  pdfPageUrls = [];
  pdfToImgPages.innerHTML = '';
}

function renderPdfPage(blob, pageNumber, baseName, totalPages) {
  var url = URL.createObjectURL(blob);
  pdfPageUrls.push(url);

  var item = document.createElement('div');
  item.className = 'pdf-page-item';

  var img = document.createElement('img');
  img.src = url;
  img.alt = '페이지 ' + pageNumber + ' 미리보기';

  var link = document.createElement('a');
  link.className = 'btn';
  link.href = url;
  link.download = getPageImageFilename(baseName, pageNumber, totalPages);
  link.textContent = '페이지 ' + pageNumber + ' 다운로드';

  item.appendChild(img);
  item.appendChild(link);
  pdfToImgPages.appendChild(item);
}

function renderPdfPageToBlob(pdfDoc, pageNumber) {
  return pdfDoc.getPage(pageNumber).then(function (page) {
    var viewport = page.getViewport({ scale: 2 });
    var canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    var ctx = canvas.getContext('2d');
    if (!ctx) {
      return Promise.reject(new Error('2D 캔버스 컨텍스트를 생성할 수 없습니다.'));
    }
    return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () {
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) {
            reject(new Error('페이지 ' + pageNumber + ' 이미지를 만들지 못했습니다.'));
            return;
          }
          resolve(blob);
        }, 'image/png');
      });
    });
  });
}

function processPdfFile(file) {
  clearPdfToImgError();
  clearPdfPages();
  pdfToImgProgress.hidden = false;
  pdfToImgProgress.textContent = 'PDF를 불러오는 중...';

  var baseName = getBaseFileName(file.name);
  var objectUrl = URL.createObjectURL(file);

  return pdfjsLib.getDocument(objectUrl).promise
    .catch(function () {
      URL.revokeObjectURL(objectUrl);
      throw new Error('PDF 파일을 읽을 수 없습니다.');
    })
    .then(function (pdfDoc) {
      URL.revokeObjectURL(objectUrl);

      if (!isValidPageCount(pdfDoc.numPages)) {
        throw new Error('PDF 페이지 수가 너무 많습니다 (최대 ' + MAX_PDF_PAGES + '페이지).');
      }

      var totalPages = pdfDoc.numPages;
      var pageNumbers = [];
      for (var i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }

      return pageNumbers.reduce(function (promise, pageNumber) {
        return promise.then(function () {
          pdfToImgProgress.textContent = '처리 중... (' + pageNumber + '/' + totalPages + ')';
          return renderPdfPageToBlob(pdfDoc, pageNumber);
        }).then(function (blob) {
          renderPdfPage(blob, pageNumber, baseName, totalPages);
        });
      }, Promise.resolve());
    });
}

function handlePdfFile(file) {
  if (!file) {
    return;
  }
  clearPdfToImgError();

  if (!isValidPdfFile(file)) {
    showPdfToImgError('PDF 파일만 업로드할 수 있어요.');
    return;
  }
  if (!isValidFileSize(file.size)) {
    showPdfToImgError('파일이 너무 큽니다 (최대 20MB).');
    return;
  }
  if (typeof pdfjsLib === 'undefined') {
    showPdfToImgError('PDF 처리 기능을 불러오지 못했습니다. 인터넷 연결을 확인해주세요.');
    return;
  }

  processPdfFile(file)
    .then(function () {
      pdfToImgProgress.hidden = true;
    })
    .catch(function (err) {
      pdfToImgProgress.hidden = true;
      showPdfToImgError(err.message);
    });
}

pdfToImgFileInput.addEventListener('change', function (e) {
  handlePdfFile(e.target.files[0]);
});

pdfToImgUploadArea.addEventListener('click', function (e) {
  if (e.target !== pdfToImgFileInput) {
    pdfToImgFileInput.click();
  }
});

var pdfToImgDragCounter = 0;

pdfToImgUploadArea.addEventListener('dragenter', function (e) {
  e.preventDefault();
  pdfToImgDragCounter = pdfToImgDragCounter + 1;
  pdfToImgUploadArea.classList.add('drag-over');
});

pdfToImgUploadArea.addEventListener('dragover', function (e) {
  e.preventDefault();
});

pdfToImgUploadArea.addEventListener('dragleave', function () {
  pdfToImgDragCounter = pdfToImgDragCounter - 1;
  if (pdfToImgDragCounter <= 0) {
    pdfToImgDragCounter = 0;
    pdfToImgUploadArea.classList.remove('drag-over');
  }
});

pdfToImgUploadArea.addEventListener('drop', function (e) {
  e.preventDefault();
  pdfToImgDragCounter = 0;
  pdfToImgUploadArea.classList.remove('drag-over');
  pdfToImgFileInput.value = '';
  handlePdfFile(e.dataTransfer.files[0]);
});
```

- [ ] **Step 2: 브라우저에서 전체 흐름 수동 검증**

`pdf.html`을 새로고침해서 연다.
Expected 체크리스트:
- 여러 페이지짜리 PDF를 업로드하면 "처리 중... (N/전체)" 문구가 페이지 수만큼 갱신되다가 사라지고, 페이지 수만큼 썸네일과 "페이지 N 다운로드" 버튼이 나타난다
- 각 페이지 썸네일이 실제 PDF 내용과 일치한다
- "페이지 1 다운로드"를 누르면 PNG 파일이 다운로드되고, 파일명이 `<PDF파일명>-page-01.png` 형식이다 (전체 페이지 수 자릿수에 맞춰 0이 채워짐)
- PDF가 아닌 파일(이미지 등)을 선택하면 "PDF 파일만 업로드할 수 있어요." 에러가 뜬다
- 20MB를 넘는 PDF는 크기 초과 에러가 뜬다 (모의 검증: `isValidFileSize` 유닛테스트로 대체 가능하면 실제 대용량 파일 없이도 로직 확인)
- 손상된 PDF(텍스트 파일 확장자만 `.pdf`로 바꾼 파일 등)를 업로드하면 "PDF 파일을 읽을 수 없습니다." 에러가 뜨고 멈추지 않는다
- 새 PDF를 다시 업로드하면 이전 페이지 목록과 blob URL이 정리되고 새 결과로 교체된다
- 모바일 화면 크기(개발자 도구 반응형 보기)에서 두 섹션의 레이아웃이 깨지지 않는다

- [ ] **Step 3: 커밋**

```bash
git add js/pdfApp.js
git commit -m "Implement PDF-to-image conversion"
```

---

## 이후 계획 (이번 계획 범위 밖)

워드/엑셀/파워포인트 변환은 이 계획이 배포되어 정상 동작하는 것을 확인한 뒤 별도의 계획 문서로 작성한다.
