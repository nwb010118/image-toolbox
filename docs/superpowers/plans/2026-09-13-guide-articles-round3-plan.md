# 정보성 가이드 글 3차 라운드(6개) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제로 검증된 사실에 기반한 정보성 가이드 글 6개를 신설하고, `guide.html`(1·2·3번 섹션 전부)/`pdf.html`/`upscale.html`/`sitemap.xml`에 연결한다 (AdSense 반려 대응 5단계 계획의 4단계, 3차 배치. 1차 5개 + 2차 5개 + 이번 6개 = 16개, 목표 10~20개 범위).

**Architecture:** 저장소 루트에 신규 정적 페이지 6개를 추가한다. 새 변환 로직은 없다 — 각 글은 기존 `container`/`subtitle`/`tool-nav`/`info-section`/`btn`/`site-footer` 클래스를 재사용하고, 문맥에 맞는 지점에서 기존 도구로 연결한다.

**Tech Stack:** 순수 HTML(신규 CSS 클래스 없음). Node 기반 무프레임워크 통합 테스트(`tests/seoPagesIntegrity.test.js`, 기존 파일에 이어서 작성).

## Global Constraints

- 새 CSS 클래스를 추가하지 않는다 — `container`, `subtitle`, `tool-nav`, `info-section`, `btn`, `site-footer`만 재사용한다.
- 새 JS 파일/함수를 추가하지 않는다.
- 각 신규 페이지는 `title`/`meta description`/`canonical`/`og:type`(article)/`og:title`/`og:description`/`og:url`/`og:locale`를 기존 페이지들과 동일한 패턴으로 갖춘다. `Article` schema.org JSON-LD를 포함한다.
- **도구가 실제로 못 하는 일을 있는 것처럼 쓰지 않는다.** 코드로 확인된 사실:
  - `index.html`(`js/app.js`)의 `#fileInput`은 `accept="image/jpeg,image/png,image/webp"`뿐이다 — **HEIC를 직접 지원하지 않는다.** 크롭(자르기) 기능도 없다 — 자르는 단계가 필요하면 반드시 "사진 편집 프로그램으로"라고 주체를 명시하고, 이 사이트 도구가 자르는 것처럼 쓰지 않는다.
  - `upscale.html`(`js/upscaleTools.js`)은 입력 이미지가 **가로세로 각각 1000px 이하**여야 하고(`MAX_UPSCALE_DIMENSION = 1000`), `1440p`(목표 2560px)·`4K`(목표 3840px) 옵션은 원본 긴 변이 각각 **최소 640px**·**최소 960px** 이상이어야 도달 가능하다(`getUpscalePlan`의 `requiredScale <= MAX_AI_SCALE(4)` 조건, `RESOLUTION_PRESETS = { '1440p': 2560, '4K': 3840 }`). 이보다 작은 원본은 해당 해상도 옵션이 비활성화되지만, 고정 배율인 `2x`/`4x`는 원본 크기와 무관하게 항상 선택 가능하다(`getUpscalePlan`의 `2x`/`4x` 분기는 크기 검사 없이 `reachable: true`를 반환).
  - `pdf.html`(`js/pdfConvertTools.js` 및 UI)은 이미지→PDF 최대 **50장**, PDF→이미지 추출 최대 **300페이지**를 지원하지만, **이미 만들어진 PDF 파일 여러 개를 그대로 하나로 합치는(병합) 기능은 없다.**
- 아래 각 글에 명시된 사실(iOS 설정 경로, 모니터 해상도 표준, 유튜브 공식 스펙, 스캔 DPI, 인쇄 DPI 계산 공식)은 이미 웹 검색(유튜브는 `support.google.com` 공식 문서를 WebFetch로 직접 확인)으로 검증됐다 — 임의로 다른 숫자로 바꾸지 않는다. **유튜브 썸네일은 흔한 통설인 "1280×720"이 아니라 공식 현재 기준(3840×2160px 권장, 최소 너비 640px, 16:9, JPG/PNG, 파일 용량 모바일 2MB/데스크톱 50MB)을 쓴다.**
- **중복 콘텐츠 방지**: 이미 배포된 10개 글(`kakao-photo-quality.html`, `email-attachment-size.html`, `image-format-comparison.html`, `photo-id-resize.html`, `ai-upscaling-limits.html`, `web-image-loading-speed.html`, `cloud-storage-photo-tips.html`, `pdf-file-size-reduction.html`, `sns-blog-image-size.html`, `favicon-og-image-size.html`)와 문장 단위로 겹치지 않는다. 특히 `photo-id-resize.html:47`과 `sns-blog-image-size.html:51`은 둘 다 "가로/세로 픽셀 입력란에 직접 입력 + '비율 유지' 끄기"를 거의 같은 문장 구조로 설명한다 — 이번 라운드의 6개 글은 같은 지시사항을 전달하더라도 각자의 고유한 맥락(HEIC 변환 후, 정확한 유튜브 규격 숫자, DPI 계산 결과, 모니터 해상도 도달 가능 여부 등)에 맞춰 문장을 새로 구성하고, 저 두 글의 문장을 참고하되 복사하지 않는다.
- 6개 신규 페이지는 전부 표준 footer(`privacy.html`/`about.html`/`contact.html` 링크)를 포함한다.
- 언어는 한국어, 이모지 사용 금지, UTF-8, `<!DOCTYPE html>`로 시작.

---

## Task 1: 통합 검증 테스트 확장 (실패 확인)

**Files:**
- Modify: `tests/seoPagesIntegrity.test.js` (파일 끝에 이어서 작성. 기존 391번째 줄 근처의 "guide.html section 1 is restructured..." 테스트는 href 존재 여부만 확인하므로 round 3에서 링크가 늘어나도 계속 통과하며, 수정할 필요 없다.)

**Interfaces:**
- Consumes: 기존 `test`, `readRepoFile`, `extractJsonLdBlocks` 헬퍼 함수
- Produces: RED 상태 확인

- [ ] **Step 1: 테스트 파일 끝에 아래 코드를 추가**

```javascript

const GUIDE_ARTICLES_ROUND3 = [
  'iphone-heic-photo-guide.html',
  'monitor-resolution-wallpaper-size.html',
  'youtube-thumbnail-size.html',
  'old-photo-scan-digitize-workflow.html',
  'print-resolution-dpi-guide.html',
  'pdf-merge-multiple-files.html'
];

GUIDE_ARTICLES_ROUND3.forEach(function (file) {
  test(file + ' exists and has required <head> tags', function () {
    const html = readRepoFile(file);
    assert.ok(/<title>[^<]+<\/title>/.test(html), 'missing <title>');
    assert.ok(html.includes('rel="canonical"'), 'missing canonical link');
    assert.ok(html.includes('property="og:title"'), 'missing og:title');
  });

  test(file + ' has valid Article JSON-LD', function () {
    const html = readRepoFile(file);
    const types = extractJsonLdBlocks(html).map(function (b) { return b['@type']; });
    assert.ok(types.includes('Article'), 'missing Article block');
  });

  test(file + ' footer links to privacy/about/contact', function () {
    const html = readRepoFile(file);
    assert.ok(html.includes('href="privacy.html"'), file + ' footer missing privacy.html link');
    assert.ok(html.includes('href="about.html"'), file + ' footer missing about.html link');
    assert.ok(html.includes('href="contact.html"'), file + ' footer missing contact.html link');
  });

  test(file + ' is linked from guide.html', function () {
    const guideHtml = readRepoFile('guide.html');
    assert.ok(guideHtml.includes('href="' + file + '"'), 'guide.html missing link to ' + file);
  });

  test(file + ' is listed in sitemap.xml', function () {
    const xml = readRepoFile('sitemap.xml');
    assert.ok(xml.includes('/image-toolbox/' + file), 'sitemap.xml missing ' + file);
  });
});

test('iphone-heic-photo-guide.html states the iPhone setting path and this site does not accept HEIC directly', function () {
  const html = readRepoFile('iphone-heic-photo-guide.html');
  assert.ok(html.includes('카메라') && html.includes('포맷') && html.includes('호환성 우선'), 'missing iPhone setting path (설정 → 카메라 → 포맷 → 호환성 우선)');
  assert.ok(html.includes('HEIC'), 'missing HEIC mention');
  assert.ok(html.includes('href="index.html"'), 'missing link to compression tool for the after-conversion step');
});

test('monitor-resolution-wallpaper-size.html contains the verified FHD/QHD/4K resolutions and the upscale reachability facts', function () {
  const html = readRepoFile('monitor-resolution-wallpaper-size.html');
  assert.ok(html.includes('1920') && html.includes('1080'), 'missing FHD 1920x1080');
  assert.ok(html.includes('2560') && html.includes('1440'), 'missing QHD 2560x1440');
  assert.ok(html.includes('3840') && html.includes('2160'), 'missing 4K 3840x2160');
  assert.ok(html.includes('1000'), 'missing upscale tool input limit (1000px)');
  assert.ok(html.includes('href="upscale.html"'), 'missing link to upscale.html');
});

test('youtube-thumbnail-size.html contains the official current spec, not the outdated 1280x720 folklore figure', function () {
  const html = readRepoFile('youtube-thumbnail-size.html');
  assert.ok(html.includes('3840') && html.includes('2160'), 'missing official recommended resolution 3840x2160');
  assert.ok(html.includes('640'), 'missing minimum width 640px');
  assert.ok(html.includes('16:9'), 'missing 16:9 aspect ratio');
  assert.ok(html.includes('2MB'), 'missing mobile 2MB file size limit');
  assert.ok(html.includes('50MB'), 'missing desktop 50MB file size limit');
});

test('old-photo-scan-digitize-workflow.html contains the verified scan DPI recommendations and links both tools', function () {
  const html = readRepoFile('old-photo-scan-digitize-workflow.html');
  assert.ok(html.includes('300') && html.includes('600'), 'missing 300/600 DPI scan recommendation');
  assert.ok(html.includes('href="index.html"'), 'missing link to compression tool');
  assert.ok(html.includes('href="upscale.html"'), 'missing link to upscale tool');
});

test('print-resolution-dpi-guide.html contains the DPI formula and both print-quality thresholds', function () {
  const html = readRepoFile('print-resolution-dpi-guide.html');
  assert.ok(html.includes('300'), 'missing 300DPI print standard');
  assert.ok(html.includes('150') && html.includes('200'), 'missing 150-200DPI large-format threshold');
  assert.ok(html.includes('2.54'), 'missing inch-to-cm conversion constant');
});

test('pdf-merge-multiple-files.html honestly states PDF+PDF merge is unsupported and names the 50-image bottleneck', function () {
  const html = readRepoFile('pdf-merge-multiple-files.html');
  assert.ok(html.includes('병합') && html.includes('없습니다'), 'missing honest disclosure that PDF+PDF merge is unsupported');
  assert.ok(html.includes('href="pdf.html"'), 'missing link to pdf.html for the extraction step');
  assert.ok(html.includes('href="photos-to-pdf.html"'), 'missing link to photos-to-pdf.html for the re-merge step');
  assert.ok(html.includes('50'), 'missing mention of the 50-image batch limit bottleneck');
});

test('pdf-merge-multiple-files.html is linked from pdf.html FAQ', function () {
  const pdfHtml = readRepoFile('pdf.html');
  assert.ok(pdfHtml.includes('href="pdf-merge-multiple-files.html"'), 'pdf.html FAQ missing link to pdf-merge-multiple-files.html');
});

test('upscale.html links to monitor-resolution-wallpaper-size.html and old-photo-scan-digitize-workflow.html', function () {
  const html = readRepoFile('upscale.html');
  assert.ok(html.includes('href="monitor-resolution-wallpaper-size.html"'), 'upscale.html missing link to monitor-resolution-wallpaper-size.html');
  assert.ok(html.includes('href="old-photo-scan-digitize-workflow.html"'), 'upscale.html missing link to old-photo-scan-digitize-workflow.html');
});
```

- [ ] **Step 2: 실행해서 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^FAIL"`
Expected: 신규 테스트 다수가 FAIL (6개 파일 × 5개 공통 검사 = 30 + 개별 사실 검증 6개 + pdf.html 링크 1개 + upscale.html 링크 1개 = 38개 전후 FAIL). exit code 1. 기존 테스트(109개)는 전부 PASS 유지.
Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^PASS"`
Expected: 109 (기존 테스트 전부 유지, 신규는 아직 하나도 통과 안 함).

- [ ] **Step 3: 커밋**

```bash
git add tests/seoPagesIntegrity.test.js
git commit -m "test: add integrity checks for guide articles round 3

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: `iphone-heic-photo-guide.html` 작성

**Files:**
- Create: `iphone-heic-photo-guide.html`

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>아이폰 HEIC 사진이 안 열릴 때 대처법</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="아이폰 HEIC 사진이 다른 기기나 웹사이트에서 안 열리는 이유와, 아이폰 설정으로 앞으로 찍을 사진을 JPG로 저장하는 방법, 이미 찍은 사진을 변환하는 방법을 정리했습니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/iphone-heic-photo-guide.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="아이폰 HEIC 사진이 안 열릴 때 대처법">
  <meta property="og:description" content="아이폰 HEIC 사진이 안 열리는 이유와 JPG로 저장/변환하는 방법을 정리했습니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/iphone-heic-photo-guide.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "아이폰 HEIC 사진이 안 열릴 때 대처법",
    "url": "https://nwb010118.github.io/image-toolbox/iphone-heic-photo-guide.html",
    "description": "아이폰 HEIC 사진이 안 열리는 이유와 JPG로 저장/변환하는 방법을 정리했습니다.",
    "inLanguage": "ko",
    "datePublished": "2026-09-13"
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>아이폰 HEIC 사진, 왜 안 열릴까</h1>
    <p class="subtitle">아이폰 기본 사진 형식이 다른 곳에서 안 열리는 이유와, 두 가지 해결 방법을 정리했습니다.</p>
    <p class="tool-nav"><a href="guide.html">← 가이드 목록</a></p>

    <section class="info-section">
      <h2>HEIC가 뭐길래 안 열릴까</h2>
      <p>아이폰은 iOS 11부터 사진을 기본적으로 HEIC(고효율 이미지 포맷)로 저장합니다. 같은 화질에서 JPG보다 용량이 훨씬 작다는 장점이 있지만, 비교적 최신 형식이라 일부 구형 프로그램이나 안드로이드 기기, 웹사이트에서는 열리지 않을 수 있습니다.</p>
      <p>이 사이트의 <a href="index.html">이미지 압축 도구</a>도 마찬가지입니다. 업로드 창이 JPG, PNG, WebP 파일만 받도록 되어 있어서, HEIC 파일을 그대로 올리면 선택되지 않습니다. HEIC를 직접 변환해주는 기능은 이 사이트에 없습니다.</p>
    </section>

    <section class="info-section">
      <h2>해결 방법 1: 앞으로 찍을 사진을 자동으로 JPG로 저장하기</h2>
      <p>아이폰 설정 → 카메라 → 포맷으로 들어가서 '높은 효율성' 대신 '호환성 우선'을 선택하면, 그 이후로 찍는 사진이 HEIC 대신 JPG로 저장됩니다. 다만 이 설정은 앞으로 찍을 사진에만 적용되고, 이미 저장돼 있는 HEIC 사진은 그대로 남습니다.</p>
    </section>

    <section class="info-section">
      <h2>해결 방법 2: 이미 찍어둔 HEIC 사진 변환하기</h2>
      <p>이미 찍어둔 HEIC 사진은 아이폰의 공유 기능(에어드롭, 메일, 메신저 등)으로 다른 기기나 앱에 전달하면 대부분 자동으로 JPG로 바뀌어 전달됩니다. 다만 어떤 형식으로 전달되는지는 사용하는 앱과 설정에 따라 달라질 수 있어서, 확실하게 바꾸려면 별도의 HEIC 변환 프로그램이나 앱을 쓰는 것이 안전합니다. 이 사이트는 HEIC 파일 자체를 읽어서 변환하는 기능은 제공하지 않습니다.</p>
    </section>

    <section class="info-section">
      <h2>JPG/PNG로 바뀐 뒤에는</h2>
      <p>일단 JPG나 PNG로 바뀌고 나면, <a href="index.html">이미지 압축 도구</a>에 업로드해서 품질을 조절하거나 가로세로 크기를 줄여 용량을 더 아낄 수 있습니다.</p>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>이 사이트에서 HEIC 파일을 바로 압축할 수 있나요?</summary>
        <p>아니요. 이미지 압축 도구는 JPG, PNG, WebP 파일만 받습니다. HEIC 파일은 먼저 JPG나 PNG로 변환한 뒤 업로드해야 합니다.</p>
      </details>
      <details>
        <summary>호환성 우선으로 바꾸면 사진 화질이 나빠지나요?</summary>
        <p>화질 자체가 나빠지는 것은 아닙니다. 다만 같은 화질을 유지하기 위해 JPG 파일의 용량이 HEIC보다 커지는 경향이 있어서, 저장 공간을 더 많이 씁니다.</p>
      </details>
      <details>
        <summary>안드로이드 기기로 보내면 왜 안 열리나요?</summary>
        <p>일부 구형 안드로이드 기기나 프로그램은 아직 HEIC 형식을 지원하지 않습니다. 이런 경우 아이폰에서 사진을 보내기 전에 호환성 우선 설정으로 바꾸거나, 이미 찍은 사진은 변환 앱을 거쳐서 보내는 것이 안전합니다.</p>
      </details>
    </section>

    <section class="info-section">
      <h2>관련 페이지</h2>
      <p><a href="image-format-comparison.html">PNG vs JPG vs WebP 비교</a></p>
      <p><a href="index.html">이미지 압축 도구</a></p>
      <p><a href="guide.html">언제 어떤 도구가 필요할까? 가이드</a></p>
    </section>
  </main>

  <footer class="site-footer">
    <a href="privacy.html">개인정보처리방침</a>
    <a href="about.html">About</a>
    <a href="contact.html">문의</a>
  </footer>
</body>
</html>
```

- [ ] **Step 2: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^PASS"` 그리고 `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^FAIL"`
Expected: `iphone-heic-photo-guide.html` 관련 head/JSON-LD/footer/HEIC 사실 테스트는 PASS. `guide.html`/`sitemap.xml` 링크 테스트는 여전히 FAIL(정상 — Task 8 전).

- [ ] **Step 3: 커밋**

```bash
git add iphone-heic-photo-guide.html
git commit -m "Add iphone-heic-photo-guide.html guide article

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: `monitor-resolution-wallpaper-size.html` 작성

**Files:**
- Create: `monitor-resolution-wallpaper-size.html`

**Interfaces:**
- Consumes: `upscale.html`의 실제 동작(`js/upscaleTools.js`) — 입력 이미지 1000px 이하, `1440p`는 원본 긴 변 640px 이상, `4K`는 960px 이상이어야 도달 가능. `ai-upscaling-limits.html`(이미 배포됨)의 "AI는 없는 디테일을 만들어내는 게 아니다"라는 기존 원칙과 모순되지 않게 서술.

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>모니터 해상도별 배경화면 이미지 크기 정리 (FHD·QHD·4K)</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="FHD, QHD, 4K 모니터 해상도별 배경화면 픽셀 크기와, 작은 원본 사진을 AI 업스케일링으로 각 해상도까지 키울 수 있는지 정직하게 정리했습니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/monitor-resolution-wallpaper-size.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="모니터 해상도별 배경화면 이미지 크기 정리 (FHD·QHD·4K)">
  <meta property="og:description" content="FHD, QHD, 4K 모니터 해상도별 배경화면 픽셀 크기를 정리했습니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/monitor-resolution-wallpaper-size.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "모니터 해상도별 배경화면 이미지 크기 정리 (FHD·QHD·4K)",
    "url": "https://nwb010118.github.io/image-toolbox/monitor-resolution-wallpaper-size.html",
    "description": "FHD, QHD, 4K 모니터 해상도별 배경화면 픽셀 크기를 정리했습니다.",
    "inLanguage": "ko",
    "datePublished": "2026-09-13"
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>내 모니터에 딱 맞는 배경화면 크기는</h1>
    <p class="subtitle">FHD·QHD·4K 해상도 정리와, 작은 사진을 각 해상도까지 키울 수 있는지 정직하게 확인하는 법입니다.</p>
    <p class="tool-nav"><a href="guide.html">← 가이드 목록</a></p>

    <section class="info-section">
      <h2>모니터 해상도 3종</h2>
      <p><strong>FHD(풀HD)</strong> — 1920×1080px. 가장 널리 쓰이는 표준 해상도입니다.</p>
      <p><strong>QHD(WQHD)</strong> — 2560×1440px. FHD보다 한 단계 높은 해상도입니다.</p>
      <p><strong>4K(UHD)</strong> — 3840×2160px. FHD의 가로세로 각각 2배입니다.</p>
    </section>

    <section class="info-section">
      <h2>원본 사진이 작다면 — AI 업스케일링이 될지 확인하기</h2>
      <p>이 사이트의 <a href="upscale.html">이미지 업스케일링</a> 도구는 원본 이미지가 가로세로 각각 1000px 이하일 때만 입력받습니다. 그리고 목표 해상도에 따라 확대 가능 여부가 갈립니다 — QHD(1440p 옵션, 목표 2560px)는 원본의 긴 변이 최소 640px 이상, 4K 옵션(목표 3840px)은 최소 960px 이상이어야 AI가 도달할 수 있습니다. 원본이 이보다 작으면 해당 해상도 옵션이 비활성화됩니다. 다만 정해진 배율인 2배·4배 확대는 원본 크기와 관계없이 항상 선택할 수 있습니다.</p>
      <p>AI 업스케일링은 있던 픽셀 패턴을 분석해 경계와 질감을 더 선명하게 만드는 것이지, 원본에 없던 정보를 되살리는 것은 아닙니다. 초점이 심하게 나간 사진은 확대해도 개선 폭이 작다는 점은 <a href="ai-upscaling-limits.html">이 글</a>에서 자세히 다룹니다.</p>
    </section>

    <section class="info-section">
      <h2>원본 사진이 크다면 — 정확한 크기로 줄이기</h2>
      <p>원본이 목표 해상도보다 크다면 확대할 필요 없이 <a href="index.html">이미지 압축 도구</a>의 가로/세로 입력란에 원하는 값(예: 3840×2160)을 직접 넣어 정확한 크기로 줄일 수 있습니다.</p>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>800×600 사진을 4K 배경화면으로 만들 수 있나요?</summary>
        <p>긴 변인 800px이 960px보다 작아서 4K(3840px) 옵션은 비활성화됩니다. 대신 QHD(2560px, 최소 640px 필요)는 시도할 수 있고, 고정 배율인 4배 확대(3200×2400)도 선택할 수 있습니다.</p>
      </details>
      <details>
        <summary>왜 업로드할 수 있는 원본 크기에 제한이 있나요?</summary>
        <p>AI 모델이 브라우저 안에서 직접 연산하기 때문에, 너무 큰 원본을 넣으면 처리 시간이 오래 걸리거나 브라우저가 멈출 수 있어 가로세로 각각 1000px로 제한하고 있습니다.</p>
      </details>
      <details>
        <summary>4배 확대와 4K 옵션은 뭐가 다른가요?</summary>
        <p>4배 확대는 원본 크기의 정확히 4배로 키우는 고정 배율입니다. 4K 옵션은 원본 비율과 관계없이 긴 변을 3840px에 맞추는 목표 해상도 방식이라, 필요한 확대 배율이 원본 크기에 따라 달라집니다.</p>
      </details>
    </section>

    <section class="info-section">
      <h2>관련 페이지</h2>
      <p><a href="ai-upscaling-limits.html">AI 업스케일링, 실제로 되는 것과 안 되는 것</a></p>
      <p><a href="upscale.html">이미지 업스케일링 도구</a></p>
      <p><a href="index.html">이미지 압축 도구</a></p>
      <p><a href="guide.html">언제 어떤 도구가 필요할까? 가이드</a></p>
    </section>
  </main>

  <footer class="site-footer">
    <a href="privacy.html">개인정보처리방침</a>
    <a href="about.html">About</a>
    <a href="contact.html">문의</a>
  </footer>
</body>
</html>
```

- [ ] **Step 2: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^PASS"` 그리고 `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^FAIL"`
Expected: `monitor-resolution-wallpaper-size.html` 관련 테스트(head/JSON-LD/footer/해상도 수치/1000px 제한) PASS.

- [ ] **Step 3: 커밋**

```bash
git add monitor-resolution-wallpaper-size.html
git commit -m "Add monitor-resolution-wallpaper-size.html guide article

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: `youtube-thumbnail-size.html` 작성

**Files:**
- Create: `youtube-thumbnail-size.html`

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>유튜브 썸네일 크기, 공식 기준 정리 (3840×2160)</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="유튜브 공식 고객센터 문서 기준 맞춤 썸네일 권장 해상도, 비율, 파일 형식, 용량 제한을 정리했습니다. 흔히 알려진 1280x720이 아닌 현재 공식 기준입니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/youtube-thumbnail-size.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="유튜브 썸네일 크기, 공식 기준 정리 (3840×2160)">
  <meta property="og:description" content="유튜브 공식 문서 기준 맞춤 썸네일 권장 크기와 용량 제한을 정리했습니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/youtube-thumbnail-size.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "유튜브 썸네일 크기, 공식 기준 정리 (3840×2160)",
    "url": "https://nwb010118.github.io/image-toolbox/youtube-thumbnail-size.html",
    "description": "유튜브 공식 문서 기준 맞춤 썸네일 권장 크기와 용량 제한을 정리했습니다.",
    "inLanguage": "ko",
    "datePublished": "2026-09-13"
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>유튜브 썸네일, 정확한 크기는 몇 픽셀일까</h1>
    <p class="subtitle">여기저기 도는 "1280×720"이 아니라, 유튜브 고객센터의 현재 공식 기준을 정리했습니다.</p>
    <p class="tool-nav"><a href="guide.html">← 가이드 목록</a></p>

    <section class="info-section">
      <h2>유튜브 공식 기준</h2>
      <p>유튜브 고객센터의 맞춤 썸네일 안내에 따르면, 동영상 썸네일의 권장 해상도는 <strong>3840×2160px</strong>이고 최소 너비는 640px입니다. 가로세로 비율은 <strong>16:9</strong>를 권장하며, 파일 형식은 <strong>JPG 또는 PNG</strong>입니다.</p>
      <p>파일 용량 제한은 업로드하는 기기에 따라 다릅니다 — <strong>모바일에서는 2MB</strong>, <strong>데스크톱에서는 50MB</strong>까지 허용됩니다.</p>
      <p>블로그나 커뮤니티에 "1280×720이 유튜브 썸네일 표준"이라고 알려진 경우가 많은데, 이는 예전에 널리 퍼진 수치이고 현재 유튜브 고객센터가 안내하는 권장 해상도는 3840×2160px입니다. 1280×720으로 만들어도 업로드는 되지만, 공식 권장 해상도에 맞추는 것이 더 안전합니다.</p>
    </section>

    <section class="info-section">
      <h2>이 사이트 도구로 맞추는 법</h2>
      <p><a href="index.html">이미지 압축 도구</a>의 가로/세로 입력란에 3840, 2160을 각각 넣고 '비율 유지'를 꺼서 정확한 크기로 맞춘 뒤, 품질을 조절해 파일 용량을 2MB 이하로 줄이면 모바일에서 업로드할 때도 문제없습니다.</p>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>1280×720으로 만들면 안 되나요?</summary>
        <p>업로드 자체는 가능하지만, 유튜브 고객센터가 현재 권장하는 해상도는 3840×2160px입니다. 화질이 중요하다면 권장 해상도에 맞추는 것이 좋습니다.</p>
      </details>
      <details>
        <summary>PNG와 JPG 중 어느 쪽이 나을까요?</summary>
        <p>유튜브는 둘 다 지원합니다. 글자나 선명한 경계가 많은 썸네일이라면 PNG가 유리할 수 있고, 사진 위주라면 JPG로도 충분하며 용량도 더 작게 나옵니다. 형식별 차이는 <a href="image-format-comparison.html">PNG vs JPG vs WebP 비교</a>를 참고하세요.</p>
      </details>
      <details>
        <summary>모바일에서 업로드가 안 될 때는 어떻게 하나요?</summary>
        <p>모바일 업로드는 2MB 제한이 있습니다. 파일 용량이 이보다 크다면 이미지 압축 도구에서 품질을 낮춰 용량을 줄인 뒤 다시 시도해주세요.</p>
      </details>
    </section>

    <section class="info-section">
      <h2>관련 페이지</h2>
      <p><a href="image-format-comparison.html">PNG vs JPG vs WebP 비교</a></p>
      <p><a href="index.html">이미지 압축 도구</a></p>
      <p><a href="guide.html">언제 어떤 도구가 필요할까? 가이드</a></p>
    </section>
  </main>

  <footer class="site-footer">
    <a href="privacy.html">개인정보처리방침</a>
    <a href="about.html">About</a>
    <a href="contact.html">문의</a>
  </footer>
</body>
</html>
```

- [ ] **Step 2: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^PASS"` 그리고 `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^FAIL"`
Expected: `youtube-thumbnail-size.html` 관련 테스트(head/JSON-LD/footer/공식 스펙 수치) PASS.

- [ ] **Step 3: 커밋**

```bash
git add youtube-thumbnail-size.html
git commit -m "Add youtube-thumbnail-size.html guide article

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: `old-photo-scan-digitize-workflow.html` 작성

**Files:**
- Create: `old-photo-scan-digitize-workflow.html`

**Interfaces:**
- Consumes: `index.html`(압축), `upscale.html`(업스케일링, 1000px 입력 제한), `ai-upscaling-limits.html`(기존 한계 서술), `photos-to-pdf.html`(이미지→PDF)

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>오래된 사진 스캔 후 디지털로 보관하는 법</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="오래된 인화 사진을 스캔할 때 권장 DPI, 스캔한 사진을 압축해서 저장하는 법, 흐릿하거나 작은 사진을 AI로 확대하는 법, 여러 장을 한 파일로 정리하는 법까지 순서대로 정리했습니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/old-photo-scan-digitize-workflow.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="오래된 사진 스캔 후 디지털로 보관하는 법">
  <meta property="og:description" content="오래된 사진을 스캔부터 보관까지 순서대로 정리하는 방법을 안내합니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/old-photo-scan-digitize-workflow.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "오래된 사진 스캔 후 디지털로 보관하는 법",
    "url": "https://nwb010118.github.io/image-toolbox/old-photo-scan-digitize-workflow.html",
    "description": "오래된 사진을 스캔부터 보관까지 순서대로 정리하는 방법을 안내합니다.",
    "inLanguage": "ko",
    "datePublished": "2026-09-13"
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>옛날 사진, 스캔부터 보관까지</h1>
    <p class="subtitle">서랍 속 인화 사진을 디지털로 옮기는 전체 과정을 순서대로 정리했습니다.</p>
    <p class="tool-nav"><a href="guide.html">← 가이드 목록</a></p>

    <section class="info-section">
      <h2>1단계: 몇 DPI로 스캔해야 할까</h2>
      <p>단순히 보관만 할 목적이라면 <strong>300DPI</strong>로 스캔해도 충분합니다. 나중에 확대해서 인화하거나 손상된 부분을 복원할 계획이 있다면 <strong>600DPI</strong>로 스캔해두는 것이 좋습니다. DPI가 높을수록 파일 용량도 커진다는 점을 함께 고려해서 선택하세요.</p>
    </section>

    <section class="info-section">
      <h2>2단계: 스캔한 사진, 압축해서 저장 공간 아끼기</h2>
      <p>고DPI로 스캔한 사진은 한 장당 용량이 꽤 큽니다. <a href="index.html">이미지 압축 도구</a>에서 품질을 조절해 눈에 띄는 화질 손상 없이 용량을 줄일 수 있습니다. 여러 장을 클라우드에 보관할 계획이라면 <a href="cloud-storage-photo-tips.html">클라우드 저장공간 아끼는 팁</a>도 참고하세요.</p>
    </section>

    <section class="info-section">
      <h2>3단계: 흐릿하거나 작게 나온 사진은 AI로 확대</h2>
      <p>오래된 사진 중에는 원본 자체가 작게 인화됐거나 스캔 결과가 흐릿한 경우가 있습니다. 이런 사진은 <a href="upscale.html">이미지 업스케일링</a>으로 더 선명하게 키울 수 있습니다. 다만 이 도구는 원본이 가로세로 각각 1000px 이하일 때만 입력받고, 초점이 심하게 나가거나 심하게 훼손된 사진은 AI가 참고할 정보 자체가 부족해 개선 폭이 작습니다. 이 한계는 <a href="ai-upscaling-limits.html">이 글</a>에서 자세히 다룹니다.</p>
    </section>

    <section class="info-section">
      <h2>4단계: 여러 장을 한 파일로 정리하고 싶다면</h2>
      <p>정리한 사진이 여러 장이라면 낱장으로 흩어두는 대신 <a href="photos-to-pdf.html">이미지→PDF</a>로 앨범 순서대로 하나의 파일로 묶어두면 관리하기 편합니다.</p>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>스캔 DPI를 무조건 높게 하면 좋은가요?</summary>
        <p>화질은 좋아지지만 파일 용량도 그만큼 커집니다. 단순 보관 목적이면 300DPI로 충분하고, 확대·복원이 목적일 때만 600DPI를 권장합니다.</p>
      </details>
      <details>
        <summary>많이 훼손된 사진도 AI로 복원할 수 있나요?</summary>
        <p>AI 업스케일링은 남아있는 픽셀 정보를 바탕으로 경계와 질감을 선명하게 다듬는 것이지, 사라지거나 심하게 훼손된 부분을 원래대로 복원하는 것은 아닙니다. 손상이 심한 사진은 개선 폭이 제한적입니다.</p>
      </details>
      <details>
        <summary>스캔한 사진과 압축한 사진 중 어느 쪽을 보관해야 하나요?</summary>
        <p>가능하면 원본 스캔 파일을 별도로 백업해두고, 평소 보거나 공유할 용도로는 압축한 버전을 쓰는 것을 권장합니다.</p>
      </details>
    </section>

    <section class="info-section">
      <h2>관련 페이지</h2>
      <p><a href="ai-upscaling-limits.html">AI 업스케일링, 실제로 되는 것과 안 되는 것</a></p>
      <p><a href="cloud-storage-photo-tips.html">클라우드 저장공간 아끼는 사진 압축 팁</a></p>
      <p><a href="upscale.html">이미지 업스케일링 도구</a></p>
      <p><a href="index.html">이미지 압축 도구</a></p>
      <p><a href="guide.html">언제 어떤 도구가 필요할까? 가이드</a></p>
    </section>
  </main>

  <footer class="site-footer">
    <a href="privacy.html">개인정보처리방침</a>
    <a href="about.html">About</a>
    <a href="contact.html">문의</a>
  </footer>
</body>
</html>
```

- [ ] **Step 2: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^PASS"` 그리고 `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^FAIL"`
Expected: `old-photo-scan-digitize-workflow.html` 관련 테스트(head/JSON-LD/footer/DPI 수치/두 도구 링크) PASS.

- [ ] **Step 3: 커밋**

```bash
git add old-photo-scan-digitize-workflow.html
git commit -m "Add old-photo-scan-digitize-workflow.html guide article

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: `print-resolution-dpi-guide.html` 작성

**Files:**
- Create: `print-resolution-dpi-guide.html`

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>인쇄용 사진 해상도(DPI) 완전정리 — 픽셀 계산법</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="DPI가 무엇인지, 인쇄할 크기(cm)에 맞는 픽셀 수를 계산하는 공식, 인쇄물 종류별 권장 DPI를 정리했습니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/print-resolution-dpi-guide.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="인쇄용 사진 해상도(DPI) 완전정리 — 픽셀 계산법">
  <meta property="og:description" content="인쇄할 크기에 맞는 픽셀 수를 계산하는 공식과 인쇄물별 권장 DPI를 정리했습니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/print-resolution-dpi-guide.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "인쇄용 사진 해상도(DPI) 완전정리 — 픽셀 계산법",
    "url": "https://nwb010118.github.io/image-toolbox/print-resolution-dpi-guide.html",
    "description": "인쇄할 크기에 맞는 픽셀 수를 계산하는 공식과 인쇄물별 권장 DPI를 정리했습니다.",
    "inLanguage": "ko",
    "datePublished": "2026-09-13"
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>인쇄하면 깨지지 않는 사진, 몇 픽셀이 필요할까</h1>
    <p class="subtitle">DPI 계산 공식과 인쇄물 종류별 권장 기준을 정리했습니다.</p>
    <p class="tool-nav"><a href="guide.html">← 가이드 목록</a></p>

    <section class="info-section">
      <h2>DPI란, 어떻게 계산하나</h2>
      <p>DPI(Dots Per Inch)는 1인치(2.54cm)에 몇 개의 점(픽셀)을 채워 인쇄하는지를 나타내는 단위입니다. 필요한 픽셀 수는 <strong>DPI × 인쇄할 크기(인치)</strong>로 계산합니다. 인치가 아니라 센티미터로 크기를 알고 있다면 먼저 센티미터를 2.54로 나눠서 인치로 바꾼 뒤 곱하면 됩니다.</p>
    </section>

    <section class="info-section">
      <h2>인쇄물별 권장 DPI</h2>
      <p>안전하게 인쇄하려면 <strong>300DPI</strong>를 기준으로 삼는 것이 일반적입니다. 다만 포스터나 배너처럼 사람이 멀리서 보는 대형 출력물은 <strong>150~200DPI</strong>로도 충분히 선명하게 나옵니다. 명함이나 스티커처럼 가까이서 보는 작은 인쇄물은 300DPI를 지키는 것이 안전합니다.</p>
    </section>

    <section class="info-section">
      <h2>계산 예시</h2>
      <p>10cm × 15cm(약 4×6인치) 사진을 300DPI로 인쇄하려면, 4 × 300 = 1200px, 6 × 300 = 1800px, 즉 약 1200×1800px가 필요합니다. A4 크기(약 8.3×11.7인치) 포스터를 200DPI로 인쇄한다면 약 1660×2340px면 충분합니다.</p>
    </section>

    <section class="info-section">
      <h2>이 사이트에서 필요한 크기로 맞추는 법</h2>
      <p>계산한 픽셀 값을 <a href="index.html">이미지 압축 도구</a>의 가로/세로 입력란에 그대로 넣으면 정확한 크기로 맞출 수 있습니다. 원본이 계산된 값보다 작다면 <a href="upscale.html">이미지 업스케일링</a>으로 먼저 키운 뒤 정확한 크기로 조정하는 순서를 권장합니다.</p>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>웹에서 쓰던 사진을 그대로 인쇄해도 되나요?</summary>
        <p>웹용 이미지는 보통 72~96DPI 기준으로 작게 만들어지는 경우가 많아서, 그대로 인쇄하면 확대된 만큼 흐릿하게 나올 수 있습니다. 인쇄할 크기에 맞는 픽셀 수를 계산해서 확인해보는 것이 안전합니다.</p>
      </details>
      <details>
        <summary>대형 포스터도 무조건 300DPI로 만들어야 하나요?</summary>
        <p>아닙니다. 포스터처럼 멀리서 보는 대형 출력물은 150~200DPI로도 충분히 선명하게 보입니다. 무조건 300DPI를 맞추려 하면 필요 이상으로 큰 파일이 될 수 있습니다.</p>
      </details>
      <details>
        <summary>원본 사진이 계산된 픽셀보다 작으면 어떻게 하나요?</summary>
        <p>단순히 늘리면 화질이 흐려집니다. 이 사이트의 AI 업스케일링 도구로 먼저 확대한 뒤(단, 원본이 가로세로 각각 1000px 이하여야 입력 가능) 정확한 크기로 맞추는 순서를 권장합니다.</p>
      </details>
    </section>

    <section class="info-section">
      <h2>관련 페이지</h2>
      <p><a href="photo-id-resize.html">여권사진·증명사진 규격에 맞게 리사이즈하는 법</a></p>
      <p><a href="index.html">이미지 압축 도구</a></p>
      <p><a href="upscale.html">이미지 업스케일링 도구</a></p>
      <p><a href="guide.html">언제 어떤 도구가 필요할까? 가이드</a></p>
    </section>
  </main>

  <footer class="site-footer">
    <a href="privacy.html">개인정보처리방침</a>
    <a href="about.html">About</a>
    <a href="contact.html">문의</a>
  </footer>
</body>
</html>
```

- [ ] **Step 2: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^PASS"` 그리고 `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^FAIL"`
Expected: `print-resolution-dpi-guide.html` 관련 테스트(head/JSON-LD/footer/DPI 공식/기준치) PASS.

- [ ] **Step 3: 커밋**

```bash
git add print-resolution-dpi-guide.html
git commit -m "Add print-resolution-dpi-guide.html guide article

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: `pdf-merge-multiple-files.html` 작성 + `pdf.html` FAQ 링크

**Files:**
- Create: `pdf-merge-multiple-files.html`
- Modify: `pdf.html`(기존 "여러 장의 이미지를 하나의 PDF로 합칠 수 있나요?" FAQ 바로 뒤에 새 FAQ 항목 추가)

**Interfaces:**
- Consumes: `pdf.html`(이미지→PDF 최대 50장, PDF→이미지 최대 300페이지, PDF+PDF 병합 기능 없음 — 코드로 확인된 사실), `photos-to-pdf.html`(이미지→PDF 안내)

- [ ] **Step 1: `pdf-merge-multiple-files.html` 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>PDF 여러 개 하나로 합치기(병합) — 이 방법으로</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="이미 만들어진 PDF 파일 여러 개를 하나로 합치는 방법을 정리했습니다. 이 사이트는 PDF+PDF 병합 기능이 없지만, 이미지로 추출해 다시 합치는 우회법과 그 한계를 정직하게 안내합니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/pdf-merge-multiple-files.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="PDF 여러 개 하나로 합치기(병합) — 이 방법으로">
  <meta property="og:description" content="PDF 파일 여러 개를 하나로 합치는 우회 방법과 한계를 정리했습니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/pdf-merge-multiple-files.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "PDF 여러 개 하나로 합치기(병합) — 이 방법으로",
    "url": "https://nwb010118.github.io/image-toolbox/pdf-merge-multiple-files.html",
    "description": "PDF 파일 여러 개를 하나로 합치는 우회 방법과 한계를 정리했습니다.",
    "inLanguage": "ko",
    "datePublished": "2026-09-13"
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>PDF 파일 여러 개, 하나로 합칠 수 있을까</h1>
    <p class="subtitle">이 사이트에는 PDF+PDF 병합 기능이 없지만, 우회하는 방법이 있습니다.</p>
    <p class="tool-nav"><a href="guide.html">← 가이드 목록</a></p>

    <section class="info-section">
      <h2>솔직한 전제: PDF 파일끼리 합치는 기능은 없습니다</h2>
      <p><a href="pdf.html">PDF 변환 도구</a>는 이미지 여러 장을 하나의 PDF로 합치거나(최대 50장), PDF의 각 페이지를 이미지로 추출하는(최대 300페이지) 기능만 있습니다. 이미 만들어진 PDF 파일 여러 개를 그대로 하나로 합치는 병합 기능은 없습니다.</p>
    </section>

    <section class="info-section">
      <h2>우회 방법: 이미지로 추출 → 순서대로 배열 → 다시 합치기</h2>
      <p>1) 합치고 싶은 각 PDF를 <a href="pdf.html">PDF 변환 도구</a>에서 페이지별 이미지로 추출합니다(PDF 한 개당 최대 300페이지). 2) 추출된 이미지 파일들을 원하는 최종 순서대로 정렬합니다. 3) 정렬한 이미지를 <a href="photos-to-pdf.html">이미지→PDF</a>로 다시 하나의 PDF로 합칩니다.</p>
    </section>

    <section class="info-section">
      <h2>한계: 합칠 페이지가 50장을 넘으면</h2>
      <p>이미지→PDF는 한 번에 최대 50장까지만 지원합니다. 합치려는 PDF들의 총 페이지 수가 50장을 넘으면 이 방법으로 한 번에 합칠 수 없습니다. 이 경우 50장 이하로 나눠서 여러 개의 PDF로 만들거나, PDF끼리 직접 병합할 수 있는 다른 전용 도구를 이용해야 합니다.</p>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>이 사이트에서 PDF 두 개를 바로 합칠 수 있나요?</summary>
        <p>아니요. PDF 파일끼리 합치는 기능은 없습니다. 각 PDF를 이미지로 추출한 뒤 다시 이미지→PDF로 합치는 우회 방법을 이용해야 합니다.</p>
      </details>
      <details>
        <summary>합치려는 PDF가 총 80페이지면 어떻게 하나요?</summary>
        <p>이미지→PDF의 50장 제한 때문에 한 번에 합칠 수 없습니다. 40페이지씩 두 개의 PDF로 나눠서 합치거나, PDF 병합 전용 도구를 이용하는 것을 권장합니다.</p>
      </details>
      <details>
        <summary>페이지 순서가 뒤바뀌지 않게 하려면 어떻게 하나요?</summary>
        <p>이미지로 추출한 뒤, 최종적으로 원하는 순서에 맞게 파일명을 정리하거나 업로드 순서를 맞춰서 이미지→PDF에 넣으면 그 순서 그대로 PDF 페이지가 만들어집니다.</p>
      </details>
    </section>

    <section class="info-section">
      <h2>관련 페이지</h2>
      <p><a href="pdf.html">PDF 변환 도구</a></p>
      <p><a href="photos-to-pdf.html">여러 장 사진을 PDF로 합치는 법</a></p>
      <p><a href="pdf-file-size-reduction.html">PDF 파일 용량 줄이는 법</a></p>
      <p><a href="guide.html">언제 어떤 도구가 필요할까? 가이드</a></p>
    </section>
  </main>

  <footer class="site-footer">
    <a href="privacy.html">개인정보처리방침</a>
    <a href="about.html">About</a>
    <a href="contact.html">문의</a>
  </footer>
</body>
</html>
```

- [ ] **Step 2: `pdf.html`에 새 FAQ 항목 추가**

`pdf.html`에서 아래 기존 블록(첫 번째 FAQ 항목)을 찾는다:

```html
      <details>
        <summary>여러 장의 이미지를 하나의 PDF로 합칠 수 있나요?</summary>
        <p>네. 최대 50장까지 선택해서 업로드한 순서 그대로 PDF 페이지로 만들 수 있습니다. 각 페이지는 원본 이미지의 가로세로 비율 그대로 생성됩니다.</p>
      </details>
```

바로 뒤에 아래 새 FAQ 항목을 추가한다(기존 블록은 그대로 두고, 그 다음 줄에 삽입):

```html
      <details>
        <summary>PDF 파일 여러 개를 하나로 합칠 수 있나요?</summary>
        <p>이 도구는 이미지를 PDF로 합치는 기능이라, 이미 만들어진 PDF 파일 여러 개를 그대로 하나로 합치는(병합) 기능은 없습니다. 각 PDF를 이미지로 추출한 뒤 순서대로 다시 이미지→PDF로 합치는 우회 방법이 있습니다. 자세한 방법과 한계는 <a href="pdf-merge-multiple-files.html">이 글</a>을 참고하세요.</p>
      </details>
```

- [ ] **Step 3: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^PASS"` 그리고 `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^FAIL"`
Expected: `pdf-merge-multiple-files.html` 관련 테스트와 `pdf.html` FAQ 링크 테스트 PASS.

- [ ] **Step 4: 커밋**

```bash
git add pdf-merge-multiple-files.html pdf.html
git commit -m "Add pdf-merge-multiple-files.html guide article and link from pdf.html FAQ

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: `guide.html`(1·2·3번 섹션)/`upscale.html`/`sitemap.xml` 연결

**Files:**
- Modify: `guide.html`(1번 섹션의 `<ul>`에 3개 `<li>` 추가, 2번 섹션 문단 끝에 문장 추가, 3번 섹션 문단 끝에 문장 추가)
- Modify: `upscale.html`("언제 필요한가요" 섹션의 문단 끝에 문장 추가)
- Modify: `sitemap.xml`(`</urlset>` 앞에 6개 URL 추가)

**Interfaces:**
- Consumes: Task 2~7에서 만든 6개 신규 페이지
- Produces: Task 1 테스트의 나머지 전부가 통과 — 전체 스위트 GREEN

- [ ] **Step 1: `guide.html` 1번 섹션 `<ul>`에 3개 항목 추가**

`guide.html`에서 아래 블록을 찾는다:

```html
        <li><a href="favicon-og-image-size.html">파비콘·OG 이미지 정확한 크기</a></li>
      </ul>
```

아래로 교체한다:

```html
        <li><a href="favicon-og-image-size.html">파비콘·OG 이미지 정확한 크기</a></li>
        <li><a href="iphone-heic-photo-guide.html">아이폰 HEIC 사진이 안 열릴 때 대처법</a></li>
        <li><a href="youtube-thumbnail-size.html">유튜브 썸네일 크기, 공식 기준 정리</a></li>
        <li><a href="print-resolution-dpi-guide.html">인쇄용 사진 해상도(DPI) 완전정리</a></li>
      </ul>
```

- [ ] **Step 2: `guide.html` 2번 섹션 문단에 링크 추가**

`guide.html`에서 아래 문단을 찾는다:

```html
      <p>서류 제출, 스캔한 문서 정리, 포트폴리오 공유처럼 여러 장의 사진을 순서대로 하나의 파일로 묶어야 하는 상황이 있습니다. 반대로 PDF 안에 있는 페이지를 개별 이미지로 꺼내야 할 때도 있고요. <a href="pdf.html">PDF 변환 도구</a>에서 이미지→PDF, PDF→이미지 양방향 변환을 할 수 있습니다. 여러 장의 사진을 PDF로 합치는 자세한 방법은 <a href="photos-to-pdf.html">이 안내</a>를 참고하세요. PDF 파일 자체의 용량을 줄이는 방법은 <a href="pdf-file-size-reduction.html">이 글</a>을 참고하세요.</p>
```

아래로 교체한다:

```html
      <p>서류 제출, 스캔한 문서 정리, 포트폴리오 공유처럼 여러 장의 사진을 순서대로 하나의 파일로 묶어야 하는 상황이 있습니다. 반대로 PDF 안에 있는 페이지를 개별 이미지로 꺼내야 할 때도 있고요. <a href="pdf.html">PDF 변환 도구</a>에서 이미지→PDF, PDF→이미지 양방향 변환을 할 수 있습니다. 여러 장의 사진을 PDF로 합치는 자세한 방법은 <a href="photos-to-pdf.html">이 안내</a>를 참고하세요. PDF 파일 자체의 용량을 줄이는 방법은 <a href="pdf-file-size-reduction.html">이 글</a>을 참고하세요. 이미 만들어진 PDF 파일 여러 개를 하나로 합치고 싶다면 <a href="pdf-merge-multiple-files.html">이 글</a>을 참고하세요.</p>
```

- [ ] **Step 3: `guide.html` 3번 섹션 문단에 링크 추가**

`guide.html`에서 아래 문단을 찾는다:

```html
      <p>오래된 사진, 작게 찍힌 사진, 원본을 잃어버린 저해상도 이미지를 인쇄하거나 크게 써야 할 때 단순히 크기만 늘리면 화질이 뭉개집니다. AI 업스케일링은 픽셀 정보를 분석해 디테일을 추론하며 확대하기 때문에 결과물이 더 선명합니다. <a href="upscale.html">이미지 업스케일링</a>에서 2배·4배 확대나 1440p·4K 해상도로 키울 수 있습니다. 실제로 가능한 것과 안 되는 것은 <a href="ai-upscaling-limits.html">이 글</a>에서 정직하게 정리했습니다.</p>
```

아래로 교체한다:

```html
      <p>오래된 사진, 작게 찍힌 사진, 원본을 잃어버린 저해상도 이미지를 인쇄하거나 크게 써야 할 때 단순히 크기만 늘리면 화질이 뭉개집니다. AI 업스케일링은 픽셀 정보를 분석해 디테일을 추론하며 확대하기 때문에 결과물이 더 선명합니다. <a href="upscale.html">이미지 업스케일링</a>에서 2배·4배 확대나 1440p·4K 해상도로 키울 수 있습니다. 실제로 가능한 것과 안 되는 것은 <a href="ai-upscaling-limits.html">이 글</a>에서 정직하게 정리했습니다. 모니터 해상도에 맞는 배경화면을 만들고 싶다면 <a href="monitor-resolution-wallpaper-size.html">이 글</a>을, 오래된 사진을 스캔해서 정리하는 전체 과정이 궁금하다면 <a href="old-photo-scan-digitize-workflow.html">이 글</a>을 참고하세요.</p>
```

- [ ] **Step 4: `upscale.html`의 "언제 필요한가요" 문단에 링크 추가**

`upscale.html`에서 아래 문단을 찾는다:

```html
      <p>오래되거나 작게 찍힌 사진을 인쇄하거나 크게 써야 할 때, 저해상도 이미지를 배경화면처럼 큰 화면에 띄워야 할 때, 원본을 잃어버려 남은 사본밖에 없는 사진을 최대한 선명하게 살리고 싶을 때 유용합니다. AI 업스케일링으로 실제로 가능한 것과 안 되는 것은 <a href="ai-upscaling-limits.html">이 글</a>에서 정직하게 정리했습니다.</p>
```

아래로 교체한다:

```html
      <p>오래되거나 작게 찍힌 사진을 인쇄하거나 크게 써야 할 때, 저해상도 이미지를 배경화면처럼 큰 화면에 띄워야 할 때, 원본을 잃어버려 남은 사본밖에 없는 사진을 최대한 선명하게 살리고 싶을 때 유용합니다. AI 업스케일링으로 실제로 가능한 것과 안 되는 것은 <a href="ai-upscaling-limits.html">이 글</a>에서 정직하게 정리했습니다. 모니터 해상도에 맞는 배경화면 크기가 궁금하다면 <a href="monitor-resolution-wallpaper-size.html">이 글</a>을, 오래된 사진을 스캔해서 정리하는 방법은 <a href="old-photo-scan-digitize-workflow.html">이 글</a>을 참고하세요.</p>
```

- [ ] **Step 5: `sitemap.xml`에 6개 URL 추가**

`sitemap.xml`의 `</urlset>` 태그 바로 앞에 아래 블록을 추가한다:

```xml
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/iphone-heic-photo-guide.html</loc>
  </url>
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/monitor-resolution-wallpaper-size.html</loc>
  </url>
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/youtube-thumbnail-size.html</loc>
  </url>
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/old-photo-scan-digitize-workflow.html</loc>
  </url>
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/print-resolution-dpi-guide.html</loc>
  </url>
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/pdf-merge-multiple-files.html</loc>
  </url>
```

- [ ] **Step 6: 전체 테스트 실행 — 전부 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^FAIL"`
Expected: `0`.
Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^PASS"`
Expected: 이전 109개보다 늘어난 개수(Task 1에서 추가한 신규 테스트 수만큼).

- [ ] **Step 7: 커밋**

```bash
git add guide.html upscale.html sitemap.xml
git commit -m "Wire guide articles round 3 into guide.html, upscale.html, sitemap.xml

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: 배포

- [ ] **Step 1: 원격 저장소로 푸시**

```bash
git push origin master:main
```

- [ ] **Step 2: 배포 확인**

6개 신규 페이지가 몇 분 뒤 실제로 열리는지 확인한다. 배포 확인 시 실제로 배포된 페이지에서 먼저 확인한 정확한 문구를 grep 패턴으로 사용한다.

- [ ] **Step 3: 다음 단계**

3차 배치 효과를 지켜본 뒤, 목표 10~20개 중 16개 도달 상태에서 4차 배치를 더 진행할지, 아니면 4단계를 마무리하고 5단계(GSC 사이트맵 재제출 → 애드센스 재신청)로 넘어갈지 사용자와 논의한다.
