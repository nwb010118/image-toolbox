# 업스케일링 배율/해상도 선택 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `upscale.html`의 업스케일링을 2배 고정에서 2배/4배/1440p/4K 중 선택 가능하게 확장한다. AI 모델은 2배율 하나뿐이므로 2배 패스를 체이닝하고, 필요하면 캔버스로 정밀 축소해 목표 값을 정확히 맞춘다.

**Architecture:** 기존 구조를 유지한다. 배율/해상도 계산 로직(패스 수, 도달 가능 여부, 파일명)은 `js/upscaleTools.js`에 순수 함수로 추가해 Node로 유닛테스트하고, DOM 이벤트·패스 체이닝·최종 리사이즈·진행률 표시는 `js/upscaleApp.js`에서 그 함수들을 소비한다. `upscale.html`에는 라디오 버튼 그룹을 추가한다. 새 CDN 라이브러리는 추가하지 않는다 — 기존 `ESRGANSlim2x` 2배 모델을 여러 번 호출하는 것으로 해결한다.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES5 문법 위주), Canvas API, 기존 TensorFlow.js 4.22.0 / UpscalerJS 1.0.0 / `@upscalerjs/esrgan-slim` 1.0.0 CDN (버전 변경 없음). 테스트는 Node.js 내장 `assert` 모듈만 사용.

## Global Constraints

- 6배, 8배 등 2의 거듭제곱이 아니거나 4배를 초과하는 배율은 지원하지 않는다.
- 해상도 프리셋은 **긴 변** 기준으로 계산한다: `1440p` = 긴 변 2560px, `4K` = 긴 변 3840px. 원본 가로/세로 비율은 그대로 유지한다.
- AI 패스는 1회당 정확히 2배이며, 최대 2회(=4배)까지만 체이닝한다. 이 상한은 바꾸지 않는다.
- 원본이 너무 작아 AI 4배로도 목표 해상도(1440p/4K)에 못 미치면, 그 옵션은 라디오 버튼을 `disabled` 처리하고 안내 문구를 보여준다. 캔버스 보간으로 부족분을 채우는 방식은 쓰지 않는다.
- 도달 가능 여부 임계값: `1440p`는 긴 변 640px 미만이면 비활성화, `4K`는 긴 변 960px 미만이면 비활성화 (= 목표 긴 변 ÷ 4).
- 입력 이미지 크기 제한(가로·세로 각 최대 1000px)은 기존과 동일하게 유지한다. 이 제한 덕분에 AI 패스가 최대 2회로 고정되어 결과물 크기는 항상 최대 4000×4000px로 예측 가능하다.
- 새로운 CDN/외부 라이브러리를 추가하지 않는다. `js/upscaleApp.js`는 기존과 동일하게 싱글턴 `upscaler` 인스턴스(`Upscaler({ model: ESRGANSlim2x })`)를 재사용한다.
- 여러 장 일괄 처리는 범위 밖이다 (기존과 동일).
- 이미지 파일은 서버로 전송하지 않는다. 모든 처리는 브라우저 내부에서만 이루어진다 (기존과 동일).

---

### Task 1: 배율/해상도 계산 순수 함수 (`js/upscaleTools.js`)

**Files:**
- Modify: `js/upscaleTools.js`
- Modify: `tests/upscaleTools.test.js`

**Interfaces:**
- Consumes: 없음 (독립적인 순수 함수 모음)
- Produces:
  - `getUpscalePlan(mode, width, height): { reachable: boolean, aiPasses: number|null, targetLongEdge: number|null }` — `mode`는 `'2x' | '4x' | '1440p' | '4K'`
  - `isReachable(mode, width, height): boolean`
  - `getUpscaledFilename(originalFileName, mode): string` — **기존 시그니처에서 `mode` 매개변수가 추가됨** (breaking change)
  - `RESOLUTION_PRESETS: { '1440p': 2560, '4K': 3840 }`, `MAX_AI_PASSES: 2`, `MAX_AI_SCALE: 4`
  - Task 3에서 `js/upscaleApp.js`가 이 함수/상수들을 전역으로 가져다 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/upscaleTools.test.js`의 전체 내용을 아래로 교체한다:

```js
const assert = require('assert');
const {
  isValidFileSize,
  isValidUpscaleDimensions,
  getUpscaledFilename,
  getUpscalePlan,
  isReachable,
  MAX_FILE_SIZE,
  MAX_UPSCALE_DIMENSION,
  MAX_AI_PASSES,
  MAX_AI_SCALE,
  RESOLUTION_PRESETS
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

test('RESOLUTION_PRESETS has 1440p and 4K long-edge targets', () => {
  assert.strictEqual(RESOLUTION_PRESETS['1440p'], 2560);
  assert.strictEqual(RESOLUTION_PRESETS['4K'], 3840);
});

test('MAX_AI_PASSES is 2 and MAX_AI_SCALE is 4', () => {
  assert.strictEqual(MAX_AI_PASSES, 2);
  assert.strictEqual(MAX_AI_SCALE, 4);
});

test('getUpscalePlan for 2x mode needs exactly 1 AI pass and no final resize', () => {
  var plan = getUpscalePlan('2x', 500, 300);
  assert.strictEqual(plan.reachable, true);
  assert.strictEqual(plan.aiPasses, 1);
  assert.strictEqual(plan.targetLongEdge, null);
});

test('getUpscalePlan for 4x mode needs exactly 2 AI passes and no final resize', () => {
  var plan = getUpscalePlan('4x', 500, 300);
  assert.strictEqual(plan.reachable, true);
  assert.strictEqual(plan.aiPasses, 2);
  assert.strictEqual(plan.targetLongEdge, null);
});

test('getUpscalePlan for 1440p uses 1 AI pass when 1 pass already reaches target', () => {
  var plan = getUpscalePlan('1440p', 1280, 960);
  assert.strictEqual(plan.reachable, true);
  assert.strictEqual(plan.aiPasses, 1);
  assert.strictEqual(plan.targetLongEdge, 2560);
});

test('getUpscalePlan for 1440p uses 2 AI passes when 1 pass is not enough', () => {
  var plan = getUpscalePlan('1440p', 1000, 750);
  assert.strictEqual(plan.reachable, true);
  assert.strictEqual(plan.aiPasses, 2);
  assert.strictEqual(plan.targetLongEdge, 2560);
});

test('getUpscalePlan for 1440p is unreachable below 640px long edge', () => {
  var reachablePlan = getUpscalePlan('1440p', 640, 480);
  assert.strictEqual(reachablePlan.reachable, true);
  var unreachablePlan = getUpscalePlan('1440p', 639, 480);
  assert.strictEqual(unreachablePlan.reachable, false);
  assert.strictEqual(unreachablePlan.aiPasses, null);
});

test('getUpscalePlan for 4K is unreachable below 960px long edge', () => {
  var reachablePlan = getUpscalePlan('4K', 960, 540);
  assert.strictEqual(reachablePlan.reachable, true);
  var unreachablePlan = getUpscalePlan('4K', 959, 540);
  assert.strictEqual(unreachablePlan.reachable, false);
});

test('getUpscalePlan for 4K at max input size (1000px) needs 2 AI passes', () => {
  var plan = getUpscalePlan('4K', 1000, 1000);
  assert.strictEqual(plan.reachable, true);
  assert.strictEqual(plan.aiPasses, 2);
});

test('isReachable mirrors getUpscalePlan.reachable', () => {
  assert.strictEqual(isReachable('1440p', 640, 480), true);
  assert.strictEqual(isReachable('1440p', 639, 480), false);
  assert.strictEqual(isReachable('2x', 10, 10), true);
});

test('getUpscaledFilename appends the mode suffix and forces .png extension', () => {
  assert.strictEqual(getUpscaledFilename('photo.jpg', '2x'), 'photo-2x.png');
  assert.strictEqual(getUpscaledFilename('photo.png', '4x'), 'photo-4x.png');
  assert.strictEqual(getUpscaledFilename('a.b.jpg', '1440p'), 'a.b-1440p.png');
  assert.strictEqual(getUpscaledFilename('noext', '4K'), 'noext-4K.png');
});

if (process.exitCode !== 1) {
  console.log('\n모든 테스트 통과');
}
```

- [ ] **Step 2: 테스트 실행해서 실패하는지 확인**

Run: `node tests/upscaleTools.test.js`
Expected: `getUpscalePlan`, `isReachable` 등이 아직 정의되지 않아 `TypeError: getUpscalePlan is not a function` 로 실패 (exit code 1)

- [ ] **Step 3: 구현 작성**

`js/upscaleTools.js`의 전체 내용을 아래로 교체한다:

```js
(function (exports) {
  var MAX_FILE_SIZE = 20 * 1024 * 1024;
  var MAX_UPSCALE_DIMENSION = 1000;
  var AI_PASS_SCALE = 2; // 모델 1회 호출은 정확히 2배로 확대한다
  var MAX_AI_PASSES = 2; // 최대 2회 체이닝 (= 최대 4배)
  var MAX_AI_SCALE = Math.pow(AI_PASS_SCALE, MAX_AI_PASSES); // 4
  var RESOLUTION_PRESETS = { '1440p': 2560, '4K': 3840 }; // 긴 변 기준 목표 px
  var FILENAME_SUFFIXES = { '2x': '-2x', '4x': '-4x', '1440p': '-1440p', '4K': '-4K' };

  function isValidFileSize(bytes) {
    return typeof bytes === 'number' && !isNaN(bytes) && bytes > 0 && bytes <= MAX_FILE_SIZE;
  }

  function isValidUpscaleDimensions(width, height) {
    return typeof width === 'number' && !isNaN(width) && width >= 1 && width <= MAX_UPSCALE_DIMENSION &&
      typeof height === 'number' && !isNaN(height) && height >= 1 && height <= MAX_UPSCALE_DIMENSION;
  }

  function getUpscalePlan(mode, width, height) {
    if (mode === '2x') {
      return { reachable: true, aiPasses: 1, targetLongEdge: null };
    }
    if (mode === '4x') {
      return { reachable: true, aiPasses: 2, targetLongEdge: null };
    }

    var target = RESOLUTION_PRESETS[mode];
    var longEdge = Math.max(width, height);
    var requiredScale = target / longEdge;

    if (requiredScale <= AI_PASS_SCALE) {
      return { reachable: true, aiPasses: 1, targetLongEdge: target };
    }
    if (requiredScale <= MAX_AI_SCALE) {
      return { reachable: true, aiPasses: 2, targetLongEdge: target };
    }
    return { reachable: false, aiPasses: null, targetLongEdge: target };
  }

  function isReachable(mode, width, height) {
    return getUpscalePlan(mode, width, height).reachable;
  }

  function getUpscaledFilename(originalFileName, mode) {
    var lastDot = originalFileName.lastIndexOf('.');
    var base = lastDot === -1 ? originalFileName : originalFileName.slice(0, lastDot);
    return base + FILENAME_SUFFIXES[mode] + '.png';
  }

  exports.MAX_FILE_SIZE = MAX_FILE_SIZE;
  exports.MAX_UPSCALE_DIMENSION = MAX_UPSCALE_DIMENSION;
  exports.MAX_AI_PASSES = MAX_AI_PASSES;
  exports.MAX_AI_SCALE = MAX_AI_SCALE;
  exports.RESOLUTION_PRESETS = RESOLUTION_PRESETS;
  exports.isValidFileSize = isValidFileSize;
  exports.isValidUpscaleDimensions = isValidUpscaleDimensions;
  exports.getUpscalePlan = getUpscalePlan;
  exports.isReachable = isReachable;
  exports.getUpscaledFilename = getUpscaledFilename;
})(typeof module !== 'undefined' ? module.exports : window);
```

- [ ] **Step 4: 테스트 실행해서 통과하는지 확인**

Run: `node tests/upscaleTools.test.js`
Expected: 모든 테스트가 `PASS`로 출력되고, 마지막 줄에 `모든 테스트 통과` 출력, exit code 0

- [ ] **Step 5: 커밋**

```bash
git add js/upscaleTools.js tests/upscaleTools.test.js
git commit -m "Add multiplier/resolution plan calculation to upscaleTools"
```

---

### Task 2: 배율/해상도 선택 UI (`upscale.html`, `css/style.css`)

**Files:**
- Modify: `upscale.html`
- Modify: `css/style.css`

**Interfaces:**
- Consumes: 없음 (마크업/스타일만)
- Produces: 아래 `id`를 가진 새 DOM 엘리먼트. Task 3에서 그대로 참조한다.
  - `upscaleControls` (라디오 그룹을 감싸는 `<section class="controls">`)
  - `name="upscaleMode"`인 라디오 4개, `value`는 각각 `2x`/`4x`/`1440p`/`4K` (기본 체크: `2x`)
  - `upscaleNote1440p`, `upscaleNote4K` (도달 불가 안내 문구용 `<span>`)
  - `upscaleResultHeading` (결과 미리보기 제목 `<h2>`)
  - 기존 `upscaleBtn`은 유지하되 더 이상 자체 `hidden` 속성을 갖지 않는다 (부모 `upscaleControls`의 `hidden`으로 함께 보이고 감춰짐)

- [ ] **Step 1: `upscale.html` 마크업 수정**

`upscale.html`에서 아래 5곳을 찾아 교체한다.

**(a) title 태그** — 다음 줄을:
```html
  <title>이미지 업스케일링 - AI로 사진 화질 2배 확대</title>
```
다음으로 교체:
```html
  <title>이미지 업스케일링 - AI로 사진 화질 최대 4배, 4K까지 확대</title>
```

**(b) meta description / og:title / og:description** — 다음 3줄을:
```html
  <meta name="description" content="AI 모델로 사진을 2배 확대하는 무료 온라인 도구. 서버 전송 없이 브라우저에서 바로 처리합니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/upscale.html">
  <meta property="og:type" content="website">
  <meta property="og:title" content="이미지 업스케일링 - AI로 사진 화질 2배 확대">
  <meta property="og:description" content="AI 모델로 사진을 2배 확대하는 무료 온라인 도구.">
```
다음으로 교체:
```html
  <meta name="description" content="AI 모델로 사진을 2배, 4배 확대하거나 1440p·4K 해상도로 키우는 무료 온라인 도구. 서버 전송 없이 브라우저에서 바로 처리합니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/upscale.html">
  <meta property="og:type" content="website">
  <meta property="og:title" content="이미지 업스케일링 - AI로 사진 화질 최대 4배, 4K까지 확대">
  <meta property="og:description" content="AI 모델로 사진을 2배, 4배 확대하거나 1440p·4K 해상도로 키우는 무료 온라인 도구.">
```

**(c) subtitle** — 다음 줄을:
```html
    <p class="subtitle">사진이 서버로 전송되지 않고, 이 브라우저 안에서 AI로 2배 확대됩니다.</p>
```
다음으로 교체:
```html
    <p class="subtitle">사진이 서버로 전송되지 않고, 이 브라우저 안에서 AI로 확대됩니다.</p>
```

**(d) 버튼/진행 표시 블록** — 다음 2줄을:
```html
    <button id="upscaleBtn" hidden>2배로 확대</button>
    <p id="upscaleProgress" class="pdf-progress" hidden>처리 중...</p>
```
다음으로 교체:
```html
    <section class="controls" id="upscaleControls" hidden>
      <p class="upscale-mode-label">확대 방식 선택</p>
      <div class="upscale-mode-group">
        <label class="radio-label">
          <input type="radio" name="upscaleMode" value="2x" checked>
          2배
        </label>
        <label class="radio-label">
          <input type="radio" name="upscaleMode" value="4x">
          4배
        </label>
        <label class="radio-label">
          <input type="radio" name="upscaleMode" value="1440p">
          1440p로
          <span class="upscale-mode-note" id="upscaleNote1440p" hidden></span>
        </label>
        <label class="radio-label">
          <input type="radio" name="upscaleMode" value="4K">
          4K로
          <span class="upscale-mode-note" id="upscaleNote4K" hidden></span>
        </label>
      </div>
      <button id="upscaleBtn">확대하기</button>
    </section>
    <p id="upscaleProgress" class="pdf-progress" hidden>처리 중...</p>
```

**(e) 결과 제목** — 다음 줄을:
```html
        <h2>결과 (2배)</h2>
```
다음으로 교체:
```html
        <h2 id="upscaleResultHeading">결과</h2>
```

**(f) FAQ 답변** — 다음 블록을:
```html
      <details>
        <summary>몇 배까지 확대할 수 있나요?</summary>
        <p>현재는 2배 확대만 지원합니다.</p>
      </details>
```
다음으로 교체:
```html
      <details>
        <summary>몇 배까지 확대할 수 있나요?</summary>
        <p>2배, 4배 확대와 1440p·4K 해상도로 키우는 옵션을 지원합니다. AI 모델은 한 번에 2배씩만 확대할 수 있어서 내부적으로 최대 두 번(4배)까지 반복 적용하며, 그보다 더 큰 배율이 필요한 해상도 옵션은 원본 이미지가 충분히 클 때만 선택할 수 있습니다.</p>
      </details>
```

- [ ] **Step 2: `css/style.css`에 라디오 그룹 스타일 추가**

`.controls .checkbox-label { ... }` 규칙 바로 다음에 추가한다:

```css
.upscale-mode-label {
  font-weight: 600;
  margin: 0 0 10px;
}

.upscale-mode-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  color: var(--color-text);
}

.radio-label input[disabled] {
  cursor: not-allowed;
}

.upscale-mode-note {
  color: var(--color-text-secondary);
  font-size: 12px;
}
```

- [ ] **Step 3: 수동 확인**

`upscale.html`을 브라우저로 새로고침해서 연다.
Expected:
- 이미지를 아직 선택하지 않았으면 라디오 그룹이 보이지 않는다 (`upscaleControls`가 `hidden`)
- 개발자 도구에서 `document.getElementById('upscaleControls').hidden = false`를 실행하면 "확대 방식 선택" 아래 4개 라디오(2배/4배/1440p로/4K로)와 "확대하기" 버튼이 보인다
- 콘솔 에러가 없다
- (Task 3을 아직 구현하지 않았으므로 라디오를 눌러도, 이미지를 올려도 도달 불가 비활성화나 실제 업스케일링 동작은 없다 — 이 단계에서는 정상)

- [ ] **Step 4: 커밋**

```bash
git add upscale.html css/style.css
git commit -m "Add multiplier/resolution radio UI to upscale page"
```

---

### Task 3: 앱 로직 연결 (`js/upscaleApp.js`)

**Files:**
- Modify: `js/upscaleApp.js`

**Interfaces:**
- Consumes: `formatBytes`, `isSupportedImageType` (`js/imageTools.js`), `isValidFileSize`, `isValidUpscaleDimensions`, `getUpscalePlan`, `isReachable`, `getUpscaledFilename`, `MAX_UPSCALE_DIMENSION`, `RESOLUTION_PRESETS`, `MAX_AI_SCALE` (Task 1의 `js/upscaleTools.js`), Task 2의 `upscaleControls`/`upscaleMode` 라디오/`upscaleNote1440p`/`upscaleNote4K`/`upscaleResultHeading` DOM 요소, 전역 `Upscaler`, `ESRGANSlim2x` (CDN)
- Produces: 없음 (이 페이지의 종단 기능)

- [ ] **Step 1: `js/upscaleApp.js`의 전체 내용을 아래로 교체**

```js
// 이미지 업스케일링 도구 - 이벤트 와이어링

var upscaleUploadArea = document.getElementById('upscaleUploadArea');
var upscaleFileInput = document.getElementById('upscaleFileInput');
var upscaleError = document.getElementById('upscaleError');
var upscaleControls = document.getElementById('upscaleControls');
var upscaleBtn = document.getElementById('upscaleBtn');
var upscaleProgress = document.getElementById('upscaleProgress');
var upscalePreviewArea = document.getElementById('upscalePreviewArea');
var upscaleOriginalPreview = document.getElementById('upscaleOriginalPreview');
var upscaleOriginalSize = document.getElementById('upscaleOriginalSize');
var upscaleResultHeading = document.getElementById('upscaleResultHeading');
var upscaleResultPreview = document.getElementById('upscaleResultPreview');
var upscaleDownloadBtn = document.getElementById('upscaleDownloadBtn');
var upscaleModeRadios = document.querySelectorAll('input[name="upscaleMode"]');

var UPSCALE_MODE_LABELS = { '2x': '2배', '4x': '4배', '1440p': '1440p', '4K': '4K' };

var selectedUpscaleFile = null;
var selectedUpscaleDataUrl = null;
var selectedUpscaleWidth = null;
var selectedUpscaleHeight = null;
var upscaler = null;

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

function updateUpscaleModeAvailability(width, height) {
  var disabledCurrentlyChecked = false;

  for (var i = 0; i < upscaleModeRadios.length; i++) {
    var radio = upscaleModeRadios[i];
    var mode = radio.value;

    if (mode === '2x' || mode === '4x') {
      continue;
    }

    var reachable = isReachable(mode, width, height);
    radio.disabled = !reachable;
    if (!reachable && radio.checked) {
      disabledCurrentlyChecked = true;
    }

    var note = document.getElementById('upscaleNote' + mode);
    if (reachable) {
      note.hidden = true;
      note.textContent = '';
    } else {
      var minLongEdge = Math.ceil(RESOLUTION_PRESETS[mode] / MAX_AI_SCALE);
      note.textContent = '이 이미지로는 도달할 수 없어요 (긴 변 최소 ' + minLongEdge + 'px 필요)';
      note.hidden = false;
    }
  }

  if (disabledCurrentlyChecked) {
    document.querySelector('input[name="upscaleMode"][value="2x"]').checked = true;
  }
}

function handleUpscaleFile(file) {
  clearUpscaleError();
  upscaleControls.hidden = true;
  upscalePreviewArea.hidden = true;
  upscaleResultPreview.hidden = true;
  upscaleDownloadBtn.hidden = true;
  selectedUpscaleFile = null;
  selectedUpscaleDataUrl = null;
  selectedUpscaleWidth = null;
  selectedUpscaleHeight = null;

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
      selectedUpscaleWidth = img.naturalWidth;
      selectedUpscaleHeight = img.naturalHeight;

      upscaleOriginalPreview.src = selectedUpscaleDataUrl;
      upscaleOriginalSize.textContent = img.naturalWidth + ' × ' + img.naturalHeight + ' · ' + formatBytes(file.size);
      upscalePreviewArea.hidden = false;
      updateUpscaleModeAvailability(img.naturalWidth, img.naturalHeight);
      upscaleControls.hidden = false;
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

function chainOneUpscalePass(chain, passIndex, passCount, onProgress) {
  return chain.then(function (inputDataUrl) {
    return upscaler.upscale(inputDataUrl, {
      patchSize: 128,
      padding: 2,
      progress: function (amount) {
        onProgress((passIndex + amount) / passCount);
      }
    });
  });
}

function runUpscalePasses(dataUrl, passCount, onProgress) {
  var chain = Promise.resolve(dataUrl);
  for (var i = 0; i < passCount; i++) {
    chain = chainOneUpscalePass(chain, i, passCount, onProgress);
  }
  return chain;
}

function resizeDataUrlToLongEdge(dataUrl, targetLongEdge) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () {
      var scale = targetLongEdge / Math.max(img.naturalWidth, img.naturalHeight);
      var targetWidth = Math.round(img.naturalWidth * scale);
      var targetHeight = Math.round(img.naturalHeight * scale);
      var canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      var ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('2D 캔버스 컨텍스트를 생성할 수 없습니다.'));
        return;
      }
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = function () {
      reject(new Error('업스케일 결과 이미지를 불러올 수 없습니다.'));
    };
    img.src = dataUrl;
  });
}

upscaleBtn.addEventListener('click', function () {
  if (!selectedUpscaleDataUrl) {
    return;
  }
  clearUpscaleError();

  if (typeof Upscaler === 'undefined' || typeof ESRGANSlim2x === 'undefined') {
    showUpscaleError('업스케일링 기능을 불러오지 못했습니다. 인터넷 연결을 확인해주세요.');
    return;
  }

  var checkedRadio = document.querySelector('input[name="upscaleMode"]:checked');
  var mode = checkedRadio.value;
  var plan = getUpscalePlan(mode, selectedUpscaleWidth, selectedUpscaleHeight);

  upscaleBtn.disabled = true;
  upscaleBtn.textContent = '처리 중...';
  upscaleProgress.textContent = '처리 중... (0%)';
  upscaleProgress.hidden = false;
  upscaleResultPreview.hidden = true;
  upscaleDownloadBtn.hidden = true;

  if (!upscaler) {
    upscaler = new Upscaler({ model: ESRGANSlim2x });
  }

  runUpscalePasses(selectedUpscaleDataUrl, plan.aiPasses, function (fraction) {
    upscaleProgress.textContent = '처리 중... (' + Math.round(fraction * 100) + '%)';
  })
    .then(function (resultDataUrl) {
      if (plan.targetLongEdge) {
        return resizeDataUrlToLongEdge(resultDataUrl, plan.targetLongEdge);
      }
      return resultDataUrl;
    })
    .then(function (finalDataUrl) {
      upscaleResultHeading.textContent = '결과 (' + UPSCALE_MODE_LABELS[mode] + ')';
      upscaleResultPreview.src = finalDataUrl;
      upscaleResultPreview.hidden = false;
      upscaleDownloadBtn.href = finalDataUrl;
      upscaleDownloadBtn.download = getUpscaledFilename(selectedUpscaleFile.name, mode);
      upscaleDownloadBtn.hidden = false;
    })
    .catch(function (err) {
      console.error('Upscale failed:', err);
      showUpscaleError('업스케일링 중 오류가 발생했습니다. 다른 이미지로 다시 시도해주세요.');
    })
    .then(function () {
      upscaleBtn.disabled = false;
      upscaleBtn.textContent = '확대하기';
      upscaleProgress.hidden = true;
    });
});
```

- [ ] **Step 2: 브라우저에서 수동 검증**

`upscale.html`을 새로고침해서 연다.
Expected 체크리스트:
- 긴 변이 600px 미만인 작은 이미지를 선택하면 "1440p로"와 "4K로" 라디오가 회색으로 비활성화되고 각각 옆에 "이 이미지로는 도달할 수 없어요 (긴 변 최소 640px/960px 필요)" 문구가 보인다
- 800×600 이미지(긴 변 800px, 4K는 비활성화, 1440p는 활성화)를 선택하고 기본값 "2배"로 "확대하기"를 누르면 진행률이 "처리 중... (0%)"에서 점점 올라가며 결과가 정확히 1600×1200으로 나온다. 다운로드 파일명이 `<원본>-2x.png`
- 같은 이미지에서 "4배"를 선택해 확대하면 결과가 정확히 3200×2400으로 나오고, 진행률이 두 패스에 걸쳐 0%→100%까지 끊기지 않고 이어진다. 파일명이 `<원본>-4x.png`, 결과 제목이 "결과 (4배)"
- 같은 이미지에서 "1440p로"를 선택해 확대하면 결과의 긴 변이 정확히 2560px이고 짧은 변도 원본과 같은 비율로 축소되어 있다. 파일명이 `<원본>-1440p.png`
- 1000×1000 이미지로 "4K로"를 선택해 확대하면 내부적으로 4배(4000×4000) AI 패스 후 3840×3840으로 정밀 축소된 결과가 나온다
- 이미 비활성화된 상태에서 선택돼 있던 프리셋이 있는 이미지를 올렸다가, 그보다 작은 새 이미지로 교체하면 라디오 선택이 자동으로 "2배"로 되돌아간다
- 지원하지 않는 파일, 20MB 초과, 1000px 초과 이미지에서 기존과 동일하게 에러가 뜨고 진행되지 않는다
- 개발자 도구 콘솔에 에러가 없다

- [ ] **Step 3: 커밋**

```bash
git add js/upscaleApp.js
git commit -m "Wire multiplier/resolution selection into upscale app logic"
```

---

## Self-Review Notes

- **스펙 커버리지:** 스펙의 "핵심 알고리즘"(패스 수 계산, 도달 가능 여부, 진행률 환산)이 Task 1의 `getUpscalePlan`/`isReachable`과 Task 3의 `runUpscalePasses`/`chainOneUpscalePass`에 정확히 반영됨. "UI 변경"(라디오 그룹, 비활성화+안내 문구, 동적 제목/파일명)이 Task 2·3에 반영됨. "범위 밖"(6배/8배, 보간으로 마저 채우기, 일괄 처리, 1000px 제한 변경)은 코드에 추가하지 않음으로써 자연히 충족.
- **타입/인터페이스 일관성:** Task 1이 export하는 `getUpscalePlan`, `isReachable`, `getUpscaledFilename(name, mode)`, `RESOLUTION_PRESETS`, `MAX_AI_SCALE`이 Task 3에서 정확히 동일한 이름/시그니처로 쓰임. Task 2가 정의한 DOM id(`upscaleControls`, `upscaleNote1440p`, `upscaleNote4K`, `upscaleResultHeading`, `input[name="upscaleMode"]`)가 Task 3에서 정확히 동일하게 참조됨. `getUpscaledFilename`의 시그니처 변경(breaking change)이 Task 1의 테스트와 Task 3의 호출부 양쪽에 일관되게 반영됨.
- **플레이스홀더 검사:** TBD/TODO 없음. 모든 코드 블록은 실제로 붙여넣어 실행 가능한 내용.
