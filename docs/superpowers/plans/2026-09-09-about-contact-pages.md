# About/문의 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 애드센스 반려 진단에서 지적된 "About/운영자 소개/문의 페이지 부재"를 해소하기 위해 `about.html`/`contact.html` 2개 신규 페이지를 만들고, 사이트 전체(기존 8개 페이지 포함)에서 이 두 페이지로 이동할 수 있게 연결한다.

**Architecture:** 빌드 도구 없는 순수 정적 HTML 2개를 저장소 루트에 추가한다. 새 JS/CSS는 만들지 않고 기존 `container`/`info-section`/`tool-nav`/`btn`/`site-footer` 클래스를 재사용한다. 기존 8개 페이지의 `<footer class="site-footer">`에 두 페이지로의 링크를 추가하고, `sitemap.xml`에 2개 URL을 추가한다.

**Tech Stack:** 순수 HTML/CSS, JSON-LD 구조화 데이터(`AboutPage`, `ContactPage`). Node 기반 무프레임워크 통합 테스트(`tests/seoPagesIntegrity.test.js`, 기존 파일에 이어서 작성).

## Global Constraints

- 새 CSS 클래스를 추가하지 않는다 — `container`, `subtitle`, `tool-nav`, `info-section`, `btn`, `site-footer` 등 기존 클래스만 재사용한다.
- 새 JS 파일/함수를 추가하지 않는다.
- 각 신규 페이지는 `<title>`, `meta description`, `link rel="canonical"`, `og:type`(article)/`og:title`/`og:description`/`og:url`/`og:locale`를 기존 페이지들과 동일한 패턴으로 갖춘다. `guide.html`과 동일하게 AdSense 로더 스크립트(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037`)를 포함한다(정보성 콘텐츠 페이지이므로 — `privacy.html`만 예외적으로 광고 스크립트가 없는 정책 페이지라 다른 패턴을 쓴다).
- `about.html`은 `AboutPage`, `contact.html`은 `ContactPage` schema.org JSON-LD를 포함한다.
- 운영자 정보는 닉네임/프로젝트명 수준만 노출한다 — 실명·소속 등 개인 식별 정보는 절대 넣지 않는다.
- 문의 이메일은 `nwb010118@gmail.com`이며 `mailto:` 링크로만 노출한다 — 문의 폼(서버/서드파티 연동)은 만들지 않는다.
- **footer 자기 자신 링크 금지**: 어떤 페이지의 footer도 그 페이지 자신으로의 링크는 넣지 않는다 (`about.html`의 footer는 About 링크를 넣지 않고, `contact.html`의 footer는 문의 링크를 넣지 않는다).
- 언어는 한국어(`lang="ko"`), 이모지 사용 금지, UTF-8, `<!DOCTYPE html>`로 시작.

---

## Task 1: 통합 검증 테스트 확장 (실패 확인)

**Files:**
- Modify: `tests/seoPagesIntegrity.test.js` (파일 끝에 추가, 기존 76번째 줄 이후 이어서 작성 — 기존 테스트는 건드리지 않는다)

**Interfaces:**
- Consumes: 기존 `test`, `readRepoFile`, `extractJsonLdBlocks` 헬퍼 함수(이미 파일 상단에 정의돼 있음, 재사용)
- Produces: `node tests/seoPagesIntegrity.test.js` 실행 시 신규 검증 항목이 실패로 나오는 RED 상태 확인

- [ ] **Step 1: 테스트 파일 끝에 아래 코드를 추가**

`tests/seoPagesIntegrity.test.js`의 마지막 줄(현재 103번째 줄, `});`로 끝나는 `sitemap.xml includes the 3 new pages` 테스트 블록) 바로 다음에 이어서 추가한다:

```javascript

const TRUST_PAGES = ['about.html', 'contact.html'];

TRUST_PAGES.forEach(function (file) {
  test(file + ' exists and has required <head> tags', function () {
    const html = readRepoFile(file);
    assert.ok(/<title>[^<]+<\/title>/.test(html), 'missing <title>');
    assert.ok(html.includes('rel="canonical"'), 'missing canonical link');
    assert.ok(html.includes('property="og:title"'), 'missing og:title');
  });
});

test('about.html has valid AboutPage JSON-LD', function () {
  const html = readRepoFile('about.html');
  const types = extractJsonLdBlocks(html).map(function (b) { return b['@type']; });
  assert.ok(types.includes('AboutPage'), 'missing AboutPage block');
});

test('contact.html has valid ContactPage JSON-LD', function () {
  const html = readRepoFile('contact.html');
  const types = extractJsonLdBlocks(html).map(function (b) { return b['@type']; });
  assert.ok(types.includes('ContactPage'), 'missing ContactPage block');
});

test('contact.html includes a mailto link to the contact email', function () {
  const html = readRepoFile('contact.html');
  assert.ok(html.includes('mailto:nwb010118@gmail.com'), 'missing mailto link');
});

test('about.html links to contact.html', function () {
  const html = readRepoFile('about.html');
  assert.ok(html.includes('href="contact.html"'), 'about.html missing link to contact.html');
});

test('contact.html links to about.html', function () {
  const html = readRepoFile('contact.html');
  assert.ok(html.includes('href="about.html"'), 'contact.html missing link to about.html');
});

test('about.html and contact.html footers link to privacy.html', function () {
  ['about.html', 'contact.html'].forEach(function (file) {
    const html = readRepoFile(file);
    assert.ok(html.includes('href="privacy.html"'), file + ' footer missing link to privacy.html');
  });
});

const ALL_PAGES = [
  'index.html', 'pdf.html', 'upscale.html', 'guide.html', 'privacy.html',
  'photos-to-pdf.html', 'pdf-to-word.html', 'pdf-to-ppt.html', 'about.html', 'contact.html'
];

ALL_PAGES.forEach(function (file) {
  test(file + ' footer links to About and 문의 (except its own page)', function () {
    const html = readRepoFile(file);
    if (file !== 'about.html') {
      assert.ok(html.includes('href="about.html"'), file + ' footer missing link to about.html');
    }
    if (file !== 'contact.html') {
      assert.ok(html.includes('href="contact.html"'), file + ' footer missing link to contact.html');
    }
  });
});

test('sitemap.xml includes about.html and contact.html', function () {
  const xml = readRepoFile('sitemap.xml');
  ['about.html', 'contact.html'].forEach(function (page) {
    assert.ok(xml.includes('/image-toolbox/' + page), 'sitemap.xml missing ' + page);
  });
});

test('privacy.html points to contact.html instead of GitHub Issues for policy inquiries', function () {
  const html = readRepoFile('privacy.html');
  assert.ok(html.includes('href="contact.html"'), 'privacy.html missing link to contact.html in its inquiry section');
});
```

- [ ] **Step 2: 실행해서 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 기존 16개 테스트는 그대로 PASS. 새로 추가한 테스트는 전부 FAIL — `about.html`/`contact.html`이 아직 없어서 ENOENT, 10개 페이지 footer 링크 테스트도 아직 링크가 없어서 실패, `privacy.html` 문의 링크 테스트도 실패. `process.exitCode`가 1로 설정됨.

- [ ] **Step 3: 커밋**

```bash
git add tests/seoPagesIntegrity.test.js
git commit -m "test: add integrity checks for upcoming About/Contact pages"
```

---

## Task 2: `about.html` 작성

**Files:**
- Create: `about.html`

**Interfaces:**
- Consumes: `css/style.css`의 `.container`/`.subtitle`/`.tool-nav`/`.info-section`/`.btn`/`.site-footer` 클래스
- Produces: Task 1의 `about.html` 관련 테스트(head 태그, AboutPage JSON-LD, contact.html 링크, privacy.html 링크)가 통과하게 될 파일. 아직 자기 자신을 제외한 나머지 9개 페이지의 footer 테스트는 Task 4에서 통과한다.

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>About - image-toolbox 소개 및 운영 원칙</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="image-toolbox가 어떤 사이트인지, 왜 서버 전송 없이 브라우저에서만 이미지·PDF를 처리하도록 만들었는지 소개합니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/about.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="About - image-toolbox 소개 및 운영 원칙">
  <meta property="og:description" content="image-toolbox가 어떤 사이트인지, 왜 서버 전송 없이 브라우저에서만 이미지·PDF를 처리하도록 만들었는지 소개합니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/about.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About - image-toolbox",
    "url": "https://nwb010118.github.io/image-toolbox/about.html",
    "description": "image-toolbox가 어떤 사이트인지, 왜 서버 전송 없이 브라우저에서만 이미지·PDF를 처리하도록 만들었는지 소개합니다.",
    "inLanguage": "ko"
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>About</h1>
    <p class="subtitle">image-toolbox를 만든 이유와 이 사이트가 지키는 원칙을 소개합니다.</p>
    <p class="tool-nav"><a href="index.html">← 홈으로</a></p>
    <p class="tool-nav"><a href="contact.html">문의하기 →</a></p>

    <section class="info-section">
      <h2>image-toolbox는 무엇인가요</h2>
      <p>image-toolbox는 사진 압축, PDF 변환(이미지↔PDF, PDF→Word/PowerPoint/Excel), AI 이미지 업스케일링을 브라우저 안에서 무료로 처리하는 도구 모음입니다. 별도 프로그램 설치나 회원가입 없이 웹페이지에 접속해서 바로 사용할 수 있습니다.</p>
      <p>이 사이트를 만든 가장 큰 동기는 개인정보 보호입니다. 신분증, 계약서, 사적인 사진처럼 민감한 파일을 온라인 도구에 올릴 때, 그 파일이 어딘가의 서버에 저장되거나 남는 건 아닌지 걱정되는 경우가 많습니다. image-toolbox의 모든 처리는 서버로 파일을 전송하지 않고 사용자의 브라우저 안에서만 이뤄지도록 설계했습니다.</p>
    </section>

    <section class="info-section">
      <h2>운영자 소개</h2>
      <p>image-toolbox는 한 명의 개발자가 만들고 운영하는 사이드 프로젝트입니다. 별도의 회사나 팀은 없으며, 기능 추가와 버그 수정도 혼자 진행하고 있습니다. 그래서 문의에 대한 답변이 조금 늦어질 수 있다는 점을 미리 말씀드립니다.</p>
    </section>

    <section class="info-section">
      <h2>이 사이트의 원칙</h2>
      <p><strong>무료.</strong> 광고 수익만으로 운영되며, 어떤 기능도 유료로 제한하지 않습니다.</p>
      <p><strong>회원가입 불필요.</strong> 이메일이나 개인정보를 입력하지 않아도 모든 기능을 바로 쓸 수 있습니다. 방문자를 추적하기 위한 계정 시스템 자체가 없습니다.</p>
      <p><strong>서버로 파일 전송 안 함.</strong> 압축·변환·업스케일링 전부 브라우저의 JavaScript로 처리되며, 원본 파일이 네트워크를 통해 어디로도 전송되지 않습니다. 브라우저 개발자 도구의 네트워크 탭을 열어두고 사용해보면 직접 확인할 수 있습니다.</p>
    </section>

    <section class="info-section">
      <h2>제공하는 도구</h2>
      <p><a href="index.html">이미지 압축 도구</a></p>
      <p><a href="pdf.html">PDF 변환 도구</a></p>
      <p><a href="upscale.html">이미지 업스케일링</a></p>
      <p><a href="guide.html">언제 어떤 도구가 필요할까? 가이드</a></p>
    </section>
  </main>

  <footer class="site-footer">
    <a href="privacy.html">개인정보처리방침</a>
    <a href="contact.html">문의</a>
  </footer>
</body>
</html>
```

- [ ] **Step 2: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: `about.html exists and has required <head> tags`, `about.html has valid AboutPage JSON-LD`, `about.html links to contact.html`, `about.html and contact.html footers link to privacy.html`(이 시점엔 about.html 쪽만 실질적으로 검증됨, contact.html이 아직 없어 그 항목은 계속 FAIL) 테스트가 PASS로 바뀐다. `contact.html` 관련 테스트와 footer 전수 검사, `sitemap.xml`, `privacy.html` 테스트는 여전히 FAIL — 정상.

- [ ] **Step 3: 커밋**

```bash
git add about.html
git commit -m "Add about.html page"
```

---

## Task 3: `contact.html` 작성

**Files:**
- Create: `contact.html`

**Interfaces:**
- Consumes: `css/style.css`의 기존 클래스, `about.html`(Task 2에서 생성됨)
- Produces: Task 1의 `contact.html` 관련 테스트가 통과하게 될 파일

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>문의하기 - image-toolbox</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="버그 제보, 기능 제안, 기타 문의는 이메일로 받습니다. 문의 전에 자주 묻는 질문을 먼저 확인해보세요.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/contact.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="문의하기 - image-toolbox">
  <meta property="og:description" content="버그 제보, 기능 제안, 기타 문의는 이메일로 받습니다. 문의 전에 자주 묻는 질문을 먼저 확인해보세요.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/contact.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "문의하기 - image-toolbox",
    "url": "https://nwb010118.github.io/image-toolbox/contact.html",
    "description": "버그 제보, 기능 제안, 기타 문의는 이메일로 받습니다.",
    "inLanguage": "ko"
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>문의하기</h1>
    <p class="subtitle">버그 제보, 기능 제안, 기타 문의를 이메일로 받고 있습니다.</p>
    <p class="tool-nav"><a href="about.html">← About 보기</a></p>

    <section class="info-section">
      <h2>이메일로 문의해주세요</h2>
      <p>사용 중 발견한 버그, 추가됐으면 하는 기능, 그 외 어떤 문의든 아래 이메일로 보내주세요.</p>
      <p><a class="btn" href="mailto:nwb010118@gmail.com">이메일 보내기 →</a></p>
    </section>

    <section class="info-section">
      <h2>문의 전에 확인해보세요</h2>
      <p>페이지 수·용량 제한이 왜 있는지, 스캔한 PDF는 왜 Word/Excel로 변환되지 않는지처럼 자주 나오는 질문은 이미 각 도구 페이지의 자주 묻는 질문과 가이드에 정리돼 있습니다. 문의하시기 전에 먼저 확인해보시면 더 빠르게 답을 얻으실 수 있습니다.</p>
      <p><a href="guide.html">언제 어떤 도구가 필요할까? 가이드</a></p>
      <p><a href="pdf.html">PDF 변환 도구 (자주 묻는 질문 포함)</a></p>
      <p><a href="upscale.html">이미지 업스케일링 (자주 묻는 질문 포함)</a></p>
    </section>

    <section class="info-section">
      <h2>답변 관련 안내</h2>
      <p>image-toolbox는 한 명이 운영하는 사이트라 답변에 며칠 정도 시간이 걸릴 수 있습니다. 빠른 답변을 약속드리긴 어렵지만, 보내주신 문의는 전부 확인합니다.</p>
    </section>
  </main>

  <footer class="site-footer">
    <a href="privacy.html">개인정보처리방침</a>
    <a href="about.html">About</a>
  </footer>
</body>
</html>
```

- [ ] **Step 2: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: `contact.html` 관련 모든 테스트(head 태그, ContactPage JSON-LD, mailto 링크, about.html 링크, privacy.html 링크) PASS. `about.html and contact.html footers link to privacy.html`도 이제 완전히 PASS. footer 전수 검사(`ALL_PAGES`)는 여전히 기존 8개 페이지 + about.html + contact.html 모두에서 실패 중이어야 정상(Task 4에서 해결) — 단, `about.html`은 이미 문의 링크가 있고 `contact.html`은 이미 About 링크가 있으므로 이 둘은 통과하고, 나머지 8개만 FAIL로 남는다.

- [ ] **Step 3: 커밋**

```bash
git add contact.html
git commit -m "Add contact.html page"
```

---

## Task 4: 기존 8개 페이지에 About/문의 링크 연결 + sitemap.xml 갱신

**Files:**
- Modify: `index.html:192`, `pdf.html:255`, `upscale.html:187`, `guide.html:59`, `photos-to-pdf.html:149`, `pdf-to-word.html:149`, `pdf-to-ppt.html:149` (7개 파일 모두 동일한 패턴: `<footer class="site-footer">` 다음 줄에 있는 `<a href="privacy.html">개인정보처리방침</a>` 바로 다음에 2줄 추가)
- Modify: `privacy.html` (현재 `<footer>` 요소가 없음 — `</main>` 태그 뒤, `</body>` 앞에 새로 추가. 그리고 4번 섹션의 GitHub Issues 링크를 `contact.html`로 교체)
- Modify: `sitemap.xml:17` (`</urlset>` 앞)

**Interfaces:**
- Consumes: Task 2~3에서 만든 `about.html`/`contact.html`
- Produces: Task 1 테스트의 나머지 전부가 통과 — 전체 스위트 GREEN

- [ ] **Step 1: 7개 페이지의 footer에 링크 2줄 추가**

`index.html`, `pdf.html`, `upscale.html`, `guide.html`, `photos-to-pdf.html`, `pdf-to-word.html`, `pdf-to-ppt.html` 각 파일에서, 아래처럼 되어 있는 부분을:

```html
  <footer class="site-footer">
    <a href="privacy.html">개인정보처리방침</a>
  </footer>
```

아래로 교체한다 (7개 파일 전부 동일):

```html
  <footer class="site-footer">
    <a href="privacy.html">개인정보처리방침</a>
    <a href="about.html">About</a>
    <a href="contact.html">문의</a>
  </footer>
```

- [ ] **Step 2: `privacy.html`에 footer 신규 추가 + 문의 섹션 링크 교체**

`privacy.html`의 `</main>` 태그(현재 33번째 줄) 바로 다음, `</body>` 태그(현재 34번째 줄) 앞에 아래 footer를 추가한다:

```html

  <footer class="site-footer">
    <a href="about.html">About</a>
    <a href="contact.html">문의</a>
  </footer>
```

그리고 같은 파일의 "4. 문의" 섹션(현재 28~29번째 줄)을:

```html
      <h2>4. 문의</h2>
      <p>본 방침에 대한 문의는 사이트 저장소(<a href="https://github.com/nwb010118/image-toolbox" target="_blank" rel="noopener">GitHub</a>)의 이슈로 남겨주세요.</p>
```

아래로 교체한다:

```html
      <h2>4. 문의</h2>
      <p>본 방침에 대한 문의는 <a href="contact.html">문의 페이지</a>를 통해 이메일로 보내주세요.</p>
```

- [ ] **Step 3: `sitemap.xml`에 2개 URL 추가**

`sitemap.xml`의 `</urlset>` 태그 바로 앞에 아래 블록을 추가한다:

```xml
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/about.html</loc>
  </url>
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/contact.html</loc>
  </url>
```

- [ ] **Step 4: 전체 테스트 실행 — 전부 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, `process.exitCode`가 설정되지 않음(0).

- [ ] **Step 5: 브라우저로 최종 수동 확인**

- `index.html`/`pdf.html`/`upscale.html`/`guide.html`/`privacy.html`/`photos-to-pdf.html`/`pdf-to-word.html`/`pdf-to-ppt.html` 각각을 열어 footer에 About/문의 링크가 보이고 클릭 시 정확히 이동하는지 확인
- `privacy.html`의 "4. 문의" 섹션이 이제 GitHub 대신 `contact.html`을 가리키는지 확인
- `contact.html`의 "이메일 보내기" 버튼이 실제로 메일 클라이언트를 여는지 확인 (mailto 링크이므로 클릭 시 OS 기본 메일 앱이 뜨는지)
- `about.html`/`contact.html`의 JSON-LD를 Google 리치 결과 테스트 등으로 문법 오류 없는지 확인

- [ ] **Step 6: 커밋**

```bash
git add index.html pdf.html upscale.html guide.html privacy.html photos-to-pdf.html pdf-to-word.html pdf-to-ppt.html sitemap.xml
git commit -m "Wire About/Contact pages into every page's footer and sitemap.xml"
```

---

## Task 5: 배포

- [ ] **Step 1: 원격 저장소로 푸시**

```bash
git push origin master:main
```

- [ ] **Step 2: 배포 확인**

몇 분 뒤 아래 URL들이 실제로 열리는지 확인:
- `https://nwb010118.github.io/image-toolbox/about.html`
- `https://nwb010118.github.io/image-toolbox/contact.html`

- [ ] **Step 3: Google Search Console 사이트맵 재제출은 이번 라운드에서 하지 않는다**

진단 문서의 5번 제안(사이트맵 재제출)은 이 계획의 범위 밖이다 — 이후 순서(2번: 기존 도구 페이지 콘텐츠 보강, 3번: 실측 비교 데이터, 4번: 정보성 가이드 글)까지 전부 배포된 뒤 한 번에 재제출하기로 사용자와 합의됐다.
