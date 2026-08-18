# PDF → 문서(PPT/Word/Excel) 변환 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 `pdf.html`에 "PDF → 문서 변환" 섹션을 추가해, 업로드한 PDF를 PowerPoint(.pptx), Word(.docx), Excel(.xlsx) 중 선택한 형식으로 변환·다운로드할 수 있게 한다.

**Architecture:** 기존 페이지 구조(빌드 도구 없는 순수 HTML/CSS/vanilla JS, 섹션을 세로로 쌓는 방식 — 실제 탭 전환 UI는 없음)를 그대로 따른다. PDF 읽기(페이지 렌더링, 텍스트 추출)는 이미 로드 중인 pdf.js를 재사용하고, 출력 파일 생성을 위해 pptxgenjs/docx/xlsx 세 라이브러리를 CDN `<script>`로 추가한다. 텍스트 아이템을 줄/문단으로 재구성하는 순수 로직은 `js/pdfConvertTools.js`에 두고 Node로 유닛테스트하며, DOM 이벤트와 pdf.js/pptxgenjs/docx/xlsx 연동은 `js/pdfConvertApp.js`에서 그 함수들을 소비한다. 기존 `js/pdfTools.js`의 `isValidPdfFile`, `isValidFileSize`, `isValidPageCount`, `getBaseFileName`, `MAX_PDF_PAGES`를 재사용한다(중복 구현 금지).

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES5 문법 위주), Canvas API, File API, pdf.js 3.11.174(기존 재사용), pptxgenjs 4.0.1(CDN, 신규), docx 9.7.1(CDN, 신규), xlsx(SheetJS) 0.18.5(CDN, 신규). 빌드 도구 없음. 테스트는 Node.js 내장 `assert` 모듈만 사용.

## Global Constraints

- 순수 HTML/CSS/JavaScript로만 작성한다. 빌드 도구를 사용하지 않는다.
- 새 외부 라이브러리는 아래 3개만 추가하고, 모두 특정 버전으로 CDN URL과 SRI(integrity)에 고정한다("latest" 금지):
  - pptxgenjs: `https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js`, `integrity="sha384-qb0Xhi7LLYpvW1HCK6oMrmDLSY9sy7vwm6ZlV6KjtrlL9yg30+YN4neTwnmX+Kp8"` — 전역 `PptxGenJS` 생성자 노출
  - docx: `https://cdn.jsdelivr.net/npm/docx@9.7.1/dist/index.iife.js`, `integrity="sha384-9OH56uLhIvkZkwF0jWNlfpcK3gPuSy5DfEMNqKe156wCpkND+MDdtaRyd05kwpG0"` — 전역 `docx` 객체 노출(`.umd.cjs` 빌드는 jsdelivr가 `application/node` MIME으로 서빙해 `<script>` 태그로 실행되지 않으므로 반드시 `.iife.js`를 사용한다 — 브라우저에서 실제 로드해 확인함)
  - xlsx(SheetJS): `https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js`, `integrity="sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw"` — 전역 `XLSX` 객체 노출
  - 세 라이브러리 모두 `pdf.html`에서만 로드한다. `index.html`, `upscale.html`은 영향받지 않는다.
- OCR(스캔 PDF 텍스트 인식), Excel 열(칼럼) 자동 인식, Word 서식/레이아웃 복원, 역방향 변환(Office→PDF)은 이번 범위에서 제외한다.
- 파일 하나당 최대 20MB(`MAX_FILE_SIZE` 재사용), 최대 300페이지(`MAX_PDF_PAGES` 재사용) — 기존 PDF→이미지 기능과 동일한 제한을 그대로 적용한다.
- Excel 변환은 열 분리를 시도하지 않는다. 한 줄(같은 y좌표 그룹) = 한 행으로 A열에 그대로 넣는다.
- Word/Excel 선택 시 PDF 전체에서 추출한 텍스트가 `MIN_TEXT_LENGTH_FOR_CONVERSION`(20자) 미만이면 스캔 PDF로 간주해 변환을 중단하고 안내 문구를 표시한다. PPT는 이미지 기반이라 이 검사를 하지 않는다.
- 파일은 서버로 전송하지 않는다. 모든 처리는 브라우저 내부에서만 이루어진다.

---

## File Structure

- `js/pdfConvertTools.js` (신규) — 텍스트 아이템→줄/문단 변환, 스캔 여부 판별용 텍스트 길이 검사, 출력 파일명 생성 등 순수 함수
- `tests/pdfConvertTools.test.js` (신규) — 위 함수들에 대한 Node 기반 단위 테스트
- `pdf.html` (수정) — "PDF → 문서 변환" 섹션 추가, pptxgenjs/docx/xlsx CDN 스크립트 및 `js/pdfConvertTools.js`, `js/pdfConvertApp.js` 로드, FAQ/메타 설명 보강
- `js/pdfConvertApp.js` (신규) — DOM 이벤트 와이어링, pdf.js 페이지 렌더링/텍스트 추출, pptxgenjs/docx/xlsx 호출 오케스트레이션

`css/style.css`는 수정하지 않는다 — 업로드 영역·에러 메시지·라디오 그룹·진행 문구·다운로드 버튼 스타일 모두 `upscale.html`/`pdf.html`이 이미 쓰고 있는 기존 클래스(`.upload-area`, `.error-message`, `.controls`, `.upscale-mode-label`, `.upscale-mode-group`, `.radio-label`, `.pdf-progress`, `.pdf-section`, `.btn`)를 그대로 재사용한다.

---

### Task 1: PDF 텍스트 재구성 순수 함수 (`js/pdfConvertTools.js`)

**Files:**
- Create: `js/pdfConvertTools.js`
- Create: `tests/pdfConvertTools.test.js`

**Interfaces:**
- Consumes: 없음 (독립적인 순수 함수 모음)
- Produces: `hasSubstantialText(text): boolean`, `groupTextItemsIntoLines(items, yTolerance): Array<{y: number, text: string}>` (items: `Array<{str: string, x: number, y: number}>`), `groupLinesIntoParagraphs(lines, gapThreshold): string[]` (lines: `Array<{y: number, text: string}>`), `concatenatePagesLinesText(pagesLines): string` (pagesLines: `Array<Array<{y: number, text: string}>>`), `getConvertedFilename(baseName, format): string` (format: `'ppt' | 'word' | 'excel'`), `MIN_TEXT_LENGTH_FOR_CONVERSION: number`, `LINE_Y_TOLERANCE: number`, `PARAGRAPH_GAP_THRESHOLD: number`
  - Task 2, 3, 4에서 `js/pdfConvertApp.js`가 이 함수들을 전역으로 가져다 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/pdfConvertTools.test.js` 파일을 새로 만든다:

```js
const assert = require('assert');
const {
  hasSubstantialText,
  groupTextItemsIntoLines,
  groupLinesIntoParagraphs,
  concatenatePagesLinesText,
  getConvertedFilename,
  MIN_TEXT_LENGTH_FOR_CONVERSION,
  LINE_Y_TOLERANCE,
  PARAGRAPH_GAP_THRESHOLD
} = require('../js/pdfConvertTools.js');

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

test('MIN_TEXT_LENGTH_FOR_CONVERSION is 20', () => {
  assert.strictEqual(MIN_TEXT_LENGTH_FOR_CONVERSION, 20);
});

test('hasSubstantialText accepts text at/above the threshold', () => {
  assert.strictEqual(hasSubstantialText('a'.repeat(MIN_TEXT_LENGTH_FOR_CONVERSION)), true);
  assert.strictEqual(hasSubstantialText('a'.repeat(100)), true);
});

test('hasSubstantialText rejects text below the threshold', () => {
  assert.strictEqual(hasSubstantialText('a'.repeat(MIN_TEXT_LENGTH_FOR_CONVERSION - 1)), false);
  assert.strictEqual(hasSubstantialText(''), false);
  assert.strictEqual(hasSubstantialText('   '), false);
});

test('hasSubstantialText rejects non-string input', () => {
  assert.strictEqual(hasSubstantialText(null), false);
  assert.strictEqual(hasSubstantialText(undefined), false);
});

test('groupTextItemsIntoLines groups items with the same y into one line', () => {
  const items = [
    { str: 'Hello', x: 10, y: 700 },
    { str: 'World', x: 60, y: 700 }
  ];
  const lines = groupTextItemsIntoLines(items, LINE_Y_TOLERANCE);
  assert.deepStrictEqual(lines, [{ y: 700, text: 'Hello World' }]);
});

test('groupTextItemsIntoLines starts a new line when y differs beyond tolerance', () => {
  const items = [
    { str: 'Hello', x: 10, y: 700 },
    { str: 'Next', x: 10, y: 650 }
  ];
  const lines = groupTextItemsIntoLines(items, LINE_Y_TOLERANCE);
  assert.deepStrictEqual(lines, [
    { y: 700, text: 'Hello' },
    { y: 650, text: 'Next' }
  ]);
});

test('groupTextItemsIntoLines groups items within the y tolerance', () => {
  const items = [
    { str: 'Hello', x: 10, y: 700 },
    { str: 'World', x: 60, y: 701 }
  ];
  const lines = groupTextItemsIntoLines(items, 3);
  assert.deepStrictEqual(lines, [{ y: 700, text: 'Hello World' }]);
});

test('groupTextItemsIntoLines filters out lines that are empty after trimming', () => {
  const items = [
    { str: '   ', x: 10, y: 700 },
    { str: 'Real text', x: 10, y: 650 }
  ];
  const lines = groupTextItemsIntoLines(items, LINE_Y_TOLERANCE);
  assert.deepStrictEqual(lines, [{ y: 650, text: 'Real text' }]);
});

test('groupTextItemsIntoLines returns an empty array for no items', () => {
  assert.deepStrictEqual(groupTextItemsIntoLines([], LINE_Y_TOLERANCE), []);
});

test('groupLinesIntoParagraphs merges lines within the gap threshold', () => {
  const lines = [
    { y: 700, text: 'a' },
    { y: 688, text: 'b' },
    { y: 600, text: 'c' }
  ];
  assert.deepStrictEqual(groupLinesIntoParagraphs(lines, 20), ['a b', 'c']);
});

test('groupLinesIntoParagraphs returns an empty array for no lines', () => {
  assert.deepStrictEqual(groupLinesIntoParagraphs([], PARAGRAPH_GAP_THRESHOLD), []);
});

test('concatenatePagesLinesText joins all lines across all pages with spaces', () => {
  const pagesLines = [
    [{ y: 700, text: 'Hello' }],
    [{ y: 700, text: 'World' }]
  ];
  assert.strictEqual(concatenatePagesLinesText(pagesLines), 'Hello World');
});

test('concatenatePagesLinesText returns an empty string for no pages', () => {
  assert.strictEqual(concatenatePagesLinesText([]), '');
});

test('getConvertedFilename appends the correct extension per format', () => {
  assert.strictEqual(getConvertedFilename('report', 'ppt'), 'report.pptx');
  assert.strictEqual(getConvertedFilename('report', 'word'), 'report.docx');
  assert.strictEqual(getConvertedFilename('report', 'excel'), 'report.xlsx');
});

test('getConvertedFilename throws for an unknown format', () => {
  assert.throws(() => getConvertedFilename('report', 'unknown'));
});

if (process.exitCode !== 1) {
  console.log('\n모든 테스트 통과');
}
```

- [ ] **Step 2: 테스트 실행해서 실패하는지 확인**

Run: `node tests/pdfConvertTools.test.js`
Expected: `Cannot find module '../js/pdfConvertTools.js'` 에러로 실패

- [ ] **Step 3: 구현 작성**

`js/pdfConvertTools.js` 파일을 새로 만든다:

```js
(function (exports) {
  var MIN_TEXT_LENGTH_FOR_CONVERSION = 20;
  var LINE_Y_TOLERANCE = 3;
  var PARAGRAPH_GAP_THRESHOLD = 20;
  var FORMAT_EXTENSIONS = { ppt: 'pptx', word: 'docx', excel: 'xlsx' };

  function hasSubstantialText(text) {
    return typeof text === 'string' && text.trim().length >= MIN_TEXT_LENGTH_FOR_CONVERSION;
  }

  function groupTextItemsIntoLines(items, yTolerance) {
    var lines = [];
    var current = null;

    items.forEach(function (item) {
      if (current === null || Math.abs(item.y - current.y) > yTolerance) {
        if (current !== null) {
          lines.push(current);
        }
        current = { y: item.y, parts: [item.str] };
      } else {
        current.parts.push(item.str);
      }
    });

    if (current !== null) {
      lines.push(current);
    }

    return lines
      .map(function (line) {
        return { y: line.y, text: line.parts.join(' ').replace(/\s+/g, ' ').trim() };
      })
      .filter(function (line) {
        return line.text.length > 0;
      });
  }

  function groupLinesIntoParagraphs(lines, gapThreshold) {
    var paragraphs = [];
    var current = [];
    var previousY = null;

    lines.forEach(function (line) {
      if (previousY !== null && Math.abs(previousY - line.y) > gapThreshold) {
        paragraphs.push(current.join(' '));
        current = [];
      }
      current.push(line.text);
      previousY = line.y;
    });

    if (current.length > 0) {
      paragraphs.push(current.join(' '));
    }

    return paragraphs;
  }

  function concatenatePagesLinesText(pagesLines) {
    return pagesLines
      .map(function (lines) {
        return lines.map(function (line) { return line.text; }).join(' ');
      })
      .join(' ')
      .trim();
  }

  function getConvertedFilename(baseName, format) {
    var extension = FORMAT_EXTENSIONS[format];
    if (!extension) {
      throw new Error('지원하지 않는 변환 형식입니다: ' + format);
    }
    return baseName + '.' + extension;
  }

  exports.MIN_TEXT_LENGTH_FOR_CONVERSION = MIN_TEXT_LENGTH_FOR_CONVERSION;
  exports.LINE_Y_TOLERANCE = LINE_Y_TOLERANCE;
  exports.PARAGRAPH_GAP_THRESHOLD = PARAGRAPH_GAP_THRESHOLD;
  exports.hasSubstantialText = hasSubstantialText;
  exports.groupTextItemsIntoLines = groupTextItemsIntoLines;
  exports.groupLinesIntoParagraphs = groupLinesIntoParagraphs;
  exports.concatenatePagesLinesText = concatenatePagesLinesText;
  exports.getConvertedFilename = getConvertedFilename;
})(typeof module !== 'undefined' ? module.exports : window);
```

- [ ] **Step 4: 테스트 실행해서 통과하는지 확인**

Run: `node tests/pdfConvertTools.test.js`
Expected: 모든 테스트가 `PASS`로 출력되고, 마지막 줄에 `모든 테스트 통과` 출력, exit code 0

- [ ] **Step 5: 커밋**

```bash
git add js/pdfConvertTools.js tests/pdfConvertTools.test.js
git commit -m "Add PDF text-to-paragraph/line pure functions for document conversion"
```

---

### Task 2: `pdf.html` 마크업 + CDN 라이브러리 + PPT 변환

**Files:**
- Modify: `pdf.html`
- Create: `js/pdfConvertApp.js`

**Interfaces:**
- Consumes: `isValidPdfFile`, `isValidFileSize`, `isValidPageCount`, `getBaseFileName`, `MAX_PDF_PAGES`(기존 `js/pdfTools.js`), `getConvertedFilename`(Task 1의 `js/pdfConvertTools.js`), 전역 `pdfjsLib`(기존 CDN), 전역 `PptxGenJS`(신규 CDN)
- Produces:
  - DOM 엘리먼트 id: `pdfConvertUploadArea`, `pdfConvertFileInput`, `pdfConvertError`, `pdfConvertControls`, `pdfConvertBtn`, `pdfConvertProgress`, `pdfConvertDownloadBtn`, 라디오 그룹 `name="pdfConvertFormat"`(값 `ppt`/`word`/`excel`)
  - 함수: `runPdfConversion(pdfDoc, totalPages, format): Promise<Blob>`, `isPdfConvertLibraryLoaded(format): boolean` — Task 3, 4에서 이 두 함수를 수정해 word/excel 분기를 추가한다.

- [ ] **Step 1: `pdf.html`에 "PDF → 문서 변환" 섹션 추가**

`pdf.html`에서 `<section class="info-section">`(자주 묻는 질문) 바로 앞, 즉 기존 "PDF → 이미지" `<section class="pdf-section">`이 끝나는 지점(`</section>` 다음 줄) 뒤에 아래 섹션을 추가한다:

```html
    <section class="pdf-section">
      <h2>PDF → 문서 변환</h2>
      <section class="upload-area" id="pdfConvertUploadArea">
        <input type="file" id="pdfConvertFileInput" class="visually-hidden" accept="application/pdf,.pdf">
        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3v12"></path>
          <path d="M7 8l5-5 5 5"></path>
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path>
        </svg>
        <button type="button" class="upload-btn">PDF 파일 선택</button>
        <p class="upload-hint">또는 파일을 이 영역에 끌어다 놓으세요</p>
        <p class="upload-formats">PDF 지원 · 최대 20MB · 최대 300페이지</p>
        <div id="pdfConvertError" class="error-message" hidden></div>
      </section>

      <section class="controls" id="pdfConvertControls" hidden>
        <p class="upscale-mode-label">출력 형식 선택</p>
        <div class="upscale-mode-group">
          <label class="radio-label">
            <input type="radio" name="pdfConvertFormat" value="ppt" checked>
            PowerPoint (.pptx)
          </label>
          <label class="radio-label">
            <input type="radio" name="pdfConvertFormat" value="word">
            Word (.docx)
          </label>
          <label class="radio-label">
            <input type="radio" name="pdfConvertFormat" value="excel">
            Excel (.xlsx)
          </label>
        </div>
        <button id="pdfConvertBtn">변환하기</button>
      </section>

      <p id="pdfConvertProgress" class="pdf-progress" hidden></p>
      <a id="pdfConvertDownloadBtn" class="btn" href="#" download hidden>변환된 파일 다운로드</a>
    </section>
```

- [ ] **Step 2: CDN 스크립트와 신규 JS 파일 로드 추가**

`pdf.html`에서 기존 마지막 스크립트 줄:

```html
  <script src="js/imageTools.js"></script>
  <script src="js/pdfTools.js"></script>
  <script src="js/pdfApp.js"></script>
</body>
```

다음으로 교체:

```html
  <script src="js/imageTools.js"></script>
  <script src="js/pdfTools.js"></script>
  <script src="js/pdfApp.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js" integrity="sha384-qb0Xhi7LLYpvW1HCK6oMrmDLSY9sy7vwm6ZlV6KjtrlL9yg30+YN4neTwnmX+Kp8" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/docx@9.7.1/dist/index.iife.js" integrity="sha384-9OH56uLhIvkZkwF0jWNlfpcK3gPuSy5DfEMNqKe156wCpkND+MDdtaRyd05kwpG0" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" integrity="sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw" crossorigin="anonymous"></script>
  <script src="js/pdfConvertTools.js"></script>
  <script src="js/pdfConvertApp.js"></script>
</body>
```

- [ ] **Step 3: `js/pdfConvertApp.js` 생성 (업로드/검증 와이어링 + PPT 변환)**

```js
// PDF → 문서 변환 (PPT/Word/Excel) 이벤트 와이어링

var pdfConvertUploadArea = document.getElementById('pdfConvertUploadArea');
var pdfConvertFileInput = document.getElementById('pdfConvertFileInput');
var pdfConvertError = document.getElementById('pdfConvertError');
var pdfConvertControls = document.getElementById('pdfConvertControls');
var pdfConvertBtn = document.getElementById('pdfConvertBtn');
var pdfConvertProgress = document.getElementById('pdfConvertProgress');
var pdfConvertDownloadBtn = document.getElementById('pdfConvertDownloadBtn');

var selectedPdfConvertFile = null;
var lastPdfConvertUrl = null;
var isConvertingPdf = false;

function showPdfConvertError(message) {
  pdfConvertError.textContent = message;
  pdfConvertError.hidden = false;
}

function clearPdfConvertError() {
  pdfConvertError.textContent = '';
  pdfConvertError.hidden = true;
}

function getSelectedPdfConvertFormat() {
  return document.querySelector('input[name="pdfConvertFormat"]:checked').value;
}

function handlePdfConvertFile(file) {
  clearPdfConvertError();
  pdfConvertControls.hidden = true;
  pdfConvertDownloadBtn.hidden = true;
  if (lastPdfConvertUrl) {
    URL.revokeObjectURL(lastPdfConvertUrl);
    lastPdfConvertUrl = null;
  }
  pdfConvertDownloadBtn.removeAttribute('href');
  selectedPdfConvertFile = null;

  if (!file) {
    return;
  }

  if (!isValidPdfFile(file)) {
    showPdfConvertError('PDF 파일만 업로드할 수 있어요.');
    return;
  }
  if (!isValidFileSize(file.size)) {
    showPdfConvertError('파일이 너무 큽니다 (최대 20MB).');
    return;
  }

  selectedPdfConvertFile = file;
  pdfConvertControls.hidden = false;
}

pdfConvertFileInput.addEventListener('change', function (e) {
  handlePdfConvertFile(e.target.files[0]);
});

pdfConvertUploadArea.addEventListener('click', function (e) {
  if (e.target !== pdfConvertFileInput) {
    pdfConvertFileInput.click();
  }
});

var pdfConvertDragCounter = 0;

pdfConvertUploadArea.addEventListener('dragenter', function (e) {
  e.preventDefault();
  pdfConvertDragCounter = pdfConvertDragCounter + 1;
  pdfConvertUploadArea.classList.add('drag-over');
});

pdfConvertUploadArea.addEventListener('dragover', function (e) {
  e.preventDefault();
});

pdfConvertUploadArea.addEventListener('dragleave', function () {
  pdfConvertDragCounter = pdfConvertDragCounter - 1;
  if (pdfConvertDragCounter <= 0) {
    pdfConvertDragCounter = 0;
    pdfConvertUploadArea.classList.remove('drag-over');
  }
});

pdfConvertUploadArea.addEventListener('drop', function (e) {
  e.preventDefault();
  pdfConvertDragCounter = 0;
  pdfConvertUploadArea.classList.remove('drag-over');
  pdfConvertFileInput.value = '';
  handlePdfConvertFile(e.dataTransfer.files[0]);
});

function renderPdfConvertPageToImage(pdfDoc, pageNumber, renderScale) {
  return pdfDoc.getPage(pageNumber).then(function (page) {
    var basePt = page.getViewport({ scale: 1 });
    var viewport = page.getViewport({ scale: renderScale });
    var canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    var ctx = canvas.getContext('2d');
    if (!ctx) {
      return Promise.reject(new Error('2D 캔버스 컨텍스트를 생성할 수 없습니다.'));
    }
    return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () {
      return {
        dataUrl: canvas.toDataURL('image/png'),
        widthIn: basePt.width / 72,
        heightIn: basePt.height / 72
      };
    });
  });
}

function convertPdfToPptx(pdfDoc, totalPages) {
  var pptx = new PptxGenJS();
  var pageNumbers = [];
  for (var i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return pageNumbers.reduce(function (promise, pageNumber) {
    return promise.then(function () {
      pdfConvertProgress.textContent = '처리 중... (' + pageNumber + '/' + totalPages + ')';
      return renderPdfConvertPageToImage(pdfDoc, pageNumber, 2);
    }).then(function (page) {
      if (pageNumber === 1) {
        pptx.defineLayout({ name: 'PDF_CONVERT_LAYOUT', width: page.widthIn, height: page.heightIn });
        pptx.layout = 'PDF_CONVERT_LAYOUT';
      }
      var slide = pptx.addSlide();
      slide.addImage({ data: page.dataUrl, x: 0, y: 0, w: page.widthIn, h: page.heightIn });
    });
  }, Promise.resolve()).then(function () {
    return pptx.write({ outputType: 'blob' });
  });
}

function runPdfConversion(pdfDoc, totalPages, format) {
  if (format === 'ppt') {
    return convertPdfToPptx(pdfDoc, totalPages);
  }
  return Promise.reject(new Error('아직 지원하지 않는 형식입니다: ' + format));
}

function isPdfConvertLibraryLoaded(format) {
  if (format === 'ppt') {
    return typeof PptxGenJS !== 'undefined';
  }
  if (format === 'word') {
    return typeof docx !== 'undefined';
  }
  if (format === 'excel') {
    return typeof XLSX !== 'undefined';
  }
  return false;
}

pdfConvertBtn.addEventListener('click', function () {
  if (!selectedPdfConvertFile || isConvertingPdf) {
    return;
  }
  clearPdfConvertError();

  var format = getSelectedPdfConvertFormat();

  if (typeof pdfjsLib === 'undefined' || !isPdfConvertLibraryLoaded(format)) {
    showPdfConvertError('문서 변환 기능을 불러오지 못했습니다. 인터넷 연결을 확인해주세요.');
    return;
  }

  isConvertingPdf = true;
  pdfConvertBtn.disabled = true;
  pdfConvertBtn.textContent = '변환 중...';
  pdfConvertProgress.hidden = false;
  pdfConvertProgress.textContent = 'PDF를 불러오는 중...';
  pdfConvertDownloadBtn.hidden = true;

  var baseName = getBaseFileName(selectedPdfConvertFile.name);
  var objectUrl = URL.createObjectURL(selectedPdfConvertFile);

  pdfjsLib.getDocument(objectUrl).promise
    .catch(function () {
      URL.revokeObjectURL(objectUrl);
      throw new Error('PDF 파일을 읽을 수 없습니다.');
    })
    .then(function (pdfDoc) {
      URL.revokeObjectURL(objectUrl);

      if (!isValidPageCount(pdfDoc.numPages)) {
        throw new Error('PDF 페이지 수가 너무 많습니다 (최대 ' + MAX_PDF_PAGES + '페이지).');
      }

      return runPdfConversion(pdfDoc, pdfDoc.numPages, format);
    })
    .then(function (blob) {
      if (lastPdfConvertUrl) {
        URL.revokeObjectURL(lastPdfConvertUrl);
      }
      lastPdfConvertUrl = URL.createObjectURL(blob);
      pdfConvertDownloadBtn.href = lastPdfConvertUrl;
      pdfConvertDownloadBtn.download = getConvertedFilename(baseName, format);
      pdfConvertDownloadBtn.hidden = false;
    })
    .catch(function (err) {
      showPdfConvertError(err.message);
    })
    .then(function () {
      isConvertingPdf = false;
      pdfConvertBtn.disabled = false;
      pdfConvertBtn.textContent = '변환하기';
      pdfConvertProgress.hidden = true;
    });
});
```

- [ ] **Step 4: 브라우저에서 수동 검증**

`pdf.html`을 새로고침해서 연다.
Expected 체크리스트:
- 개발자 도구 콘솔(F12)에 스크립트 로드 에러가 없다(`typeof PptxGenJS`, `typeof docx`, `typeof XLSX`가 콘솔에서 각각 `"function"`/`"object"`/`"object"`로 나온다)
- "PDF → 문서 변환" 섹션에 PDF를 업로드하면 "출력 형식 선택"(PowerPoint 기본 선택)과 "변환하기" 버튼이 나타난다
- PowerPoint가 선택된 채로 "변환하기"를 누르면 "처리 중... (N/전체)" 문구가 갱신되다가 "변환된 파일 다운로드" 버튼이 나타난다
- 다운로드한 `.pptx` 파일을 PowerPoint나 Google Slides에서 열면, 슬라이드 수가 PDF 페이지 수와 같고 각 슬라이드에 해당 페이지 이미지가 꽉 차게 들어가 있다
- Word 또는 Excel을 선택하고 "변환하기"를 누르면 "아직 지원하지 않는 형식입니다: word"(또는 excel) 에러가 뜬다 — Task 3, 4에서 구현 전까지는 정상
- PDF가 아닌 파일이나 20MB 초과 파일을 선택하면 각각의 에러 메시지가 뜨고 진행되지 않는다

- [ ] **Step 5: 커밋**

```bash
git add pdf.html js/pdfConvertApp.js
git commit -m "Add PDF-to-document section markup and PDF-to-PPTX conversion"
```

---

### Task 3: PDF → Word 변환

**Files:**
- Modify: `js/pdfConvertApp.js`

**Interfaces:**
- Consumes: `groupTextItemsIntoLines`, `groupLinesIntoParagraphs`, `concatenatePagesLinesText`, `hasSubstantialText`, `LINE_Y_TOLERANCE`, `PARAGRAPH_GAP_THRESHOLD`(Task 1의 `js/pdfConvertTools.js`), Task 2의 `pdfConvertProgress`, `runPdfConversion`, 전역 `docx`(CDN)
- Produces: `extractPdfConvertPagesLines(pdfDoc, totalPages): Promise<Array<Array<{y, text}>>>` — Task 4에서 그대로 재사용한다.

- [ ] **Step 1: 텍스트 추출 헬퍼와 Word 변환 함수 추가**

`js/pdfConvertApp.js`의 `function convertPdfToPptx(...) { ... }` 함수 정의 다음, `function runPdfConversion(...)` 정의 앞에 추가:

```js
function extractPdfConvertPageLines(pdfDoc, pageNumber) {
  return pdfDoc.getPage(pageNumber).then(function (page) {
    return page.getTextContent();
  }).then(function (textContent) {
    var items = textContent.items.map(function (item) {
      return { str: item.str, x: item.transform[4], y: item.transform[5] };
    });
    return groupTextItemsIntoLines(items, LINE_Y_TOLERANCE);
  });
}

function extractPdfConvertPagesLines(pdfDoc, totalPages) {
  var pageNumbers = [];
  for (var i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }
  var pagesLines = [];

  return pageNumbers.reduce(function (promise, pageNumber) {
    return promise.then(function () {
      pdfConvertProgress.textContent = '텍스트를 읽는 중... (' + pageNumber + '/' + totalPages + ')';
      return extractPdfConvertPageLines(pdfDoc, pageNumber);
    }).then(function (lines) {
      pagesLines.push(lines);
    });
  }, Promise.resolve()).then(function () {
    return pagesLines;
  });
}

function convertPdfToDocx(pagesLines) {
  var docChildren = [];

  pagesLines.forEach(function (lines, pageIndex) {
    var paragraphs = groupLinesIntoParagraphs(lines, PARAGRAPH_GAP_THRESHOLD);
    paragraphs.forEach(function (text, paragraphIndex) {
      docChildren.push(new docx.Paragraph({
        children: [new docx.TextRun(text)],
        pageBreakBefore: paragraphIndex === 0 && pageIndex > 0
      }));
    });
  });

  var doc = new docx.Document({
    sections: [{ properties: {}, children: docChildren }]
  });

  return docx.Packer.toBlob(doc);
}
```

- [ ] **Step 2: `runPdfConversion`에 word 분기 추가**

`js/pdfConvertApp.js`에서 기존:

```js
function runPdfConversion(pdfDoc, totalPages, format) {
  if (format === 'ppt') {
    return convertPdfToPptx(pdfDoc, totalPages);
  }
  return Promise.reject(new Error('아직 지원하지 않는 형식입니다: ' + format));
}
```

다음으로 교체:

```js
function runPdfConversion(pdfDoc, totalPages, format) {
  if (format === 'ppt') {
    return convertPdfToPptx(pdfDoc, totalPages);
  }
  if (format === 'word') {
    return extractPdfConvertPagesLines(pdfDoc, totalPages).then(function (pagesLines) {
      if (!hasSubstantialText(concatenatePagesLinesText(pagesLines))) {
        throw new Error('이 PDF는 텍스트가 없는 스캔본으로 보입니다. PPT 변환을 이용해주세요.');
      }
      return convertPdfToDocx(pagesLines);
    });
  }
  return Promise.reject(new Error('아직 지원하지 않는 형식입니다: ' + format));
}
```

- [ ] **Step 3: 브라우저에서 수동 검증**

`pdf.html`을 새로고침해서 연다.
Expected 체크리스트:
- 텍스트 위주의 여러 페이지짜리 PDF를 업로드하고 Word를 선택해 "변환하기"를 누르면 "텍스트를 읽는 중... (N/전체)" 문구가 갱신되다가 "변환된 파일 다운로드" 버튼이 나타난다
- 다운로드한 `.docx` 파일을 Word나 한글에서 열면, 원문 텍스트가 문단으로 나뉘어 들어가 있고 원본 페이지 경계마다 새 페이지로 넘어간다
- 이미지로만 스캔된 PDF(텍스트 레이어 없음)를 업로드하고 Word를 선택하면 "이 PDF는 텍스트가 없는 스캔본으로 보입니다. PPT 변환을 이용해주세요." 에러가 뜨고 다운로드 버튼이 나타나지 않는다
- 같은 스캔 PDF를 PPT로 변환하면 정상적으로 진행된다(Word/Excel에서만 스캔 검사를 한다)
- Excel을 선택하고 "변환하기"를 누르면 여전히 "아직 지원하지 않는 형식입니다: excel" 에러가 뜬다 — Task 4에서 구현 전까지는 정상

- [ ] **Step 4: 커밋**

```bash
git add js/pdfConvertApp.js
git commit -m "Implement PDF-to-Word (docx) conversion with scanned-PDF detection"
```

---

### Task 4: PDF → Excel 변환

**Files:**
- Modify: `js/pdfConvertApp.js`

**Interfaces:**
- Consumes: `extractPdfConvertPagesLines`(Task 3), `hasSubstantialText`, `concatenatePagesLinesText`(Task 1), 전역 `XLSX`(CDN)
- Produces: 없음 (이 페이지의 종단 기능)

- [ ] **Step 1: Excel 변환 함수 추가**

`js/pdfConvertApp.js`의 `function convertPdfToDocx(...) { ... }` 함수 정의 다음, `function runPdfConversion(...)` 정의 앞에 추가:

```js
function convertPdfToXlsx(pagesLines) {
  var rows = [];

  pagesLines.forEach(function (lines, pageIndex) {
    if (pageIndex > 0) {
      rows.push(['']);
    }
    lines.forEach(function (line) {
      rows.push([line.text]);
    });
  });

  var worksheet = XLSX.utils.aoa_to_sheet(rows);
  var workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  var arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([arrayBuffer], { type: 'application/octet-stream' });
}
```

- [ ] **Step 2: `runPdfConversion`에 excel 분기 추가**

`js/pdfConvertApp.js`에서 기존:

```js
function runPdfConversion(pdfDoc, totalPages, format) {
  if (format === 'ppt') {
    return convertPdfToPptx(pdfDoc, totalPages);
  }
  if (format === 'word') {
    return extractPdfConvertPagesLines(pdfDoc, totalPages).then(function (pagesLines) {
      if (!hasSubstantialText(concatenatePagesLinesText(pagesLines))) {
        throw new Error('이 PDF는 텍스트가 없는 스캔본으로 보입니다. PPT 변환을 이용해주세요.');
      }
      return convertPdfToDocx(pagesLines);
    });
  }
  return Promise.reject(new Error('아직 지원하지 않는 형식입니다: ' + format));
}
```

다음으로 교체:

```js
function runPdfConversion(pdfDoc, totalPages, format) {
  if (format === 'ppt') {
    return convertPdfToPptx(pdfDoc, totalPages);
  }
  if (format === 'word' || format === 'excel') {
    return extractPdfConvertPagesLines(pdfDoc, totalPages).then(function (pagesLines) {
      if (!hasSubstantialText(concatenatePagesLinesText(pagesLines))) {
        throw new Error('이 PDF는 텍스트가 없는 스캔본으로 보입니다. PPT 변환을 이용해주세요.');
      }
      if (format === 'word') {
        return convertPdfToDocx(pagesLines);
      }
      return convertPdfToXlsx(pagesLines);
    });
  }
  return Promise.reject(new Error('지원하지 않는 형식입니다: ' + format));
}
```

- [ ] **Step 3: 브라우저에서 전체 흐름 수동 검증**

`pdf.html`을 새로고침해서 연다.
Expected 체크리스트:
- 표가 포함된 PDF를 업로드하고 Excel을 선택해 "변환하기"를 누르면 "변환된 파일 다운로드" 버튼이 나타난다
- 다운로드한 `.xlsx` 파일을 Excel이나 구글 시트에서 열면, 원문의 각 줄이 A열에 한 행씩 순서대로 들어가 있고(열 분리 없음), 페이지가 바뀌는 지점에는 빈 행이 하나 있다
- 스캔 PDF에 Excel을 선택하면 Word와 동일하게 스캔본 안내 에러가 뜨고 진행되지 않는다
- 같은 PDF 파일을 새로 업로드해 PPT → Word → Excel 순서로 형식을 바꿔가며 변환해도 이전 결과의 blob URL이 정리되고 매번 올바른 새 파일이 다운로드된다(개발자 도구에서 이전 blob URL이 더 이상 유효하지 않음을 확인)
- 모바일 화면 크기(개발자 도구 반응형 보기)에서 새 섹션의 레이아웃이 깨지지 않는다

- [ ] **Step 4: 커밋**

```bash
git add js/pdfConvertApp.js
git commit -m "Implement PDF-to-Excel (xlsx) conversion"
```

---

### Task 5: SEO 메타데이터/FAQ 보강

**Files:**
- Modify: `pdf.html`

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (콘텐츠 전용 변경)

- [ ] **Step 1: `<title>`, 메타 설명, OG 태그 갱신**

`pdf.html`에서 기존:

```html
  <title>무료 PDF 변환 도구 - 이미지를 PDF로, PDF를 이미지로</title>
```

다음으로 교체:

```html
  <title>무료 PDF 변환 도구 - 이미지·PPT·Word·Excel로 변환</title>
```

기존:

```html
  <meta name="description" content="이미지를 PDF로 합치거나 PDF 페이지를 이미지로 추출하는 무료 온라인 도구. 서버 전송 없이 브라우저에서 바로 변환.">
```

다음으로 교체:

```html
  <meta name="description" content="이미지를 PDF로 합치거나 PDF를 이미지·PowerPoint·Word·Excel로 변환하는 무료 온라인 도구. 서버 전송 없이 브라우저에서 바로 변환.">
```

기존:

```html
  <meta property="og:title" content="무료 PDF 변환 도구 - 이미지를 PDF로, PDF를 이미지로">
  <meta property="og:description" content="이미지를 PDF로 합치거나 PDF 페이지를 이미지로 추출하는 무료 온라인 도구.">
```

다음으로 교체:

```html
  <meta property="og:title" content="무료 PDF 변환 도구 - 이미지·PPT·Word·Excel로 변환">
  <meta property="og:description" content="이미지를 PDF로 합치거나 PDF를 이미지·PowerPoint·Word·Excel로 변환하는 무료 온라인 도구.">
```

- [ ] **Step 2: `SoftwareApplication` JSON-LD 설명 갱신**

기존:

```html
    "name": "PDF 변환 도구",
    "url": "https://nwb010118.github.io/image-toolbox/pdf.html",
    "description": "이미지를 PDF로 합치거나 PDF 페이지를 이미지로 추출하는 무료 온라인 도구. 서버 전송 없이 브라우저에서 바로 변환.",
```

다음으로 교체:

```html
    "name": "PDF 변환 도구",
    "url": "https://nwb010118.github.io/image-toolbox/pdf.html",
    "description": "이미지를 PDF로 합치거나 PDF를 이미지·PowerPoint·Word·Excel로 변환하는 무료 온라인 도구. 서버 전송 없이 브라우저에서 바로 변환.",
```

- [ ] **Step 3: `FAQPage` JSON-LD에 항목 2개 추가**

기존 `FAQPage`의 `mainEntity` 배열에서 마지막 항목("설치나 가입 없이 바로 쓸 수 있나요?") 앞, 즉 기존:

```html
      {
        "@type": "Question",
        "name": "스캔한 문서 이미지를 PDF로 만들 수 있나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "네. 스캔본이나 사진으로 찍은 문서 이미지를 여러 장 선택해 순서대로 하나의 PDF로 합칠 수 있습니다."
        }
      },
      {
        "@type": "Question",
        "name": "설치나 가입 없이 바로 쓸 수 있나요?",
```

다음으로 교체:

```html
      {
        "@type": "Question",
        "name": "스캔한 문서 이미지를 PDF로 만들 수 있나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "네. 스캔본이나 사진으로 찍은 문서 이미지를 여러 장 선택해 순서대로 하나의 PDF로 합칠 수 있습니다."
        }
      },
      {
        "@type": "Question",
        "name": "PDF를 PowerPoint나 Word, Excel로 변환할 수 있나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "네. PDF → 문서 변환 섹션에서 PDF를 업로드하고 PowerPoint(.pptx), Word(.docx), Excel(.xlsx) 중 원하는 형식을 선택해 변환할 수 있습니다. PowerPoint는 각 페이지를 이미지로, Word는 텍스트를 문단으로, Excel은 텍스트를 줄 단위로 담습니다."
        }
      },
      {
        "@type": "Question",
        "name": "스캔한 문서(사진으로 찍은 PDF)도 Word나 Excel로 변환되나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "텍스트 레이어가 없는 스캔본은 Word/Excel 변환이 지원되지 않으며, 안내 문구와 함께 변환이 중단됩니다. 이 경우 PowerPoint 변환(페이지를 이미지로 저장)을 이용해주세요."
        }
      },
      {
        "@type": "Question",
        "name": "설치나 가입 없이 바로 쓸 수 있나요?",
```

- [ ] **Step 4: 화면에 보이는 FAQ에도 동일한 항목 2개 추가**

`<section class="info-section">` 안, 기존:

```html
      <details>
        <summary>스캔한 문서 이미지를 PDF로 만들 수 있나요?</summary>
        <p>네. 스캔본이나 사진으로 찍은 문서 이미지를 여러 장 선택해 순서대로 하나의 PDF로 합칠 수 있습니다.</p>
      </details>
      <details>
        <summary>설치나 가입 없이 바로 쓸 수 있나요?</summary>
```

다음으로 교체:

```html
      <details>
        <summary>스캔한 문서 이미지를 PDF로 만들 수 있나요?</summary>
        <p>네. 스캔본이나 사진으로 찍은 문서 이미지를 여러 장 선택해 순서대로 하나의 PDF로 합칠 수 있습니다.</p>
      </details>
      <details>
        <summary>PDF를 PowerPoint나 Word, Excel로 변환할 수 있나요?</summary>
        <p>네. PDF → 문서 변환 섹션에서 PDF를 업로드하고 PowerPoint(.pptx), Word(.docx), Excel(.xlsx) 중 원하는 형식을 선택해 변환할 수 있습니다. PowerPoint는 각 페이지를 이미지로, Word는 텍스트를 문단으로, Excel은 텍스트를 줄 단위로 담습니다.</p>
      </details>
      <details>
        <summary>스캔한 문서(사진으로 찍은 PDF)도 Word나 Excel로 변환되나요?</summary>
        <p>텍스트 레이어가 없는 스캔본은 Word/Excel 변환이 지원되지 않으며, 안내 문구와 함께 변환이 중단됩니다. 이 경우 PowerPoint 변환(페이지를 이미지로 저장)을 이용해주세요.</p>
      </details>
      <details>
        <summary>설치나 가입 없이 바로 쓸 수 있나요?</summary>
```

- [ ] **Step 5: 수동 확인**

`pdf.html`을 브라우저로 열어 새로 추가한 FAQ 2개가 화면 하단 "자주 묻는 질문"에 보이는지 확인한다.
브라우저 개발자 도구에서 두 `<script type="application/ld+json">` 블록을 각각 `JSON.parse`해서 문법 오류가 없는지 확인한다(콘솔에서 `JSON.parse(document.querySelectorAll('script[type="application/ld+json"]')[1].textContent)` 실행 시 에러 없이 객체가 반환되어야 한다).

- [ ] **Step 6: 커밋**

```bash
git add pdf.html
git commit -m "Update PDF page SEO metadata and FAQ for document conversion"
```

---

## 이후 계획 (이번 계획 범위 밖)

OCR 기반 스캔 PDF 지원, Excel 표(열) 자동 인식, Word 서식/레이아웃 복원은 이번 계획이 배포되어 정상 동작하는 것을 확인한 뒤 필요성이 확인되면 별도의 계획 문서로 작성한다.
