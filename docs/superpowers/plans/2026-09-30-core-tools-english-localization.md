# 핵심 도구 3페이지 영어 버전 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Product Hunt 런칭 대비, 실제 도구 기능이 있는 핵심 3페이지(압축/업스케일링/PDF변환)의 영어 버전을 `en/` 서브디렉토리에 추가하고, 기존 JS의 하드코딩된 한국어 동적 문자열(에러/진행상태/공유 문구 등)을 언어별로 전환되도록 개조한다.

**Architecture:** 순수 정적 HTML 사이트(빌드 도구 없음)에 `en/index.html`/`en/upscale.html`/`en/pdf.html` 3개 신규 파일을 추가한다. 기존 CSS/JS는 그대로 재사용하되, `js/strings.js`라는 신규 공용 문자열 테이블 파일을 추가하고 `js/app.js`/`js/upscaleApp.js`/`js/pdfApp.js`/`js/pdfConvertApp.js`/`js/shareUtil.js`의 하드코딩된 한국어 리터럴을 `t(key, params)` 호출로 교체한다. `document.documentElement.lang`이 `"en"`이면 영어, 아니면 한국어를 반환한다. 한국어 3페이지(`index.html`/`upscale.html`/`pdf.html`)에도 `hreflang` 교차 링크와 언어 전환(`EN`) 링크를 추가한다.

**Tech Stack:** 순수 HTML/CSS/바닐라 ES5 JS(기존 컨벤션: `var`, function expression, IIFE `exports` 패턴), Node 기반 무프레임워크 통합 테스트(`tests/` 디렉터리 기존 패턴), JSON-LD 구조화 데이터.

## Global Constraints

- 한국어 3페이지(`index.html`/`upscale.html`/`pdf.html`)의 **기존 사용자 노출 동작은 한 글자도 달라지면 안 된다** — `js/strings.js`의 `ko` 텍스트는 기존 하드코딩 문자열과 정확히 일치해야 하며, 모든 리팩터링 후 반드시 로컬 서버로 라이브 재검증한다.
- 기존 JS 코드 스타일을 따른다: `var` 선언, `function` 표현식(화살표 함수/`let`/`const` 금지), IIFE + `exports.xxx = ...` export 패턴(`js/imageTools.js`, `js/pdfTools.js`, `js/upscaleTools.js`, `js/pdfConvertTools.js`와 동일).
- `js/imageTools.js`, `js/pdfTools.js`, `js/upscaleTools.js`, `js/pdfConvertTools.js`(순수 로직 파일들)는 Node `require()`로 테스트되므로 **`document`/`window`에 의존하지 않아야 한다.** `js/strings.js`는 `typeof document !== 'undefined'` 가드로 Node 환경에서도 안전하게 로드되어야 한다(기본값 `'ko'`).
- `tests/sizeChange.test.js`의 기존 5개 테스트 케이스는 **한 줄도 수정하지 않는다** — `describeSizeChange`의 세 번째 인자 `lang`은 선택값이며 기본값 `'ko'`로 하위 호환을 보장한다.
- 신규 영어 페이지의 엘리먼트 `id`/`name`/`accept` 등 JS가 참조하는 속성은 한국어판과 **완전히 동일**해야 한다.
- 영어 페이지 nav는 `Compress`/`PDF Tools`/`Upscale` 3개 링크 + 언어 전환 링크만 포함하고 가이드 링크는 제외한다. Footer의 About/Contact/Privacy Policy, 그리고 본문 중 가이드 글·롱테일 페이지로의 "자세히 보기" 링크는 번역된 영어 텍스트로 유지하되 **기존 한국어 페이지로 그대로 링크**한다(번역하지 않음, 아웃 오브 스코프).
- `js/pdfConvertTools.js`의 내부 전용 가드 메시지(`'지원하지 않는 변환 형식입니다: '`, UI에서 도달 불가능한 방어 코드)는 이번 범위에서 다국어화하지 않는다.
- 커밋 메시지는 `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`로 끝낸다. 이 저장소는 git 명령을 직접 실행해도 되는 문서화된 예외 프로젝트다.
- 사이트 URL: `https://nwb010118.github.io/image-toolbox/`. Sitemap lastmod 날짜는 `2026-09-30`(오늘).

---

## Task 1: `js/strings.js` 공용 문자열 테이블 작성 (TDD)

**Files:**
- Create: `js/strings.js`
- Create: `tests/strings.test.js`

**Interfaces:**
- Produces: 전역(브라우저) 또는 `module.exports`(Node)로 `STRINGS`(원시 테이블), `LANG`(`'ko'`|`'en'`), `t(key, params)`(현재 `LANG` 기준 조회+치환), `resolveString(key, params, lang)`(언어를 명시적으로 지정해 조회+치환 — 테스트 및 이후 태스크에서 사용)를 노출한다.
- Consumes: 아무것도 소비하지 않음(최상위 유틸리티).

- [ ] **Step 1: 실패하는 테스트 작성**

```javascript
const assert = require('assert');
const { STRINGS, resolveString } = require('../js/strings');

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

test('every string key has both ko and en translations', function () {
  Object.keys(STRINGS).forEach(function (key) {
    var entry = STRINGS[key];
    assert.ok(typeof entry.ko === 'string' && entry.ko.length > 0, key + ' missing ko text');
    assert.ok(typeof entry.en === 'string' && entry.en.length > 0, key + ' missing en text');
  });
});

test('resolveString returns the ko text for lang=ko', function () {
  assert.strictEqual(resolveString('chooseFile', null, 'ko'), '파일 선택');
});

test('resolveString returns the en text for lang=en', function () {
  assert.strictEqual(resolveString('chooseFile', null, 'en'), 'Choose File');
});

test('resolveString substitutes a single {placeholder}', function () {
  assert.strictEqual(resolveString('originalSizeLabel', { size: '1.2 MB' }, 'ko'), '원본 크기: 1.2 MB');
  assert.strictEqual(resolveString('originalSizeLabel', { size: '1.2 MB' }, 'en'), 'Original size: 1.2 MB');
});

test('resolveString substitutes multiple {placeholders}', function () {
  assert.strictEqual(
    resolveString('processingPageProgress', { current: 2, total: 5 }, 'en'),
    'Processing... (2/5)'
  );
  assert.strictEqual(
    resolveString('processingPageProgress', { current: 2, total: 5 }, 'ko'),
    '처리 중... (2/5)'
  );
});

test('resolveString falls back to the key itself for an unknown key', function () {
  assert.strictEqual(resolveString('doesNotExist', null, 'en'), 'doesNotExist');
});

test('resolveString falls back to ko text when en is somehow missing', function () {
  var backupEn = STRINGS.chooseFile.en;
  delete STRINGS.chooseFile.en;
  assert.strictEqual(resolveString('chooseFile', null, 'en'), '파일 선택');
  STRINGS.chooseFile.en = backupEn;
});
```

- [ ] **Step 2: 실행해서 실패 확인**

Run: `node tests/strings.test.js`
Expected: `Cannot find module '../js/strings'` 에러로 전부 FAIL.

- [ ] **Step 3: `js/strings.js` 작성**

```javascript
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
```

- [ ] **Step 4: 테스트 재실행 — 전부 통과 확인**

Run: `node tests/strings.test.js`
Expected: 7개 테스트 전부 PASS.

- [ ] **Step 5: 커밋**

```bash
git add js/strings.js tests/strings.test.js
git commit -m "$(cat <<'EOF'
Add js/strings.js bilingual string lookup table

en/ 페이지 지원을 위한 공용 ko/en 문자열 테이블 + t()/resolveString() 헬퍼.
document.documentElement.lang으로 언어를 판정하며, Node 환경에서는 ko로 폴백한다.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `describeSizeChange`에 언어 인자 추가

**Files:**
- Modify: `js/imageTools.js:89-97`
- Modify: `tests/sizeChange.test.js`

**Interfaces:**
- Consumes: 없음(자체 완결). Task 1의 `js/strings.js`에 **의존하지 않는다** — 이 함수는 Node에서 `require`되므로 자체 ko/en 텍스트를 내부에 갖는다.
- Produces: `describeSizeChange(originalBytes, resultBytes, lang)` — `lang` 생략 시 기존과 동일한 `'ko'` 문자열 반환(하위 호환), `lang === 'en'`이면 영어 문자열 반환. Task 3에서 `js/app.js`가 세 번째 인자로 전역 `LANG`을 넘겨 호출한다.

- [ ] **Step 1: 기존 테스트가 여전히 통과하는지 먼저 확인(회귀 기준선)**

Run: `node tests/sizeChange.test.js`
Expected: 기존 5개 테스트 전부 PASS (아직 아무것도 안 건드림).

- [ ] **Step 2: `describeSizeChange`에 영어 케이스를 요구하는 실패 테스트 추가**

`tests/sizeChange.test.js` 끝에 아래 블록을 추가(기존 5줄의 `cases`/`for` 루프는 그대로 둔다):

```javascript
const enCases = [
  ['reduction (en)', 10240, 2048, 'en', 'About 80.0% smaller · 8.0 KB saved'],
  ['increase (en)', 1024, 2048, 'en', 'About 100.0% larger · 1.0 KB added'],
  ['unchanged (en)', 1024, 1024, 'en', 'No change in size'],
  ['zero input (en)', 0, 1024, 'en', 'Original size unavailable for comparison.'],
  ['tiny reduction (en)', 100000, 99999, 'en', 'Less than 0.1% smaller · 1 B saved']
];
for (const [name, original, result, lang, expected] of enCases) {
  assert.strictEqual(describeSizeChange(original, result, lang), expected);
  console.log('PASS: size change ' + name);
}
```

- [ ] **Step 3: 실행해서 실패 확인**

Run: `node tests/sizeChange.test.js`
Expected: 기존 5개는 PASS, 신규 5개 영어 케이스는 FAIL(현재 함수가 `lang` 인자를 무시하고 항상 한국어를 반환하므로).

- [ ] **Step 4: `describeSizeChange` 수정**

`js/imageTools.js`에서 아래 함수를:

```javascript
  function describeSizeChange(originalBytes, resultBytes) {
    if (originalBytes <= 0) return '원본 용량을 비교할 수 없습니다.';
    var difference = originalBytes - resultBytes;
    if (difference === 0) return '용량 변화 없음';
    var percent = Math.abs(difference) / originalBytes * 100;
    var percentage = percent < 0.1 ? '0.1% 미만' : percent.toFixed(1) + '%';
    return '약 ' + percentage + (difference > 0 ? ' 감소 · ' : ' 증가 · ')
      + formatBytes(Math.abs(difference)) + (difference > 0 ? ' 절약' : ' 증가');
  }
```

아래로 교체:

```javascript
  function describeSizeChange(originalBytes, resultBytes, lang) {
    lang = lang === 'en' ? 'en' : 'ko';
    if (originalBytes <= 0) {
      return lang === 'en' ? 'Original size unavailable for comparison.' : '원본 용량을 비교할 수 없습니다.';
    }
    var difference = originalBytes - resultBytes;
    if (difference === 0) {
      return lang === 'en' ? 'No change in size' : '용량 변화 없음';
    }
    var percent = Math.abs(difference) / originalBytes * 100;
    var sizeText = formatBytes(Math.abs(difference));
    if (lang === 'en') {
      var percentageEn = percent < 0.1 ? 'Less than 0.1%' : 'About ' + percent.toFixed(1) + '%';
      return percentageEn + (difference > 0 ? ' smaller · ' : ' larger · ')
        + sizeText + (difference > 0 ? ' saved' : ' added');
    }
    var percentageKo = percent < 0.1 ? '0.1% 미만' : percent.toFixed(1) + '%';
    return '약 ' + percentageKo + (difference > 0 ? ' 감소 · ' : ' 증가 · ')
      + sizeText + (difference > 0 ? ' 절약' : ' 증가');
  }
```

- [ ] **Step 5: 테스트 재실행 — 전부 통과 확인**

Run: `node tests/sizeChange.test.js`
Expected: 기존 5개 + 신규 5개, 총 10개 전부 PASS. 기존 5개의 기대값 문자열은 한 글자도 바뀌지 않았음을 diff로 재확인.

- [ ] **Step 6: 커밋**

```bash
git add js/imageTools.js tests/sizeChange.test.js
git commit -m "$(cat <<'EOF'
Add optional lang param to describeSizeChange for English output

기본값 'ko'로 하위 호환 유지, 기존 5개 테스트 케이스 무수정.
Node에서 require되는 순수 함수라 strings.js에는 의존하지 않고 자체 ko/en 텍스트를 갖는다.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `t()`/`LANG`을 4개 App.js + shareUtil.js에 배선 (가장 위험한 태스크 — 한국어 사이트를 깨뜨리지 않는 것이 최우선)

**Files:**
- Modify: `js/shareUtil.js`
- Modify: `js/app.js` (전체 재작성)
- Modify: `js/upscaleApp.js` (전체 재작성)
- Modify: `js/pdfApp.js` (전체 재작성)
- Modify: `js/pdfConvertApp.js` (전체 재작성)
- Modify: `index.html`, `upscale.html`, `pdf.html` — `<script src="js/strings.js">`를 각 페이지의 첫 번째 스크립트 태그로 추가
- Create: `tests/jsI18nWiring.test.js`

**Interfaces:**
- Consumes: Task 1의 전역 `t(key, params)`, `LANG`(브라우저에서 `window.t`/`window.LANG`로 노출됨). Task 2의 `describeSizeChange(a, b, lang)`.
- Produces: 한국어 페이지에서 기존과 동일한 한국어 텍스트, 영어 페이지(`lang="en"`)에서는 영어 텍스트가 나오는 5개 JS 파일. Task 4~6의 영어 페이지가 이 JS를 그대로 재사용한다.

- [ ] **Step 1: 실패하는 정적 검증 테스트 작성**

```javascript
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
  'pdf.html': 'src="js/pdfApp.js"'
};

Object.keys(APP_SCRIPT_BY_PAGE).forEach(function (page) {
  test(page + ' loads js/strings.js before ' + APP_SCRIPT_BY_PAGE[page], function () {
    var html = readRepoFile(page);
    var stringsIndex = html.indexOf('src="js/strings.js"');
    var appIndex = html.indexOf(APP_SCRIPT_BY_PAGE[page]);
    assert.ok(stringsIndex !== -1, page + ' missing js/strings.js script tag');
    assert.ok(appIndex !== -1, page + ' missing ' + APP_SCRIPT_BY_PAGE[page]);
    assert.ok(stringsIndex < appIndex, page + ' loads js/strings.js after its app script');
  });
});
```

- [ ] **Step 2: 실행해서 실패 확인**

Run: `node tests/jsI18nWiring.test.js`
Expected: 모든 "no longer hardcodes"/"calls t(...)"/"loads js/strings.js" 테스트가 FAIL(아직 아무 파일도 안 건드림).

- [ ] **Step 3: `js/shareUtil.js` 수정**

`js/shareUtil.js`에서:

```javascript
      navigator.clipboard.writeText(data.url).then(function () {
        if (statusEl) {
          statusEl.textContent = '링크가 복사되었습니다.';
          statusEl.hidden = false;
        }
      });
```

를 아래로 교체:

```javascript
      navigator.clipboard.writeText(data.url).then(function () {
        if (statusEl) {
          statusEl.textContent = t('linkCopied');
          statusEl.hidden = false;
        }
      });
```

- [ ] **Step 4: `js/app.js` 전체 재작성**

```javascript
var selectedFile = null;

var uploadArea = document.getElementById('uploadArea');
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
var compressionSavings = document.getElementById('compressionSavings');
var uploadHeading = uploadArea.querySelector('.upload-heading');
var uploadButton = uploadArea.querySelector('.upload-btn');
var compressWarning = document.getElementById('compressWarning');
var downloadBtn = document.getElementById('downloadBtn');
var pngSizeHint = document.getElementById('pngSizeHint');
var shareBtn = document.getElementById('shareBtn');
var shareStatus = document.getElementById('shareStatus');

var resizeWidth = document.getElementById('resizeWidth');
var resizeHeight = document.getElementById('resizeHeight');
var maintainAspectRatio = document.getElementById('maintainAspectRatio');
var formatSelect = document.getElementById('formatSelect');

var originalImageWidth = 0;
var originalImageHeight = 0;
var lastResultUrl = null;

var MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
var SHARE_URL = LANG === 'en'
  ? 'https://nwb010118.github.io/image-toolbox/en/index.html'
  : 'https://nwb010118.github.io/image-toolbox/';

function processImage(file, options) {
  return new Promise(function (resolve, reject) {
    if (!options.outputMimeType) {
      reject(new Error(t('unsupportedFormatGeneric')));
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
        reject(new Error(t('canvas2dUnavailable')));
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
            reject(new Error(t('imageProcessingFailed')));
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
      reject(new Error(t('imageLoadFailedGeneric')));
    };

    img.src = objectUrl;
  });
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.textContent = '';
  errorMessage.hidden = true;
}

function updatePngSizeHint() {
  if (!selectedFile) {
    pngSizeHint.hidden = true;
    return;
  }
  var outputMimeType = resolveOutputMimeType(selectedFile.type, formatSelect.value);
  pngSizeHint.hidden = outputMimeType !== 'image/png';
}

function handleFile(file) {
  clearError();
  compressionSavings.hidden = true;
  compressionSavings.textContent = '';
  uploadArea.classList.remove('has-file');
  uploadHeading.textContent = t('dropImageHere');
  uploadButton.textContent = t('chooseFile');
  controls.hidden = true;
  previewArea.hidden = true;
  selectedFile = null;
  originalImageWidth = 0;
  originalImageHeight = 0;
  resizeWidth.value = '';
  resizeHeight.value = '';
  pngSizeHint.hidden = true;
  shareBtn.hidden = true;
  shareStatus.hidden = true;
  shareStatus.textContent = '';
  if (lastResultUrl) {
    URL.revokeObjectURL(lastResultUrl);
    lastResultUrl = null;
  }

  if (!file) {
    return;
  }

  if (!isSupportedImageType(file.type)) {
    showError(t('unsupportedImageUpload'));
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    showError(t('fileTooLarge20MB'));
    return;
  }

  selectedFile = file;
  originalPreview.src = URL.createObjectURL(file);
  originalSize.textContent = t('originalSizeLabel', { size: formatBytes(file.size) });
  // Show editing controls only after the image has decoded.
  previewArea.hidden = false;
  compressedPreview.src = '';
  compressedSize.textContent = '';
  compressWarning.hidden = true;
  downloadBtn.hidden = true;
  updatePngSizeHint();
}

originalPreview.addEventListener('load', function () {
  if (!selectedFile) {
    return;
  }
  originalImageWidth = originalPreview.naturalWidth;
  originalImageHeight = originalPreview.naturalHeight;

  var prefill = clampDimensionsToMax(originalImageWidth, originalImageHeight);
  resizeWidth.value = prefill.width;
  resizeHeight.value = prefill.height;
  uploadHeading.textContent = selectedFile.name;
  uploadHeading.title = selectedFile.name;
  uploadButton.textContent = t('chooseAnotherImage');
  uploadArea.classList.add('has-file');
  controls.hidden = false;
  controls.focus({ preventScroll: true });
  controls.scrollIntoView({ behavior: 'instant', block: 'start' });
});

originalPreview.addEventListener('error', function () {
  if (!selectedFile) return;
  selectedFile = null;
  controls.hidden = true;
  previewArea.hidden = true;
  showError(t('imageLoadFailedChooseAnother'));
});

fileInput.addEventListener('change', function (e) {
  handleFile(e.target.files[0]);
});

uploadArea.addEventListener('click', function (e) {
  if (e.target !== fileInput) {
    fileInput.click();
  }
});

var dragCounter = 0;

uploadArea.addEventListener('dragenter', function (e) {
  e.preventDefault();
  dragCounter = dragCounter + 1;
  uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragover', function (e) {
  e.preventDefault();
});

uploadArea.addEventListener('dragleave', function () {
  dragCounter = dragCounter - 1;
  if (dragCounter <= 0) {
    dragCounter = 0;
    uploadArea.classList.remove('drag-over');
  }
});

uploadArea.addEventListener('drop', function (e) {
  e.preventDefault();
  dragCounter = 0;
  uploadArea.classList.remove('drag-over');
  var file = e.dataTransfer.files[0];
  fileInput.value = '';
  handleFile(file);
});

window.addEventListener('paste', function (e) {
  var items = e.clipboardData && e.clipboardData.items;
  if (!items) {
    return;
  }
  for (var i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image/') === 0) {
      var file = items[i].getAsFile();
      if (file) {
        fileInput.value = '';
        handleFile(file);
      }
      break;
    }
  }
});

qualitySlider.addEventListener('input', function () {
  qualityValue.textContent = qualitySlider.value;
});

compressBtn.addEventListener('click', function () {
  if (!selectedFile) {
    return;
  }
  clearError();
  compressWarning.hidden = true;

  var widthInput = readDimensionInput(resizeWidth);
  var heightInput = readDimensionInput(resizeHeight);

  if ((widthInput !== null && isNaN(widthInput)) || (heightInput !== null && isNaN(heightInput))) {
    showError(t('dimensionsMustBeNumbers'));
    return;
  }
  if ((widthInput !== null && !isValidDimensionInput(widthInput)) || (heightInput !== null && !isValidDimensionInput(heightInput))) {
    showError(t('dimensionsOutOfRange', { max: MAX_DIMENSION }));
    return;
  }

  var resolved = resolveDimensions(originalImageWidth, originalImageHeight, widthInput, heightInput);
  if (!isValidDimensionInput(resolved.width) || !isValidDimensionInput(resolved.height)) {
    showError(t('dimensionsOutOfRange', { max: MAX_DIMENSION }));
    return;
  }

  var outputMimeType = resolveOutputMimeType(selectedFile.type, formatSelect.value);

  compressBtn.disabled = true;
  compressBtn.textContent = t('processingEllipsis');

  var quality = Number(qualitySlider.value) / 100;

  processImage(selectedFile, {
    quality: quality,
    targetWidth: widthInput,
    targetHeight: heightInput,
    outputMimeType: outputMimeType
  })
    .then(function (result) {
      if (lastResultUrl) {
        URL.revokeObjectURL(lastResultUrl);
      }
      lastResultUrl = result.url;
      compressedPreview.src = result.url;
      compressedSize.textContent = t('resultSizeLabel', { size: formatBytes(result.blob.size), width: result.width, height: result.height });
      compressionSavings.textContent = describeSizeChange(selectedFile.size, result.blob.size, LANG);
      compressionSavings.classList.toggle('size-increased', result.blob.size > selectedFile.size);
      compressionSavings.hidden = false;
      compressWarning.hidden = result.blob.size <= selectedFile.size;
      downloadBtn.href = result.url;
      downloadBtn.download = 'processed-image.' + getExtensionForMimeType(result.blob.type);
      downloadBtn.hidden = false;
      shareBtn.hidden = false;
      shareStatus.hidden = true;
    })
    .catch(function (err) {
      showError(err.message);
    })
    .then(function () {
      compressBtn.disabled = false;
      compressBtn.textContent = t('applyButton');
    });
});

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

formatSelect.addEventListener('change', updatePngSizeHint);

wireShareButton(shareBtn, shareStatus, function () {
  return {
    title: t('compressShareTitle'),
    text: t('compressShareText'),
    url: SHARE_URL
  };
});
```

- [ ] **Step 5: `js/upscaleApp.js` 전체 재작성**

```javascript
// Image upscaling tool - event wiring

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
var upscaleShareBtn = document.getElementById('upscaleShareBtn');
var upscaleShareStatus = document.getElementById('upscaleShareStatus');
var upscaleModeRadios = document.querySelectorAll('input[name="upscaleMode"]');

var UPSCALE_MODE_LABELS = LANG === 'en'
  ? { '2x': '2x', '4x': '4x', '1440p': '1440p', '4K': '4K' }
  : { '2x': '2배', '4x': '4배', '1440p': '1440p', '4K': '4K' };
var SHARE_URL = LANG === 'en'
  ? 'https://nwb010118.github.io/image-toolbox/en/upscale.html'
  : 'https://nwb010118.github.io/image-toolbox/upscale.html';

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
      reject(new Error(t('imageLoadFailedNamed', { name: file.name })));
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
    throw new Error(t('canvas2dUnavailable'));
  }
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

function updateUpscaleModeAvailability(width, height) {
  var disabledCurrentlyChecked = false;

  for (var i = 0; i < upscaleModeRadios.length; i++) {
    var radio = upscaleModeRadios[i];
    var mode = radio.value;

    if (!RESOLUTION_PRESETS[mode]) {
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
      note.textContent = t('modeUnreachableNote', { min: minLongEdge });
      note.hidden = false;
    }
  }

  if (disabledCurrentlyChecked) {
    document.querySelector('input[name="upscaleMode"][value="2x"]').checked = true;
  }
}

function handleUpscaleFile(file) {
  if (upscaleBtn.disabled) {
    showUpscaleError(t('busyCannotSelectNew'));
    return;
  }

  clearUpscaleError();
  upscaleControls.hidden = true;
  upscalePreviewArea.hidden = true;
  upscaleResultPreview.hidden = true;
  upscaleDownloadBtn.hidden = true;
  upscaleShareBtn.hidden = true;
  upscaleShareStatus.hidden = true;
  upscaleShareStatus.textContent = '';
  upscaleResultHeading.textContent = t('resultLabel');
  selectedUpscaleFile = null;
  selectedUpscaleDataUrl = null;
  selectedUpscaleWidth = null;
  selectedUpscaleHeight = null;

  if (!file) {
    return;
  }

  if (!isSupportedImageType(file.type)) {
    showUpscaleError(t('unsupportedFormatNamed', { name: file.name }));
    return;
  }
  if (!isValidFileSize(file.size)) {
    showUpscaleError(t('fileTooLargeNamed20MB', { name: file.name }));
    return;
  }

  loadImageFile(file)
    .then(function (img) {
      if (!isValidUpscaleDimensions(img.naturalWidth, img.naturalHeight)) {
        showUpscaleError(t('imageTooLarge', { max: MAX_UPSCALE_DIMENSION }));
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

window.addEventListener('paste', function (e) {
  var items = e.clipboardData && e.clipboardData.items;
  if (!items) {
    return;
  }
  for (var i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image/') === 0) {
      var file = items[i].getAsFile();
      if (file) {
        upscaleFileInput.value = '';
        handleUpscaleFile(file);
      }
      break;
    }
  }
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
        reject(new Error(t('canvas2dUnavailable')));
        return;
      }
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = function () {
      reject(new Error(t('upscaleResultImageFailed')));
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
    showUpscaleError(t('upscaleLibraryLoadFailed'));
    return;
  }

  var checkedRadio = document.querySelector('input[name="upscaleMode"]:checked');
  var mode = checkedRadio.value;
  var plan = getUpscalePlan(mode, selectedUpscaleWidth, selectedUpscaleHeight);

  if (!plan.reachable) {
    showUpscaleError(t('resolutionUnreachable'));
    return;
  }

  var runFileName = selectedUpscaleFile.name;

  upscaleBtn.disabled = true;
  upscaleBtn.textContent = t('processingEllipsis');
  upscaleProgress.textContent = t('processingPercent', { percent: 0 });
  upscaleProgress.hidden = false;
  upscaleResultPreview.hidden = true;
  upscaleDownloadBtn.hidden = true;

  if (!upscaler) {
    upscaler = new Upscaler({ model: ESRGANSlim2x });
  }

  runUpscalePasses(selectedUpscaleDataUrl, plan.aiPasses, function (fraction) {
    upscaleProgress.textContent = t('processingPercent', { percent: Math.round(fraction * 100) });
  })
    .then(function (resultDataUrl) {
      if (plan.targetLongEdge) {
        return resizeDataUrlToLongEdge(resultDataUrl, plan.targetLongEdge);
      }
      return resultDataUrl;
    })
    .then(function (finalDataUrl) {
      upscaleResultHeading.textContent = t('resultWithMode', { mode: UPSCALE_MODE_LABELS[mode] });
      upscaleResultPreview.src = finalDataUrl;
      upscaleResultPreview.hidden = false;
      upscaleDownloadBtn.href = finalDataUrl;
      upscaleDownloadBtn.download = getUpscaledFilename(runFileName, mode);
      upscaleDownloadBtn.hidden = false;
      upscaleShareBtn.hidden = false;
      upscaleShareStatus.hidden = true;
    })
    .catch(function (err) {
      console.error('Upscale failed:', err);
      showUpscaleError(t('upscaleFailed'));
    })
    .then(function () {
      upscaleBtn.disabled = false;
      upscaleBtn.textContent = t('upscaleButton');
      upscaleProgress.hidden = true;
    });
});

wireShareButton(upscaleShareBtn, upscaleShareStatus, function () {
  return {
    title: t('upscaleShareTitle'),
    text: t('upscaleShareText'),
    url: SHARE_URL
  };
});
```

- [ ] **Step 6: `js/pdfApp.js` 전체 재작성**

```javascript
// PDF tools - image to PDF and PDF to image event wiring

var imgToPdfUploadArea = document.getElementById('imgToPdfUploadArea');
var imgToPdfFileInput = document.getElementById('imgToPdfFileInput');
var imgToPdfError = document.getElementById('imgToPdfError');
var imgToPdfFileList = document.getElementById('imgToPdfFileList');
var imgToPdfBtn = document.getElementById('imgToPdfBtn');
var imgToPdfDownloadBtn = document.getElementById('imgToPdfDownloadBtn');
var imgToPdfShareBtn = document.getElementById('imgToPdfShareBtn');
var imgToPdfShareStatus = document.getElementById('imgToPdfShareStatus');

var PDF_SHARE_URL = LANG === 'en'
  ? 'https://nwb010118.github.io/image-toolbox/en/pdf.html'
  : 'https://nwb010118.github.io/image-toolbox/pdf.html';

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
  imgToPdfShareBtn.hidden = true;
  imgToPdfShareStatus.hidden = true;
  imgToPdfShareStatus.textContent = '';
  if (lastPdfUrl) {
    URL.revokeObjectURL(lastPdfUrl);
    lastPdfUrl = null;
  }
  imgToPdfDownloadBtn.removeAttribute('href');
  selectedImageFiles = [];
  renderImgToPdfFileList();

  if (!files || files.length === 0) {
    return;
  }

  if (!isValidImageCount(files.length)) {
    showImgToPdfError(t('tooManyImages', { max: MAX_IMAGE_COUNT }));
    return;
  }

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    if (!isSupportedImageType(file.type)) {
      showImgToPdfError(t('unsupportedFormatNamed', { name: file.name }));
      return;
    }
    if (!isValidFileSize(file.size)) {
      showImgToPdfError(t('fileTooLargeNamed20MB', { name: file.name }));
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

window.addEventListener('paste', function (e) {
  var items = e.clipboardData && e.clipboardData.items;
  if (!items) {
    return;
  }
  var pastedImages = [];
  for (var i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image/') === 0) {
      var file = items[i].getAsFile();
      if (file) {
        pastedImages.push(file);
      }
    }
  }
  if (pastedImages.length > 0) {
    imgToPdfFileInput.value = '';
    handleImageFiles(pastedImages);
  }
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
        reject(new Error(t('canvas2dUnavailable')));
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
      reject(new Error(t('imageLoadFailedNamed', { name: file.name })));
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
    showImgToPdfError(t('pdfLibraryLoadFailed'));
    return;
  }

  imgToPdfBtn.disabled = true;
  imgToPdfBtn.textContent = t('convertingEllipsis');

  buildPdfFromImages(selectedImageFiles)
    .then(function (blob) {
      if (lastPdfUrl) {
        URL.revokeObjectURL(lastPdfUrl);
      }
      lastPdfUrl = URL.createObjectURL(blob);
      imgToPdfDownloadBtn.href = lastPdfUrl;
      imgToPdfDownloadBtn.download = getPdfOutputFilename();
      imgToPdfDownloadBtn.hidden = false;
      imgToPdfShareBtn.hidden = false;
      imgToPdfShareStatus.hidden = true;
    })
    .catch(function (err) {
      showImgToPdfError(err.message);
    })
    .then(function () {
      imgToPdfBtn.disabled = false;
      imgToPdfBtn.textContent = t('convertToPdfButton');
    });
});

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

var pdfToImgUploadArea = document.getElementById('pdfToImgUploadArea');
var pdfToImgFileInput = document.getElementById('pdfToImgFileInput');
var pdfToImgError = document.getElementById('pdfToImgError');
var pdfToImgProgress = document.getElementById('pdfToImgProgress');
var pdfToImgPages = document.getElementById('pdfToImgPages');

var pdfPageUrls = [];
var isProcessingPdf = false;

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
  img.alt = t('pageAltLabel', { n: pageNumber });

  var link = document.createElement('a');
  link.className = 'btn';
  link.href = url;
  link.download = getPageImageFilename(baseName, pageNumber, totalPages);
  link.textContent = t('pageDownloadLabel', { n: pageNumber });

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
      return Promise.reject(new Error(t('canvas2dUnavailable')));
    }
    return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () {
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) {
            reject(new Error(t('pageImageFailed', { n: pageNumber })));
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
  pdfToImgProgress.textContent = t('loadingPdf');

  var baseName = getBaseFileName(file.name);
  var objectUrl = URL.createObjectURL(file);

  return pdfjsLib.getDocument(objectUrl).promise
    .catch(function () {
      URL.revokeObjectURL(objectUrl);
      throw new Error(t('pdfReadFailed'));
    })
    .then(function (pdfDoc) {
      URL.revokeObjectURL(objectUrl);

      if (!isValidPageCount(pdfDoc.numPages)) {
        throw new Error(t('tooManyPages', { max: MAX_PDF_PAGES }));
      }

      var totalPages = pdfDoc.numPages;
      var pageNumbers = [];
      for (var i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }

      return pageNumbers.reduce(function (promise, pageNumber) {
        return promise.then(function () {
          pdfToImgProgress.textContent = t('processingPageProgress', { current: pageNumber, total: totalPages });
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
    showPdfToImgError(t('pdfOnlyUpload'));
    return;
  }
  if (!isValidFileSize(file.size)) {
    showPdfToImgError(t('fileTooLarge20MBGeneric'));
    return;
  }
  if (typeof pdfjsLib === 'undefined') {
    showPdfToImgError(t('pdfLibraryLoadFailed'));
    return;
  }
  if (isProcessingPdf) {
    showPdfToImgError(t('pdfBusy'));
    return;
  }

  isProcessingPdf = true;

  processPdfFile(file)
    .then(function () {
      pdfToImgProgress.hidden = true;
    })
    .catch(function (err) {
      pdfToImgProgress.hidden = true;
      showPdfToImgError(err.message);
    })
    .then(function () {
      isProcessingPdf = false;
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

wireShareButton(imgToPdfShareBtn, imgToPdfShareStatus, function () {
  return {
    title: t('pdfShareTitle'),
    text: t('imgToPdfShareText'),
    url: PDF_SHARE_URL
  };
});
```

- [ ] **Step 7: `js/pdfConvertApp.js` 전체 재작성**

```javascript
// PDF to document conversion (PPT/Word/Excel) - event wiring

var pdfConvertUploadArea = document.getElementById('pdfConvertUploadArea');
var pdfConvertFileInput = document.getElementById('pdfConvertFileInput');
var pdfConvertError = document.getElementById('pdfConvertError');
var pdfConvertControls = document.getElementById('pdfConvertControls');
var pdfConvertBtn = document.getElementById('pdfConvertBtn');
var pdfConvertProgress = document.getElementById('pdfConvertProgress');
var pdfConvertDownloadBtn = document.getElementById('pdfConvertDownloadBtn');
var pdfConvertShareBtn = document.getElementById('pdfConvertShareBtn');
var pdfConvertShareStatus = document.getElementById('pdfConvertShareStatus');

var PDF_CONVERT_SHARE_URL = LANG === 'en'
  ? 'https://nwb010118.github.io/image-toolbox/en/pdf.html'
  : 'https://nwb010118.github.io/image-toolbox/pdf.html';

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
  if (isConvertingPdf) {
    showPdfConvertError(t('convertBusy'));
    return;
  }
  pdfConvertControls.hidden = true;
  pdfConvertDownloadBtn.hidden = true;
  pdfConvertShareBtn.hidden = true;
  pdfConvertShareStatus.hidden = true;
  pdfConvertShareStatus.textContent = '';
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
    showPdfConvertError(t('pdfOnlyUpload'));
    return;
  }
  if (!isValidFileSize(file.size)) {
    showPdfConvertError(t('fileTooLarge20MBGeneric'));
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
      return Promise.reject(new Error(t('canvas2dUnavailable')));
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
      pdfConvertProgress.textContent = t('processingPageProgress', { current: pageNumber, total: totalPages });
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
      pdfConvertProgress.textContent = t('readingTextProgress', { current: pageNumber, total: totalPages });
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

function runPdfConversion(pdfDoc, totalPages, format) {
  if (format === 'ppt') {
    return convertPdfToPptx(pdfDoc, totalPages);
  }
  if (format === 'word' || format === 'excel') {
    return extractPdfConvertPagesLines(pdfDoc, totalPages).then(function (pagesLines) {
      if (!hasSubstantialText(concatenatePagesLinesText(pagesLines))) {
        throw new Error(t('scannedPdfNoText'));
      }
      if (format === 'word') {
        return convertPdfToDocx(pagesLines);
      }
      return convertPdfToXlsx(pagesLines);
    });
  }
  return Promise.reject(new Error(t('unsupportedConvertFormat', { format: format })));
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
    showPdfConvertError(t('documentLibraryLoadFailed'));
    return;
  }

  isConvertingPdf = true;
  pdfConvertBtn.disabled = true;
  pdfConvertBtn.textContent = t('convertingEllipsis');
  pdfConvertProgress.hidden = false;
  pdfConvertProgress.textContent = t('loadingPdf');
  pdfConvertDownloadBtn.hidden = true;

  var baseName = getBaseFileName(selectedPdfConvertFile.name);
  var objectUrl = URL.createObjectURL(selectedPdfConvertFile);

  pdfjsLib.getDocument(objectUrl).promise
    .catch(function () {
      URL.revokeObjectURL(objectUrl);
      throw new Error(t('pdfReadFailed'));
    })
    .then(function (pdfDoc) {
      URL.revokeObjectURL(objectUrl);

      if (!isValidPageCount(pdfDoc.numPages)) {
        throw new Error(t('tooManyPages', { max: MAX_PDF_PAGES }));
      }
      if (format === 'ppt' && pdfDoc.numPages > MAX_PPT_CONVERSION_PAGES) {
        throw new Error(t('pptPageLimitExceeded', { max: MAX_PPT_CONVERSION_PAGES }));
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
      pdfConvertShareBtn.hidden = false;
      pdfConvertShareStatus.hidden = true;
    })
    .catch(function (err) {
      showPdfConvertError(err.message);
    })
    .then(function () {
      isConvertingPdf = false;
      pdfConvertBtn.disabled = false;
      pdfConvertBtn.textContent = t('convertButton');
      pdfConvertProgress.hidden = true;
    });
});

wireShareButton(pdfConvertShareBtn, pdfConvertShareStatus, function () {
  return {
    title: t('pdfShareTitle'),
    text: t('pdfConvertShareText'),
    url: PDF_CONVERT_SHARE_URL
  };
});
```

- [ ] **Step 8: 3개 한국어 페이지에 `js/strings.js` 스크립트 태그 추가**

`index.html`에서:
```html
  <script src="js/imageTools.js"></script>
  <script src="js/shareUtil.js"></script>
  <script src="js/app.js"></script>
```
를:
```html
  <script src="js/strings.js"></script>
  <script src="js/imageTools.js"></script>
  <script src="js/shareUtil.js"></script>
  <script src="js/app.js"></script>
```
로 교체.

`upscale.html`에서:
```html
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js" integrity="sha384-vE8hbVJ4lezako5rlvE7bY0BVzWlFhZncPlckrqNwcUQpVtgbENTgZ8TBbnPjZre" crossorigin="anonymous"></script>
```
바로 앞에:
```html
  <script src="js/strings.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js" integrity="sha384-vE8hbVJ4lezako5rlvE7bY0BVzWlFhZncPlckrqNwcUQpVtgbENTgZ8TBbnPjZre" crossorigin="anonymous"></script>
```
로 교체(즉 `js/strings.js` 한 줄만 그 앞에 삽입).

`pdf.html`에서:
```html
  <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js" integrity="sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e" crossorigin="anonymous"></script>
```
바로 앞에 `<script src="js/strings.js"></script>` 한 줄을 삽입.

- [ ] **Step 9: `tests/jsI18nWiring.test.js` 재실행 — 전부 통과 확인**

Run: `node tests/jsI18nWiring.test.js`
Expected: 전부 PASS.

- [ ] **Step 10: 전체 회귀 테스트 재실행**

Run:
```bash
node tests/imageTools.test.js
node tests/sizeChange.test.js
node tests/upscaleTools.test.js
node tests/pdfTools.test.js
node tests/pdfConvertTools.test.js
node tests/seoPagesIntegrity.test.js
node tests/strings.test.js
node tests/jsI18nWiring.test.js
```
Expected: 전부 PASS, 회귀 없음(이 태스크는 순수 로직 파일을 건드리지 않았으므로 원래도 영향 없어야 함).

- [ ] **Step 11: 로컬 서버로 한국어 3페이지 라이브 재검증 (필수 — 이 태스크의 핵심 위험 지점)**

```bash
python3 -m http.server 8890
```

브라우저(Claude Browser 또는 claude-in-chrome)로 `http://localhost:8890/index.html`, `/upscale.html`, `/pdf.html`을 열어 각각:
- 파일 선택 버튼 텍스트, 드롭 영역 안내 문구가 기존과 동일한 한국어로 보이는지
- 실제 이미지를 업로드해 처리(압축/업스케일링/PDF변환)까지 끝까지 실행해 결과 크기 표시, 진행 상태 문구, 완료 후 버튼 텍스트가 전부 기존과 동일한 한국어인지
- 의도적으로 에러를 유발(예: 20MB 초과 파일 대신 지원하지 않는 파일 형식 업로드)해 에러 메시지가 기존과 동일한 한국어인지
- "사이트 공유하기" 버튼 클릭 시(클립보드 폴백 경로) "링크가 복사되었습니다." 문구가 뜨는지
- 브라우저 콘솔에 `t is not defined`, `LANG is not defined` 같은 에러가 없는지

브라우저 캐시 때문에 수정 전 JS가 남아있을 수 있으므로, 반드시 **새 포트로 서버를 재시작하고 새 탭으로 열어서** 확인한다(이 프로젝트에서 과거에 겪었던 캐시 함정).

- [ ] **Step 12: 커밋**

```bash
git add js/shareUtil.js js/app.js js/upscaleApp.js js/pdfApp.js js/pdfConvertApp.js index.html upscale.html pdf.html tests/jsI18nWiring.test.js
git commit -m "$(cat <<'EOF'
Wire js/strings.js into all dynamic UI text across the 3 tool pages

app.js/upscaleApp.js/pdfApp.js/pdfConvertApp.js/shareUtil.js의 하드코딩된
한국어 에러/진행상태/공유 문구를 전부 t()로 교체. 한국어 3페이지는 동작 무변경
(js/strings.js의 ko 텍스트가 기존 하드코딩 문자열과 정확히 일치), lang="en"
페이지에서는 영어로 전환된다. 공유 버튼 URL도 LANG에 따라 분기.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `en/index.html` 작성

**Files:**
- Create: `en/index.html`

**Interfaces:**
- Consumes: Task 3에서 리팩터링된 `../js/strings.js`, `../js/imageTools.js`, `../js/shareUtil.js`, `../js/app.js`(수정 없이 그대로 재사용), `../css/style.css`, `../css/site.css`
- Produces: `lang="en"`인 완결된 페이지. Task 7에서 `index.html`과 `hreflang`으로 상호 연결된다.

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="../favicon.svg">
  <link rel="apple-touch-icon" href="../images/apple-touch-icon.png">
  <link rel="manifest" href="../manifest.json">
  <meta name="theme-color" content="#116b5d">
  <title>Free Image Compressor - Compress, Convert &amp; Resize in Your Browser</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="Compress, convert, and upscale your photos for free, right in your browser. No uploads, no sign-up. Supports JPG, PNG, and WebP.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/en/index.html">
  <link rel="alternate" hreflang="ko" href="https://nwb010118.github.io/image-toolbox/">
  <link rel="alternate" hreflang="en" href="https://nwb010118.github.io/image-toolbox/en/index.html">
  <link rel="alternate" hreflang="x-default" href="https://nwb010118.github.io/image-toolbox/">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Free Image Compressor - Compress, Convert &amp; Resize in Your Browser">
  <meta property="og:description" content="Compress, convert, and upscale your photos for free, right in your browser. No uploads, no sign-up.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/en/index.html">
  <meta property="og:locale" content="en_US">
  <meta property="og:image" content="https://nwb010118.github.io/image-toolbox/images/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://nwb010118.github.io/image-toolbox/images/og-image.png">
  <link rel="stylesheet" href="../css/style.css">
  <link rel="stylesheet" href="../css/site.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Image Compressor",
    "url": "https://nwb010118.github.io/image-toolbox/en/index.html",
    "description": "Compress, convert, and upscale your photos for free, right in your browser. No uploads, no sign-up. Supports JPG, PNG, and WebP.",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Are my uploaded photos stored on a server?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. This tool never sends your images to any server. Compression happens entirely on your device using the browser's Canvas API, and the result disappears once you leave the page."
        }
      },
      {
        "@type": "Question",
        "name": "Which file formats are supported?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can upload JPG, PNG, or WebP images, and save the result as any of those three formats."
        }
      },
      {
        "@type": "Question",
        "name": "How do I set the compression quality?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Use the slider to choose a quality between 10% and 100%. Lower values produce smaller files but reduce image quality. If the result ends up larger than the original, a warning is shown before you download."
        }
      },
      {
        "@type": "Question",
        "name": "How much can I shrink a photo's file size?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "It depends on how far you lower the quality, but a 50-90% reduction from the original is typical. Results vary with the photo's original format and content."
        }
      },
      {
        "@type": "Question",
        "name": "Can I also resize the image dimensions?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Enter width and height directly, or turn on \"Keep aspect ratio\" and enter just one value — the other is calculated automatically to match the original proportions."
        }
      },
      {
        "@type": "Question",
        "name": "Do I need to sign up or install anything?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. You can use it right away in your browser, with no account and no software to install."
        }
      }
    ]
  }
  </script>
</head>
<body class="page-tool page-compress">
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <header class="site-header">
    <div class="header-inner">
      <a class="site-brand" href="index.html" aria-label="image toolbox home"><svg class="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="8" fill="currentColor"/><path d="M8 11h16M8 16h11M8 21h7" stroke="white" stroke-width="2" stroke-linecap="round"/><path d="m21 18 3 3-3 3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>image toolbox<span style="color:var(--color-accent)">.</span></span></a>
      <nav class="site-nav" aria-label="Main menu">
        <a href="index.html" aria-current="page">Compress</a>
        <a href="pdf.html">PDF Tools</a>
        <a href="upscale.html">Upscale</a>
        <a href="../index.html">한국어</a>
      </nav>
    </div>
  </header>
  <noscript><p class="noscript-banner">This site doesn't work with JavaScript disabled. Please enable JavaScript in your browser to use the image compressor.</p></noscript>
  <main class="container" id="main-content">
    <p class="eyebrow">IMAGE TOOLS</p>
    <h1>Compress &amp; Convert Images</h1>
    <p class="subtitle">Reduce file size, resize, and convert format — all for free, right in your browser.</p>

    <div class="tool-intro-grid">
<section class="upload-area" id="uploadArea">
      <input type="file" id="fileInput" class="visually-hidden" accept="image/jpeg,image/png,image/webp">
      <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 3v12"></path>
        <path d="M7 8l5-5 5 5"></path>
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path>
      </svg>
      <h2 class="upload-heading">Drop your image here</h2>
      <button type="button" class="upload-btn">Choose File</button>
      <p class="upload-hint">or drag and drop a file into this area</p>
      <p class="upload-formats">JPG, PNG, WebP · one file at a time · up to 20MB</p>
      <div id="errorMessage" class="error-message" hidden></div>
    </section>
<aside class="compression-example" aria-labelledby="example-title">
  <span class="example-label">MEASURED EXAMPLE</span>
  <h2 id="example-title">How much smaller?</h2>
  <div class="example-sizes"><div><span>Original PNG</span><strong>1.72 <small>MB</small></strong></div><span aria-hidden="true">→</span><div><span>Converted to JPG</span><strong>113 <small>KB</small></strong></div></div>
  <p class="example-saving">93.6% smaller</p>
  <p class="example-caption">Synthetic photo-style test image · JPG quality 80%<br>Results vary by file and browser.</p>
  <a href="../benchmark.html">See the full measured results →</a>
</aside>
    </div>

    <p class="privacy-strip">No server uploads · No sign-up or install required</p>

    <section class="controls" id="controls" tabindex="-1" aria-label="Image compression settings" hidden>
      <label for="qualitySlider">Quality: <span id="qualityValue">80</span>%</label>
      <input type="range" id="qualitySlider" min="10" max="100" value="80">

      <div class="resize-fields">
        <label class="resize-label">Width (px)
          <input type="number" id="resizeWidth" min="1" max="8000">
        </label>
        <label class="resize-label">Height (px)
          <input type="number" id="resizeHeight" min="1" max="8000">
        </label>
        <label class="checkbox-label">
          <input type="checkbox" id="maintainAspectRatio" checked>
          Keep aspect ratio
        </label>
      </div>

      <label for="formatSelect">Output format</label>
      <select id="formatSelect">
        <option value="original">Same as original</option>
        <option value="image/jpeg">JPG</option>
        <option value="image/png">PNG</option>
        <option value="image/webp">WebP</option>
      </select>
      <p id="pngSizeHint" class="compress-warning" hidden>PNG is a lossless format, so compressing it won't shrink the file size — it may even get larger than the original. Choose JPG or WebP to actually reduce file size.</p>

      <button id="compressBtn">Apply</button>
      <p class="offline-badge">
        <svg class="offline-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2"></rect>
          <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
        </svg>
        No server uploads · Processed entirely in your browser
      </p>
    </section>

    <section class="preview-area" id="previewArea" hidden>
      <div class="preview-box">
        <h2>Original</h2>
        <img id="originalPreview" alt="Original image preview">
        <p id="originalSize"></p>
      </div>
      <div class="preview-box">
        <h2>Result</h2>
        <img id="compressedPreview" alt="Compressed image preview">
        <p id="compressedSize"></p>
        <p id="compressionSavings" class="compression-savings" role="status" hidden></p>
        <p id="compressWarning" class="compress-warning" hidden>⚠ The result is larger than the original. Consider lowering the quality, or skip downloading it.</p>
        <div class="result-actions">
          <a id="downloadBtn" class="btn" href="#" download="compressed-image.jpg" hidden>Download</a>
          <button type="button" id="shareBtn" class="btn btn-outline" hidden>Share this site</button>
        </div>
        <p id="shareStatus" class="share-status" role="status" hidden></p>
      </div>
    </section>

    <section class="info-section">
      <h2>How compression works</h2>
      <p class="tool-nav"><a href="../benchmark.html">See real compression-rate test results →</a></p>
      <p>This tool compresses images by re-encoding them with the browser's Canvas API: it draws the original onto a canvas, then saves it again in the format and quality you choose.</p>
      <p>JPG and WebP are lossy formats, so lowering the quality slider actually shrinks the file size. PNG, on the other hand, is lossless — adjusting the quality slider has no effect on its file size, and that's standard browser behavior, not a limitation of this tool. To shrink a PNG photo, switch the output format to JPG or WebP, or reduce its pixel dimensions instead.</p>
    </section>

    <section class="info-section">
      <h2>Which format should I choose?</h2>
      <p><strong>JPG</strong> works well for photos with complex colors and compresses efficiently to a small file size. It doesn't support transparency.</p>
      <p><strong>PNG</strong> is lossless, so there's no quality loss, and it supports transparency. It's a good fit for screenshots, logos, and text-heavy graphics, but produces large files for photos.</p>
      <p><strong>WebP</strong> is a newer format that can match JPG-level quality at a smaller file size. Most modern browsers support it, but older software may not be able to open it.</p>
    </section>

    <section class="info-section">
      <h2>Frequently Asked Questions</h2>
      <details>
        <summary>Are my uploaded photos stored on a server?</summary>
        <p>No. This tool never sends your images to any server. Compression happens entirely on your device using the browser's Canvas API, and the result disappears once you leave the page.</p>
      </details>
      <details>
        <summary>Which file formats are supported?</summary>
        <p>You can upload JPG, PNG, or WebP images, and save the result as any of those three formats.</p>
      </details>
      <details>
        <summary>How do I set the compression quality?</summary>
        <p>Use the slider to choose a quality between 10% and 100%. Lower values produce smaller files but reduce image quality. If the result ends up larger than the original, a warning is shown before you download.</p>
      </details>
      <details>
        <summary>How much can I shrink a photo's file size?</summary>
        <p>It depends on how far you lower the quality, but a 50-90% reduction from the original is typical. Results vary with the photo's original format and content.</p>
      </details>
      <details>
        <summary>Can I also resize the image dimensions?</summary>
        <p>Yes. Enter width and height directly, or turn on "Keep aspect ratio" and enter just one value — the other is calculated automatically to match the original proportions.</p>
      </details>
      <details>
        <summary>Do I need to sign up or install anything?</summary>
        <p>No. You can use it right away in your browser, with no account and no software to install.</p>
      </details>
    </section>
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <div><span class="footer-brand">image toolbox.</span><p class="footer-note">Everyday image work, made simple and safe.</p></div>
      <nav class="footer-links" aria-label="Site info"><a href="../about.html">About</a><a href="../contact.html">Contact</a><a href="../privacy.html">Privacy Policy</a></nav>
    </div>
  </footer>

  <script src="../js/strings.js"></script>
  <script src="../js/imageTools.js"></script>
  <script src="../js/shareUtil.js"></script>
  <script src="../js/app.js"></script>
</body>
</html>
```

**주의:** 위 코드에서 `—`(em dash)와 `→`, `⚠`, `·` 같은 특수문자는 원본 한국어 페이지의 대응 문자를 그대로 유지한 것이다 — 타이핑 시 실제 유니코드 문자(—, →, ⚠, ·)로 입력할 것(`—` 이스케이프 표기는 이 계획 문서 안에서 가독성을 위해 쓴 것일 뿐, 실제 파일에는 리터럴 em dash 문자를 넣는다).

- [ ] **Step 2: 로컬 서버로 라이브 확인**

`python3 -m http.server 8891` 후 `http://localhost:8891/en/index.html`을 열어:
- 페이지가 전부 영어로 렌더링되는지
- 실제 이미지 업로드 → 압축까지 실행해 "Result size: ...", "About XX.X% smaller · ... saved" 같은 영어 결과 문구가 나오는지
- 헤더의 "한국어" 링크 클릭 시 `../index.html`(루트 한국어 페이지)로 이동하는지
- 브라우저 콘솔에 에러가 없는지(특히 `t is not defined`)

- [ ] **Step 3: 커밋**

```bash
git add en/index.html
git commit -m "$(cat <<'EOF'
Add English version of the image compressor tool page

Product Hunt 런칭 대비 en/index.html 신규 작성. 기존 js/app.js를 그대로 재사용
(Task 3에서 다국어 대응 완료), 콘텐츠는 자연스러운 영어로 새로 작성.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `en/upscale.html` 작성

**Files:**
- Create: `en/upscale.html`

**Interfaces:**
- Consumes: `../js/strings.js`, `../js/imageTools.js`, `../js/upscaleTools.js`, `../js/shareUtil.js`, `../js/upscaleApp.js`(Task 3에서 다국어 대응 완료, 수정 없이 재사용), 3rd-party CDN 스크립트(tfjs/upscalerjs — 한국어판과 동일한 버전/SRI 해시).
- Produces: `lang="en"` 페이지. Task 7에서 `upscale.html`과 `hreflang`으로 상호 연결된다.

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="../favicon.svg">
  <link rel="apple-touch-icon" href="../images/apple-touch-icon.png">
  <link rel="manifest" href="../manifest.json">
  <meta name="theme-color" content="#116b5d">
  <title>Free AI Image Upscaler - Enlarge Photos Up to 4x, Up to 4K</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="Free online tool that uses an AI model to upscale photos 2x or 4x, or resize them to 1440p or 4K resolution. No server uploads — everything runs in your browser.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/en/upscale.html">
  <link rel="alternate" hreflang="ko" href="https://nwb010118.github.io/image-toolbox/upscale.html">
  <link rel="alternate" hreflang="en" href="https://nwb010118.github.io/image-toolbox/en/upscale.html">
  <link rel="alternate" hreflang="x-default" href="https://nwb010118.github.io/image-toolbox/upscale.html">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Free AI Image Upscaler - Enlarge Photos Up to 4x, Up to 4K">
  <meta property="og:description" content="Free online tool that uses an AI model to upscale photos 2x or 4x, or resize them to 1440p or 4K resolution.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/en/upscale.html">
  <meta property="og:locale" content="en_US">
  <meta property="og:image" content="https://nwb010118.github.io/image-toolbox/images/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://nwb010118.github.io/image-toolbox/images/og-image.png">
  <link rel="stylesheet" href="../css/style.css">
  <link rel="stylesheet" href="../css/site.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Image Upscaler",
    "url": "https://nwb010118.github.io/image-toolbox/en/upscale.html",
    "description": "Free online tool that uses an AI model to upscale photos 2x or 4x, or resize them to 1440p or 4K resolution. No server uploads — everything runs in your browser.",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How much can I enlarge an image?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "It supports 2x and 4x enlargement, plus resizing to 1440p or 4K resolution. The AI model can only double an image per pass, so it chains up to two passes internally (for 4x); the resolution options that need more than that are only selectable when the original image is already large enough."
        }
      },
      {
        "@type": "Question",
        "name": "Why is there an image size limit?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The AI model runs its calculations directly in your browser, so a very large image would take a long time or could freeze the browser. Only images up to 1000px on each side are supported — for larger images, shrink them first with the image compressor."
        }
      },
      {
        "@type": "Question",
        "name": "Are my uploaded photos stored on a server?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. All AI computation happens in your browser, and no image is ever sent to a server."
        }
      },
      {
        "@type": "Question",
        "name": "Can a low-resolution image really become high-resolution?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. The AI model analyzes the image's pixel data and infers plausible detail as it enlarges it. Unlike simple stretching, edges and textures come out noticeably sharper."
        }
      },
      {
        "@type": "Question",
        "name": "How long does processing take?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "It depends on the image size and the scale or resolution you choose, but since the AI runs directly in your browser, it typically takes anywhere from a few seconds to tens of seconds."
        }
      },
      {
        "@type": "Question",
        "name": "Can I use it without installing anything or signing up?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. No installation or account is required — just use it directly in your browser."
        }
      }
    ]
  }
  </script>
</head>
<body class="page-tool">
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <header class="site-header">
    <div class="header-inner">
      <a class="site-brand" href="index.html" aria-label="image toolbox home"><svg class="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="8" fill="currentColor"/><path d="M8 11h16M8 16h11M8 21h7" stroke="white" stroke-width="2" stroke-linecap="round"/><path d="m21 18 3 3-3 3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>image toolbox<span style="color:var(--color-accent)">.</span></span></a>
      <nav class="site-nav" aria-label="Main menu">
        <a href="index.html">Compress</a>
        <a href="pdf.html">PDF Tools</a>
        <a href="upscale.html" aria-current="page">Upscale</a>
        <a href="../upscale.html">한국어</a>
      </nav>
    </div>
  </header>
  <noscript><p class="noscript-banner">This site doesn't work with JavaScript disabled. Please enable JavaScript in your browser to use the AI upscaler.</p></noscript>
  <main class="container" id="main-content">
    <p class="eyebrow">AI IMAGE TOOLS</p>
    <h1>Image Upscaler</h1>
    <p class="subtitle">Your photo is never sent anywhere — it's enlarged by AI right in this browser.</p>

    <div class="tool-intro-grid">
<section class="upload-area" id="upscaleUploadArea">
      <input type="file" id="upscaleFileInput" class="visually-hidden" accept="image/jpeg,image/png,image/webp">
      <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 3v12"></path>
        <path d="M7 8l5-5 5 5"></path>
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path>
      </svg>
      <h2 class="upload-heading">Drop your image here</h2>
      <button type="button" class="upload-btn">Choose File</button>
      <p class="upload-hint">or drag and drop a file into this area</p>
      <p class="upload-formats">JPG, PNG, WebP supported · up to 20MB · max 1000px per side</p>
      <div id="upscaleError" class="error-message" hidden></div>
    </section>
<aside class="tool-aside" aria-label="Tool info"><span class="aside-label">MADE FOR YOUR PRIVACY</span><h2>Your photo,<br>stays in your browser.</h2><p>Enlarge a small image with AI and compare the original side by side with the result. All processing happens on your device.</p><ul><li>No image server uploads</li><li>Free, no sign-up</li><li>No install — use it right away</li></ul></aside>
    </div>

    <section class="controls" id="upscaleControls" hidden>
      <p class="upscale-mode-label">Choose a scale</p>
      <div class="upscale-mode-group">
        <label class="radio-label">
          <input type="radio" name="upscaleMode" value="2x" checked>
          2x
        </label>
        <label class="radio-label">
          <input type="radio" name="upscaleMode" value="4x">
          4x
        </label>
        <label class="radio-label">
          <input type="radio" name="upscaleMode" value="1440p">
          To 1440p
          <span class="upscale-mode-note" id="upscaleNote1440p" hidden></span>
        </label>
        <label class="radio-label">
          <input type="radio" name="upscaleMode" value="4K">
          To 4K
          <span class="upscale-mode-note" id="upscaleNote4K" hidden></span>
        </label>
      </div>
      <button id="upscaleBtn">Upscale</button>
      <p class="offline-badge">
        <svg class="offline-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2"></rect>
          <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
        </svg>
        No server uploads · Processed entirely in your browser
      </p>
    </section>
    <p id="upscaleProgress" class="pdf-progress" hidden>Processing...</p>

    <section class="preview-area" id="upscalePreviewArea" hidden>
      <div class="preview-box">
        <h2>Original</h2>
        <img id="upscaleOriginalPreview" alt="Original image preview">
        <p id="upscaleOriginalSize"></p>
      </div>
      <div class="preview-box">
        <h2 id="upscaleResultHeading">Result</h2>
        <img id="upscaleResultPreview" alt="Upscaled image preview" hidden>
        <div class="result-actions">
          <a id="upscaleDownloadBtn" class="btn" href="#" download="upscaled.png" hidden>Download</a>
          <button type="button" id="upscaleShareBtn" class="btn btn-outline" hidden>Share this site</button>
        </div>
        <p id="upscaleShareStatus" class="share-status" role="status" hidden></p>
      </div>
    </section>

    <section class="info-section">
      <h2>How AI upscaling works</h2>
      <p>Ordinary resizing interpolates by averaging nearby pixel colors to fill in the new pixels, so no real detail is added and edges end up blurry. This tool instead runs a lightweight ESRGAN-family AI model (esrgan-slim) directly in your browser using TensorFlow.js.</p>
      <p>When you pick a resolution option like 1440p or 4K, it upscales with AI up to the target size (measured by the long edge), then precisely downsizes any excess with the canvas to land exactly on that size.</p>
    </section>

    <section class="info-section">
      <h2>When would I need this</h2>
      <p>Useful when you need to print or display an old or small photo at a larger size, show a low-resolution image on a big screen like a wallpaper, or bring back as much detail as possible from a photo where only a small copy survives. We wrote an honest breakdown of what AI upscaling can and can't actually do — read it <a href="../ai-upscaling-limits.html">here</a>. Curious about the right wallpaper size for your monitor's resolution? Check out <a href="../monitor-resolution-wallpaper-size.html">this guide</a>, and for scanning and organizing old photos, see <a href="../old-photo-scan-digitize-workflow.html">this guide</a>.</p>
    </section>

    <section class="info-section">
      <h2>Frequently Asked Questions</h2>
      <details>
        <summary>How much can I enlarge an image?</summary>
        <p>It supports 2x and 4x enlargement, plus resizing to 1440p or 4K resolution. The AI model can only double an image per pass, so it chains up to two passes internally (for 4x); the resolution options that need more than that are only selectable when the original image is already large enough.</p>
      </details>
      <details>
        <summary>Why is there an image size limit?</summary>
        <p>The AI model runs its calculations directly in your browser, so a very large image would take a long time or could freeze the browser. Only images up to 1000px on each side are supported — for larger images, shrink them first with the image compressor.</p>
      </details>
      <details>
        <summary>Are my uploaded photos stored on a server?</summary>
        <p>No. All AI computation happens in your browser, and no image is ever sent to a server.</p>
      </details>
      <details>
        <summary>Can a low-resolution image really become high-resolution?</summary>
        <p>Yes. The AI model analyzes the image's pixel data and infers plausible detail as it enlarges it. Unlike simple stretching, edges and textures come out noticeably sharper.</p>
      </details>
      <details>
        <summary>How long does processing take?</summary>
        <p>It depends on the image size and the scale or resolution you choose, but since the AI runs directly in your browser, it typically takes anywhere from a few seconds to tens of seconds.</p>
      </details>
      <details>
        <summary>Can I use it without installing anything or signing up?</summary>
        <p>Yes. No installation or account is required — just use it directly in your browser.</p>
      </details>
    </section>
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <div><span class="footer-brand">image toolbox.</span><p class="footer-note">Everyday image work, made simple and safe.</p></div>
      <nav class="footer-links" aria-label="Site info"><a href="../about.html">About</a><a href="../contact.html">Contact</a><a href="../privacy.html">Privacy Policy</a></nav>
    </div>
  </footer>

  <script src="../js/strings.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js" integrity="sha384-vE8hbVJ4lezako5rlvE7bY0BVzWlFhZncPlckrqNwcUQpVtgbENTgZ8TBbnPjZre" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-slim@1.0.0/dist/umd/models/esrgan-slim/src/x2/index.min.js" integrity="sha384-AGBOpw8YDaWtze64+1P80uYCg+607+NLyI/tVeKNOJr9+SHUMEC7Z0ue5WJy5zIs" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/upscaler@1.0.0/dist/browser/umd/upscaler.min.js" integrity="sha384-QMCS4oRU0yhc/triRbY4mcIreg38XzA/8NNuZfTWWvv/km8cX/L63yLb3hh0IaA3" crossorigin="anonymous"></script>
  <script src="../js/imageTools.js"></script>
  <script src="../js/upscaleTools.js"></script>
  <script src="../js/shareUtil.js"></script>
  <script src="../js/upscaleApp.js"></script>
</body>
</html>
```

**주의:** Task 4와 동일하게, `—` 표기는 실제 파일에는 리터럴 em dash(—) 문자로 입력한다.

- [ ] **Step 2: 로컬 서버로 라이브 확인**

`http://localhost:8891/en/upscale.html`에서 실제 작은 이미지를 업로드해 2x 업스케일까지 끝까지 실행하고, 결과 헤딩이 "Result (2x)"로 뜨는지, 진행률 문구가 "Processing... (NN%)"인지, "한국어" 링크가 `../upscale.html`로 이동하는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add en/upscale.html
git commit -m "$(cat <<'EOF'
Add English version of the AI upscaling tool page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `en/pdf.html` 작성

**Files:**
- Create: `en/pdf.html`

**Interfaces:**
- Consumes: `../js/strings.js`, `../js/imageTools.js`, `../js/pdfTools.js`, `../js/shareUtil.js`, `../js/pdfApp.js`, `../js/pdfConvertTools.js`, `../js/pdfConvertApp.js`(Task 3에서 다국어 대응 완료, 수정 없이 재사용), 3rd-party CDN 스크립트(pdfjs/jspdf/pptxgenjs/docx/xlsx — 한국어판과 동일한 버전/SRI 해시).
- Produces: `lang="en"` 페이지. Task 7에서 `pdf.html`과 `hreflang`으로 상호 연결된다.

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="../favicon.svg">
  <link rel="apple-touch-icon" href="../images/apple-touch-icon.png">
  <link rel="manifest" href="../manifest.json">
  <meta name="theme-color" content="#116b5d">
  <title>Free PDF Converter - Images, PPT, Word &amp; Excel</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="Free online tool to combine images into a PDF, or convert a PDF to images, PowerPoint, Word, or Excel. No server uploads — everything happens in your browser.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/en/pdf.html">
  <link rel="alternate" hreflang="ko" href="https://nwb010118.github.io/image-toolbox/pdf.html">
  <link rel="alternate" hreflang="en" href="https://nwb010118.github.io/image-toolbox/en/pdf.html">
  <link rel="alternate" hreflang="x-default" href="https://nwb010118.github.io/image-toolbox/pdf.html">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Free PDF Converter - Images, PPT, Word &amp; Excel">
  <meta property="og:description" content="Free online tool to combine images into a PDF, or convert a PDF to images, PowerPoint, Word, or Excel.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/en/pdf.html">
  <meta property="og:locale" content="en_US">
  <meta property="og:image" content="https://nwb010118.github.io/image-toolbox/images/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://nwb010118.github.io/image-toolbox/images/og-image.png">
  <link rel="stylesheet" href="../css/style.css">
  <link rel="stylesheet" href="../css/site.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "PDF Converter",
    "url": "https://nwb010118.github.io/image-toolbox/en/pdf.html",
    "description": "Free online tool to combine images into a PDF, or convert a PDF to images, PowerPoint, Word, or Excel. No server uploads — everything happens in your browser.",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Can I combine multiple images into a single PDF?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Select up to 50 images and they'll become PDF pages in the order you uploaded them. Each page keeps the original image's aspect ratio."
        }
      },
      {
        "@type": "Question",
        "name": "Can I merge multiple PDF files into one?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "This tool combines images into a PDF, so it doesn't merge existing PDF files directly. A workaround is to extract each PDF to images first, then combine those images back into a single PDF in order."
        }
      },
      {
        "@type": "Question",
        "name": "What format do I get when I extract images from a PDF?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Each page is converted to a PNG image, downloadable individually. Up to 300 pages are supported."
        }
      },
      {
        "@type": "Question",
        "name": "Is my uploaded file sent to a server?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. Both creating a PDF and extracting pages happen entirely in your browser — no file is ever sent to a server."
        }
      },
      {
        "@type": "Question",
        "name": "Can I also shrink a PDF's file size?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "This tool combines images into a PDF or extracts a PDF's pages as images — it doesn't compress a PDF directly. To shrink one, extract it to images, compress those with the image compressor, then combine them back into a PDF."
        }
      },
      {
        "@type": "Question",
        "name": "Can I turn scanned document photos into a PDF?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Select multiple scanned or photographed document images in order and combine them into a single PDF."
        }
      },
      {
        "@type": "Question",
        "name": "Can I convert a PDF to PowerPoint, Word, or Excel?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. In the PDF to Document section, upload a PDF and choose PowerPoint (.pptx), Word (.docx), or Excel (.xlsx). PowerPoint captures each page as an image, Word extracts text as paragraphs, and Excel puts text one line per row."
        }
      },
      {
        "@type": "Question",
        "name": "Do scanned documents (photographed PDFs) also convert to Word or Excel?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A scan with no text layer can't be converted to Word or Excel — conversion stops with an explanatory message. Use the PowerPoint conversion instead, which saves each page as an image."
        }
      },
      {
        "@type": "Question",
        "name": "Can I use it without installing anything or signing up?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. No installation or account is required — just convert directly in your browser."
        }
      }
    ]
  }
  </script>
</head>
<body class="page-tool">
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <header class="site-header">
    <div class="header-inner">
      <a class="site-brand" href="index.html" aria-label="image toolbox home"><svg class="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="8" fill="currentColor"/><path d="M8 11h16M8 16h11M8 21h7" stroke="white" stroke-width="2" stroke-linecap="round"/><path d="m21 18 3 3-3 3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>image toolbox<span style="color:var(--color-accent)">.</span></span></a>
      <nav class="site-nav" aria-label="Main menu">
        <a href="index.html">Compress</a>
        <a href="pdf.html" aria-current="page">PDF Tools</a>
        <a href="upscale.html">Upscale</a>
        <a href="../pdf.html">한국어</a>
      </nav>
    </div>
  </header>
  <noscript><p class="noscript-banner">This site doesn't work with JavaScript disabled. Please enable JavaScript in your browser to use the PDF tools.</p></noscript>
  <main class="container" id="main-content">
    <p class="eyebrow">DOCUMENT TOOLS</p>
    <h1>PDF Converter</h1>
    <p class="subtitle">Your files are never sent anywhere — everything is processed right in this browser.</p>

    <section class="pdf-section">
      <h2>Images → PDF</h2>
      <p class="tool-nav"><a href="../photos-to-pdf.html">Learn more about combining multiple photos into a PDF →</a></p>
      <section class="upload-area" id="imgToPdfUploadArea">
        <input type="file" id="imgToPdfFileInput" class="visually-hidden" accept="image/jpeg,image/png,image/webp" multiple>
        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3v12"></path>
          <path d="M7 8l5-5 5 5"></path>
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path>
        </svg>
        <button type="button" class="upload-btn">Choose Files (multiple allowed)</button>
        <p class="upload-hint">or drag and drop files into this area</p>
        <p class="upload-formats">JPG, PNG, WebP supported · up to 20MB each · max 50 images</p>
        <div id="imgToPdfError" class="error-message" hidden></div>
      </section>

      <ul id="imgToPdfFileList" class="file-list"></ul>

      <button id="imgToPdfBtn" hidden>Convert to PDF</button>
      <p class="offline-badge">
        <svg class="offline-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2"></rect>
          <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
        </svg>
        No server uploads · Processed entirely in your browser
      </p>
      <div class="result-actions">
        <a id="imgToPdfDownloadBtn" class="btn" href="#" download="images.pdf" hidden>Download PDF</a>
        <button type="button" id="imgToPdfShareBtn" class="btn btn-outline" hidden>Share this site</button>
      </div>
      <p id="imgToPdfShareStatus" class="share-status" role="status" hidden></p>
    </section>

    <section class="pdf-section">
      <h2>PDF → Images</h2>
      <p class="tool-nav"><a href="../pdf-to-image.html">Learn more about converting a PDF to images →</a></p>
      <section class="upload-area" id="pdfToImgUploadArea">
        <input type="file" id="pdfToImgFileInput" class="visually-hidden" accept="application/pdf,.pdf">
        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3v12"></path>
          <path d="M7 8l5-5 5 5"></path>
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path>
        </svg>
        <button type="button" class="upload-btn">Choose PDF File</button>
        <p class="upload-hint">or drag and drop a file into this area</p>
        <p class="upload-formats">PDF supported · up to 20MB · max 300 pages</p>
        <div id="pdfToImgError" class="error-message" hidden></div>
      </section>

      <p class="offline-badge">
        <svg class="offline-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2"></rect>
          <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
        </svg>
        No server uploads · Processed entirely in your browser
      </p>

      <p id="pdfToImgProgress" class="pdf-progress" hidden></p>
      <div id="pdfToImgPages" class="pdf-page-list"></div>
    </section>

    <section class="pdf-section">
      <h2>PDF → Document</h2>
      <p class="tool-nav"><a href="../pdf-to-word.html">Learn more about converting a PDF to Word →</a></p>
      <p class="tool-nav"><a href="../pdf-to-ppt.html">Learn more about converting a PDF to PowerPoint →</a></p>
      <section class="upload-area" id="pdfConvertUploadArea">
        <input type="file" id="pdfConvertFileInput" class="visually-hidden" accept="application/pdf,.pdf">
        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3v12"></path>
          <path d="M7 8l5-5 5 5"></path>
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path>
        </svg>
        <button type="button" class="upload-btn">Choose PDF File</button>
        <p class="upload-hint">or drag and drop a file into this area</p>
        <p class="upload-formats">PDF supported · up to 20MB · max 300 pages</p>
        <div id="pdfConvertError" class="error-message" hidden></div>
      </section>

      <section class="controls" id="pdfConvertControls" hidden>
        <p class="upscale-mode-label">Choose an output format</p>
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
        <button id="pdfConvertBtn">Convert</button>
        <p class="offline-badge">
          <svg class="offline-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="4" y="11" width="16" height="10" rx="2"></rect>
            <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
          </svg>
          No server uploads · Processed entirely in your browser
        </p>
      </section>

      <p id="pdfConvertProgress" class="pdf-progress" hidden></p>
      <div class="result-actions">
        <a id="pdfConvertDownloadBtn" class="btn" href="#" download hidden>Download converted file</a>
        <button type="button" id="pdfConvertShareBtn" class="btn btn-outline" hidden>Share this site</button>
      </div>
      <p id="pdfConvertShareStatus" class="share-status" role="status" hidden></p>
    </section>

    <section class="info-section">
      <h2>What can this tool do</h2>
      <p>Combine multiple photos into a single PDF, in order. See <a href="../photos-to-pdf.html">how to combine photos into a PDF</a> for details.</p>
      <p>Extract individual PDF pages as separate images.</p>
      <p>Convert a PDF to Word, PowerPoint, or Excel. See <a href="../pdf-to-word.html">how to convert a PDF to Word</a> and <a href="../pdf-to-ppt.html">how to convert a PDF to PowerPoint</a> for details.</p>
    </section>

    <section class="info-section">
      <h2>Frequently Asked Questions</h2>
      <details>
        <summary>Can I combine multiple images into a single PDF?</summary>
        <p>Yes. Select up to 50 images and they'll become PDF pages in the order you uploaded them. Each page keeps the original image's aspect ratio.</p>
      </details>
      <details>
        <summary>Can I merge multiple PDF files into one?</summary>
        <p>This tool combines images into a PDF, so it doesn't merge existing PDF files directly. A workaround is to extract each PDF to images first, then combine those images back into a single PDF in order. See <a href="../pdf-merge-multiple-files.html">this guide</a> for the full method and its limits.</p>
      </details>
      <details>
        <summary>What format do I get when I extract images from a PDF?</summary>
        <p>Each page is converted to a PNG image, downloadable individually. Up to 300 pages are supported.</p>
      </details>
      <details>
        <summary>Is my uploaded file sent to a server?</summary>
        <p>No. Both creating a PDF and extracting pages happen entirely in your browser — no file is ever sent to a server.</p>
      </details>
      <details>
        <summary>Can I also shrink a PDF's file size?</summary>
        <p>This tool combines images into a PDF or extracts a PDF's pages as images — it doesn't compress a PDF directly. To shrink one, extract it to images, compress those with the image compressor, then combine them back into a PDF. See <a href="../pdf-file-size-reduction.html">this guide</a> for when this approach actually helps.</p>
      </details>
      <details>
        <summary>Can I turn scanned document photos into a PDF?</summary>
        <p>Yes. Select multiple scanned or photographed document images in order and combine them into a single PDF.</p>
      </details>
      <details>
        <summary>Can I convert a PDF to PowerPoint, Word, or Excel?</summary>
        <p>Yes. In the PDF to Document section, upload a PDF and choose PowerPoint (.pptx), Word (.docx), or Excel (.xlsx). PowerPoint captures each page as an image, Word extracts text as paragraphs, and Excel puts text one line per row.</p>
      </details>
      <details>
        <summary>Do scanned documents (photographed PDFs) also convert to Word or Excel?</summary>
        <p>A scan with no text layer can't be converted to Word or Excel — conversion stops with an explanatory message. Use the PowerPoint conversion instead, which saves each page as an image.</p>
      </details>
      <details>
        <summary>Can I use it without installing anything or signing up?</summary>
        <p>Yes. No installation or account is required — just convert directly in your browser.</p>
      </details>
    </section>
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <div><span class="footer-brand">image toolbox.</span><p class="footer-note">Everyday image work, made simple and safe.</p></div>
      <nav class="footer-links" aria-label="Site info"><a href="../about.html">About</a><a href="../contact.html">Contact</a><a href="../privacy.html">Privacy Policy</a></nav>
    </div>
  </footer>

  <script src="../js/strings.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js" integrity="sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e" crossorigin="anonymous"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" integrity="sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk" crossorigin="anonymous"></script>
  <script src="../js/imageTools.js"></script>
  <script src="../js/pdfTools.js"></script>
  <script src="../js/shareUtil.js"></script>
  <script src="../js/pdfApp.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js" integrity="sha384-qb0Xhi7LLYpvW1HCK6oMrmDLSY9sy7vwm6ZlV6KjtrlL9yg30+YN4neTwnmX+Kp8" crossorigin="anonymous"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/docx@9.7.1/dist/index.iife.js" integrity="sha384-9OH56uLhIvkZkwF0jWNlfpcK3gPuSy5DfEMNqKe156wCpkND+MDdtaRyd05kwpG0" crossorigin="anonymous"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" integrity="sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw" crossorigin="anonymous"></script>
  <script src="../js/pdfConvertTools.js"></script>
  <script src="../js/pdfConvertApp.js"></script>
</body>
</html>
```

**주의:** Task 4와 동일하게, `—` 표기는 실제 파일에는 리터럴 em dash(—) 문자로 입력한다.

- [ ] **Step 2: 로컬 서버로 라이브 확인**

`http://localhost:8891/en/pdf.html`에서 세 섹션(Images→PDF, PDF→Images, PDF→Document) 전부 실제 파일로 끝까지 실행해 다운로드 버튼/공유 버튼 문구가 영어로 나오는지, "한국어" 링크가 `../pdf.html`로 이동하는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add en/pdf.html
git commit -m "$(cat <<'EOF'
Add English version of the PDF converter tool page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 한국어 3페이지에 hreflang + 언어 전환 링크 추가, sitemap.xml 갱신, 통합 테스트 확장

**Files:**
- Modify: `index.html`, `upscale.html`, `pdf.html` (각각 `<head>`의 hreflang 3줄 + nav의 언어 전환 링크 1줄)
- Modify: `sitemap.xml`
- Modify: `tests/seoPagesIntegrity.test.js`

**Interfaces:**
- Consumes: Task 4~6에서 생성된 `en/index.html`, `en/upscale.html`, `en/pdf.html`.
- Produces: 한국어↔영어 페이지 간 완전한 hreflang 상호 참조 + 양방향 nav 링크. sitemap에 반영된 영어 URL 3개.

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/seoPagesIntegrity.test.js` 끝(925번째 줄 이후)에 추가:

```javascript
const EN_PAGES = [
  { ko: 'index.html', en: 'en/index.html', koUrl: 'https://nwb010118.github.io/image-toolbox/', enUrl: 'https://nwb010118.github.io/image-toolbox/en/index.html' },
  { ko: 'upscale.html', en: 'en/upscale.html', koUrl: 'https://nwb010118.github.io/image-toolbox/upscale.html', enUrl: 'https://nwb010118.github.io/image-toolbox/en/upscale.html' },
  { ko: 'pdf.html', en: 'en/pdf.html', koUrl: 'https://nwb010118.github.io/image-toolbox/pdf.html', enUrl: 'https://nwb010118.github.io/image-toolbox/en/pdf.html' }
];

EN_PAGES.forEach(function (pair) {
  test(pair.en + ' exists and has required <head> tags', function () {
    const html = readRepoFile(pair.en);
    assert.ok(/<title>[^<]+<\/title>/.test(html), 'missing <title>');
    assert.ok(html.includes('rel="canonical"'), 'missing canonical link');
    assert.ok(html.includes('property="og:title"'), 'missing og:title');
    assert.ok(html.includes('lang="en"'), 'missing lang="en" on <html>');
  });

  test(pair.en + ' has valid SoftwareApplication and FAQPage JSON-LD', function () {
    const html = readRepoFile(pair.en);
    const blocks = extractJsonLdBlocks(html);
    const types = blocks.map(function (b) { return b['@type']; });
    assert.ok(types.includes('SoftwareApplication'), 'missing SoftwareApplication block');
    assert.ok(types.includes('FAQPage'), 'missing FAQPage block');
  });

  test(pair.en + ' FAQPage entry count matches its visible <details> count', function () {
    const html = readRepoFile(pair.en);
    const blocks = extractJsonLdBlocks(html);
    const faqBlock = blocks.filter(function (b) { return b['@type'] === 'FAQPage'; })[0];
    const detailsCount = (html.match(/<details>/g) || []).length;
    assert.strictEqual(faqBlock.mainEntity.length, detailsCount, 'FAQPage mainEntity count does not match visible <details> count');
  });

  test(pair.ko + ' FAQPage entry count still matches its visible <details> count', function () {
    const html = readRepoFile(pair.ko);
    const blocks = extractJsonLdBlocks(html);
    const faqBlock = blocks.filter(function (b) { return b['@type'] === 'FAQPage'; })[0];
    const detailsCount = (html.match(/<details>/g) || []).length;
    assert.strictEqual(faqBlock.mainEntity.length, detailsCount, 'FAQPage mainEntity count does not match visible <details> count');
  });

  test(pair.en + ' <-> ' + pair.ko + ' hreflang cross-references are correct', function () {
    const enHtml = readRepoFile(pair.en);
    const koHtml = readRepoFile(pair.ko);
    assert.ok(enHtml.includes('hreflang="ko" href="' + pair.koUrl + '"'), pair.en + ' missing hreflang=ko pointing to ' + pair.koUrl);
    assert.ok(enHtml.includes('hreflang="en" href="' + pair.enUrl + '"'), pair.en + ' missing hreflang=en pointing to itself');
    assert.ok(enHtml.includes('hreflang="x-default" href="' + pair.koUrl + '"'), pair.en + ' missing hreflang=x-default pointing to ' + pair.koUrl);
    assert.ok(koHtml.includes('hreflang="ko" href="' + pair.koUrl + '"'), pair.ko + ' missing hreflang=ko pointing to itself');
    assert.ok(koHtml.includes('hreflang="en" href="' + pair.enUrl + '"'), pair.ko + ' missing hreflang=en pointing to ' + pair.enUrl);
    assert.ok(koHtml.includes('hreflang="x-default" href="' + pair.koUrl + '"'), pair.ko + ' missing hreflang=x-default');
  });

  test(pair.ko + ' nav links to ' + pair.en + ', and ' + pair.en + ' nav links back to ' + pair.ko, function () {
    const koHtml = readRepoFile(pair.ko);
    const enHtml = readRepoFile(pair.en);
    assert.ok(koHtml.includes('href="' + pair.en + '"'), pair.ko + ' missing nav link to ' + pair.en);
    assert.ok(enHtml.includes('href="../' + pair.ko + '"'), pair.en + ' missing nav link back to ../' + pair.ko);
  });
});

test('sitemap.xml includes the 3 English pages', function () {
  const xml = readRepoFile('sitemap.xml');
  ['en/index.html', 'en/upscale.html', 'en/pdf.html'].forEach(function (page) {
    assert.ok(xml.includes('/image-toolbox/' + page), 'sitemap.xml missing ' + page);
  });
});
```

- [ ] **Step 2: 실행해서 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 새로 추가된 hreflang/nav-link/sitemap 관련 테스트가 FAIL(한국어 페이지에 아직 hreflang/EN 링크 없음, sitemap에 아직 영어 URL 없음). `en/*.html` 관련 테스트(존재 여부, JSON-LD)는 Task 4~6에서 이미 만들어졌으므로 PASS.

- [ ] **Step 3: `index.html`에 hreflang + EN 링크 추가**

`index.html`에서:
```html
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/">
  <meta property="og:type" content="website">
```
를:
```html
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/">
  <link rel="alternate" hreflang="ko" href="https://nwb010118.github.io/image-toolbox/">
  <link rel="alternate" hreflang="en" href="https://nwb010118.github.io/image-toolbox/en/index.html">
  <link rel="alternate" hreflang="x-default" href="https://nwb010118.github.io/image-toolbox/">
  <meta property="og:type" content="website">
```
로 교체.

`index.html`에서:
```html
      <nav class="site-nav" aria-label="주요 메뉴">
        <a href="index.html" aria-current="page">이미지 압축</a>
        <a href="pdf.html">PDF 변환</a>
        <a href="upscale.html">업스케일링</a>
        <a href="guide.html">가이드</a>
      </nav>
```
를:
```html
      <nav class="site-nav" aria-label="주요 메뉴">
        <a href="index.html" aria-current="page">이미지 압축</a>
        <a href="pdf.html">PDF 변환</a>
        <a href="upscale.html">업스케일링</a>
        <a href="guide.html">가이드</a>
        <a href="en/index.html">EN</a>
      </nav>
```
로 교체.

- [ ] **Step 4: `upscale.html`에 hreflang + EN 링크 추가**

`upscale.html`에서:
```html
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/upscale.html">
  <meta property="og:type" content="website">
```
를:
```html
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/upscale.html">
  <link rel="alternate" hreflang="ko" href="https://nwb010118.github.io/image-toolbox/upscale.html">
  <link rel="alternate" hreflang="en" href="https://nwb010118.github.io/image-toolbox/en/upscale.html">
  <link rel="alternate" hreflang="x-default" href="https://nwb010118.github.io/image-toolbox/upscale.html">
  <meta property="og:type" content="website">
```
로 교체.

`upscale.html`에서:
```html
      <nav class="site-nav" aria-label="주요 메뉴">
        <a href="index.html">이미지 압축</a>
        <a href="pdf.html">PDF 변환</a>
        <a href="upscale.html" aria-current="page">업스케일링</a>
        <a href="guide.html">가이드</a>
      </nav>
```
를:
```html
      <nav class="site-nav" aria-label="주요 메뉴">
        <a href="index.html">이미지 압축</a>
        <a href="pdf.html">PDF 변환</a>
        <a href="upscale.html" aria-current="page">업스케일링</a>
        <a href="guide.html">가이드</a>
        <a href="en/upscale.html">EN</a>
      </nav>
```
로 교체.

- [ ] **Step 5: `pdf.html`에 hreflang + EN 링크 추가**

`pdf.html`에서:
```html
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/pdf.html">
  <meta property="og:type" content="website">
```
를:
```html
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/pdf.html">
  <link rel="alternate" hreflang="ko" href="https://nwb010118.github.io/image-toolbox/pdf.html">
  <link rel="alternate" hreflang="en" href="https://nwb010118.github.io/image-toolbox/en/pdf.html">
  <link rel="alternate" hreflang="x-default" href="https://nwb010118.github.io/image-toolbox/pdf.html">
  <meta property="og:type" content="website">
```
로 교체.

`pdf.html`에서:
```html
      <nav class="site-nav" aria-label="주요 메뉴">
        <a href="index.html">이미지 압축</a>
        <a href="pdf.html" aria-current="page">PDF 변환</a>
        <a href="upscale.html">업스케일링</a>
        <a href="guide.html">가이드</a>
      </nav>
```
를:
```html
      <nav class="site-nav" aria-label="주요 메뉴">
        <a href="index.html">이미지 압축</a>
        <a href="pdf.html" aria-current="page">PDF 변환</a>
        <a href="upscale.html">업스케일링</a>
        <a href="guide.html">가이드</a>
        <a href="en/pdf.html">EN</a>
      </nav>
```
로 교체.

- [ ] **Step 6: `sitemap.xml`에 3개 영어 URL 추가**

`sitemap.xml`의 `</urlset>` 태그 바로 앞에 추가:

```xml
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/en/index.html</loc>
    <lastmod>2026-09-30</lastmod>
  </url>
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/en/upscale.html</loc>
    <lastmod>2026-09-30</lastmod>
  </url>
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/en/pdf.html</loc>
    <lastmod>2026-09-30</lastmod>
  </url>
```

- [ ] **Step 7: 테스트 재실행 — 전부 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 전부 PASS(기존 항목 포함, 신규 hreflang/nav/sitemap 항목까지 전부).

- [ ] **Step 8: 브라우저로 수동 확인**

로컬 서버에서 `index.html`/`upscale.html`/`pdf.html`의 "EN" 링크 클릭 시 대응하는 `en/` 페이지로, 각 `en/` 페이지의 "한국어" 링크 클릭 시 원래 한국어 페이지로 정확히 돌아오는지 왕복 확인.

- [ ] **Step 9: 커밋**

```bash
git add index.html upscale.html pdf.html sitemap.xml tests/seoPagesIntegrity.test.js
git commit -m "$(cat <<'EOF'
Cross-link Korean and English tool pages via hreflang and nav

3개 한국어 페이지에 hreflang(ko/en/x-default) + EN nav 링크 추가,
sitemap.xml에 영어 3페이지 반영. seoPagesIntegrity.test.js에 상호 참조
검증 + FAQPage/details 개수 일치 검증 추가.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 전체 회귀 테스트 + 최종 라이브 QA

**Files:** 없음(검증 전용 태스크)

**Interfaces:**
- Consumes: Task 1~7의 모든 산출물.
- Produces: 배포 가능 상태 확인.

- [ ] **Step 1: 전체 테스트 스위트 실행**

```bash
for f in tests/*.test.js; do echo "=== $f ==="; node "$f"; done
```

Expected: 모든 파일에서 FAIL 0건. (기존 6개 테스트 파일 + Task 1의 `strings.test.js` + Task 3의 `jsI18nWiring.test.js` = 총 8개 파일.)

- [ ] **Step 2: 깨진 내부 링크 스캔**

```bash
python3 - <<'PYEOF'
import re, os

root = os.getcwd()
html_files = []
for dirpath, dirnames, filenames in os.walk(root):
    if '.git' in dirpath or '.worktrees' in dirpath:
        continue
    for f in filenames:
        if f.endswith('.html'):
            html_files.append(os.path.relpath(os.path.join(dirpath, f), root))

broken = []
for rel in html_files:
    with open(os.path.join(root, rel), 'r', encoding='utf-8') as fh:
        content = fh.read()
    base_dir = os.path.dirname(rel)
    for m in re.finditer(r'(?:href|src)="([^"]+)"', content):
        target = m.group(1)
        if target.startswith(('http://', 'https://', 'mailto:', '#', 'data:')):
            continue
        target_path = target.split('#')[0].split('?')[0]
        if not target_path:
            continue
        resolved = os.path.normpath(os.path.join(root, base_dir, target_path))
        if not os.path.exists(resolved):
            broken.append((rel, target))

if broken:
    print('BROKEN LINKS FOUND:')
    for rel, target in broken:
        print(' ', rel, '->', target)
else:
    print('No broken links found across', len(html_files), 'HTML files.')
PYEOF
```

Expected: `No broken links found`. (이 스캔은 `en/` 하위 상대경로 `../`도 정확히 처리한다.)

- [ ] **Step 3: 로컬 서버로 6개 페이지 전부 최종 왕복 확인**

새 포트로 서버 재시작(캐시 회피) 후:

```bash
python3 -m http.server 8892
```

각 페이지를 새 탭으로 열어:
1. `index.html`, `upscale.html`, `pdf.html` — 실제 업로드→처리까지 실행해 한국어 문구가 기존과 동일한지, 브라우저 콘솔에 에러 없는지.
2. `en/index.html`, `en/upscale.html`, `en/pdf.html` — 동일한 작업을 실행해 전부 영어로 나오는지, "한국어" 링크가 정확한 한국어 페이지로 가는지.
3. `index.html`/`upscale.html`/`pdf.html`의 "EN" 링크 → 정확한 영어 페이지로 이동하는지.
4. 각 페이지의 JSON-LD를 브라우저 콘솔에서 `JSON.parse`해 문법 오류가 없는지(또는 Google 리치 결과 테스트에 붙여넣어 확인).

- [ ] **Step 4: 발견된 문제가 있다면 이 시점에 수정하고 위 1~3단계를 재실행**

(문제 없으면 이 단계는 스킵)

---

## Task 9: 배포

- [ ] **Step 1: 원격 저장소로 푸시**

```bash
git push origin master:main
```

- [ ] **Step 2: 배포 확인 (GitHub Pages 반영까지 1~2분 소요될 수 있음)**

아래 URL들이 실제로 열리고, Task 8의 왕복 확인과 동일한 결과가 나오는지 재확인:
- `https://nwb010118.github.io/image-toolbox/en/index.html`
- `https://nwb010118.github.io/image-toolbox/en/upscale.html`
- `https://nwb010118.github.io/image-toolbox/en/pdf.html`
- `https://nwb010118.github.io/image-toolbox/`(한국어, EN 링크 확인)
- `https://nwb010118.github.io/image-toolbox/upscale.html`(한국어, EN 링크 확인)
- `https://nwb010118.github.io/image-toolbox/pdf.html`(한국어, EN 링크 확인)

- [ ] **Step 3: Product Hunt 런칭 링크를 `en/index.html`로 연결할 준비 완료 보고**

배포 확인이 끝나면, Product Hunt 런칭 카피(이전 세션에서 초안 작성됨)의 링크를 `https://nwb010118.github.io/image-toolbox/en/index.html`로 사용할 수 있음을 사용자에게 알린다.
