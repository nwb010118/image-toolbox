# 정보성 가이드 글 2차 라운드(5개) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제로 검증된 사실에 기반한 정보성 가이드 글 5개를 신설하고, `guide.html`/`pdf.html`/`sitemap.xml`에 연결한다 (AdSense 반려 대응 5단계 계획의 4단계, 2차 배치). 동시에 `guide.html` 1번 섹션의 링크 과밀 문단을 목록으로 재구성한다.

**Architecture:** 저장소 루트에 신규 정적 페이지 5개를 추가한다. 새 변환 로직은 없다 — 각 글은 기존 `container`/`subtitle`/`tool-nav`/`info-section`/`btn`/`site-footer` 클래스를 재사용하고, 문맥에 맞는 지점에서 기존 도구로 연결한다. `guide.html` 1번 섹션은 기존 `<p>` 문단 대신 순수 `<ul>`/`<li>`(신규 클래스 없음)로 재구성한다.

**Tech Stack:** 순수 HTML(신규 CSS 클래스 없음). Node 기반 무프레임워크 통합 테스트(`tests/seoPagesIntegrity.test.js`, 기존 파일에 이어서 작성).

## Global Constraints

- 새 CSS 클래스를 추가하지 않는다 — `container`, `subtitle`, `tool-nav`, `info-section`, `btn`, `site-footer`만 재사용한다. `guide.html` 재구성에 쓰는 `<ul>`/`<li>`는 클래스 없이 브라우저 기본 스타일을 그대로 쓴다.
- 새 JS 파일/함수를 추가하지 않는다.
- 각 신규 페이지는 `title`/`meta description`/`canonical`/`og:type`(article)/`og:title`/`og:description`/`og:url`/`og:locale`를 기존 페이지들과 동일한 패턴으로 갖춘다. `Article` schema.org JSON-LD를 포함한다.
- 아래 각 글에 명시된 사실(LCP 기준, 클라우드 무료 용량, SNS/블로그 이미지 규격, 파비콘/OG 이미지 규격)은 이미 웹 검색으로 확인된 값이다 — 임의로 다른 숫자로 바꾸지 않는다.
- `pdf-file-size-reduction.html`은 "이 사이트의 PDF 도구는 PDF 파일 자체를 압축하는 기능이 없다"는 사실을 숨기지 않고 명시한다. 우회법(PDF→이미지 추출 → 이미지 압축 → 다시 PDF로 합치기)이 스캔본류(이미지 비중이 큰 PDF)에는 효과적이지만 텍스트 위주 PDF에는 효과가 적다는 점도 함께 언급한다.
- 도구 자체 기능을 서술하는 문장은 작성 전에 실제 `js/*.js` 코드로 검증한다. 특히 `index.html`(단일 파일 전용, 파일당 최대 20MB), `pdf.html`의 이미지→PDF(최대 50장 배치 가능)를 혼동하지 않는다.
- 5개 신규 페이지는 전부 표준 footer(`privacy.html`/`about.html`/`contact.html` 링크)를 포함한다.
- 언어는 한국어, 이모지 사용 금지, UTF-8, `<!DOCTYPE html>`로 시작.
- `guide.html` 재구성 후에도 1차 배치(5개)와 2차 배치(4개, `pdf-file-size-reduction.html` 제외) 링크 총 9개가 전부 유지되어야 한다.

---

## Task 1: 통합 검증 테스트 확장 (실패 확인)

**Files:**
- Modify: `tests/seoPagesIntegrity.test.js` (파일 끝에 이어서 작성)

**Interfaces:**
- Consumes: 기존 `test`, `readRepoFile`, `extractJsonLdBlocks` 헬퍼 함수
- Produces: RED 상태 확인

- [ ] **Step 1: 테스트 파일 끝에 아래 코드를 추가**

```javascript

const GUIDE_ARTICLES_ROUND2 = [
  'web-image-loading-speed.html',
  'cloud-storage-photo-tips.html',
  'pdf-file-size-reduction.html',
  'sns-blog-image-size.html',
  'favicon-og-image-size.html'
];

GUIDE_ARTICLES_ROUND2.forEach(function (file) {
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

test('web-image-loading-speed.html contains the verified Core Web Vitals LCP thresholds', function () {
  const html = readRepoFile('web-image-loading-speed.html');
  assert.ok(html.includes('2.5'), 'missing LCP good threshold 2.5s');
  assert.ok(html.includes('4.0') || html.includes('4초'), 'missing LCP poor threshold 4.0s');
});

test('cloud-storage-photo-tips.html contains the verified free storage capacities', function () {
  const html = readRepoFile('cloud-storage-photo-tips.html');
  assert.ok(html.includes('15GB'), 'missing Google Drive 15GB');
  assert.ok(html.includes('30GB'), 'missing Naver MYBOX 30GB');
  assert.ok(html.includes('5GB'), 'missing iCloud/OneDrive 5GB');
});

test('pdf-file-size-reduction.html honestly states the tool cannot compress PDF directly', function () {
  const html = readRepoFile('pdf-file-size-reduction.html');
  assert.ok(html.includes('PDF 자체') || html.includes('PDF 파일 자체'), 'missing honest disclosure about PDF compression limitation');
  assert.ok(html.includes('href="index.html"'), 'missing link to image compression tool for the workaround');
  assert.ok(html.includes('href="pdf.html"'), 'missing link to pdf.html for the workaround');
});

test('pdf-file-size-reduction.html is linked from pdf.html FAQ', function () {
  const pdfHtml = readRepoFile('pdf.html');
  assert.ok(pdfHtml.includes('href="pdf-file-size-reduction.html"'), 'pdf.html FAQ missing link to pdf-file-size-reduction.html');
});

test('sns-blog-image-size.html contains the verified Instagram and Naver Blog dimensions', function () {
  const html = readRepoFile('sns-blog-image-size.html');
  assert.ok(html.includes('1080') && html.includes('1350'), 'missing Instagram feed 1080x1350');
  assert.ok(html.includes('1300') && html.includes('885'), 'missing Naver Blog thumbnail 1300x885');
});

test('favicon-og-image-size.html contains the verified favicon/touch-icon/og:image dimensions', function () {
  const html = readRepoFile('favicon-og-image-size.html');
  assert.ok(html.includes('180'), 'missing Apple touch icon 180x180');
  assert.ok(html.includes('192') && html.includes('512'), 'missing Android/PWA 192/512');
  assert.ok(html.includes('1200') && html.includes('630'), 'missing og:image 1200x630');
});

test('guide.html section 1 is restructured as a list and keeps all round 1 + round 2 links', function () {
  const html = readRepoFile('guide.html');
  assert.ok(/<h2>1\. [^<]*<\/h2>[\s\S]*?<ul>/.test(html), 'guide.html section 1 is not restructured as a list');
  const mustKeepLinks = [
    'kakao-photo-quality.html',
    'email-attachment-size.html',
    'image-format-comparison.html',
    'photo-id-resize.html',
    'ai-upscaling-limits.html',
    'web-image-loading-speed.html',
    'cloud-storage-photo-tips.html',
    'sns-blog-image-size.html',
    'favicon-og-image-size.html'
  ];
  mustKeepLinks.forEach(function (link) {
    assert.ok(html.includes('href="' + link + '"'), 'guide.html missing link to ' + link);
  });
});
```

- [ ] **Step 2: 실행해서 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^FAIL"`
Expected: 신규 테스트 다수가 FAIL (5개 파일 × 4개 공통 검사 = 20 + 개별 사실 검증 5개 + pdf.html 링크 1개 + guide.html 재구성 1개 = 27개 전후 FAIL). exit code 1. 기존 테스트는 전부 PASS 유지.

- [ ] **Step 3: 커밋**

```bash
git add tests/seoPagesIntegrity.test.js
git commit -m "test: add integrity checks for guide articles round 2

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: `web-image-loading-speed.html` 작성

**Files:**
- Create: `web-image-loading-speed.html`

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>웹사이트 이미지 로딩 속도 개선하기 (Core Web Vitals LCP)</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="Core Web Vitals의 LCP 기준과, 이미지 용량 때문에 페이지 로딩이 느려지는 이유, 실질적으로 개선하는 방법을 정리했습니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/web-image-loading-speed.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="웹사이트 이미지 로딩 속도 개선하기 (Core Web Vitals LCP)">
  <meta property="og:description" content="Core Web Vitals의 LCP 기준과 이미지 로딩 속도를 실질적으로 개선하는 방법을 정리했습니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/web-image-loading-speed.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "웹사이트 이미지 로딩 속도 개선하기 (Core Web Vitals LCP)",
    "url": "https://nwb010118.github.io/image-toolbox/web-image-loading-speed.html",
    "description": "Core Web Vitals의 LCP 기준과 이미지 로딩 속도를 실질적으로 개선하는 방법을 정리했습니다.",
    "inLanguage": "ko",
    "datePublished": "2026-09-10"
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>웹사이트 이미지 로딩 속도, 왜 중요할까</h1>
    <p class="subtitle">Core Web Vitals의 LCP 기준부터 실질적인 개선 방법까지 정리했습니다.</p>
    <p class="tool-nav"><a href="guide.html">← 가이드 목록</a></p>

    <section class="info-section">
      <h2>LCP(Largest Contentful Paint)란</h2>
      <p>구글이 검색 순위에 반영하는 페이지 경험 지표인 Core Web Vitals 중 하나로, 페이지에서 가장 큰 콘텐츠 요소가 화면에 그려지기까지 걸리는 시간을 측정합니다. 기준은 <strong>2.5초 이하면 양호, 2.5~4.0초는 개선 필요, 4.0초를 초과하면 나쁨</strong>으로 평가됩니다.</p>
      <p>많은 웹페이지에서 가장 큰 콘텐츠 요소는 이미지입니다. 히어로 이미지, 대표 사진, 배경 이미지처럼 화면에서 넓은 면적을 차지하는 이미지가 LCP 요소로 측정되는 경우가 흔합니다.</p>
    </section>

    <section class="info-section">
      <h2>이미지 용량이 LCP를 늦추는 이유</h2>
      <p>이미지 파일 용량이 클수록 브라우저가 다운로드를 완료하는 데 걸리는 시간이 늘어나고, 그만큼 화면에 그려지는 시점도 늦어집니다. 특히 모바일처럼 네트워크 속도가 느린 환경에서는 이 차이가 훨씬 크게 나타납니다. 카메라로 찍은 원본 사진을 리사이즈 없이 그대로 웹에 올리면 실제로 화면에 표시되는 크기보다 훨씬 큰 용량을 다운로드하게 되는 경우가 많습니다.</p>
    </section>

    <section class="info-section">
      <h2>실질적인 개선 방법</h2>
      <p><strong>이미지 용량 줄이기.</strong> 화질 손상이 크게 느껴지지 않는 수준에서 품질을 조절해 압축하면 다운로드 시간이 줄어듭니다. <a href="index.html">이미지 압축 도구</a>로 품질을 조절할 수 있고, 실제로 얼마나 줄어드는지는 <a href="benchmark.html">실측 압축률 비교</a>에서 확인할 수 있습니다.</p>
      <p><strong>더 효율적인 형식 사용.</strong> 같은 화질이라면 WebP가 JPG보다 더 작은 용량으로 나오는 경우가 많습니다. 형식별 차이는 <a href="image-format-comparison.html">PNG vs JPG vs WebP 비교</a>에서 자세히 다룹니다.</p>
      <p><strong>필요한 크기 이상으로 올리지 않기.</strong> 화면에 표시될 실제 크기보다 훨씬 큰 원본을 그대로 쓰면 불필요하게 큰 파일을 다운로드하게 됩니다. 가로/세로 픽셀 크기를 실제 표시 크기에 맞게 줄이는 것도 <a href="index.html">이미지 압축 도구</a>에서 함께 처리할 수 있습니다.</p>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>LCP가 정확히 몇 초여야 안전한가요?</summary>
        <p>구글 기준으로는 2.5초 이하가 양호합니다. 2.5초에서 4.0초 사이는 개선이 필요한 상태이고, 4.0초를 넘으면 나쁨으로 평가됩니다.</p>
      </details>
      <details>
        <summary>이미지를 압축하면 무조건 LCP가 좋아지나요?</summary>
        <p>이미지 용량이 LCP에 영향을 주는 여러 요인 중 하나이므로, 압축만으로 항상 기준을 충족하지는 않습니다. 다만 이미지가 LCP 요소인 경우가 많아서 용량을 줄이는 것이 가장 효과가 큰 개선 방법 중 하나입니다.</p>
      </details>
      <details>
        <summary>내 페이지의 LCP는 어떻게 확인하나요?</summary>
        <p>이 사이트는 LCP 측정 기능을 제공하지 않습니다. 구글의 PageSpeed Insights나 Chrome 개발자 도구의 Lighthouse 기능으로 직접 측정할 수 있습니다.</p>
      </details>
    </section>

    <section class="info-section">
      <h2>관련 페이지</h2>
      <p><a href="image-format-comparison.html">PNG vs JPG vs WebP 비교</a></p>
      <p><a href="benchmark.html">실측 압축률 비교</a></p>
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

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^FAIL"`
Expected: `web-image-loading-speed.html` 관련 head/JSON-LD/footer/LCP 수치 테스트는 PASS. `guide.html`/`sitemap.xml` 링크 테스트는 여전히 FAIL(정상 — Task 7 전).

- [ ] **Step 3: 커밋**

```bash
git add web-image-loading-speed.html
git commit -m "Add web-image-loading-speed.html guide article

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: `cloud-storage-photo-tips.html` 작성

**Files:**
- Create: `cloud-storage-photo-tips.html`

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>클라우드 저장공간 아끼는 사진 압축 팁 (구글 드라이브·아이클라우드)</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="구글 드라이브, 아이클라우드, 원드라이브, 네이버 마이박스의 무료 저장공간 용량을 정리하고, 사진 압축으로 같은 용량에 더 많은 사진을 보관하는 방법을 안내합니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/cloud-storage-photo-tips.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="클라우드 저장공간 아끼는 사진 압축 팁 (구글 드라이브·아이클라우드)">
  <meta property="og:description" content="구글 드라이브, 아이클라우드, 원드라이브, 네이버 마이박스의 무료 저장공간 용량과 아끼는 방법을 정리했습니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/cloud-storage-photo-tips.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "클라우드 저장공간 아끼는 사진 압축 팁 (구글 드라이브·아이클라우드)",
    "url": "https://nwb010118.github.io/image-toolbox/cloud-storage-photo-tips.html",
    "description": "구글 드라이브, 아이클라우드, 원드라이브, 네이버 마이박스의 무료 저장공간 용량과 아끼는 방법을 정리했습니다.",
    "inLanguage": "ko",
    "datePublished": "2026-09-10"
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>클라우드 저장공간, 사진 압축으로 더 오래 쓰는 법</h1>
    <p class="subtitle">서비스별 무료 용량과, 같은 용량으로 더 많은 사진을 보관하는 방법을 정리했습니다.</p>
    <p class="tool-nav"><a href="guide.html">← 가이드 목록</a></p>

    <section class="info-section">
      <h2>서비스별 무료 저장공간</h2>
      <p><strong>구글 드라이브</strong> — 15GB(드라이브, Gmail, 구글 포토가 이 용량을 함께 씁니다).</p>
      <p><strong>아이클라우드</strong> — 5GB.</p>
      <p><strong>원드라이브</strong> — 5GB.</p>
      <p><strong>네이버 마이박스</strong> — 30GB.</p>
      <p>구글 드라이브는 드라이브 파일뿐 아니라 Gmail 첨부파일, 구글 포토에 저장한 원본 품질 사진까지 15GB를 함께 나눠 쓰기 때문에, 사진이 많이 쌓이면 다른 용도로 쓸 공간이 빠르게 줄어듭니다.</p>
    </section>

    <section class="info-section">
      <h2>사진 용량을 줄이면 더 오래 쓸 수 있습니다</h2>
      <p>같은 무료 용량이라도 사진 한 장당 용량이 작아지면 더 많은 사진을 보관할 수 있습니다. <a href="index.html">이미지 압축 도구</a>에서 품질을 조절해 사진 용량을 줄인 뒤 업로드하면, 화질 차이가 크게 느껴지지 않는 수준에서도 전체 용량을 상당히 줄일 수 있습니다. 실제 압축 전후 용량 차이는 <a href="benchmark.html">실측 압축률 비교</a>에서 확인할 수 있습니다.</p>
      <p>이미 클라우드에 쌓여 있는 오래된 사진들도 다시 내려받아 압축한 뒤 원본을 지우고 재업로드하면 공간을 확보할 수 있습니다. 특히 스캔한 문서나 스크린샷처럼 다시 찍을 수 없는 자료가 아니라면, 압축 후 화질 차이를 확인해보고 결정하는 것을 권장합니다.</p>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>구글 포토에 저장한 사진도 15GB 안에 포함되나요?</summary>
        <p>네. 구글 포토에서 원본 품질로 저장한 사진은 구글 드라이브, Gmail과 같은 15GB 용량을 함께 사용합니다.</p>
      </details>
      <details>
        <summary>사진을 압축하면 클라우드에 이미 저장된 원본도 줄어드나요?</summary>
        <p>아니요. 압축은 새로 저장할 사진 파일에만 적용됩니다. 이미 클라우드에 저장된 원본의 용량을 줄이려면 원본을 내려받아 압축한 뒤 다시 업로드하고 기존 원본을 삭제해야 합니다.</p>
      </details>
      <details>
        <summary>어느 정도 압축해야 화질 차이가 크게 안 느껴지나요?</summary>
        <p>이미지 종류에 따라 다릅니다. 실제 품질별 압축률과 결과물 차이는 <a href="benchmark.html">실측 압축률 비교</a>에서 확인할 수 있습니다.</p>
      </details>
    </section>

    <section class="info-section">
      <h2>관련 페이지</h2>
      <p><a href="benchmark.html">실측 압축률 비교</a></p>
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

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^FAIL"`
Expected: `cloud-storage-photo-tips.html` 관련 테스트(head/JSON-LD/footer/용량 수치) PASS.

- [ ] **Step 3: 커밋**

```bash
git add cloud-storage-photo-tips.html
git commit -m "Add cloud-storage-photo-tips.html guide article

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: `pdf-file-size-reduction.html` 작성 + `pdf.html` FAQ 링크

**Files:**
- Create: `pdf-file-size-reduction.html`
- Modify: `pdf.html:241` (기존 "PDF 파일 용량도 줄일 수 있나요?" FAQ 답변에 링크 추가)

**Interfaces:**
- Consumes: `pdf.html`(이미지→PDF 최대 50장 배치, PDF 자체 압축 기능 없음 — 이미 FAQ에 명시된 사실), `index.html`(이미지 압축 도구)

- [ ] **Step 1: `pdf-file-size-reduction.html` 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>PDF 파일 용량 줄이는 법 (직접 압축이 안 될 때 우회법)</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="PDF 파일 용량을 줄이는 방법을 정리했습니다. 이미지로 추출해 압축한 뒤 다시 PDF로 합치는 방법이 스캔본류 PDF에 효과적인 이유와, 텍스트 위주 PDF에는 효과가 적은 이유를 설명합니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/pdf-file-size-reduction.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="PDF 파일 용량 줄이는 법 (직접 압축이 안 될 때 우회법)">
  <meta property="og:description" content="PDF 파일 용량을 줄이는 방법과, 어떤 종류의 PDF에 효과적인지를 정리했습니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/pdf-file-size-reduction.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "PDF 파일 용량 줄이는 법 (직접 압축이 안 될 때 우회법)",
    "url": "https://nwb010118.github.io/image-toolbox/pdf-file-size-reduction.html",
    "description": "PDF 파일 용량을 줄이는 방법과, 어떤 종류의 PDF에 효과적인지를 정리했습니다.",
    "inLanguage": "ko",
    "datePublished": "2026-09-10"
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>PDF 파일 용량, 어떻게 줄일 수 있을까</h1>
    <p class="subtitle">이 사이트의 도구로 PDF 자체를 직접 압축할 수는 없지만, 우회하는 방법이 있습니다.</p>
    <p class="tool-nav"><a href="guide.html">← 가이드 목록</a></p>

    <section class="info-section">
      <h2>솔직한 전제: 이 사이트는 PDF 파일 자체를 압축하지 않습니다</h2>
      <p><a href="pdf.html">PDF 변환 도구</a>는 이미지를 PDF로 합치거나 PDF 페이지를 이미지로 추출하는 기능입니다. PDF 파일 자체의 용량을 줄이는 압축 기능은 없습니다. 대신 아래처럼 우회하는 방법으로 PDF 용량을 줄일 수 있습니다.</p>
    </section>

    <section class="info-section">
      <h2>우회 방법: 추출 → 압축 → 재합치기</h2>
      <p>1) <a href="pdf.html">PDF 변환 도구</a>에서 PDF를 페이지별 이미지로 추출합니다. 2) 추출된 이미지를 <a href="index.html">이미지 압축 도구</a>에서 품질을 조절해 압축합니다. 3) 압축된 이미지를 다시 <a href="photos-to-pdf.html">이미지→PDF</a>로 합칩니다. 이 과정을 거치면 PDF 안에 들어있던 이미지의 용량이 줄어든 만큼 전체 PDF 파일의 용량도 줄어듭니다.</p>
    </section>

    <section class="info-section">
      <h2>모든 PDF에 효과가 있는 건 아닙니다</h2>
      <p>이 방법은 <strong>스캔한 문서, 사진을 모은 PDF처럼 이미지가 용량 대부분을 차지하는 PDF</strong>에 효과적입니다. 이미지 용량을 줄이면 PDF 전체 용량도 그만큼 줄어들기 때문입니다.</p>
      <p>반면 <strong>글자 위주의 텍스트 PDF</strong>는 이 방법의 효과가 거의 없습니다. 텍스트는 원래부터 용량이 매우 작기 때문에 압축할 여지가 거의 없고, 오히려 텍스트를 이미지로 바꾸는 과정에서 글자를 마우스로 선택하거나 검색하는 기능을 잃게 됩니다. 텍스트 위주 PDF는 이 우회법 대신 워드프로세서나 PDF 편집 프로그램의 용량 최적화 기능을 이용하는 것이 더 적합합니다.</p>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>이 사이트에서 PDF를 바로 업로드해서 압축할 수 있나요?</summary>
        <p>아니요. PDF 파일 자체를 압축하는 기능은 제공하지 않습니다. 이미지로 추출해서 압축한 뒤 다시 PDF로 합치는 우회 방법을 이용해야 합니다.</p>
      </details>
      <details>
        <summary>글자가 많은 보고서 PDF도 이 방법으로 용량을 줄일 수 있나요?</summary>
        <p>효과가 크지 않습니다. 텍스트는 이미 용량이 작아서 압축할 여지가 거의 없고, 이미지로 바꾸면 텍스트 선택·검색 기능을 잃게 됩니다. 텍스트 위주 PDF는 다른 방법을 권장합니다.</p>
      </details>
      <details>
        <summary>스캔한 문서 PDF는 얼마나 줄어드나요?</summary>
        <p>원본 스캔 품질과 압축 설정에 따라 다릅니다. 이미지 압축 품질별로 용량이 얼마나 줄어드는지는 <a href="benchmark.html">실측 압축률 비교</a>에서 확인할 수 있습니다.</p>
      </details>
    </section>

    <section class="info-section">
      <h2>관련 페이지</h2>
      <p><a href="pdf.html">PDF 변환 도구</a></p>
      <p><a href="index.html">이미지 압축 도구</a></p>
      <p><a href="photos-to-pdf.html">여러 장 사진을 PDF로 합치는 법</a></p>
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

- [ ] **Step 2: `pdf.html`의 FAQ 답변에 링크 추가**

`pdf.html`의 241번째 줄(`PDF 파일 용량도 줄일 수 있나요?`의 답변)을 아래로 교체한다:

기존:
```html
        <p>이 도구는 이미지를 PDF로 합치거나 PDF의 각 페이지를 이미지로 추출하는 기능입니다. PDF 자체의 용량을 압축하려면, 이미지로 추출한 뒤 이미지 압축 도구에서 압축하고 다시 PDF로 합치는 방식을 이용해주세요.</p>
```

변경:
```html
        <p>이 도구는 이미지를 PDF로 합치거나 PDF의 각 페이지를 이미지로 추출하는 기능입니다. PDF 자체의 용량을 압축하려면, 이미지로 추출한 뒤 이미지 압축 도구에서 압축하고 다시 PDF로 합치는 방식을 이용해주세요. 어떤 PDF에 이 방법이 효과적인지 자세한 설명은 <a href="pdf-file-size-reduction.html">이 글</a>을 참고하세요.</p>
```

- [ ] **Step 3: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^FAIL"`
Expected: `pdf-file-size-reduction.html` 관련 테스트와 `pdf.html` FAQ 링크 테스트 PASS.

- [ ] **Step 4: 커밋**

```bash
git add pdf-file-size-reduction.html pdf.html
git commit -m "Add pdf-file-size-reduction.html guide article and link from pdf.html FAQ

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: `sns-blog-image-size.html` 작성

**Files:**
- Create: `sns-blog-image-size.html`

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>인스타그램·네이버 블로그 이미지 최적 크기 정리</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="인스타그램 피드·정사각·스토리, 네이버 블로그 썸네일·모바일 커버 이미지의 정확한 픽셀 규격과 브라우저에서 맞추는 방법을 정리했습니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/sns-blog-image-size.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="인스타그램·네이버 블로그 이미지 최적 크기 정리">
  <meta property="og:description" content="인스타그램과 네이버 블로그 이미지의 정확한 픽셀 규격을 정리했습니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/sns-blog-image-size.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "인스타그램·네이버 블로그 이미지 최적 크기 정리",
    "url": "https://nwb010118.github.io/image-toolbox/sns-blog-image-size.html",
    "description": "인스타그램과 네이버 블로그 이미지의 정확한 픽셀 규격을 정리했습니다.",
    "inLanguage": "ko",
    "datePublished": "2026-09-10"
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>인스타그램·네이버 블로그, 이미지 몇 픽셀이 적당할까</h1>
    <p class="subtitle">플랫폼마다 권장 규격이 다릅니다. 정확한 픽셀 크기를 정리했습니다.</p>
    <p class="tool-nav"><a href="guide.html">← 가이드 목록</a></p>

    <section class="info-section">
      <h2>인스타그램 이미지 규격</h2>
      <p><strong>피드 게시물(4:5)</strong> — 1080 × 1350px.</p>
      <p><strong>정사각형 게시물(1:1)</strong> — 1080 × 1080px.</p>
      <p><strong>스토리·릴스(9:16)</strong> — 1080 × 1920px.</p>
    </section>

    <section class="info-section">
      <h2>네이버 블로그 이미지 규격</h2>
      <p><strong>게시글 썸네일(검색 노출용)</strong> — 1300 × 885px.</p>
      <p><strong>모바일 앱 커버 이미지</strong> — 1080 × 1300px.</p>
    </section>

    <section class="info-section">
      <h2>브라우저에서 규격에 맞게 크기 조정하는 법</h2>
      <p><a href="index.html">이미지 압축 도구</a>의 가로/세로 픽셀 입력란에 원하는 규격(예: 1080 × 1350)을 직접 입력하면 해당 크기로 맞춰집니다. '비율 유지'를 꺼야 가로세로 값을 각각 원하는 대로 지정할 수 있습니다. 원본 사진의 비율이 목표 규격과 크게 다르다면, 먼저 필요한 부분만 잘라낸 뒤 정확한 픽셀 크기로 맞추는 순서를 권장합니다.</p>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>정사각형 사진을 인스타그램 스토리에 올려도 되나요?</summary>
        <p>업로드는 되지만 화면 비율(9:16)과 맞지 않아 위아래에 여백이 생기거나 잘릴 수 있습니다. 스토리는 1080×1920px 비율로 미리 맞춰서 올리는 것이 더 안전합니다.</p>
      </details>
      <details>
        <summary>네이버 블로그 썸네일 규격을 안 맞추면 어떻게 되나요?</summary>
        <p>업로드 자체는 가능하지만 검색 결과나 목록에서 이미지가 원하는 비율로 잘려서 보일 수 있습니다. 1300×885px에 맞춰두면 노출되는 화면에서 의도한 대로 보일 가능성이 높아집니다.</p>
      </details>
      <details>
        <summary>이미지 크기를 규격보다 작게 올리면 문제가 되나요?</summary>
        <p>플랫폼이 자동으로 확대해서 보여주긴 하지만 화질이 흐려질 수 있습니다. 가능하면 권장 픽셀 크기 이상의 원본에서 시작해 정확한 크기로 맞추는 것이 좋습니다.</p>
      </details>
    </section>

    <section class="info-section">
      <h2>관련 페이지</h2>
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

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^FAIL"`
Expected: `sns-blog-image-size.html` 관련 테스트(head/JSON-LD/footer/규격 수치) PASS.

- [ ] **Step 3: 커밋**

```bash
git add sns-blog-image-size.html
git commit -m "Add sns-blog-image-size.html guide article

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: `favicon-og-image-size.html` 작성

**Files:**
- Create: `favicon-og-image-size.html`

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>파비콘·OG 이미지 정확한 크기 정리 (16px~1200px)</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="파비콘, Apple Touch Icon, Android/PWA 아이콘, og:image의 정확한 픽셀 규격과 브라우저에서 각 크기를 만드는 방법을 정리했습니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/favicon-og-image-size.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="파비콘·OG 이미지 정확한 크기 정리 (16px~1200px)">
  <meta property="og:description" content="파비콘, 앱 아이콘, og:image의 정확한 픽셀 규격을 정리했습니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/favicon-og-image-size.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "파비콘·OG 이미지 정확한 크기 정리 (16px~1200px)",
    "url": "https://nwb010118.github.io/image-toolbox/favicon-og-image-size.html",
    "description": "파비콘, 앱 아이콘, og:image의 정확한 픽셀 규격을 정리했습니다.",
    "inLanguage": "ko",
    "datePublished": "2026-09-10"
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>파비콘부터 OG 이미지까지, 정확한 크기는 몇 픽셀일까</h1>
    <p class="subtitle">용도별로 요구하는 픽셀 크기가 다릅니다. 정확한 규격을 정리했습니다.</p>
    <p class="tool-nav"><a href="guide.html">← 가이드 목록</a></p>

    <section class="info-section">
      <h2>파비콘(브라우저 탭 아이콘)</h2>
      <p>브라우저 탭에 표시되는 작은 아이콘입니다. <strong>16×16px, 32×32px, 48×48px</strong> 여러 크기를 하나의 favicon.ico 파일에 포함하는 것이 권장됩니다. 화면 배율(고해상도 디스플레이 등)에 따라 브라우저가 알맞은 크기를 골라 쓰기 때문입니다.</p>
    </section>

    <section class="info-section">
      <h2>Apple Touch Icon과 Android/PWA 아이콘</h2>
      <p><strong>Apple Touch Icon</strong> — 180×180px. iOS에서 웹사이트를 홈 화면에 추가할 때 쓰이는 아이콘입니다.</p>
      <p><strong>Android/PWA 아이콘</strong> — 192×192px, 512×512px. 안드로이드 홈 화면 추가나 PWA(웹앱) 설치 시 쓰입니다.</p>
    </section>

    <section class="info-section">
      <h2>og:image(소셜 공유 미리보기 이미지)</h2>
      <p>카카오톡, 페이스북, X(트위터) 등에 링크를 공유했을 때 보이는 미리보기 이미지입니다. <strong>1200×630px(1.91:1 비율)</strong>이 표준 규격으로 널리 쓰입니다. 이 비율에서 벗어나면 플랫폼에 따라 이미지가 잘려 보일 수 있습니다.</p>
    </section>

    <section class="info-section">
      <h2>브라우저에서 각 크기 만드는 법</h2>
      <p><a href="index.html">이미지 압축 도구</a>의 가로/세로 픽셀 입력란에 원하는 규격을 직접 입력해 필요한 크기로 만들 수 있습니다. 파비콘처럼 여러 크기가 필요하다면 원본 하나를 준비해두고 필요한 크기(16, 32, 48, 180, 192, 512px 등)마다 각각 리사이즈하면 됩니다. og:image는 1200×630px 비율에 맞춰 미리 크롭한 뒤 크기를 조정하는 것을 권장합니다.</p>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>파비콘을 32×32px 하나만 만들면 안 되나요?</summary>
        <p>한 가지 크기만으로도 작동은 하지만, 화면 배율이 높은 기기에서는 확대되면서 흐릿하게 보일 수 있습니다. 여러 크기를 함께 준비하면 기기에 맞는 크기가 자동으로 선택됩니다.</p>
      </details>
      <details>
        <summary>og:image 비율을 안 지키면 어떻게 되나요?</summary>
        <p>플랫폼마다 다르지만, 1.91:1 비율에서 크게 벗어나면 미리보기에서 이미지의 일부가 잘려 보이거나 여백이 생길 수 있습니다.</p>
      </details>
      <details>
        <summary>PWA 아이콘은 꼭 192px과 512px 둘 다 필요한가요?</summary>
        <p>대부분의 PWA 매니페스트 가이드에서 두 크기를 함께 요구합니다. 192px은 홈 화면 아이콘, 512px은 스플래시 화면 등 더 큰 화면에 쓰입니다.</p>
      </details>
    </section>

    <section class="info-section">
      <h2>관련 페이지</h2>
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

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^FAIL"`
Expected: `favicon-og-image-size.html` 관련 테스트(head/JSON-LD/footer/규격 수치) PASS.

- [ ] **Step 3: 커밋**

```bash
git add favicon-og-image-size.html
git commit -m "Add favicon-og-image-size.html guide article

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: `guide.html` 재구성 + `sitemap.xml` 연결

**Files:**
- Modify: `guide.html:38-41` (1번 섹션을 목록으로 재구성)
- Modify: `guide.html:43-46` (2번 섹션에 PDF 용량 링크 추가)
- Modify: `sitemap.xml:50` (`</urlset>` 앞)

**Interfaces:**
- Consumes: Task 2~6에서 만든 5개 신규 페이지 + Task 1의 1차 배치 5개 페이지(이미 배포됨)
- Produces: Task 1 테스트의 나머지 전부가 통과 — 전체 스위트 GREEN

- [ ] **Step 1: `guide.html`의 1번 섹션을 목록으로 재구성**

`guide.html`의 38~41번째 줄을 아래로 교체한다:

기존:
```html
    <section class="info-section">
      <h2>1. 사진 용량을 줄여야 할 때</h2>
      <p>웹사이트에 이미지를 그대로 올리면 페이지 로딩이 느려지고, 이는 방문자 이탈뿐 아니라 검색엔진 SEO 순위에도 불리하게 작용합니다. 이메일에 사진을 첨부할 때 용량 제한에 걸리는 경우, 클라우드 저장공간을 아끼고 싶은 경우에도 압축이 필요합니다. <a href="index.html">이미지 압축 도구</a>에서 품질과 가로세로 크기를 조절해 용량을 줄일 수 있습니다. 실제로 얼마나 줄어드는지는 <a href="benchmark.html">실측 압축률 비교</a>에서 확인할 수 있습니다. 이메일 서비스별 첨부 용량 제한이 궁금하다면 <a href="email-attachment-size.html">이 글</a>을, 카카오톡으로 사진을 보낼 때 화질이 떨어지는 이유는 <a href="kakao-photo-quality.html">이 글</a>을 참고하세요. 어떤 형식(JPG·PNG·WebP)을 골라야 할지 고민된다면 <a href="image-format-comparison.html">형식 비교</a>를, 여권사진처럼 정확한 규격에 맞춰야 한다면 <a href="photo-id-resize.html">여권사진·증명사진 규격 가이드</a>를 참고하세요.</p>
    </section>
```

변경:
```html
    <section class="info-section">
      <h2>1. 사진 용량을 줄여야 할 때</h2>
      <p>웹사이트에 이미지를 그대로 올리면 페이지 로딩이 느려지고, 이는 방문자 이탈뿐 아니라 검색엔진 SEO 순위에도 불리하게 작용합니다. 이메일에 사진을 첨부할 때 용량 제한에 걸리는 경우, 클라우드 저장공간을 아끼고 싶은 경우에도 압축이 필요합니다. <a href="index.html">이미지 압축 도구</a>에서 품질과 가로세로 크기를 조절해 용량을 줄일 수 있습니다. 실제로 얼마나 줄어드는지는 <a href="benchmark.html">실측 압축률 비교</a>에서 확인할 수 있습니다.</p>
      <p>상황별로 더 자세히 알아보려면:</p>
      <ul>
        <li><a href="email-attachment-size.html">이메일 서비스별 첨부 용량 제한 정리</a></li>
        <li><a href="kakao-photo-quality.html">카카오톡 사진 화질 저하 이유와 원본으로 보내는 법</a></li>
        <li><a href="image-format-comparison.html">PNG vs JPG vs WebP, 언제 무엇을 써야 할까</a></li>
        <li><a href="photo-id-resize.html">여권사진·증명사진 규격에 맞게 리사이즈하는 법</a></li>
        <li><a href="web-image-loading-speed.html">웹사이트 이미지 로딩 속도 개선하기</a></li>
        <li><a href="cloud-storage-photo-tips.html">클라우드 저장공간 아끼는 사진 압축 팁</a></li>
        <li><a href="sns-blog-image-size.html">인스타그램·네이버 블로그 이미지 최적 크기</a></li>
        <li><a href="favicon-og-image-size.html">파비콘·OG 이미지 정확한 크기</a></li>
      </ul>
    </section>
```

- [ ] **Step 2: `guide.html`의 2번 섹션에 PDF 용량 링크 추가**

`guide.html`의 44~46번째 줄을 아래로 교체한다:

기존:
```html
    <section class="info-section">
      <h2>2. 여러 장의 이미지를 PDF로 합쳐야 할 때</h2>
      <p>서류 제출, 스캔한 문서 정리, 포트폴리오 공유처럼 여러 장의 사진을 순서대로 하나의 파일로 묶어야 하는 상황이 있습니다. 반대로 PDF 안에 있는 페이지를 개별 이미지로 꺼내야 할 때도 있고요. <a href="pdf.html">PDF 변환 도구</a>에서 이미지→PDF, PDF→이미지 양방향 변환을 할 수 있습니다. 여러 장의 사진을 PDF로 합치는 자세한 방법은 <a href="photos-to-pdf.html">이 안내</a>를 참고하세요.</p>
    </section>
```

변경:
```html
    <section class="info-section">
      <h2>2. 여러 장의 이미지를 PDF로 합쳐야 할 때</h2>
      <p>서류 제출, 스캔한 문서 정리, 포트폴리오 공유처럼 여러 장의 사진을 순서대로 하나의 파일로 묶어야 하는 상황이 있습니다. 반대로 PDF 안에 있는 페이지를 개별 이미지로 꺼내야 할 때도 있고요. <a href="pdf.html">PDF 변환 도구</a>에서 이미지→PDF, PDF→이미지 양방향 변환을 할 수 있습니다. 여러 장의 사진을 PDF로 합치는 자세한 방법은 <a href="photos-to-pdf.html">이 안내</a>를 참고하세요. PDF 파일 자체의 용량을 줄이는 방법은 <a href="pdf-file-size-reduction.html">이 글</a>을 참고하세요.</p>
    </section>
```

- [ ] **Step 3: `sitemap.xml`에 5개 URL 추가**

`sitemap.xml`의 `</urlset>` 태그(50번째 줄) 바로 앞에 아래 블록을 추가한다:

```xml
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/web-image-loading-speed.html</loc>
  </url>
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/cloud-storage-photo-tips.html</loc>
  </url>
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/pdf-file-size-reduction.html</loc>
  </url>
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/sns-blog-image-size.html</loc>
  </url>
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/favicon-og-image-size.html</loc>
  </url>
```

- [ ] **Step 4: 전체 테스트 실행 — 전부 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | tee /tmp/test-output.txt | grep -c "^FAIL"`
Expected: `FAIL` 카운트 0. 이어서 `grep -c "^PASS" /tmp/test-output.txt`로 PASS 개수를 직접 세어 1차 배치 종료 시점(round1 plan 종료 시) 개수보다 늘어났는지 확인한다.

- [ ] **Step 5: 브라우저로 최종 확인**

`guide.html`(재구성된 목록 렌더링, 링크 9개 모두 동작), `pdf.html`(FAQ 링크)에서 새로 추가된 링크가 각각 올바른 페이지로 이동하는지 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add guide.html sitemap.xml
git commit -m "Wire guide articles round 2 into guide.html, pdf.html, sitemap.xml

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: 배포

- [ ] **Step 1: 원격 저장소로 푸시**

```bash
git push origin master:main
```

- [ ] **Step 2: 배포 확인**

`https://nwb010118.github.io/image-toolbox/web-image-loading-speed.html`(및 나머지 4개)이 몇 분 뒤 실제로 열리는지 확인한다. 배포 확인 시 실제로 배포된 페이지에서 먼저 확인한 정확한 문구를 grep 패턴으로 사용한다.

- [ ] **Step 3: 다음 단계**

2차 배치 효과를 지켜본 뒤, AdSense 반려 대응 계획 4단계의 3차 배치(목표 10~20개 중 나머지) 진행 여부를 사용자와 논의한다. 4단계 전체 배치가 끝나면 5단계(GSC 사이트맵 재제출 → 애드센스 재신청)로 이어간다.
