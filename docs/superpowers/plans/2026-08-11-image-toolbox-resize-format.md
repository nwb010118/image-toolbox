# 이미지 리사이즈·포맷 변환 (1단계) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 이미지 압축 도구에 리사이즈(가로/세로 픽셀 지정, 비율 유지)와 출력 포맷 변환(JPG/PNG/WebP) 기능을 추가한다.

**Architecture:** 기존 0단계 MVP와 동일하게 빌드 도구 없는 순수 HTML/CSS/JavaScript 정적 사이트를 유지한다. 리사이즈 치수 계산과 포맷/확장자 결정 로직은 `js/imageTools.js`에 순수 함수로 추가해 Node로 단위 테스트하고, 캔버스 렌더링과 DOM 와이어링은 `js/app.js`에서 그 순수 함수들을 소비한다. 기존 `compressImage`는 리사이즈·포맷을 함께 처리하도록 `processImage`로 확장한다. 캔버스 메모리 폭주를 막기 위해 리사이즈 가능 범위를 1~8000px로 제한한다(스펙에는 없는 구현 차원의 안전장치).

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES5 문법 위주), Canvas API, File API. 빌드 도구·프레임워크·외부 CDN 라이브러리 없음. 테스트는 Node.js 내장 `assert` 모듈만 사용.

## Global Constraints

- 순수 HTML/CSS/JavaScript로만 작성한다. React 등 프레임워크를 사용하지 않는다. (스펙: 기술 스택)
- 빌드 도구를 사용하지 않는다 (webpack/vite 등 없음). (스펙: 기술 스택)
- 외부 라이브러리는 CDN 포함 사용하지 않는다. 순정 Web API(Canvas, File API)만 사용한다. (스펙: 기술 스택)
- 이미지 파일은 절대 서버로 전송하지 않는다. 모든 처리는 브라우저 내부에서만 이루어진다. (스펙: 핵심 기능)
- 유료 API를 사용하지 않는다. (스펙: 배경 및 목표)
- 이 계획의 범위는 스펙 로드맵의 "1단계" 중 **리사이즈, 포맷 변환**까지다. 배치 처리(다중 파일)와 SEO 콘텐츠, 광고는 별도 계획에서 다룬다 — 배치 처리는 UI 구조 자체가 크게 달라지는 독립적인 하위 시스템이라 이번 계획에 포함하지 않는다. (스펙: 로드맵)
- 리사이즈 가능 범위는 1~8000px로 제한한다 (구현 안전장치, 스펙에 명시되지 않음).

---

## File Structure

- `js/imageTools.js` — (수정) 리사이즈 치수 계산, 출력 포맷/확장자 결정 순수 함수 추가
- `tests/imageTools.test.js` — (수정) 위 함수들에 대한 Node 기반 단위 테스트 추가
- `index.html` — (수정) `controls` 섹션에 가로/세로 입력, 비율 유지 체크박스, 출력 포맷 선택 추가
- `css/style.css` — (수정) 새 폼 요소 스타일 추가
- `js/app.js` — (수정) 리사이즈/포맷 UI 이벤트 와이어링, `compressImage` → `processImage`로 확장

---

### Task 1: 리사이즈/포맷 변환 순수 함수 (`js/imageTools.js`)

**Files:**
- Modify: `js/imageTools.js`
- Modify: `tests/imageTools.test.js`

**Interfaces:**
- Consumes: 기존 `isSupportedImageType`, `getOutputMimeType` (같은 파일 내)
- Produces: `calculateAspectRatioHeight(originalWidth, originalHeight, newWidth): number`, `calculateAspectRatioWidth(originalWidth, originalHeight, newHeight): number`, `resolveDimensions(originalWidth, originalHeight, inputWidth, inputHeight): { width: number, height: number }`, `resolveOutputMimeType(originalMimeType, selectedFormat): string | null`, `getExtensionForMimeType(mimeType): string`, `isValidDimensionInput(value): boolean`, `MAX_DIMENSION: number`
  - Task 3, 4에서 `js/app.js`가 이 함수들을 전역으로 가져다 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/imageTools.test.js`의 첫 줄 require를 아래처럼 바꾸고:

```js
const assert = require('assert');
const {
  formatBytes,
  isSupportedImageType,
  getOutputMimeType,
  calculateAspectRatioHeight,
  calculateAspectRatioWidth,
  resolveDimensions,
  resolveOutputMimeType,
  getExtensionForMimeType,
  isValidDimensionInput,
  MAX_DIMENSION
} = require('../js/imageTools.js');
```

파일 맨 아래, `if (process.exitCode !== 1) {` 블록 바로 위에 아래 테스트들을 추가한다:

```js
test('calculateAspectRatioHeight scales height proportionally to new width', () => {
  assert.strictEqual(calculateAspectRatioHeight(1000, 500, 400), 200);
});

test('calculateAspectRatioHeight rounds to nearest integer', () => {
  assert.strictEqual(calculateAspectRatioHeight(1000, 333, 700), 233);
});

test('calculateAspectRatioWidth scales width proportionally to new height', () => {
  assert.strictEqual(calculateAspectRatioWidth(1000, 500, 100), 200);
});

test('resolveDimensions keeps original size when neither dimension given', () => {
  const result = resolveDimensions(1000, 500, null, null);
  assert.deepStrictEqual(result, { width: 1000, height: 500 });
});

test('resolveDimensions uses both values as-is when both given (free stretch)', () => {
  const result = resolveDimensions(1000, 500, 300, 300);
  assert.deepStrictEqual(result, { width: 300, height: 300 });
});

test('resolveDimensions derives height from width when only width given', () => {
  const result = resolveDimensions(1000, 500, 400, null);
  assert.deepStrictEqual(result, { width: 400, height: 200 });
});

test('resolveDimensions derives width from height when only height given', () => {
  const result = resolveDimensions(1000, 500, null, 100);
  assert.deepStrictEqual(result, { width: 200, height: 100 });
});

test('resolveOutputMimeType passes through original type when format is "original"', () => {
  assert.strictEqual(resolveOutputMimeType('image/png', 'original'), 'image/png');
});

test('resolveOutputMimeType returns explicitly selected supported format', () => {
  assert.strictEqual(resolveOutputMimeType('image/png', 'image/jpeg'), 'image/jpeg');
});

test('resolveOutputMimeType returns null for unsupported explicit format', () => {
  assert.strictEqual(resolveOutputMimeType('image/png', 'image/gif'), null);
});

test('getExtensionForMimeType maps known mime types to extensions', () => {
  assert.strictEqual(getExtensionForMimeType('image/jpeg'), 'jpg');
  assert.strictEqual(getExtensionForMimeType('image/png'), 'png');
  assert.strictEqual(getExtensionForMimeType('image/webp'), 'webp');
});

test('getExtensionForMimeType falls back to jpg for unknown mime type', () => {
  assert.strictEqual(getExtensionForMimeType('image/gif'), 'jpg');
});

test('isValidDimensionInput accepts values within 1..MAX_DIMENSION', () => {
  assert.strictEqual(isValidDimensionInput(1), true);
  assert.strictEqual(isValidDimensionInput(MAX_DIMENSION), true);
  assert.strictEqual(isValidDimensionInput(1234), true);
});

test('isValidDimensionInput rejects out-of-range or non-numeric values', () => {
  assert.strictEqual(isValidDimensionInput(0), false);
  assert.strictEqual(isValidDimensionInput(-5), false);
  assert.strictEqual(isValidDimensionInput(MAX_DIMENSION + 1), false);
  assert.strictEqual(isValidDimensionInput(NaN), false);
});
```

- [ ] **Step 2: 테스트 실행해서 실패하는지 확인**

Run: `node tests/imageTools.test.js`
Expected: `TypeError: calculateAspectRatioHeight is not a function` (또는 유사한 undefined 함수 에러)로 실패

- [ ] **Step 3: 구현 작성**

`js/imageTools.js`를 아래처럼 수정한다 (기존 `exports.getOutputMimeType = getOutputMimeType;` 줄 위에 새 함수들을 추가하고, exports 줄들도 추가):

```js
(function (exports) {
  function formatBytes(bytes) {
    if (bytes < 1024) {
      return bytes + ' B';
    }
    var units = ['KB', 'MB', 'GB'];
    var value = bytes / 1024;
    var unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value = value / 1024;
      unitIndex = unitIndex + 1;
    }
    return value.toFixed(1) + ' ' + units[unitIndex];
  }

  var SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  function isSupportedImageType(mimeType) {
    return SUPPORTED_TYPES.indexOf(mimeType) !== -1;
  }

  function getOutputMimeType(mimeType) {
    return isSupportedImageType(mimeType) ? mimeType : null;
  }

  var MAX_DIMENSION = 8000;

  function calculateAspectRatioHeight(originalWidth, originalHeight, newWidth) {
    return Math.max(1, Math.round((newWidth * originalHeight) / originalWidth));
  }

  function calculateAspectRatioWidth(originalWidth, originalHeight, newHeight) {
    return Math.max(1, Math.round((newHeight * originalWidth) / originalHeight));
  }

  function resolveDimensions(originalWidth, originalHeight, inputWidth, inputHeight) {
    var hasWidth = typeof inputWidth === 'number' && !isNaN(inputWidth) && inputWidth > 0;
    var hasHeight = typeof inputHeight === 'number' && !isNaN(inputHeight) && inputHeight > 0;

    if (!hasWidth && !hasHeight) {
      return { width: originalWidth, height: originalHeight };
    }
    if (hasWidth && hasHeight) {
      return { width: Math.round(inputWidth), height: Math.round(inputHeight) };
    }
    if (hasWidth) {
      return {
        width: Math.round(inputWidth),
        height: calculateAspectRatioHeight(originalWidth, originalHeight, inputWidth)
      };
    }
    return {
      width: calculateAspectRatioWidth(originalWidth, originalHeight, inputHeight),
      height: Math.round(inputHeight)
    };
  }

  function resolveOutputMimeType(originalMimeType, selectedFormat) {
    if (!selectedFormat || selectedFormat === 'original') {
      return getOutputMimeType(originalMimeType);
    }
    return isSupportedImageType(selectedFormat) ? selectedFormat : null;
  }

  var EXTENSIONS_BY_MIME_TYPE = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };

  function getExtensionForMimeType(mimeType) {
    return EXTENSIONS_BY_MIME_TYPE[mimeType] || 'jpg';
  }

  function isValidDimensionInput(value) {
    return typeof value === 'number' && !isNaN(value) && value >= 1 && value <= MAX_DIMENSION;
  }

  exports.formatBytes = formatBytes;
  exports.isSupportedImageType = isSupportedImageType;
  exports.getOutputMimeType = getOutputMimeType;
  exports.MAX_DIMENSION = MAX_DIMENSION;
  exports.calculateAspectRatioHeight = calculateAspectRatioHeight;
  exports.calculateAspectRatioWidth = calculateAspectRatioWidth;
  exports.resolveDimensions = resolveDimensions;
  exports.resolveOutputMimeType = resolveOutputMimeType;
  exports.getExtensionForMimeType = getExtensionForMimeType;
  exports.isValidDimensionInput = isValidDimensionInput;
})(typeof module !== 'undefined' ? module.exports : window);
```

- [ ] **Step 4: 테스트 실행해서 통과하는지 확인**

Run: `node tests/imageTools.test.js`
Expected: 모든 테스트가 `PASS`로 출력되고, 마지막 줄에 `모든 테스트 통과` 출력, exit code 0

- [ ] **Step 5: 커밋**

```bash
git add js/imageTools.js tests/imageTools.test.js
git commit -m "Add resize dimension and format resolution pure functions"
```

---

### Task 2: 리사이즈·포맷 선택 UI 마크업 (`index.html`, `css/style.css`)

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`

**Interfaces:**
- Produces: 아래 `id`를 가진 새 DOM 엘리먼트. Task 3, 4에서 그대로 참조한다.
  - `resizeWidth`, `resizeHeight` (input[type=number]), `maintainAspectRatio` (input[type=checkbox]), `formatSelect` (select)

- [ ] **Step 1: `index.html`의 `controls` 섹션 수정**

기존:
```html
    <section class="controls" id="controls" hidden>
      <label for="qualitySlider">압축 품질: <span id="qualityValue">80</span>%</label>
      <input type="range" id="qualitySlider" min="10" max="100" value="80">
      <button id="compressBtn">압축하기</button>
    </section>
```

교체:
```html
    <section class="controls" id="controls" hidden>
      <label for="qualitySlider">압축 품질: <span id="qualityValue">80</span>%</label>
      <input type="range" id="qualitySlider" min="10" max="100" value="80">

      <div class="resize-fields">
        <label class="resize-label">가로(px)
          <input type="number" id="resizeWidth" min="1" max="8000">
        </label>
        <label class="resize-label">세로(px)
          <input type="number" id="resizeHeight" min="1" max="8000">
        </label>
        <label class="checkbox-label">
          <input type="checkbox" id="maintainAspectRatio" checked>
          비율 유지
        </label>
      </div>

      <label for="formatSelect">출력 형식</label>
      <select id="formatSelect">
        <option value="original">원본과 동일</option>
        <option value="image/jpeg">JPG</option>
        <option value="image/png">PNG</option>
        <option value="image/webp">WebP</option>
      </select>

      <button id="compressBtn">적용하기</button>
    </section>
```

`preview-area` 섹션의 `<h2>압축본</h2>`도 `<h2>결과</h2>`로 바꾼다 (이제 압축뿐 아니라 리사이즈·포맷 변환 결과도 함께 보여주므로).

- [ ] **Step 2: `css/style.css`에 스타일 추가**

파일 맨 아래에 추가:

```css
.resize-fields {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.resize-label {
  display: flex;
  flex-direction: column;
  font-size: 13px;
  color: #6e6e73;
  gap: 4px;
}

.resize-label input[type="number"] {
  width: 90px;
  padding: 8px;
  border: 1px solid #d0d0d5;
  border-radius: 8px;
  font-size: 14px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #1d1d1f;
  margin-bottom: 8px;
}

#formatSelect {
  display: block;
  width: 100%;
  max-width: 200px;
  padding: 8px;
  border: 1px solid #d0d0d5;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
}
```

- [ ] **Step 3: 수동 확인**

`index.html`을 브라우저로 열고 아무 이미지를 업로드한다.
Expected:
- 품질 슬라이더 아래에 가로/세로 입력 필드 두 개와 "비율 유지" 체크박스가 보인다
- 그 아래 "출력 형식" 드롭다운(원본과 동일/JPG/PNG/WebP)이 보인다
- 버튼 텍스트가 "적용하기"로 바뀌어 있다
- 아직 `js/app.js`가 이 요소들을 참조하지 않으므로 리사이즈/포맷 값을 바꿔도 아무 동작이 없다 — 이 단계에서는 정상
- 개발자 도구 콘솔(F12)에 새로운 에러가 없다

- [ ] **Step 4: 커밋**

```bash
git add index.html css/style.css
git commit -m "Add resize and format selection UI markup"
```

---

### Task 3: 리사이즈 UI 동작 연결 (`js/app.js`)

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `calculateAspectRatioHeight`, `calculateAspectRatioWidth` (Task 1), Task 2의 `resizeWidth`/`resizeHeight`/`maintainAspectRatio` DOM 요소
- Produces: `originalImageWidth`, `originalImageHeight` (module-level 변수, Task 4에서 재사용), `readDimensionInput(inputEl): number | null`

- [ ] **Step 1: 엘리먼트 참조와 원본 치수 상태 변수 추가**

`js/app.js` 상단, 기존 `var downloadBtn = ...` 줄 바로 아래에 추가:

```js
var resizeWidth = document.getElementById('resizeWidth');
var resizeHeight = document.getElementById('resizeHeight');
var maintainAspectRatio = document.getElementById('maintainAspectRatio');
var formatSelect = document.getElementById('formatSelect');

var originalImageWidth = 0;
var originalImageHeight = 0;
```

- [ ] **Step 2: 원본 이미지 로드 시 치수 캡처 및 입력값 초기화**

`handleFile` 함수 전체를 아래로 교체한다 (파일 선택 초기화 시 리사이즈 필드도 함께 리셋하도록 몇 줄이 추가됐다). 그 아래에 `originalPreview`의 `load` 이벤트 리스너를 새로 추가한다:

```js
function handleFile(file) {
  clearError();
  controls.hidden = true;
  previewArea.hidden = true;
  selectedFile = null;
  originalImageWidth = 0;
  originalImageHeight = 0;
  resizeWidth.value = '';
  resizeHeight.value = '';

  if (!file) {
    return;
  }

  if (!isSupportedImageType(file.type)) {
    showError('지원하지 않는 파일 형식입니다. JPG, PNG, WebP 파일만 업로드할 수 있어요.');
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    showError('파일이 너무 큽니다 (최대 20MB). 더 작은 파일을 선택해주세요.');
    return;
  }

  selectedFile = file;
  originalPreview.src = URL.createObjectURL(file);
  originalSize.textContent = '원본 크기: ' + formatBytes(file.size);
  controls.hidden = false;
  previewArea.hidden = false;
  compressedPreview.src = '';
  compressedSize.textContent = '';
  compressWarning.hidden = true;
  downloadBtn.hidden = true;
}

originalPreview.addEventListener('load', function () {
  if (!selectedFile) {
    return;
  }
  originalImageWidth = originalPreview.naturalWidth;
  originalImageHeight = originalPreview.naturalHeight;
  resizeWidth.value = originalImageWidth;
  resizeHeight.value = originalImageHeight;
});
```

- [ ] **Step 3: 비율 유지 연동 및 입력값 읽기 헬퍼 추가**

`js/app.js` 맨 아래에 추가:

```js
function readDimensionInput(inputEl) {
  var raw = inputEl.value.trim();
  if (raw === '') {
    return null;
  }
  var num = Number(raw);
  return isNaN(num) ? NaN : num;
}

resizeWidth.addEventListener('input', function () {
  if (!maintainAspectRatio.checked || !originalImageWidth || !originalImageHeight) {
    return;
  }
  var w = Number(resizeWidth.value);
  if (!w || isNaN(w)) {
    return;
  }
  resizeHeight.value = calculateAspectRatioHeight(originalImageWidth, originalImageHeight, w);
});

resizeHeight.addEventListener('input', function () {
  if (!maintainAspectRatio.checked || !originalImageWidth || !originalImageHeight) {
    return;
  }
  var h = Number(resizeHeight.value);
  if (!h || isNaN(h)) {
    return;
  }
  resizeWidth.value = calculateAspectRatioWidth(originalImageWidth, originalImageHeight, h);
});
```

- [ ] **Step 4: 브라우저에서 수동 검증**

`index.html`을 새로고침해서 연다.
Expected 체크리스트:
- 이미지를 업로드하면 가로/세로 입력 필드에 원본 픽셀 크기가 자동으로 채워진다
- "비율 유지"가 체크된 상태에서 가로 값을 바꾸면 세로 값이 비율에 맞게 자동으로 바뀐다 (반대 방향도 동일)
- "비율 유지" 체크를 해제하면 가로/세로를 각각 독립적으로 바꿀 수 있고 서로 영향을 주지 않는다
- 새 이미지를 다시 업로드하면 필드가 새 이미지의 원본 크기로 다시 채워진다

- [ ] **Step 5: 커밋**

```bash
git add js/app.js
git commit -m "Wire resize input fields with aspect-ratio linking"
```

---

### Task 4: 포맷 변환 통합 및 처리 로직 확장 (`js/app.js`)

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `resolveDimensions`, `resolveOutputMimeType`, `getExtensionForMimeType`, `isValidDimensionInput`, `MAX_DIMENSION` (Task 1), `readDimensionInput` (Task 3), Task 2의 `formatSelect`
- Produces: `processImage(file, options): Promise<{ blob: Blob, url: string, width: number, height: number }>` (기존 `compressImage` 대체)

- [ ] **Step 1: `compressImage`를 `processImage`로 교체**

`js/app.js`의 기존 `compressImage` 함수 전체를 아래로 교체한다:

```js
function processImage(file, options) {
  return new Promise(function (resolve, reject) {
    if (!options.outputMimeType) {
      reject(new Error('지원하지 않는 파일 형식입니다.'));
      return;
    }

    var img = new Image();
    var objectUrl = URL.createObjectURL(file);

    img.onload = function () {
      var dimensions = resolveDimensions(img.naturalWidth, img.naturalHeight, options.targetWidth, options.targetHeight);

      var canvas = document.createElement('canvas');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      var ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('2D 캔버스 컨텍스트를 생성할 수 없습니다.'));
        return;
      }

      if (options.outputMimeType === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);

      canvas.toBlob(
        function (blob) {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error('이미지 처리에 실패했습니다.'));
            return;
          }
          resolve({ blob: blob, url: URL.createObjectURL(blob), width: dimensions.width, height: dimensions.height });
        },
        options.outputMimeType,
        options.quality
      );
    };

    img.onerror = function () {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 불러올 수 없습니다.'));
    };

    img.src = objectUrl;
  });
}
```

`image/jpeg`는 투명도를 지원하지 않으므로, PNG나 WebP의 투명 영역이 검은색으로 바뀌는 것을 막기 위해 캔버스를 흰색으로 먼저 채운 뒤 그린다.

- [ ] **Step 2: `compressBtn` 클릭 핸들러 교체**

기존 `compressBtn.addEventListener('click', ...)` 블록 전체를 아래로 교체한다:

```js
compressBtn.addEventListener('click', function () {
  if (!selectedFile) {
    return;
  }
  clearError();
  compressWarning.hidden = true;

  var widthInput = readDimensionInput(resizeWidth);
  var heightInput = readDimensionInput(resizeHeight);

  if (isNaN(widthInput) || isNaN(heightInput)) {
    showError('가로/세로 값은 숫자로 입력해주세요.');
    return;
  }
  if ((widthInput !== null && !isValidDimensionInput(widthInput)) || (heightInput !== null && !isValidDimensionInput(heightInput))) {
    showError('가로/세로 값은 1~' + MAX_DIMENSION + 'px 사이여야 합니다.');
    return;
  }

  var outputMimeType = resolveOutputMimeType(selectedFile.type, formatSelect.value);

  compressBtn.disabled = true;
  compressBtn.textContent = '처리 중...';

  var quality = Number(qualitySlider.value) / 100;

  processImage(selectedFile, {
    quality: quality,
    targetWidth: widthInput,
    targetHeight: heightInput,
    outputMimeType: outputMimeType
  })
    .then(function (result) {
      compressedPreview.src = result.url;
      compressedSize.textContent = '결과 크기: ' + formatBytes(result.blob.size) + ' (' + result.width + '×' + result.height + ')';
      compressWarning.hidden = result.blob.size <= selectedFile.size;
      downloadBtn.href = result.url;
      downloadBtn.download = 'processed-image.' + getExtensionForMimeType(outputMimeType);
      downloadBtn.hidden = false;
    })
    .catch(function (err) {
      showError(err.message);
    })
    .then(function () {
      compressBtn.disabled = false;
      compressBtn.textContent = '적용하기';
    });
});
```

- [ ] **Step 3: 브라우저에서 전체 흐름 수동 검증**

`index.html`을 새로고침해서 연다.
Expected 체크리스트:
- JPG/PNG/WebP 이미지 각각 업로드 → 가로/세로 값을 원본의 절반으로 줄이고 "적용하기" → 결과 미리보기가 실제로 더 작은 크기로 나오고, "결과 크기: X.X KB (가로×세로)" 문구의 가로×세로 값이 절반 크기와 일치한다
- 투명 배경이 있는 PNG를 업로드하고 출력 형식을 "JPG"로 바꿔 적용 → 결과 이미지의 투명했던 부분이 검은색이 아니라 흰색으로 나온다
- 출력 형식을 "원본과 동일"로 두면 업로드한 파일과 같은 형식으로 다운로드된다 (다운로드 파일 확장자 확인)
- 출력 형식을 "PNG"나 "WebP"로 명시적으로 바꾸면 다운로드 파일 확장자가 그에 맞게 바뀐다
- 가로 입력란에 0이나 9999처럼 범위를 벗어난 값을 넣고 적용하면 "가로/세로 값은 1~8000px 사이여야 합니다." 에러가 뜨고 처리되지 않는다
- 가로 입력란에 문자를 넣으면(타입이 number라 브라우저가 대부분 막지만, 지우고 공백만 남긴 경우 등) 에러 없이 정상 처리되거나 적절한 에러 메시지가 뜬다
- 품질 슬라이더는 기존과 동일하게 동작한다
- 모바일 화면 크기(개발자 도구 반응형 보기)에서 새 필드들의 레이아웃이 깨지지 않는다

- [ ] **Step 4: 커밋**

```bash
git add js/app.js
git commit -m "Integrate resize and format conversion into image processing"
```

---

## 이후 계획 (이번 계획 범위 밖)

스펙 1단계의 배치 처리(다중 파일), 2단계(SEO 콘텐츠), 3단계(광고 삽입), 4단계(도메인/프리미엄)는 이 계획이 배포되어 정상 동작하는 것을 확인한 뒤 별도의 계획 문서로 작성한다.
