# 정보성 가이드 글 1차 라운드(5개) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제로 검증된 사실에 기반한 정보성 가이드 글 5개를 신설하고, `guide.html`/`benchmark.html`/`upscale.html`/`sitemap.xml`에 연결한다 (AdSense 반려 대응 5단계 계획의 4단계, 1차 배치).

**Architecture:** 저장소 루트에 신규 정적 페이지 5개를 추가한다. 새 변환 로직은 없다 — 각 글은 기존 `container`/`subtitle`/`tool-nav`/`info-section`/`btn`/`site-footer` 클래스를 재사용하고, 문맥에 맞는 지점에서 기존 도구로 연결한다.

**Tech Stack:** 순수 HTML(신규 CSS 클래스 없음). Node 기반 무프레임워크 통합 테스트(`tests/seoPagesIntegrity.test.js`, 기존 파일에 이어서 작성).

## Global Constraints

- 새 CSS 클래스를 추가하지 않는다 — `container`, `subtitle`, `tool-nav`, `info-section`, `btn`, `site-footer`만 재사용한다.
- 새 JS 파일/함수를 추가하지 않는다.
- 각 신규 페이지는 `title`/`meta description`/`canonical`/`og:type`(article)/`og:title`/`og:description`/`og:url`/`og:locale`를 기존 페이지들과 동일한 패턴으로 갖춘다. `Article` schema.org JSON-LD를 포함한다.
- 아래 각 글에 명시된 사실(이메일 용량 제한, 여권사진 규격, 카카오톡 설정 경로 등)은 이미 웹 검색으로 확인된 값이다 — 임의로 다른 숫자로 바꾸지 않는다.
- `image-format-comparison.html`은 압축률 수치를 새로 만들지 않고 `benchmark.html`의 실측값을 인용한다.
- 5개 신규 페이지는 전부 표준 footer(`privacy.html`/`about.html`/`contact.html` 링크)를 포함한다.
- 언어는 한국어, 이모지 사용 금지, UTF-8, `<!DOCTYPE html>`로 시작.

---

## Task 1: 통합 검증 테스트 확장 (실패 확인)

**Files:**
- Modify: `tests/seoPagesIntegrity.test.js` (파일 끝에 이어서 작성)

**Interfaces:**
- Consumes: 기존 `test`, `readRepoFile`, `extractJsonLdBlocks` 헬퍼 함수
- Produces: RED 상태 확인

- [ ] **Step 1: 테스트 파일 끝에 아래 코드를 추가**

```javascript

const GUIDE_ARTICLES = [
  'kakao-photo-quality.html',
  'email-attachment-size.html',
  'image-format-comparison.html',
  'photo-id-resize.html',
  'ai-upscaling-limits.html'
];

GUIDE_ARTICLES.forEach(function (file) {
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

test('email-attachment-size.html contains the verified size limits', function () {
  const html = readRepoFile('email-attachment-size.html');
  assert.ok(html.includes('25MB'), 'missing Gmail 25MB limit');
  assert.ok(html.includes('10MB'), 'missing Naver 10MB base limit');
  assert.ok(html.includes('2GB'), 'missing Naver large-attachment 2GB limit');
  assert.ok(html.includes('4GB'), 'missing Daum large-attachment 4GB limit');
});

test('photo-id-resize.html contains the verified photo spec numbers', function () {
  const html = readRepoFile('photo-id-resize.html');
  assert.ok(html.includes('35') && html.includes('45'), 'missing 35x45mm spec');
  assert.ok(html.includes('413') && html.includes('531'), 'missing 413x531px spec');
  assert.ok(html.includes('300'), 'missing 300DPI spec');
});

test('image-format-comparison.html cites benchmark.html data instead of duplicating measurement', function () {
  const html = readRepoFile('image-format-comparison.html');
  assert.ok(html.includes('href="benchmark.html"'), 'missing link to benchmark.html');
});

test('ai-upscaling-limits.html links to and from upscale.html', function () {
  const article = readRepoFile('ai-upscaling-limits.html');
  const upscalePage = readRepoFile('upscale.html');
  assert.ok(article.includes('href="upscale.html"'), 'ai-upscaling-limits.html missing link to upscale.html');
  assert.ok(upscalePage.includes('href="ai-upscaling-limits.html"'), 'upscale.html missing link to ai-upscaling-limits.html');
});

test('benchmark.html links to image-format-comparison.html', function () {
  const html = readRepoFile('benchmark.html');
  assert.ok(html.includes('href="image-format-comparison.html"'), 'benchmark.html missing link to image-format-comparison.html');
});
```

- [ ] **Step 2: 실행해서 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 기존 47개 테스트는 PASS. 신규 테스트(5개 파일 × 4개 검사 = 20개 + 개별 사실 검증 5개 = 25개)는 전부 FAIL. exit code 1.

- [ ] **Step 3: 커밋**

```bash
git add tests/seoPagesIntegrity.test.js
git commit -m "test: add integrity checks for guide articles round 1

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: `kakao-photo-quality.html` 작성

**Files:**
- Create: `kakao-photo-quality.html`

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>카카오톡 사진 화질 저하 이유와 원본으로 보내는 법</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="카카오톡으로 사진을 보내면 화질이 떨어지는 이유와 원본 그대로 전송하는 방법, 반대로 용량을 줄여서 안정적으로 보내는 방법을 정리했습니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/kakao-photo-quality.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="카카오톡 사진 화질 저하 이유와 원본으로 보내는 법">
  <meta property="og:description" content="카카오톡으로 사진을 보내면 화질이 떨어지는 이유와 원본 그대로 전송하는 방법을 정리했습니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/kakao-photo-quality.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "카카오톡 사진 화질 저하 이유와 원본으로 보내는 법",
    "url": "https://nwb010118.github.io/image-toolbox/kakao-photo-quality.html",
    "description": "카카오톡으로 사진을 보내면 화질이 떨어지는 이유와 원본 그대로 전송하는 방법을 정리했습니다.",
    "inLanguage": "ko",
    "datePublished": "2026-09-09"
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>카카오톡 사진, 왜 화질이 떨어질까</h1>
    <p class="subtitle">원본 그대로 보내는 방법과, 반대로 용량을 줄여서 안정적으로 보내는 방법을 정리했습니다.</p>
    <p class="tool-nav"><a href="guide.html">← 가이드 목록</a></p>

    <section class="info-section">
      <h2>카카오톡은 사진을 기본적으로 압축해서 보냅니다</h2>
      <p>채팅방에서 사진을 전송할 때 별도로 지정하지 않으면 카카오톡이 자동으로 용량을 줄여서 보냅니다. 여러 장을 빠르고 안정적으로 주고받을 수 있게 하기 위한 기본 동작입니다. 그래서 원본 사진과 비교하면 카카오톡으로 받은 사진은 화질이 떨어져 보일 수 있습니다.</p>
    </section>

    <section class="info-section">
      <h2>원본 화질 그대로 보내는 방법</h2>
      <p><strong>매번 선택해서 보내기.</strong> 채팅방에서 '+' 버튼 → 앨범에서 사진을 고른 뒤, 사진 선택 화면 우측 하단의 '원본' 버튼을 눌러 활성화하고 전송하면 그 사진만 원본 화질로 전송됩니다.</p>
      <p><strong>기본 설정을 원본으로 바꾸기.</strong> 모바일 앱에서 더보기 → 설정 → 데이터 및 저장공간 → 미디어 전송 관리에 들어가면 사진 화질을 저용량/일반 화질/원본 중에서 고를 수 있습니다. 여기서 원본을 선택하면 이후 전송하는 사진이 계속 원본 화질로 나갑니다. PC 카카오톡에는 이 설정 메뉴가 따로 없습니다.</p>
      <p><strong>파일로 보내기.</strong> '+' 버튼 → 파일에서 사진 파일을 직접 첨부하면 사진이 아니라 파일로 취급되어 압축 없이 전달됩니다.</p>
    </section>

    <section class="info-section">
      <h2>반대로 용량을 더 줄여서 보내고 싶다면</h2>
      <p>사진을 여러 장 한꺼번에 보내야 하거나 상대방의 데이터를 아껴주고 싶을 때는 원본 대신 미리 압축해서 보내는 게 더 유리합니다. <a href="index.html">이미지 압축 도구</a>에서 품질을 조절해 용량을 줄인 뒤 전송하면 됩니다.</p>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>원본으로 설정해서 보내도 카카오톡이 다시 압축하나요?</summary>
        <p>원본 옵션을 켜고 보낸 사진은 카카오톡이 추가로 압축하지 않고 그대로 전송됩니다.</p>
      </details>
      <details>
        <summary>여러 장을 한 번에 원본으로 보낼 수 있나요?</summary>
        <p>네. 앨범에서 여러 장을 선택한 상태에서 '원본' 버튼을 활성화하면 선택한 사진 전부 원본 화질로 전송됩니다.</p>
      </details>
      <details>
        <summary>PC 카카오톡에서도 원본으로 보낼 수 있나요?</summary>
        <p>PC 카카오톡에는 모바일처럼 화질을 저용량/일반/원본으로 선택하는 메뉴가 따로 없습니다. 원본 화질이 필요하다면 파일로 첨부하는 방법을 이용하는 것이 안전합니다.</p>
      </details>
    </section>

    <section class="info-section">
      <h2>관련 페이지</h2>
      <p><a href="email-attachment-size.html">이메일 첨부파일 용량 제한 정리</a></p>
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

Run: `node tests/seoPagesIntegrity.test.js`
Expected: `kakao-photo-quality.html` 관련 head/JSON-LD/footer 테스트는 PASS. `guide.html`/`sitemap.xml` 링크 테스트는 여전히 FAIL(정상 — Task 7 전).

- [ ] **Step 3: 커밋**

```bash
git add kakao-photo-quality.html
git commit -m "Add kakao-photo-quality.html guide article

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: `email-attachment-size.html` 작성

**Files:**
- Create: `email-attachment-size.html`

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>이메일 첨부파일 용량 제한 정리 (Gmail·네이버·다음)</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="Gmail, 네이버메일, 다음메일의 첨부파일 용량 제한을 정리하고, 제한에 걸렸을 때 사진 용량을 줄이거나 여러 장을 하나로 묶어 보내는 방법을 안내합니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/email-attachment-size.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="이메일 첨부파일 용량 제한 정리 (Gmail·네이버·다음)">
  <meta property="og:description" content="Gmail, 네이버메일, 다음메일의 첨부파일 용량 제한을 정리했습니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/email-attachment-size.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "이메일 첨부파일 용량 제한 정리 (Gmail·네이버·다음)",
    "url": "https://nwb010118.github.io/image-toolbox/email-attachment-size.html",
    "description": "Gmail, 네이버메일, 다음메일의 첨부파일 용량 제한을 정리했습니다.",
    "inLanguage": "ko",
    "datePublished": "2026-09-09"
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>이메일 첨부파일 용량 제한 정리</h1>
    <p class="subtitle">서비스마다 기본 첨부 용량과 대용량 첨부 기능의 한도가 다릅니다.</p>
    <p class="tool-nav"><a href="guide.html">← 가이드 목록</a></p>

    <section class="info-section">
      <h2>서비스별 첨부 용량 제한</h2>
      <p><strong>Gmail</strong> — 기본 첨부 용량은 25MB입니다. 이를 초과하면 Gmail이 자동으로 첨부파일 대신 Google Drive 공유 링크로 바꿔서 보냅니다.</p>
      <p><strong>네이버메일</strong> — 기본 첨부 용량은 10MB입니다. 대용량 첨부 기능을 쓰면 파일당 최대 2GB(최대 10개, 총 20GB)까지 보낼 수 있습니다.</p>
      <p><strong>다음메일</strong> — 기본 첨부 용량은 25MB입니다. 대용량 첨부 기능을 쓰면 최대 4GB까지 보낼 수 있습니다.</p>
    </section>

    <section class="info-section">
      <h2>제한에 걸렸을 때 대처법</h2>
      <p>대용량 첨부 기능을 쓸 수 없거나 쓰고 싶지 않은 상황이라면, 사진 자체의 용량을 줄이는 게 가장 간단한 방법입니다. <a href="index.html">이미지 압축 도구</a>에서 품질을 조절해 사진 용량을 줄일 수 있습니다(한 번에 한 장씩 처리하며, 파일당 최대 20MB까지 지원합니다).</p>
      <p>사진 여러 장을 첨부해야 한다면, 개별 파일로 붙이는 대신 <a href="photos-to-pdf.html">하나의 PDF로 합쳐서</a> 보내는 것도 방법입니다. 파일 개수가 줄어들어 관리가 편해지고, 순서가 뒤섞이지 않습니다.</p>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>Gmail에서 25MB가 넘으면 메일을 아예 못 보내나요?</summary>
        <p>아니요. Gmail은 25MB를 넘는 첨부파일을 자동으로 Google Drive 링크로 바꿔서 보내주기 때문에 메일 자체는 정상적으로 전송됩니다. 다만 받는 사람이 별도로 다운로드해야 합니다.</p>
      </details>
      <details>
        <summary>네이버메일 대용량 첨부는 항상 쓸 수 있나요?</summary>
        <p>대용량 첨부는 별도 기능으로 제공되며, 파일당 최대 2GB, 최대 10개, 총 20GB까지 지원합니다. 기본 첨부(10MB)를 넘는 경우 자동으로 대용량 첨부로 전환되는 경우가 많습니다.</p>
      </details>
      <details>
        <summary>사진 여러 장을 압축하면 화질이 많이 나빠지나요?</summary>
        <p>품질 설정에 따라 다릅니다. 실제 압축률과 화질 변화가 궁금하다면 <a href="benchmark.html">실측 압축률 비교</a>를 참고하세요.</p>
      </details>
    </section>

    <section class="info-section">
      <h2>관련 페이지</h2>
      <p><a href="kakao-photo-quality.html">카카오톡 사진 화질 저하 이유</a></p>
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

Run: `node tests/seoPagesIntegrity.test.js`
Expected: `email-attachment-size.html` 관련 테스트(head/JSON-LD/footer/수치 검증) PASS.

- [ ] **Step 3: 커밋**

```bash
git add email-attachment-size.html
git commit -m "Add email-attachment-size.html guide article

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: `image-format-comparison.html` 작성

**Files:**
- Create: `image-format-comparison.html`

**Interfaces:**
- Consumes: `benchmark.html`(이미 배포됨) — 실측 수치를 재측정하지 않고 인용

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>PNG vs JPG vs WebP, 언제 무엇을 써야 할까</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="PNG, JPG, WebP 세 이미지 형식의 압축 방식·투명도·호환성 차이를 정리하고, 실측 데이터를 근거로 상황별 추천 형식을 안내합니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/image-format-comparison.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="PNG vs JPG vs WebP, 언제 무엇을 써야 할까">
  <meta property="og:description" content="PNG, JPG, WebP 세 이미지 형식의 차이를 실측 데이터와 함께 정리했습니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/image-format-comparison.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "PNG vs JPG vs WebP, 언제 무엇을 써야 할까",
    "url": "https://nwb010118.github.io/image-toolbox/image-format-comparison.html",
    "description": "PNG, JPG, WebP 세 이미지 형식의 차이를 실측 데이터와 함께 정리했습니다.",
    "inLanguage": "ko",
    "datePublished": "2026-09-09"
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>PNG vs JPG vs WebP, 언제 무엇을 써야 할까</h1>
    <p class="subtitle">세 형식의 압축 방식 차이부터 실측 데이터까지 정리했습니다.</p>
    <p class="tool-nav"><a href="guide.html">← 가이드 목록</a></p>

    <section class="info-section">
      <h2>압축 방식이 근본적으로 다릅니다</h2>
      <p><strong>PNG</strong>는 무손실 압축 형식입니다. 원본 픽셀 정보를 그대로 유지한 채 파일 구조만 효율적으로 압축하기 때문에 화질 손상이 전혀 없습니다. 대신 사진처럼 색이 복잡한 이미지에서는 용량이 크게 나옵니다.</p>
      <p><strong>JPG</strong>는 손실 압축 형식입니다. 사람 눈이 잘 구분하지 못하는 정보를 의도적으로 버려서 용량을 크게 줄입니다. 색이 복잡하고 경계가 부드러운 사진에는 효율적이지만, 단색과 선명한 경계가 많은 그래픽에는 오히려 불리합니다.</p>
      <p><strong>WebP</strong>는 손실·무손실 모드를 모두 지원하는 비교적 최신 형식입니다. 이 사이트의 압축 도구는 WebP를 손실 모드로 출력하며, 같은 손실 압축이라도 JPG보다 더 작은 용량으로 비슷한 화질을 담아내는 경우가 많습니다.</p>
    </section>

    <section class="info-section">
      <h2>투명도와 호환성</h2>
      <p>투명 배경이 필요하다면 PNG나 WebP를 선택해야 합니다. JPG는 투명도를 지원하지 않습니다. WebP도 알파 채널(투명도)을 지원하지만, 오래된 프로그램이나 일부 이미지 편집 소프트웨어에서는 WebP 파일을 열지 못할 수 있어 호환성이 가장 중요한 상황이라면 PNG나 JPG가 더 안전합니다.</p>
    </section>

    <section class="info-section">
      <h2>실측 데이터로 보면</h2>
      <p>이론상의 설명만으로는 감이 잘 안 올 수 있어서, 실제로 두 종류의 테스트 이미지(사진형, 그래픽형)를 이 사이트의 압축 도구로 직접 압축해 정확한 바이트 수를 측정했습니다. 전체 결과는 <a href="benchmark.html">실측 압축률 비교</a>에서 확인할 수 있고, 핵심만 요약하면 다음과 같습니다.</p>
      <p>사진형 이미지에서는 JPG와 WebP 모두 80% 품질에서 원본 대비 90% 이상 용량이 줄었습니다. 반면 그래픽형(단색·UI) 이미지에서는 JPG 100% 품질이 오히려 원본 PNG보다 큰 파일로 나왔고, WebP는 100% 품질에서도 원본보다 73.6% 작았습니다. 즉 그래픽·스크린샷류에는 JPG가 잘 맞지 않는다는 것이 실측으로 확인됩니다.</p>
    </section>

    <section class="info-section">
      <h2>상황별 추천</h2>
      <p><strong>사진</strong> — JPG 또는 WebP, 80% 품질 부근.</p>
      <p><strong>투명 배경이 필요한 그래픽·로고</strong> — PNG(무손실 보장) 또는 WebP.</p>
      <p><strong>스크린샷·UI처럼 단색이 많은 이미지</strong> — WebP(호환성이 걱정되면 PNG).</p>
      <p><a class="btn" href="index.html">지금 형식 바꿔보기 →</a></p>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>WebP를 열 수 없다는 프로그램이 있는데 왜 그런가요?</summary>
        <p>WebP는 비교적 최신 형식이라 오래된 이미지 편집 프로그램이나 일부 운영체제 기본 뷰어에서는 지원하지 않을 수 있습니다. 대부분의 최신 웹 브라우저는 문제없이 지원합니다.</p>
      </details>
      <details>
        <summary>PNG를 JPG로 바꾸면 무조건 용량이 줄어드나요?</summary>
        <p>대체로 그렇지만 항상은 아닙니다. 단색과 선명한 경계가 많은 이미지는 JPG로 바꿨을 때 오히려 원본 PNG보다 커질 수 있습니다. 자세한 실측 수치는 <a href="benchmark.html">실측 압축률 비교</a>를 참고하세요.</p>
      </details>
      <details>
        <summary>화질 손상 없이 용량만 줄이고 싶으면 어떤 형식을 써야 하나요?</summary>
        <p>완전한 무손실을 원한다면 PNG를 유지해야 합니다. PNG 자체는 품질 설정과 무관하게 용량이 줄지 않으므로, 용량을 줄이려면 가로세로 크기(해상도)를 줄이는 방법을 함께 고려해야 합니다.</p>
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

Run: `node tests/seoPagesIntegrity.test.js`
Expected: `image-format-comparison.html` 관련 테스트(head/JSON-LD/footer/benchmark.html 링크) PASS.

- [ ] **Step 3: 커밋**

```bash
git add image-format-comparison.html
git commit -m "Add image-format-comparison.html guide article

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: `photo-id-resize.html` 작성

**Files:**
- Create: `photo-id-resize.html`

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>여권사진·증명사진 규격에 맞게 리사이즈하는 법</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="여권, 주민등록증, 운전면허증 사진의 정확한 규격(35×45mm, 413×531px)과 브라우저에서 바로 리사이즈하는 방법을 정리했습니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/photo-id-resize.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="여권사진·증명사진 규격에 맞게 리사이즈하는 법">
  <meta property="og:description" content="여권, 주민등록증, 운전면허증 사진의 정확한 규격과 리사이즈 방법을 정리했습니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/photo-id-resize.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "여권사진·증명사진 규격에 맞게 리사이즈하는 법",
    "url": "https://nwb010118.github.io/image-toolbox/photo-id-resize.html",
    "description": "여권, 주민등록증, 운전면허증 사진의 정확한 규격과 리사이즈 방법을 정리했습니다.",
    "inLanguage": "ko",
    "datePublished": "2026-09-09"
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>여권사진·증명사진 규격에 맞게 리사이즈하는 법</h1>
    <p class="subtitle">여권, 주민등록증, 운전면허증 사진은 모두 같은 규격을 씁니다.</p>
    <p class="tool-nav"><a href="guide.html">← 가이드 목록</a></p>

    <section class="info-section">
      <h2>정확한 규격</h2>
      <p><strong>인화 사진 크기</strong> — 여권·주민등록증·운전면허증 사진은 모두 가로 35mm × 세로 45mm로 동일합니다.</p>
      <p><strong>얼굴(정수리~턱) 길이</strong> — 3.2cm~3.6cm 사이여야 합니다.</p>
      <p><strong>온라인 여권 신청용 디지털 사진</strong> — 가로 413 × 세로 531 픽셀이 권장 규격입니다.</p>
      <p><strong>해상도</strong> — 300DPI 이상을 권장합니다.</p>
      <p>배경은 흰색이어야 하고, 안경 착용은 원칙적으로 금지됩니다(반사·그림자 없이 눈이 선명하게 보여야 함). 정확한 최신 기준은 여권을 발급받는 기관(외교부 여권과 등)의 공지를 함께 확인하는 것이 안전합니다.</p>
    </section>

    <section class="info-section">
      <h2>브라우저에서 규격에 맞게 리사이즈하는 법</h2>
      <p><a href="index.html">이미지 압축 도구</a>의 가로/세로 픽셀 입력란에 원하는 규격(예: 413 × 531)을 직접 입력하면 해당 크기로 맞춰집니다. '비율 유지'를 꺼야 정확한 가로세로 값을 각각 지정할 수 있습니다. 원본 사진에서 얼굴 비율이 규격과 크게 다르다면, 먼저 사진 편집 프로그램으로 필요한 부분만 잘라낸 뒤 이 도구로 정확한 픽셀 크기로 맞추는 순서를 권장합니다.</p>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>일반 사진을 여권사진 규격으로 바꾸면 바로 쓸 수 있나요?</summary>
        <p>크기만 규격에 맞춘다고 되는 것은 아닙니다. 배경색, 얼굴 비율, 표정, 조명 같은 촬영 조건도 함께 충족해야 합니다. 크기 조정은 이 도구로 할 수 있지만, 촬영 조건 자체는 다시 찍어야 할 수도 있습니다.</p>
      </details>
      <details>
        <summary>주민등록증과 운전면허증도 여권사진과 같은 사진을 써도 되나요?</summary>
        <p>인화 크기 규격(35×45mm)이 동일하기 때문에 대체로 같은 사진을 사용할 수 있습니다. 다만 발급 기관마다 세부 요건이 다를 수 있으니 제출 전에 해당 기관의 최신 안내를 확인하는 것이 좋습니다.</p>
      </details>
      <details>
        <summary>413×531 픽셀보다 큰 사진을 올리면 어떻게 되나요?</summary>
        <p>이 도구에서 가로/세로 값을 직접 입력하면 원본이 그보다 크더라도 지정한 크기로 줄여줍니다. 반대로 원본이 지정한 크기보다 작으면 화질이 손상될 수 있으므로, 가능한 한 고해상도 원본에서 시작하는 것이 좋습니다.</p>
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

Run: `node tests/seoPagesIntegrity.test.js`
Expected: `photo-id-resize.html` 관련 테스트(head/JSON-LD/footer/규격 수치) PASS.

- [ ] **Step 3: 커밋**

```bash
git add photo-id-resize.html
git commit -m "Add photo-id-resize.html guide article

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: `ai-upscaling-limits.html` 작성

**Files:**
- Create: `ai-upscaling-limits.html`
- Modify: `upscale.html:166` (기존 "언제 필요한가요" 문단 끝에 링크 추가)

**Interfaces:**
- Consumes: `upscale.html`에 이미 서술된 기술적 사실(ESRGAN 계열 모델, 2배씩 확대, 최대 4배)

- [ ] **Step 1: `ai-upscaling-limits.html` 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>AI 업스케일링, 실제로 되는 것과 안 되는 것</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="AI 업스케일링이 실제로 개선해줄 수 있는 것과 할 수 없는 것을 과장 없이 정리했습니다. 원본에 없는 정보를 만들어내는 마법이 아닙니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/ai-upscaling-limits.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="AI 업스케일링, 실제로 되는 것과 안 되는 것">
  <meta property="og:description" content="AI 업스케일링이 실제로 개선해줄 수 있는 것과 할 수 없는 것을 과장 없이 정리했습니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/ai-upscaling-limits.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "AI 업스케일링, 실제로 되는 것과 안 되는 것",
    "url": "https://nwb010118.github.io/image-toolbox/ai-upscaling-limits.html",
    "description": "AI 업스케일링이 실제로 개선해줄 수 있는 것과 할 수 없는 것을 과장 없이 정리했습니다.",
    "inLanguage": "ko",
    "datePublished": "2026-09-09"
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>AI 업스케일링, 실제로 되는 것과 안 되는 것</h1>
    <p class="subtitle">과장된 광고 문구가 아니라, 이 기술이 실제로 하는 일을 정직하게 설명합니다.</p>
    <p class="tool-nav"><a href="guide.html">← 가이드 목록</a></p>

    <section class="info-section">
      <h2>AI 업스케일링이 하는 일</h2>
      <p>이 사이트의 업스케일링 기능은 ESRGAN 계열의 경량 AI 모델을 브라우저 안에서 직접 실행합니다. 이 모델은 수많은 이미지를 학습하면서 "이런 저해상도 패턴은 보통 이런 고해상도 디테일에서 왔다"는 통계적 패턴을 익힌 상태입니다. 확대할 때 이 학습된 패턴을 참고해서 경계와 질감을 그럴듯하게 채워 넣기 때문에, 단순히 픽셀을 늘리는 것보다 훨씬 선명한 결과가 나옵니다.</p>
    </section>

    <section class="info-section">
      <h2>AI 업스케일링이 할 수 없는 일</h2>
      <p>중요한 건, 이 과정이 원본에 없던 진짜 정보를 만들어내는 것이 아니라는 점입니다. AI는 "그럴듯한 디테일"을 추론해서 채우는 것이지, 사라진 원본 정보를 정확히 복원하는 것이 아닙니다. 그래서 다음과 같은 상황에서는 한계가 뚜렷합니다.</p>
      <p><strong>초점이 심하게 나간 사진</strong> — 흔들리거나 초점이 안 맞아 형체 자체가 뭉개진 사진은 AI가 추론할 단서 자체가 부족해서 개선 폭이 작습니다.</p>
      <p><strong>극단적으로 작은 원본</strong> — 원본이 너무 작아 픽셀 정보 자체가 거의 없는 경우, 확대해도 실제로 있었던 디테일이 아니라 AI가 그럴듯하게 지어낸 디테일에 가까워집니다.</p>
      <p><strong>인물 얼굴 "복원"</strong> — 이 기능은 사람 얼굴을 다른 각도나 더 젊은 모습으로 재구성하는 것이 아닙니다. 원본 사진에 있는 얼굴의 경계와 질감을 더 선명하게 다듬어주는 것이지, 없던 표정이나 디테일을 만들어내는 게 아닙니다.</p>
    </section>

    <section class="info-section">
      <h2>언제 특히 효과적인가요</h2>
      <p>원본이 어느 정도 선명하지만 해상도만 낮은 경우(초점은 맞았는데 작게 찍힌 사진, 오래돼서 저해상도로만 남은 사진 등)에 가장 효과가 좋습니다. 이런 경우 AI가 참고할 실제 패턴 정보가 충분히 남아 있기 때문입니다.</p>
      <p><a href="upscale.html">이미지 업스케일링</a>에서 직접 확대해보고 결과를 확인해보세요.</p>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>흐릿한 사진을 선명하게 "복원"할 수 있나요?</summary>
        <p>어느 정도 개선은 되지만, 완전히 사라진 디테일을 원본 그대로 되살리는 것은 아닙니다. 흔들림이 심하거나 초점이 크게 나간 사진은 개선 폭이 제한적입니다.</p>
      </details>
      <details>
        <summary>몇 배까지 확대해야 자연스러운가요?</summary>
        <p>원본 해상도와 내용에 따라 다릅니다. 이 도구는 최대 4배(2배씩 두 번)까지 지원하며, 배율이 높아질수록 AI가 추론하는 비중이 커집니다.</p>
      </details>
      <details>
        <summary>사람 얼굴도 다른 AI 도구처럼 재구성해주나요?</summary>
        <p>아니요. 이 기능은 얼굴을 다른 모습으로 재구성하지 않습니다. 원본에 있는 경계와 질감을 더 선명하게 다듬는 역할만 합니다.</p>
      </details>
    </section>

    <section class="info-section">
      <h2>관련 페이지</h2>
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

- [ ] **Step 2: `upscale.html`에 상호 링크 추가**

`upscale.html`의 166번째 줄을 아래로 교체한다:

기존:
```html
      <p>오래되거나 작게 찍힌 사진을 인쇄하거나 크게 써야 할 때, 저해상도 이미지를 배경화면처럼 큰 화면에 띄워야 할 때, 원본을 잃어버려 남은 사본밖에 없는 사진을 최대한 선명하게 살리고 싶을 때 유용합니다.</p>
```

변경:
```html
      <p>오래되거나 작게 찍힌 사진을 인쇄하거나 크게 써야 할 때, 저해상도 이미지를 배경화면처럼 큰 화면에 띄워야 할 때, 원본을 잃어버려 남은 사본밖에 없는 사진을 최대한 선명하게 살리고 싶을 때 유용합니다. AI 업스케일링으로 실제로 가능한 것과 안 되는 것은 <a href="ai-upscaling-limits.html">이 글</a>에서 정직하게 정리했습니다.</p>
```

- [ ] **Step 3: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: `ai-upscaling-limits.html` 관련 테스트 전부 PASS(양방향 링크 포함).

- [ ] **Step 4: 커밋**

```bash
git add ai-upscaling-limits.html upscale.html
git commit -m "Add ai-upscaling-limits.html guide article and link from upscale.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: `guide.html`/`benchmark.html`/`sitemap.xml` 연결

**Files:**
- Modify: `guide.html:40` (1번 섹션 문단 교체)
- Modify: `guide.html:50` (3번 섹션 문단 교체)
- Modify: `benchmark.html:136` (그래픽형 문단에 링크 추가)
- Modify: `sitemap.xml:36` (`</urlset>` 앞)

**Interfaces:**
- Consumes: Task 2~6에서 만든 5개 신규 페이지
- Produces: Task 1 테스트의 나머지 전부가 통과 — 전체 스위트 GREEN

- [ ] **Step 1: `guide.html`의 1번 섹션 문단 교체**

`guide.html`의 40번째 줄을 아래로 교체한다:

기존:
```html
      <p>웹사이트에 이미지를 그대로 올리면 페이지 로딩이 느려지고, 이는 방문자 이탈뿐 아니라 검색엔진 SEO 순위에도 불리하게 작용합니다. 이메일에 사진을 첨부할 때 용량 제한에 걸리는 경우, 클라우드 저장공간을 아끼고 싶은 경우에도 압축이 필요합니다. <a href="index.html">이미지 압축 도구</a>에서 품질과 가로세로 크기를 조절해 용량을 줄일 수 있습니다. 실제로 얼마나 줄어드는지는 <a href="benchmark.html">실측 압축률 비교</a>에서 확인할 수 있습니다.</p>
```

변경:
```html
      <p>웹사이트에 이미지를 그대로 올리면 페이지 로딩이 느려지고, 이는 방문자 이탈뿐 아니라 검색엔진 SEO 순위에도 불리하게 작용합니다. 이메일에 사진을 첨부할 때 용량 제한에 걸리는 경우, 클라우드 저장공간을 아끼고 싶은 경우에도 압축이 필요합니다. <a href="index.html">이미지 압축 도구</a>에서 품질과 가로세로 크기를 조절해 용량을 줄일 수 있습니다. 실제로 얼마나 줄어드는지는 <a href="benchmark.html">실측 압축률 비교</a>에서 확인할 수 있습니다. 이메일 서비스별 첨부 용량 제한이 궁금하다면 <a href="email-attachment-size.html">이 글</a>을, 카카오톡으로 사진을 보낼 때 화질이 떨어지는 이유는 <a href="kakao-photo-quality.html">이 글</a>을 참고하세요. 어떤 형식(JPG·PNG·WebP)을 골라야 할지 고민된다면 <a href="image-format-comparison.html">형식 비교</a>를, 여권사진처럼 정확한 규격에 맞춰야 한다면 <a href="photo-id-resize.html">여권사진·증명사진 규격 가이드</a>를 참고하세요.</p>
```

- [ ] **Step 2: `guide.html`의 3번 섹션 문단 교체**

`guide.html`의 50번째 줄을 아래로 교체한다:

기존:
```html
      <p>오래된 사진, 작게 찍힌 사진, 원본을 잃어버린 저해상도 이미지를 인쇄하거나 크게 써야 할 때 단순히 크기만 늘리면 화질이 뭉개집니다. AI 업스케일링은 픽셀 정보를 분석해 디테일을 추론하며 확대하기 때문에 결과물이 더 선명합니다. <a href="upscale.html">이미지 업스케일링</a>에서 2배·4배 확대나 1440p·4K 해상도로 키울 수 있습니다.</p>
```

변경:
```html
      <p>오래된 사진, 작게 찍힌 사진, 원본을 잃어버린 저해상도 이미지를 인쇄하거나 크게 써야 할 때 단순히 크기만 늘리면 화질이 뭉개집니다. AI 업스케일링은 픽셀 정보를 분석해 디테일을 추론하며 확대하기 때문에 결과물이 더 선명합니다. <a href="upscale.html">이미지 업스케일링</a>에서 2배·4배 확대나 1440p·4K 해상도로 키울 수 있습니다. 실제로 가능한 것과 안 되는 것은 <a href="ai-upscaling-limits.html">이 글</a>에서 정직하게 정리했습니다.</p>
```

- [ ] **Step 3: `benchmark.html`에 링크 추가**

`benchmark.html`의 136번째 줄을 아래로 교체한다:

기존:
```html
      <p><strong>스크린샷·그래픽·로고라면</strong> JPG로 바꾸는 건 오히려 손해일 수 있습니다(위 실측 결과 참고). 오래된 프로그램에서 열어야 할 일이 없다면 WebP가 PNG보다 훨씬 작습니다. 다만 이 도구의 WebP 출력은 완전한 무손실 압축은 아니므로, 픽셀 단위 정확도가 중요한 경우에는 PNG를 유지하는 것이 안전합니다.</p>
```

변경:
```html
      <p><strong>스크린샷·그래픽·로고라면</strong> JPG로 바꾸는 건 오히려 손해일 수 있습니다(위 실측 결과 참고). 오래된 프로그램에서 열어야 할 일이 없다면 WebP가 PNG보다 훨씬 작습니다. 다만 이 도구의 WebP 출력은 완전한 무손실 압축은 아니므로, 픽셀 단위 정확도가 중요한 경우에는 PNG를 유지하는 것이 안전합니다. 형식별 압축 방식 차이를 더 자세히 알고 싶다면 <a href="image-format-comparison.html">PNG vs JPG vs WebP 비교</a>를 참고하세요.</p>
```

- [ ] **Step 4: `sitemap.xml`에 5개 URL 추가**

`sitemap.xml`의 `</urlset>` 태그(36번째 줄) 바로 앞에 아래 블록을 추가한다:

```xml
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/kakao-photo-quality.html</loc>
  </url>
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/email-attachment-size.html</loc>
  </url>
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/image-format-comparison.html</loc>
  </url>
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/photo-id-resize.html</loc>
  </url>
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/ai-upscaling-limits.html</loc>
  </url>
```

- [ ] **Step 5: 전체 테스트 실행 — 전부 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, `process.exitCode`가 설정되지 않음(0).

- [ ] **Step 6: 브라우저로 최종 확인**

`guide.html`, `benchmark.html`, `upscale.html`에서 새로 추가된 링크가 각각 올바른 신규 페이지로 이동하는지 확인한다.

- [ ] **Step 7: 커밋**

```bash
git add guide.html benchmark.html sitemap.xml
git commit -m "Wire guide articles round 1 into guide.html, benchmark.html, sitemap.xml

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: 배포

- [ ] **Step 1: 원격 저장소로 푸시**

```bash
git push origin master:main
```

- [ ] **Step 2: 배포 확인**

몇 분 뒤 5개 신규 페이지가 실제로 열리는지 확인한다.

- [ ] **Step 3: 다음 단계**

효과를 지켜본 뒤, AdSense 반려 대응 계획 4단계의 2차 배치(나머지 5~15개) 진행 여부를 사용자와 논의한다. 모든 배치가 끝나면 5단계(사이트맵 재제출 → 애드센스 재신청)로 이어간다.
