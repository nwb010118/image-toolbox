# 이미지 압축 도구 MVP (0단계) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 브라우저에서만 동작하는(서버 없음) 이미지 압축 도구의 최소 버전을 만들고 GitHub Pages에 배포한다.

**Architecture:** 빌드 도구 없는 순수 HTML/CSS/JavaScript 정적 사이트. 순수 로직(파일 크기 포맷팅, 파일 형식 검증)은 `js/imageTools.js`에 CommonJS/브라우저 겸용 패턴으로 작성해 Node로 단위 테스트하고, DOM 조작과 Canvas 기반 압축 로직은 `js/app.js`에 작성해 브라우저에서 수동 검증한다.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES5 문법 위주), Canvas API, File API. 빌드 도구·프레임워크·외부 CDN 라이브러리 없음. 테스트는 Node.js 내장 `assert` 모듈만 사용(별도 테스트 프레임워크 설치 없음).

## Global Constraints

- 순수 HTML/CSS/JavaScript로만 작성한다. React 등 프레임워크를 사용하지 않는다. (스펙: 기술 스택)
- 빌드 도구를 사용하지 않는다 (webpack/vite 등 없음, 파일을 직접 수정해서 바로 배포 가능해야 함). (스펙: 기술 스택)
- 외부 라이브러리는 CDN 포함 사용하지 않는다. 순정 Web API(Canvas, File API)만 사용한다. (스펙: 기술 스택)
- 이미지 파일은 절대 서버로 전송하지 않는다. 모든 처리는 브라우저(클라이언트) 내부에서만 이루어진다. (스펙: 핵심 기능)
- 유료 API를 사용하지 않는다. (스펙: 배경 및 목표)
- 배포는 GitHub Pages 무료 티어를 사용한다. (스펙: 배포)
- 이 계획의 범위는 스펙의 로드맵 "0단계(이미지 압축 기능만 있는 최소 버전)"까지다. 리사이즈·포맷 변환·배치 처리·SEO 콘텐츠·광고는 이후 별도 계획에서 다룬다. (스펙: 로드맵)

---

## File Structure

- `index.html` — 페이지 골격: 파일 업로드, 품질 슬라이더, 압축 버튼, 미리보기, 다운로드 버튼, 에러 메시지 영역
- `css/style.css` — 전체 스타일링 (모바일 반응형 포함)
- `js/imageTools.js` — DOM에 의존하지 않는 순수 로직 함수 (Node/브라우저 겸용)
- `js/app.js` — DOM 이벤트 연결 + Canvas 기반 압축 로직 (브라우저 전용)
- `tests/imageTools.test.js` — `js/imageTools.js`에 대한 Node 기반 단위 테스트 (프레임워크 없이 `assert`만 사용)
- `README.md` — 프로젝트 설명 + GitHub Pages 배포 방법 안내

---

### Task 1: 순수 유틸 함수 (`js/imageTools.js`)

**Files:**
- Create: `js/imageTools.js`
- Test: `tests/imageTools.test.js`

**Interfaces:**
- Produces: `formatBytes(bytes: number): string`, `isSupportedImageType(mimeType: string): boolean`, `getOutputMimeType(mimeType: string): string | null`
  - 이후 Task 3(`js/app.js`)에서 이 세 함수를 그대로 가져다 쓴다. 브라우저에서는 전역으로, Node에서는 `require('../js/imageTools.js')`로 접근한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/imageTools.test.js` 파일을 새로 만든다:

```js
const assert = require('assert');
const { formatBytes, isSupportedImageType, getOutputMimeType } = require('../js/imageTools.js');

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

test('formatBytes formats bytes under 1024 as B', () => {
  assert.strictEqual(formatBytes(500), '500 B');
});

test('formatBytes formats kilobytes with one decimal', () => {
  assert.strictEqual(formatBytes(2048), '2.0 KB');
});

test('formatBytes formats megabytes with one decimal', () => {
  assert.strictEqual(formatBytes(3 * 1024 * 1024), '3.0 MB');
});

test('isSupportedImageType accepts jpeg, png, webp', () => {
  assert.strictEqual(isSupportedImageType('image/jpeg'), true);
  assert.strictEqual(isSupportedImageType('image/png'), true);
  assert.strictEqual(isSupportedImageType('image/webp'), true);
});

test('isSupportedImageType rejects unsupported types', () => {
  assert.strictEqual(isSupportedImageType('image/gif'), false);
  assert.strictEqual(isSupportedImageType('application/pdf'), false);
});

test('getOutputMimeType returns the same type for supported input', () => {
  assert.strictEqual(getOutputMimeType('image/jpeg'), 'image/jpeg');
  assert.strictEqual(getOutputMimeType('image/webp'), 'image/webp');
});

test('getOutputMimeType returns null for unsupported input', () => {
  assert.strictEqual(getOutputMimeType('image/gif'), null);
});

if (process.exitCode !== 1) {
  console.log('\n모든 테스트 통과');
}
```

- [ ] **Step 2: 테스트 실행해서 실패하는지 확인**

Run: `node tests/imageTools.test.js`
Expected: `Cannot find module '../js/imageTools.js'` 에러로 실패

- [ ] **Step 3: 최소 구현 작성**

`js/imageTools.js` 파일을 새로 만든다:

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

  exports.formatBytes = formatBytes;
  exports.isSupportedImageType = isSupportedImageType;
  exports.getOutputMimeType = getOutputMimeType;
})(typeof module !== 'undefined' ? module.exports : window);
```

- [ ] **Step 4: 테스트 실행해서 통과하는지 확인**

Run: `node tests/imageTools.test.js`
Expected: 7개 테스트 모두 `PASS`, 마지막 줄에 `모든 테스트 통과` 출력, exit code 0

- [ ] **Step 5: 커밋**

```bash
git add js/imageTools.js tests/imageTools.test.js
git commit -m "Add pure utility functions for byte formatting and image type validation"
```

---

### Task 2: 페이지 골격과 스타일 (`index.html`, `css/style.css`)

**Files:**
- Create: `index.html`
- Create: `css/style.css`

**Interfaces:**
- Produces: 아래 `id`를 가진 DOM 엘리먼트들. Task 4에서 그대로 참조한다.
  - `fileInput` (input[type=file]), `qualitySlider` (input[type=range]), `qualityValue` (품질 % 표시용 span), `compressBtn` (button), `originalPreview` / `compressedPreview` (img), `originalSize` / `compressedSize` (파일 크기 표시용 span), `downloadBtn` (a 또는 button), `errorMessage` (div)

- [ ] **Step 1: `index.html` 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>이미지 압축 도구 - 브라우저에서 바로 사진 용량 줄이기</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <main class="container">
    <h1>이미지 압축 도구</h1>
    <p class="subtitle">사진이 서버로 전송되지 않고, 이 브라우저 안에서만 처리됩니다.</p>

    <section class="upload-area">
      <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp">
      <div id="errorMessage" class="error-message" hidden></div>
    </section>

    <section class="controls" id="controls" hidden>
      <label for="qualitySlider">압축 품질: <span id="qualityValue">80</span>%</label>
      <input type="range" id="qualitySlider" min="10" max="100" value="80">
      <button id="compressBtn">압축하기</button>
    </section>

    <section class="preview-area" id="previewArea" hidden>
      <div class="preview-box">
        <h2>원본</h2>
        <img id="originalPreview" alt="원본 이미지 미리보기">
        <p id="originalSize"></p>
      </div>
      <div class="preview-box">
        <h2>압축본</h2>
        <img id="compressedPreview" alt="압축된 이미지 미리보기">
        <p id="compressedSize"></p>
        <a id="downloadBtn" href="#" download="compressed-image.jpg" hidden>다운로드</a>
      </div>
    </section>
  </main>

  <script src="js/imageTools.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: `css/style.css` 작성**

```css
* {
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Malgun Gothic", sans-serif;
  margin: 0;
  padding: 0;
  background: #f5f5f7;
  color: #1d1d1f;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px 64px;
}

h1 {
  font-size: 28px;
  margin-bottom: 4px;
}

.subtitle {
  color: #6e6e73;
  margin-top: 0;
  margin-bottom: 24px;
}

.upload-area, .controls, .preview-area {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.error-message {
  color: #d70015;
  margin-top: 12px;
}

.controls label {
  display: block;
  margin-bottom: 8px;
}

.controls input[type="range"] {
  width: 100%;
  margin-bottom: 16px;
}

button, #downloadBtn {
  background: #0071e3;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 15px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}

.preview-area {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.preview-box {
  flex: 1;
  min-width: 240px;
}

.preview-box img {
  max-width: 100%;
  border-radius: 8px;
  display: block;
  margin-bottom: 8px;
}

@media (max-width: 600px) {
  .preview-area {
    flex-direction: column;
  }
}
```

- [ ] **Step 3: 수동 확인**

`index.html` 파일을 더블클릭해서 브라우저로 연다.
Expected:
- "이미지 압축 도구" 제목과 안내 문구가 보인다
- 파일 선택 버튼이 보인다
- 품질 슬라이더/압축 버튼/미리보기 영역은 아직 `hidden` 속성 때문에 안 보인다 (Task 4에서 JS가 제어)
- 브라우저 개발자 도구(F12) 콘솔에 빨간 에러가 없다 (단, `js/app.js`가 아직 없으므로 404 에러는 정상 — Task 3에서 해결됨)

- [ ] **Step 4: 커밋**

```bash
git add index.html css/style.css
git commit -m "Add page structure and styling for image compression tool"
```

---

### Task 3: Canvas 기반 압축 로직 (`js/app.js` 코어 함수)

**Files:**
- Create: `js/app.js`

**Interfaces:**
- Consumes: `formatBytes`, `isSupportedImageType`, `getOutputMimeType` (Task 1, 브라우저 전역으로 로드됨)
- Produces: `compressImage(file: File, quality: number): Promise<{ blob: Blob, url: string }>`
  - Task 4에서 이 함수를 호출해 압축 결과를 UI에 반영한다. `quality`는 0~1 사이 소수.

- [ ] **Step 1: `js/app.js`에 `compressImage` 함수 작성**

```js
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
```

- [ ] **Step 2: 브라우저 콘솔에서 수동 검증**

`index.html`을 브라우저로 열고, 개발자 도구 콘솔(F12)에서 직접 실행한다 (샘플 JPG 파일을 미리 아무 폴더에나 준비):

```js
document.getElementById('fileInput').addEventListener('change', function (e) {
  compressImage(e.target.files[0], 0.5).then(function (result) {
    console.log('압축 완료, blob 크기:', result.blob.size);
  }).catch(function (err) {
    console.error(err);
  });
});
```

Expected:
- 콘솔에 있는 코드를 붙여넣고, 화면의 파일 선택 버튼으로 JPG 이미지를 고르면 "압축 완료, blob 크기: (숫자)"가 출력된다
- 원본 파일 크기보다 압축된 blob 크기가 작다 (품질 0.5 기준)
- PNG, WebP 파일로도 같은 방식으로 테스트해서 에러 없이 동작하는지 확인한다
- GIF나 PDF처럼 지원하지 않는 파일을 선택하면 콘솔에 "지원하지 않는 파일 형식입니다." 에러가 출력된다

- [ ] **Step 3: 커밋**

```bash
git add js/app.js
git commit -m "Add canvas-based image compression core logic"
```

---

### Task 4: UI 연결 및 에러 처리 (`js/app.js` 이벤트 와이어링)

**Files:**
- Modify: `js/app.js` (Task 3에서 만든 `compressImage` 아래에 이어서 작성)

**Interfaces:**
- Consumes: `compressImage` (Task 3), `formatBytes`/`isSupportedImageType` (Task 1), Task 2에서 만든 DOM `id`들

- [ ] **Step 1: 상태 변수와 엘리먼트 참조 추가**

`js/app.js` 맨 위, `compressImage` 함수 앞에 추가:

```js
var selectedFile = null;

var fileInput = document.getElementById('fileInput');
var errorMessage = document.getElementById('errorMessage');
var controls = document.getElementById('controls');
var qualitySlider = document.getElementById('qualitySlider');
var qualityValue = document.getElementById('qualityValue');
var compressBtn = document.getElementById('compressBtn');
var previewArea = document.getElementById('previewArea');
var originalPreview = document.getElementById('originalPreview');
var compressedPreview = document.getElementById('compressedPreview');
var originalSize = document.getElementById('originalSize');
var compressedSize = document.getElementById('compressedSize');
var downloadBtn = document.getElementById('downloadBtn');

var MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
```

- [ ] **Step 2: 파일 선택 처리 + 에러 메시지 로직 추가**

`js/app.js` 맨 아래에 추가:

```js
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.textContent = '';
  errorMessage.hidden = true;
}

fileInput.addEventListener('change', function (e) {
  var file = e.target.files[0];
  clearError();
  controls.hidden = true;
  previewArea.hidden = true;
  selectedFile = null;

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
  downloadBtn.hidden = true;
});
```

- [ ] **Step 3: 슬라이더 표시값 갱신 + 압축 버튼 클릭 처리 추가**

`js/app.js` 맨 아래에 추가:

```js
qualitySlider.addEventListener('input', function () {
  qualityValue.textContent = qualitySlider.value;
});

compressBtn.addEventListener('click', function () {
  if (!selectedFile) {
    return;
  }
  clearError();
  compressBtn.disabled = true;
  compressBtn.textContent = '압축 중...';

  var quality = Number(qualitySlider.value) / 100;

  compressImage(selectedFile, quality)
    .then(function (result) {
      compressedPreview.src = result.url;
      compressedSize.textContent = '압축 크기: ' + formatBytes(result.blob.size);
      downloadBtn.href = result.url;

      var extension = selectedFile.type === 'image/png' ? 'png' : (selectedFile.type === 'image/webp' ? 'webp' : 'jpg');
      downloadBtn.download = 'compressed-image.' + extension;
      downloadBtn.hidden = false;
    })
    .catch(function (err) {
      showError(err.message);
    })
    .then(function () {
      compressBtn.disabled = false;
      compressBtn.textContent = '압축하기';
    });
});
```

- [ ] **Step 4: 브라우저에서 전체 흐름 수동 검증**

`index.html`을 브라우저로 새로고침해서 연다.
Expected 체크리스트:
- JPG 파일을 선택하면 원본 미리보기와 "원본 크기: X.X MB" 문구가 뜨고, 슬라이더/압축 버튼이 나타난다
- 슬라이더를 움직이면 옆의 % 숫자가 실시간으로 바뀐다
- "압축하기"를 누르면 잠깐 "압축 중..." 으로 바뀌었다가 압축본 미리보기와 "압축 크기: X.X KB"가 나타난다 (원본보다 작아야 함)
- "다운로드" 버튼을 누르면 압축된 이미지 파일이 다운로드된다
- PNG, WebP 파일로도 같은 흐름이 정상 동작한다
- 지원하지 않는 파일(txt 파일 등, 확장자를 바꿔서 테스트 가능)을 선택하면 에러 메시지가 뜨고 압축 버튼 영역은 나타나지 않는다
- 모바일 화면 크기(개발자 도구의 반응형 보기)에서도 레이아웃이 깨지지 않는다

- [ ] **Step 5: 커밋**

```bash
git add js/app.js
git commit -m "Wire up UI events and error handling for image compression flow"
```

---

### Task 5: README 작성 및 GitHub Pages 배포 (사용자 직접 수행)

**Files:**
- Create: `README.md`

이 태스크는 코드 작성이 아니라 **사용자가 직접 GitHub 웹사이트에서 클릭으로 진행하는 단계**입니다. Claude Code가 대신 로그인하거나 계정을 만들 수 없기 때문입니다.

**Interfaces:** 없음 (배포 단계)

- [ ] **Step 1: `README.md` 작성**

```markdown
# 이미지 압축 도구

브라우저에서만 동작하는 무료 이미지 압축 도구입니다. 사진이 서버로 전송되지 않고, 이 페이지 안에서만 처리됩니다.

## 로컬에서 테스트하기

`index.html` 파일을 더블클릭하면 브라우저에서 바로 열립니다.

## 배포 (GitHub Pages)

1. https://github.com 에서 계정을 만든다 (이미 있으면 로그인).
2. 오른쪽 위 `+` 버튼 → `New repository` 클릭. 저장소 이름을 `image-toolbox`로 입력하고 `Public`으로 설정한 뒤 `Create repository`.
3. 생성된 저장소 페이지에서 `uploading an existing file` 링크를 클릭.
4. 이 프로젝트 폴더 안의 모든 파일과 폴더(`index.html`, `css`, `js`, `README.md`)를 그대로 끌어다 놓는다 (`docs`, `tests`, `.git` 폴더는 올리지 않아도 됨).
5. 아래 `Commit changes` 버튼 클릭.
6. 저장소 상단 메뉴에서 `Settings` → 왼쪽 메뉴 `Pages` 클릭.
7. `Build and deployment` → `Branch`를 `main`, 폴더를 `/ (root)`로 선택하고 `Save`.
8. 1~2분 기다리면 같은 화면에 `https://<사용자명>.github.io/image-toolbox/` 형태의 주소가 표시된다. 그 주소로 접속해서 실제로 이미지 압축이 되는지 확인한다.
```

- [ ] **Step 2: 커밋**

```bash
git add README.md
git commit -m "Add README with GitHub Pages deployment instructions"
```

- [ ] **Step 3: 사용자가 위 README의 "배포" 절차를 따라 GitHub Pages에 실제로 배포한다.**

Expected: 배포된 URL에 접속했을 때 로컬에서 확인한 것과 동일하게 이미지 압축 도구가 정상 동작한다.

---

## 이후 계획 (이번 계획 범위 밖)

스펙의 1단계(리사이즈/포맷 변환/배치 처리), 2단계(SEO 콘텐츠), 3단계(광고 삽입), 4단계(도메인/프리미엄)는 이 MVP가 배포되어 정상 동작하는 것을 확인한 뒤 별도의 계획 문서로 작성한다.
