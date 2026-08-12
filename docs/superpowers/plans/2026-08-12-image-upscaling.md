# 이미지 업스케일링 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 별도 페이지(`upscale.html`)에서 이미지 한 장을 AI 모델(esrgan-slim)로 2배 확대하는 기능을 제공한다.

**Architecture:** 기존 이미지/PDF 도구와 동일하게 빌드 도구 없는 순수 HTML/CSS/JavaScript 정적 페이지를 유지한다. 이 기능에 한해 TensorFlow.js(추론 엔진), `@upscalerjs/esrgan-slim`의 2배율 모델, UpscalerJS(업스케일링 API)를 CDN `<script>` 태그로 불러온다. 순수 검증/파일명 로직은 `js/upscaleTools.js`에 두고 Node로 유닛테스트하며, DOM 이벤트와 UpscalerJS 연동은 `js/upscaleApp.js`에서 그 함수들을 소비한다. `upscale.html`은 기존 `js/imageTools.js`도 함께 불러와 `formatBytes`, `isSupportedImageType`을 재사용한다. `index.html`, `pdf.html`은 상단 링크 한 줄만 추가되고 그 외에는 전혀 수정되지 않는다 — AI 라이브러리는 `upscale.html`에서만 로드된다.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES5 문법 위주), Canvas API, File API, TensorFlow.js 4.22.0 (CDN, UMD 빌드), UpscalerJS 1.0.0 (CDN, UMD 빌드), `@upscalerjs/esrgan-slim` 1.0.0의 2배율 모델 (CDN). 빌드 도구 없음. 테스트는 Node.js 내장 `assert` 모듈만 사용.

## Global Constraints

- 순수 HTML/CSS/JavaScript로만 작성한다. 빌드 도구(webpack/vite 등)를 사용하지 않는다.
- TensorFlow.js, UpscalerJS, `@upscalerjs/esrgan-slim` 외의 외부 라이브러리는 추가하지 않는다. 세 라이브러리는 아래에 실측 검증된 특정 버전/경로로 CDN URL에 고정한다 ("latest" 금지, 문서의 예시 경로 중 하나는 실제로 존재하지 않는 죽은 경로였으므로 반드시 아래 검증된 값을 그대로 쓴다):
  - TensorFlow.js: `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js`
    integrity=`sha384-vE8hbVJ4lezako5rlvE7bY0BVzWlFhZncPlckrqNwcUQpVtgbENTgZ8TBbnPjZre`
  - esrgan-slim 2배율 모델 (전역 `ESRGANSlim2x` 노출): `https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-slim@1.0.0/dist/umd/models/esrgan-slim/src/x2/index.min.js`
    integrity=`sha384-AGBOpw8YDaWtze64+1P80uYCg+607+NLyI/tVeKNOJr9+SHUMEC7Z0ue5WJy5zIs`
  - UpscalerJS: `https://cdn.jsdelivr.net/npm/upscaler@1.0.0/dist/browser/umd/upscaler.min.js`
    integrity=`sha384-QMCS4oRU0yhc/triRbY4mcIreg38XzA/8NNuZfTWWvv/km8cX/L63yLb3hh0IaA3`
  - 모델 가중치(`models/x2/model.json` + `.bin`)는 UpscalerJS가 런타임에 자동으로 요청한다 — 별도 script 태그 불필요.
- 위 CDN 스크립트는 `upscale.html`에서만 로드한다. `index.html`, `pdf.html`은 상단 링크 1줄 외에 변경하지 않는다.
- 이미지 파일은 절대 서버로 전송하지 않는다. 모든 처리는 브라우저 내부에서만 이루어진다.
- 배율은 2배 고정이다. 배율 선택 UI를 만들지 않는다.
- 이미지 1장만 처리한다. 여러 장 일괄 처리 UI를 만들지 않는다.
- 파일당 최대 20MB (기존 이미지 도구와 동일한 제한값).
- 입력 이미지는 가로·세로 각각 최대 1000px로 제한한다 (구현 안전장치, 스펙에 명시되지 않음 — AI 모델이 브라우저에서 직접 계산하므로 큰 이미지를 넣으면 탭이 멈추거나 크래시할 수 있어 브라우저 메모리 보호 목적).
- 결과 이미지는 PNG로 고정한다 (UpscalerJS가 PNG 데이터 URL을 반환함, 실측 확인됨).
- 업스케일링 결과는 데이터 URL(`data:image/png;base64,...`)이며 `URL.createObjectURL`로 만든 blob URL이 아니다 — `URL.revokeObjectURL`을 호출할 필요가 없다 (호출해도 데이터 URL에는 아무 효과가 없으므로 호출 자체를 코드에 넣지 않는다).
- UpscalerJS는 `upscale()` 처리 파이프라인 내부에서 텐서를 자체적으로 정리한다 (라이브러리 코드 확인됨) — 앱 코드에서 별도의 텐서 정리 로직을 추가하지 않는다.
- 다크모드, 3배/4배 등 다른 배율, 노이즈 제거 등 다른 AI 기능은 범위 밖이다.

---

### Task 1: 업스케일링 관련 순수 함수 (`js/upscaleTools.js`)

**Files:**
- Create: `js/upscaleTools.js`
- Create: `tests/upscaleTools.test.js`

**Interfaces:**
- Consumes: 없음 (독립적인 순수 함수 모음)
- Produces: `isValidFileSize(bytes): boolean`, `isValidUpscaleDimensions(width, height): boolean`, `getUpscaledFilename(originalFileName): string`, `MAX_FILE_SIZE: number`, `MAX_UPSCALE_DIMENSION: number`
  - Task 3에서 `js/upscaleApp.js`가 이 함수들을 전역으로 가져다 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/upscaleTools.test.js` 파일을 새로 만든다:

```js
const assert = require('assert');
const {
  isValidFileSize,
  isValidUpscaleDimensions,
  getUpscaledFilename,
  MAX_FILE_SIZE,
  MAX_UPSCALE_DIMENSION
} = require('../js/upscaleTools.js');

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

test('MAX_UPSCALE_DIMENSION is 1000', () => {
  assert.strictEqual(MAX_UPSCALE_DIMENSION, 1000);
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

test('isValidUpscaleDimensions accepts dimensions within 1..1000', () => {
  assert.strictEqual(isValidUpscaleDimensions(1, 1), true);
  assert.strictEqual(isValidUpscaleDimensions(1000, 1000), true);
  assert.strictEqual(isValidUpscaleDimensions(640, 480), true);
});

test('isValidUpscaleDimensions rejects zero, negative, or over-limit dimensions', () => {
  assert.strictEqual(isValidUpscaleDimensions(0, 500), false);
  assert.strictEqual(isValidUpscaleDimensions(500, 0), false);
  assert.strictEqual(isValidUpscaleDimensions(1001, 500), false);
  assert.strictEqual(isValidUpscaleDimensions(500, 1001), false);
  assert.strictEqual(isValidUpscaleDimensions(-1, 500), false);
});

test('getUpscaledFilename appends -2x and forces .png extension', () => {
  assert.strictEqual(getUpscaledFilename('photo.jpg'), 'photo-2x.png');
  assert.strictEqual(getUpscaledFilename('photo.png'), 'photo-2x.png');
  assert.strictEqual(getUpscaledFilename('a.b.jpg'), 'a.b-2x.png');
  assert.strictEqual(getUpscaledFilename('noext'), 'noext-2x.png');
});

if (process.exitCode !== 1) {
  console.log('\n모든 테스트 통과');
}
```

- [ ] **Step 2: 테스트 실행해서 실패하는지 확인**

Run: `node tests/upscaleTools.test.js`
Expected: `Cannot find module '../js/upscaleTools.js'` 에러로 실패

- [ ] **Step 3: 구현 작성**

`js/upscaleTools.js` 파일을 새로 만든다:

```js
(function (exports) {
  var MAX_FILE_SIZE = 20 * 1024 * 1024;
  var MAX_UPSCALE_DIMENSION = 1000;

  function isValidFileSize(bytes) {
    return typeof bytes === 'number' && !isNaN(bytes) && bytes > 0 && bytes <= MAX_FILE_SIZE;
  }

  function isValidUpscaleDimensions(width, height) {
    return typeof width === 'number' && !isNaN(width) && width >= 1 && width <= MAX_UPSCALE_DIMENSION &&
      typeof height === 'number' && !isNaN(height) && height >= 1 && height <= MAX_UPSCALE_DIMENSION;
  }

  function getUpscaledFilename(originalFileName) {
    var lastDot = originalFileName.lastIndexOf('.');
    var base = lastDot === -1 ? originalFileName : originalFileName.slice(0, lastDot);
    return base + '-2x.png';
  }

  exports.MAX_FILE_SIZE = MAX_FILE_SIZE;
  exports.MAX_UPSCALE_DIMENSION = MAX_UPSCALE_DIMENSION;
  exports.isValidFileSize = isValidFileSize;
  exports.isValidUpscaleDimensions = isValidUpscaleDimensions;
  exports.getUpscaledFilename = getUpscaledFilename;
})(typeof module !== 'undefined' ? module.exports : window);
```

- [ ] **Step 4: 테스트 실행해서 통과하는지 확인**

Run: `node tests/upscaleTools.test.js`
Expected: 모든 테스트가 `PASS`로 출력되고, 마지막 줄에 `모든 테스트 통과` 출력, exit code 0

- [ ] **Step 5: 커밋**

```bash
git add js/upscaleTools.js tests/upscaleTools.test.js
git commit -m "Add upscaling validation and filename pure functions"
```

---

### Task 2: `upscale.html` 마크업, 홈/PDF 페이지 링크

**Files:**
- Create: `upscale.html`
- Create: `js/upscaleApp.js` (빈 파일, 헤더 주석만)
- Modify: `index.html`
- Modify: `pdf.html`

**Interfaces:**
- Consumes: Task 1의 `js/upscaleTools.js`의 상수/함수 (전역으로 로드됨)
- Produces: 아래 `id`를 가진 DOM 엘리먼트. Task 3에서 그대로 참조한다.
  - `upscaleUploadArea`, `upscaleFileInput`, `upscaleError`, `upscaleBtn`, `upscaleProgress`, `upscalePreviewArea`, `upscaleOriginalPreview`, `upscaleOriginalSize`, `upscaleResultPreview`, `upscaleDownloadBtn`

이 프로젝트는 `.upload-area`, `.preview-area`, `.preview-box`, `.pdf-progress`, `.info-section`, `.site-footer`, `button`/`.btn` 등 재사용 가능한 CSS 클래스를 이미 갖추고 있고(`css/style.css`), 새 페이지가 필요로 하는 시각 요소가 전부 기존 클래스로 커버되므로 **이번 작업은 `css/style.css`를 수정하지 않는다.**

- [ ] **Step 1: `upscale.html` 생성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>이미지 업스케일링 - AI로 사진 화질 2배 확대</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="AI 모델로 사진을 2배 확대하는 무료 온라인 도구. 서버 전송 없이 브라우저에서 바로 처리합니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/upscale.html">
  <meta property="og:type" content="website">
  <meta property="og:title" content="이미지 업스케일링 - AI로 사진 화질 2배 확대">
  <meta property="og:description" content="AI 모델로 사진을 2배 확대하는 무료 온라인 도구.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/upscale.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <main class="container">
    <h1>이미지 업스케일링</h1>
    <p class="subtitle">사진이 서버로 전송되지 않고, 이 브라우저 안에서 AI로 2배 확대됩니다.</p>
    <p class="tool-nav"><a href="index.html">← 이미지 압축 도구</a></p>

    <section class="upload-area" id="upscaleUploadArea">
      <input type="file" id="upscaleFileInput" class="visually-hidden" accept="image/jpeg,image/png,image/webp">
      <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 3v12"></path>
        <path d="M7 8l5-5 5 5"></path>
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path>
      </svg>
      <button type="button" class="upload-btn">파일 선택</button>
      <p class="upload-hint">또는 파일을 이 영역에 끌어다 놓으세요</p>
      <p class="upload-formats">JPG, PNG, WebP 지원 · 최대 20MB · 가로세로 각 1000px 이하</p>
      <div id="upscaleError" class="error-message" hidden></div>
    </section>

    <button id="upscaleBtn" hidden>2배로 확대</button>
    <p id="upscaleProgress" class="pdf-progress" hidden>처리 중...</p>

    <section class="preview-area" id="upscalePreviewArea" hidden>
      <div class="preview-box">
        <h2>원본</h2>
        <img id="upscaleOriginalPreview" alt="원본 이미지 미리보기">
        <p id="upscaleOriginalSize"></p>
      </div>
      <div class="preview-box">
        <h2>결과 (2배)</h2>
        <img id="upscaleResultPreview" alt="업스케일링된 이미지 미리보기" hidden>
        <a id="upscaleDownloadBtn" class="btn" href="#" download="upscaled.png" hidden>다운로드</a>
      </div>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>몇 배까지 확대할 수 있나요?</summary>
        <p>현재는 2배 확대만 지원합니다.</p>
      </details>
      <details>
        <summary>왜 이미지 크기 제한이 있나요?</summary>
        <p>AI 모델이 브라우저 안에서 직접 계산을 하기 때문에, 너무 큰 이미지를 넣으면 처리 시간이 오래 걸리거나 브라우저가 멈출 수 있습니다. 가로세로 각각 1000px 이하 이미지만 지원하며, 더 큰 이미지는 이미지 압축 도구에서 먼저 크기를 줄인 뒤 이용해주세요.</p>
      </details>
      <details>
        <summary>업로드한 사진이 서버에 저장되나요?</summary>
        <p>아니요. AI 모델 계산이 전부 브라우저 안에서 이루어지며, 어떤 이미지도 서버로 전송되지 않습니다.</p>
      </details>
    </section>
  </main>

  <footer class="site-footer">
    <a href="privacy.html">개인정보처리방침</a>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js" integrity="sha384-vE8hbVJ4lezako5rlvE7bY0BVzWlFhZncPlckrqNwcUQpVtgbENTgZ8TBbnPjZre" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-slim@1.0.0/dist/umd/models/esrgan-slim/src/x2/index.min.js" integrity="sha384-AGBOpw8YDaWtze64+1P80uYCg+607+NLyI/tVeKNOJr9+SHUMEC7Z0ue5WJy5zIs" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/upscaler@1.0.0/dist/browser/umd/upscaler.min.js" integrity="sha384-QMCS4oRU0yhc/triRbY4mcIreg38XzA/8NNuZfTWWvv/km8cX/L63yLb3hh0IaA3" crossorigin="anonymous"></script>
  <script src="js/imageTools.js"></script>
  <script src="js/upscaleTools.js"></script>
  <script src="js/upscaleApp.js"></script>
</body>
</html>
```

Path: `upscale.html`

- [ ] **Step 2: 빈 `js/upscaleApp.js` 생성**

```js
// 이미지 업스케일링 도구 - 이벤트 와이어링
```

- [ ] **Step 3: `index.html`에 링크 추가**

`index.html`의 `<p class="tool-nav"><a href="pdf.html">PDF 변환 도구 →</a></p>` 바로 다음 줄에 추가:

```html
    <p class="tool-nav"><a href="upscale.html">이미지 업스케일링 →</a></p>
```

- [ ] **Step 4: `pdf.html`에 링크 추가**

`pdf.html`의 `<p class="tool-nav"><a href="index.html">← 이미지 압축 도구</a></p>` 바로 다음 줄에 추가:

```html
    <p class="tool-nav"><a href="upscale.html">이미지 업스케일링 →</a></p>
```

- [ ] **Step 5: 수동 확인**

`index.html`을 브라우저로 열어 "이미지 업스케일링 →" 링크가 보이고 클릭하면 `upscale.html`로 이동하는지 확인한다.
`upscale.html`을 열어서 확인한다.
Expected:
- 업로드 영역, FAQ, 개인정보처리방침 링크가 보인다
- "← 이미지 압축 도구" 링크가 보이고 클릭하면 `index.html`로 돌아간다
- 개발자 도구 콘솔(F12)에 라이브러리 로드 에러가 없다 (`typeof tf`, `typeof ESRGANSlim2x`, `typeof Upscaler`가 콘솔에서 각각 `"object"`, `"object"`, `"function"`으로 나온다)
- 아직 `js/upscaleApp.js`에 로직이 없으므로 파일을 선택해도 아무 동작이 없다 — 이 단계에서는 정상
- `pdf.html`에도 "이미지 업스케일링 →" 링크가 보인다

- [ ] **Step 6: 커밋**

```bash
git add upscale.html js/upscaleApp.js index.html pdf.html
git commit -m "Add upscaling tool page markup and home/PDF page links"
```

---

### Task 3: 업스케일링 로직 (`js/upscaleApp.js`)

**Files:**
- Modify: `js/upscaleApp.js`

**Interfaces:**
- Consumes: `formatBytes`, `isSupportedImageType` (`js/imageTools.js`), `isValidFileSize`, `isValidUpscaleDimensions`, `getUpscaledFilename`, `MAX_UPSCALE_DIMENSION` (Task 1의 `js/upscaleTools.js`), Task 2의 `upscale*` DOM 요소, 전역 `Upscaler`, `ESRGANSlim2x` (CDN)
- Produces: 없음 (이 페이지의 종단 기능)

- [ ] **Step 1: `js/upscaleApp.js`에 업스케일링 로직 추가**

`js/upscaleApp.js` 맨 아래에 추가:

```js
var upscaleUploadArea = document.getElementById('upscaleUploadArea');
var upscaleFileInput = document.getElementById('upscaleFileInput');
var upscaleError = document.getElementById('upscaleError');
var upscaleBtn = document.getElementById('upscaleBtn');
var upscaleProgress = document.getElementById('upscaleProgress');
var upscalePreviewArea = document.getElementById('upscalePreviewArea');
var upscaleOriginalPreview = document.getElementById('upscaleOriginalPreview');
var upscaleOriginalSize = document.getElementById('upscaleOriginalSize');
var upscaleResultPreview = document.getElementById('upscaleResultPreview');
var upscaleDownloadBtn = document.getElementById('upscaleDownloadBtn');

var selectedUpscaleFile = null;
var selectedUpscaleDataUrl = null;

function showUpscaleError(message) {
  upscaleError.textContent = message;
  upscaleError.hidden = false;
}

function clearUpscaleError() {
  upscaleError.textContent = '';
  upscaleError.hidden = true;
}

function loadImageFile(file) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    var objectUrl = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = function () {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 불러올 수 없습니다: ' + file.name));
    };
    img.src = objectUrl;
  });
}

function imageToDataUrl(img) {
  var canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  var ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D 캔버스 컨텍스트를 생성할 수 없습니다.');
  }
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

function handleUpscaleFile(file) {
  clearUpscaleError();
  upscaleBtn.hidden = true;
  upscalePreviewArea.hidden = true;
  upscaleResultPreview.hidden = true;
  upscaleDownloadBtn.hidden = true;
  selectedUpscaleFile = null;
  selectedUpscaleDataUrl = null;

  if (!file) {
    return;
  }

  if (!isSupportedImageType(file.type)) {
    showUpscaleError('지원하지 않는 파일 형식입니다: ' + file.name + ' (JPG, PNG, WebP만 가능)');
    return;
  }
  if (!isValidFileSize(file.size)) {
    showUpscaleError('파일이 너무 큽니다 (최대 20MB): ' + file.name);
    return;
  }

  loadImageFile(file)
    .then(function (img) {
      if (!isValidUpscaleDimensions(img.naturalWidth, img.naturalHeight)) {
        showUpscaleError('이미지가 너무 큽니다 (가로/세로 각각 최대 ' + MAX_UPSCALE_DIMENSION + 'px). 이미지 압축 도구에서 먼저 크기를 줄여주세요.');
        return;
      }

      selectedUpscaleFile = file;
      selectedUpscaleDataUrl = imageToDataUrl(img);

      upscaleOriginalPreview.src = selectedUpscaleDataUrl;
      upscaleOriginalSize.textContent = img.naturalWidth + ' × ' + img.naturalHeight + ' · ' + formatBytes(file.size);
      upscalePreviewArea.hidden = false;
      upscaleBtn.hidden = false;
    })
    .catch(function (err) {
      showUpscaleError(err.message);
    });
}

upscaleFileInput.addEventListener('change', function (e) {
  handleUpscaleFile(e.target.files[0]);
});

upscaleUploadArea.addEventListener('click', function (e) {
  if (e.target !== upscaleFileInput) {
    upscaleFileInput.click();
  }
});

var upscaleDragCounter = 0;

upscaleUploadArea.addEventListener('dragenter', function (e) {
  e.preventDefault();
  upscaleDragCounter = upscaleDragCounter + 1;
  upscaleUploadArea.classList.add('drag-over');
});

upscaleUploadArea.addEventListener('dragover', function (e) {
  e.preventDefault();
});

upscaleUploadArea.addEventListener('dragleave', function () {
  upscaleDragCounter = upscaleDragCounter - 1;
  if (upscaleDragCounter <= 0) {
    upscaleDragCounter = 0;
    upscaleUploadArea.classList.remove('drag-over');
  }
});

upscaleUploadArea.addEventListener('drop', function (e) {
  e.preventDefault();
  upscaleDragCounter = 0;
  upscaleUploadArea.classList.remove('drag-over');
  upscaleFileInput.value = '';
  handleUpscaleFile(e.dataTransfer.files[0]);
});

upscaleBtn.addEventListener('click', function () {
  if (!selectedUpscaleDataUrl) {
    return;
  }
  clearUpscaleError();

  if (typeof Upscaler === 'undefined' || typeof ESRGANSlim2x === 'undefined') {
    showUpscaleError('업스케일링 기능을 불러오지 못했습니다. 인터넷 연결을 확인해주세요.');
    return;
  }

  upscaleBtn.disabled = true;
  upscaleBtn.textContent = '처리 중...';
  upscaleProgress.hidden = false;
  upscaleResultPreview.hidden = true;
  upscaleDownloadBtn.hidden = true;

  var upscaler = new Upscaler({ model: ESRGANSlim2x });

  upscaler.upscale(selectedUpscaleDataUrl)
    .then(function (resultDataUrl) {
      upscaleResultPreview.src = resultDataUrl;
      upscaleResultPreview.hidden = false;
      upscaleDownloadBtn.href = resultDataUrl;
      upscaleDownloadBtn.download = getUpscaledFilename(selectedUpscaleFile.name);
      upscaleDownloadBtn.hidden = false;
    })
    .catch(function (err) {
      showUpscaleError('업스케일링 중 오류가 발생했습니다: ' + (err && err.message ? err.message : String(err)));
    })
    .then(function () {
      upscaleBtn.disabled = false;
      upscaleBtn.textContent = '2배로 확대';
      upscaleProgress.hidden = true;
    });
});
```

- [ ] **Step 2: 브라우저에서 수동 검증**

`upscale.html`을 새로고침해서 연다.
Expected 체크리스트:
- JPG/PNG/WebP 이미지(가로세로 1000px 이하)를 선택하면 원본 미리보기와 크기 정보가 뜨고 "2배로 확대" 버튼이 나타난다
- "2배로 확대" 클릭 → "처리 중..." 표시 → 잠시 후 결과 이미지가 원본 가로세로의 정확히 2배 크기로 나타나고, "다운로드" 버튼이 활성화된다
- 다운로드한 파일이 PNG이고, 파일명이 `<원본파일명>-2x.png` 형식이다
- 가로 또는 세로가 1000px를 초과하는 이미지를 선택하면 "이미지가 너무 큽니다..." 에러가 뜨고 진행되지 않는다
- 지원하지 않는 파일(GIF 등)을 선택하면 에러 메시지로 안내되고 진행되지 않는다
- 새 이미지를 다시 선택하면 이전 결과 미리보기/다운로드 버튼이 사라지고 새로 처리할 수 있는 상태로 초기화된다
- 개발자 도구 콘솔에서 `window.tf` 삭제 후 다시 파일을 선택하고 "2배로 확대"를 누르면 "업스케일링 기능을 불러오지 못했습니다..." 에러가 뜬다 (`typeof Upscaler === 'undefined'` 조건 확인용 — 필요 시 `Upscaler`를 직접 삭제해서 테스트)

- [ ] **Step 3: 커밋**

```bash
git add js/upscaleApp.js
git commit -m "Implement image upscaling logic"
```

---

## Self-Review Notes

- **스펙 커버리지:** 스펙의 "사전 검증" 섹션에 있던 실측 CDN 경로/SRI 해시가 Global Constraints와 Task 2 Step 1에 정확히 반영됨. "핵심 기능" 목록(입력 검증, 1000px 제한, 2배 고정, PNG 출력, 진행 표시, 원본/결과 비교)이 Task 3의 코드에 전부 구현됨. "범위 밖" 항목(다른 배율, 일괄 처리, 다른 AI 기능, 다크모드)은 코드에 추가하지 않음으로써 자연히 충족. 메모리 정리 관련 스펙 내용은 "앱 코드에서 별도 처리 불필요"라는 결론이었으므로 Global Constraints에 그 근거와 함께 명시하고, 코드에는 불필요한 정리 로직을 넣지 않음.
- **타입/인터페이스 일관성:** `js/upscaleTools.js`가 export하는 이름(`isValidFileSize`, `isValidUpscaleDimensions`, `getUpscaledFilename`, `MAX_UPSCALE_DIMENSION`)이 Task 3의 `js/upscaleApp.js`에서 정확히 동일한 이름으로 쓰임. Task 2가 정의한 DOM id가 Task 3에서 정확히 동일한 문자열로 참조됨.
- **스펙과의 사소한 차이:** 스펙은 `css/style.css` 수정을 예상했으나, 실제로 필요한 스타일이 기존 클래스(`.upload-area`, `.preview-area`, `.preview-box`, `.pdf-progress`, `.info-section` 등)로 전부 커버되는 것을 확인해 이번 계획에서는 CSS 파일을 건드리지 않는다. 기능/범위에는 영향 없는 구현 세부사항 차이이므로 계획에 반영하고 넘어간다.
- **플레이스홀더 검사:** TBD/TODO 없음. 모든 코드 블록은 실제로 붙여넣어 실행 가능한 내용이며, CDN URL/SRI 해시/파일 크기는 전부 실측된 값이다.
