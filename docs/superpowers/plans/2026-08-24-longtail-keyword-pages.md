# 롱테일 키워드 신규 랜딩 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 검색 의도가 좁은 3개 키워드("PDF 워드 변환", "PDF PPT 변환", "사진 PDF 합치기")마다 전용 랜딩 페이지를 만들어 기존 `pdf.html`로의 유입 경로를 늘린다.

**Architecture:** 빌드 도구 없는 순수 정적 HTML 3개(`photos-to-pdf.html`, `pdf-to-word.html`, `pdf-to-ppt.html`)를 저장소 루트에 추가한다. 새 변환 로직/JS는 만들지 않고, 각 페이지의 CTA는 `pdf.html`의 기존 섹션으로 앵커 링크된다. 기존 `pdf.html`·`guide.html`·`sitemap.xml`에 신규 페이지로의 링크를 추가한다.

**Tech Stack:** 순수 HTML/CSS(기존 `css/style.css` 재사용), JSON-LD 구조화 데이터(HowTo + FAQPage). Node 기반 무프레임워크 통합 테스트(`tests/` 디렉터리의 기존 패턴과 동일).

## Global Constraints

- 새 CSS 클래스를 추가하지 않는다 — `container`, `subtitle`, `tool-nav`, `info-section`, `btn` 등 기존 클래스만 재사용한다.
- 새 JS 파일/함수를 추가하지 않는다 — 신규 페이지는 순수 콘텐츠이며, 실제 변환은 전부 `pdf.html`의 기존 기능을 그대로 사용한다.
- 각 페이지는 `<title>`, `meta description`, `link rel="canonical"`, `og:type`(article)/`og:title`/`og:description`/`og:url`/`og:locale`를 기존 페이지들과 동일한 패턴으로 갖춘다.
- 각 페이지는 HowTo와 FAQPage JSON-LD를 모두 포함한다.
- 언어는 한국어(`lang="ko"`), 이모지 사용 금지(기존 사이트 컨벤션).
- 파일 인코딩은 UTF-8, 기존 파일들과 동일하게 `<!DOCTYPE html>`로 시작.

---

## Task 1: 통합 검증 테스트 작성 (실패 확인)

**Files:**
- Create: `tests/seoPagesIntegrity.test.js`

**Interfaces:**
- Consumes: 파일시스템의 `photos-to-pdf.html`, `pdf-to-word.html`, `pdf-to-ppt.html`, `pdf.html`, `guide.html`, `sitemap.xml` (아직 신규 3개 파일은 존재하지 않음 — 이후 태스크에서 생성)
- Produces: `node tests/seoPagesIntegrity.test.js` 실행 시 각 검증 항목별 PASS/FAIL을 콘솔에 출력하고, 하나라도 실패하면 `process.exitCode = 1`

- [ ] **Step 1: 테스트 파일 작성**

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

function extractJsonLdBlocks(html) {
  const blocks = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    blocks.push(JSON.parse(m[1]));
  }
  return blocks;
}

const PAGES = [
  {
    file: 'photos-to-pdf.html',
    ctaHref: 'pdf.html#imgToPdfUploadArea',
    relatedLinks: ['pdf-to-word.html', 'pdf-to-ppt.html', 'pdf.html']
  },
  {
    file: 'pdf-to-word.html',
    ctaHref: 'pdf.html#pdfConvertUploadArea',
    relatedLinks: ['pdf-to-ppt.html', 'photos-to-pdf.html', 'pdf.html']
  },
  {
    file: 'pdf-to-ppt.html',
    ctaHref: 'pdf.html#pdfConvertUploadArea',
    relatedLinks: ['pdf-to-word.html', 'photos-to-pdf.html', 'pdf.html']
  }
];

PAGES.forEach(function (page) {
  test(page.file + ' exists and has required <head> tags', function () {
    const html = readRepoFile(page.file);
    assert.ok(/<title>[^<]+<\/title>/.test(html), 'missing <title>');
    assert.ok(html.includes('rel="canonical"'), 'missing canonical link');
    assert.ok(html.includes('property="og:title"'), 'missing og:title');
  });

  test(page.file + ' has valid HowTo and FAQPage JSON-LD', function () {
    const html = readRepoFile(page.file);
    const blocks = extractJsonLdBlocks(html);
    const types = blocks.map(function (b) { return b['@type']; });
    assert.ok(types.includes('HowTo'), 'missing HowTo block');
    assert.ok(types.includes('FAQPage'), 'missing FAQPage block');
  });

  test(page.file + ' CTA links to an anchor that exists in pdf.html', function () {
    const html = readRepoFile(page.file);
    assert.ok(html.includes('href="' + page.ctaHref + '"'), 'missing CTA href=' + page.ctaHref);
    const anchorId = page.ctaHref.split('#')[1];
    const pdfHtml = readRepoFile('pdf.html');
    assert.ok(pdfHtml.includes('id="' + anchorId + '"'), 'pdf.html missing id=' + anchorId);
  });

  test(page.file + ' links to all related pages that exist on disk', function () {
    const html = readRepoFile(page.file);
    page.relatedLinks.forEach(function (rel) {
      assert.ok(html.includes('href="' + rel + '"'), 'missing link to ' + rel);
      assert.ok(fs.existsSync(path.join(__dirname, '..', rel)), rel + ' does not exist on disk');
    });
  });
});

test('pdf.html links to photos-to-pdf.html', function () {
  const html = readRepoFile('pdf.html');
  assert.ok(html.includes('href="photos-to-pdf.html"'), 'pdf.html missing link to photos-to-pdf.html');
});

test('pdf.html links to pdf-to-word.html and pdf-to-ppt.html', function () {
  const html = readRepoFile('pdf.html');
  assert.ok(html.includes('href="pdf-to-word.html"'), 'pdf.html missing link to pdf-to-word.html');
  assert.ok(html.includes('href="pdf-to-ppt.html"'), 'pdf.html missing link to pdf-to-ppt.html');
});

test('guide.html links to photos-to-pdf.html', function () {
  const html = readRepoFile('guide.html');
  assert.ok(html.includes('href="photos-to-pdf.html"'), 'guide.html missing link to photos-to-pdf.html');
});

test('sitemap.xml includes the 3 new pages', function () {
  const xml = readRepoFile('sitemap.xml');
  ['photos-to-pdf.html', 'pdf-to-word.html', 'pdf-to-ppt.html'].forEach(function (page) {
    assert.ok(xml.includes('/image-toolbox/' + page), 'sitemap.xml missing ' + page);
  });
});
```

- [ ] **Step 2: 실행해서 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: `photos-to-pdf.html`, `pdf-to-word.html`, `pdf-to-ppt.html` 관련 테스트 전부 FAIL (ENOENT — 파일 없음), `pdf.html`/`guide.html`/`sitemap.xml` 관련 테스트도 FAIL (아직 링크 없음). `process.exitCode`가 1로 설정됨.

- [ ] **Step 3: 커밋**

```bash
git add tests/seoPagesIntegrity.test.js
git commit -m "test: add integrity checks for upcoming long-tail keyword pages"
```

---

## Task 2: `photos-to-pdf.html` 작성

**Files:**
- Create: `photos-to-pdf.html`

**Interfaces:**
- Consumes: `css/style.css`의 `.container`/`.subtitle`/`.tool-nav`/`.info-section`/`.btn` 클래스, `pdf.html`의 `id="imgToPdfUploadArea"` 앵커
- Produces: Task 1의 `photos-to-pdf.html` 관련 테스트 4건이 통과하게 될 파일

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>여러 장 사진을 하나의 PDF로 합치는 방법 - 무료, 온라인, 설치 없이</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="JPG, PNG, WebP 사진 여러 장을 순서대로 하나의 PDF 파일로 합치는 방법을 단계별로 설명합니다. 서버 전송 없이 브라우저에서 무료로 바로 처리합니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/photos-to-pdf.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="여러 장 사진을 하나의 PDF로 합치는 방법 - 무료, 온라인, 설치 없이">
  <meta property="og:description" content="JPG, PNG, WebP 사진 여러 장을 순서대로 하나의 PDF 파일로 합치는 방법을 단계별로 설명합니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/photos-to-pdf.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "여러 장 사진을 하나의 PDF로 합치는 방법",
    "description": "JPG, PNG, WebP 사진 여러 장을 순서대로 하나의 PDF 파일로 합치는 방법",
    "step": [
      {
        "@type": "HowToStep",
        "name": "사진 파일 선택",
        "text": "합치고 싶은 사진들을 원하는 순서대로 한 번에 선택하거나, 업로드 영역에 끌어다 놓습니다."
      },
      {
        "@type": "HowToStep",
        "name": "업로드 순서 확인",
        "text": "목록에 표시된 순서가 그대로 PDF 페이지 순서가 됩니다. 순서가 다르면 파일을 다시 선택합니다."
      },
      {
        "@type": "HowToStep",
        "name": "PDF로 변환 후 다운로드",
        "text": "PDF로 변환 버튼을 누르면 브라우저 안에서 PDF가 생성되고, 바로 다운로드할 수 있습니다."
      }
    ]
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "사진 순서를 잘못 선택했으면 어떻게 하나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "업로드 후 순서를 바꾸는 기능은 없습니다. 파일 선택 창에서 원하는 순서대로 다시 선택하거나, 파일명을 순서대로 정렬해둔 뒤 전체 선택하면 편리합니다."
        }
      },
      {
        "@type": "Question",
        "name": "사진마다 크기(가로세로 비율)가 달라도 되나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "네. 각 페이지는 해당 사진의 원본 가로세로 비율 그대로 생성되므로, 세로 사진과 가로 사진을 섞어도 문제없습니다."
        }
      },
      {
        "@type": "Question",
        "name": "몇 장까지, 얼마나 큰 파일까지 합칠 수 있나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "최대 50장, 사진 한 장당 최대 20MB까지 지원합니다. JPG, PNG, WebP 형식을 사용할 수 있습니다."
        }
      },
      {
        "@type": "Question",
        "name": "만든 PDF를 나중에 다시 수정할 수 있나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "이 도구는 사진을 PDF로 합치는 기능만 제공하며, 완성된 PDF 안의 페이지 순서 변경이나 삭제 같은 편집 기능은 없습니다. 순서를 바꾸려면 사진을 원하는 순서로 다시 선택해 새로 만들어야 합니다."
        }
      },
      {
        "@type": "Question",
        "name": "사진이 서버에 업로드되나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "아니요. PDF 생성은 브라우저 안에서만 이뤄지며, 어떤 사진도 서버로 전송되지 않습니다. 신분증, 계약서처럼 민감한 문서를 합칠 때도 안전합니다."
        }
      }
    ]
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>여러 장 사진을 하나의 PDF로 합치는 방법</h1>
    <p class="subtitle">설치나 회원가입 없이, 브라우저에서 바로 PDF로 합칠 수 있습니다.</p>
    <p class="tool-nav"><a href="pdf.html">← PDF 변환 도구 전체 보기</a></p>
    <p class="tool-nav"><a href="guide.html">언제 어떤 도구가 필요할까? 가이드 보기 →</a></p>

    <section class="info-section">
      <h2>이런 상황에서 필요합니다</h2>
      <p>계약서나 신분증 앞뒤 면을 각각 따로 촬영한 뒤 서류 제출용으로 하나의 파일로 묶어야 할 때, 영수증이나 증빙 서류를 여러 장 찍어서 한 번에 제출해야 할 때, 포트폴리오나 작업물 사진을 순서대로 묶어 공유해야 할 때처럼, 여러 장의 사진을 순서를 유지한 채 하나의 PDF로 만들어야 하는 상황은 생각보다 자주 있습니다. 이 페이지에서는 image-toolbox의 이미지→PDF 기능으로 이를 처리하는 방법을 설명합니다.</p>
    </section>

    <section class="info-section">
      <h2>사용 방법</h2>
      <p><strong>1. 사진 파일 선택.</strong> 합치고 싶은 사진들을 원하는 순서대로 한 번에 선택하거나, 업로드 영역에 끌어다 놓습니다. JPG, PNG, WebP 형식을 지원하며 최대 50장, 파일당 최대 20MB까지 가능합니다.</p>
      <p><strong>2. 업로드 순서 확인.</strong> 목록에 표시되는 순서가 그대로 PDF의 페이지 순서가 됩니다. 순서가 잘못됐다면 파일을 다시 선택해주세요.</p>
      <p><strong>3. PDF로 변환 후 다운로드.</strong> "PDF로 변환" 버튼을 누르면 브라우저 안에서 바로 PDF가 만들어지고, 완료되면 다운로드할 수 있습니다.</p>
      <p><a class="btn" href="pdf.html#imgToPdfUploadArea">지금 사진 PDF로 합치기 →</a></p>
    </section>

    <section class="info-section">
      <h2>알아두면 좋은 점</h2>
      <p>각 PDF 페이지는 원본 사진의 가로세로 비율 그대로 생성되므로, 세로로 찍은 사진과 가로로 찍은 사진을 섞어도 찌그러지지 않습니다. 다만 업로드 후 페이지 순서를 바꾸거나 특정 페이지만 삭제하는 편집 기능은 없기 때문에, 순서가 중요하다면 파일을 선택하기 전에 순서를 미리 정리해두는 것이 좋습니다. 모든 처리는 이 브라우저 안에서만 이뤄지고 서버로 전송되지 않으므로, 신분증이나 계약서처럼 민감한 문서를 다룰 때도 안전합니다.</p>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>사진 순서를 잘못 선택했으면 어떻게 하나요?</summary>
        <p>업로드 후 순서를 바꾸는 기능은 없습니다. 파일 선택 창에서 원하는 순서대로 다시 선택하거나, 파일명을 순서대로 정렬해둔 뒤 전체 선택하면 편리합니다.</p>
      </details>
      <details>
        <summary>사진마다 크기(가로세로 비율)가 달라도 되나요?</summary>
        <p>네. 각 페이지는 해당 사진의 원본 가로세로 비율 그대로 생성되므로, 세로 사진과 가로 사진을 섞어도 문제없습니다.</p>
      </details>
      <details>
        <summary>몇 장까지, 얼마나 큰 파일까지 합칠 수 있나요?</summary>
        <p>최대 50장, 사진 한 장당 최대 20MB까지 지원합니다. JPG, PNG, WebP 형식을 사용할 수 있습니다.</p>
      </details>
      <details>
        <summary>만든 PDF를 나중에 다시 수정할 수 있나요?</summary>
        <p>이 도구는 사진을 PDF로 합치는 기능만 제공하며, 완성된 PDF 안의 페이지 순서 변경이나 삭제 같은 편집 기능은 없습니다. 순서를 바꾸려면 사진을 원하는 순서로 다시 선택해 새로 만들어야 합니다.</p>
      </details>
      <details>
        <summary>사진이 서버에 업로드되나요?</summary>
        <p>아니요. PDF 생성은 브라우저 안에서만 이뤄지며, 어떤 사진도 서버로 전송되지 않습니다. 신분증, 계약서처럼 민감한 문서를 합칠 때도 안전합니다.</p>
      </details>
    </section>

    <section class="info-section">
      <h2>관련 페이지</h2>
      <p><a href="pdf-to-word.html">PDF를 워드로 변환하는 방법</a></p>
      <p><a href="pdf-to-ppt.html">PDF를 파워포인트로 변환하는 방법</a></p>
      <p><a href="pdf.html">PDF 변환 도구 (이미지↔PDF, PDF→Office 문서)</a></p>
    </section>
  </main>

  <footer class="site-footer">
    <a href="privacy.html">개인정보처리방침</a>
  </footer>
</body>
</html>
```

- [ ] **Step 2: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: `photos-to-pdf.html` 관련 4개 테스트는 PASS. `pdf-to-word.html`/`pdf-to-ppt.html` 관련 테스트와 `pdf.html`/`guide.html`/`sitemap.xml` 관련 테스트는 여전히 FAIL(정상 — 아직 Task 3~5 전).

- [ ] **Step 3: 브라우저로 수동 확인**

파일을 직접 열어서 (`file://` 또는 `python3 -m http.server`) 다음을 확인:
- FAQ 아코디언(`<details>`)이 정상적으로 펼쳐지는지
- "지금 사진 PDF로 합치기" 버튼 클릭 시 `pdf.html`로 이동해 "이미지 → PDF" 섹션으로 스크롤되는지

- [ ] **Step 4: 커밋**

```bash
git add photos-to-pdf.html
git commit -m "Add photos-to-pdf.html long-tail keyword landing page"
```

---

## Task 3: `pdf-to-word.html` 작성

**Files:**
- Create: `pdf-to-word.html`

**Interfaces:**
- Consumes: `css/style.css`의 기존 클래스, `pdf.html`의 `id="pdfConvertUploadArea"` 앵커
- Produces: Task 1의 `pdf-to-word.html` 관련 테스트 4건이 통과하게 될 파일

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>PDF를 워드(Word)로 변환하는 방법 - 무료, 온라인, 설치 없이</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="텍스트가 있는 PDF를 워드(.docx) 문서로 변환하는 방법을 단계별로 설명합니다. 서버 전송 없이 브라우저에서 무료로 바로 처리합니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/pdf-to-word.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="PDF를 워드(Word)로 변환하는 방법 - 무료, 온라인, 설치 없이">
  <meta property="og:description" content="텍스트가 있는 PDF를 워드(.docx) 문서로 변환하는 방법을 단계별로 설명합니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/pdf-to-word.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "PDF를 워드(Word)로 변환하는 방법",
    "description": "텍스트가 있는 PDF를 워드(.docx) 문서로 변환하는 방법",
    "step": [
      {
        "@type": "HowToStep",
        "name": "PDF 파일 선택",
        "text": "PDF → 문서 변환 섹션에서 PDF 파일을 선택하거나 업로드 영역에 끌어다 놓습니다."
      },
      {
        "@type": "HowToStep",
        "name": "출력 형식에서 Word 선택",
        "text": "출력 형식의 기본값은 PowerPoint이므로, Word (.docx)를 직접 선택합니다."
      },
      {
        "@type": "HowToStep",
        "name": "변환하기 클릭 후 다운로드",
        "text": "변환하기 버튼을 누르면 브라우저 안에서 .docx 파일이 만들어지고, 바로 다운로드할 수 있습니다."
      }
    ]
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "스캔한 PDF도 워드로 변환되나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "아니요. 이 기능은 PDF 안에 있는 실제 텍스트만 추출하기 때문에, 사진을 스캔해서 만든 이미지 기반 PDF는 지원하지 않습니다. 텍스트가 없는 스캔본은 대신 PDF→PPT 변환을 이용해주세요. 페이지를 이미지 그대로 슬라이드에 담을 수 있습니다."
        }
      },
      {
        "@type": "Question",
        "name": "표나 이미지, 서식도 그대로 옮겨지나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "아니요. 텍스트만 문단 단위로 추출되며, 표·이미지·글꼴 서식은 옮겨지지 않습니다. 원본 PDF의 페이지가 바뀔 때마다 워드 문서에서도 페이지가 나뉩니다."
        }
      },
      {
        "@type": "Question",
        "name": "문단이 이상하게 나뉘거나 합쳐져요",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "문단 구분은 텍스트 사이의 줄 간격을 기준으로 자동 인식됩니다. 레이아웃이 복잡한 PDF(다단 구성, 표 안의 텍스트 등)에서는 문단이 원본과 다르게 나뉠 수 있습니다."
        }
      },
      {
        "@type": "Question",
        "name": "몇 페이지까지 변환할 수 있나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "PDF 파일 최대 20MB, 최대 300페이지까지 지원합니다."
        }
      },
      {
        "@type": "Question",
        "name": "다운로드한 파일은 어떤 프로그램에서 열리나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": ".docx 형식으로 저장되며 Microsoft Word, 한글과컴퓨터의 한컴오피스, 구글 문서 등 대부분의 워드 프로세서에서 열 수 있습니다."
        }
      }
    ]
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>PDF를 워드(Word)로 변환하는 방법</h1>
    <p class="subtitle">설치나 회원가입 없이, 브라우저에서 바로 .docx로 변환할 수 있습니다.</p>
    <p class="tool-nav"><a href="pdf.html">← PDF 변환 도구 전체 보기</a></p>
    <p class="tool-nav"><a href="guide.html">언제 어떤 도구가 필요할까? 가이드 보기 →</a></p>

    <section class="info-section">
      <h2>이런 상황에서 필요합니다</h2>
      <p>PDF로 받은 보고서나 자료를 팀원이 직접 수정할 수 있게 워드 파일로 바꿔야 할 때, 계약서나 공문에서 텍스트만 뽑아 다른 문서에 인용해야 할 때, PDF로만 남아있는 옛날 문서를 다시 편집 가능한 형태로 되살려야 할 때처럼, PDF 안의 텍스트를 워드 문서로 옮겨야 하는 상황이 있습니다. 이 페이지에서는 image-toolbox의 PDF→문서 변환 기능으로 이를 처리하는 방법을 설명합니다.</p>
    </section>

    <section class="info-section">
      <h2>사용 방법</h2>
      <p><strong>1. PDF 파일 선택.</strong> "PDF → 문서 변환" 섹션에서 PDF 파일을 선택하거나 업로드 영역에 끌어다 놓습니다. 최대 20MB, 최대 300페이지까지 지원합니다.</p>
      <p><strong>2. 출력 형식에서 Word 선택.</strong> 출력 형식의 기본값은 PowerPoint로 되어 있으니, 목록에서 "Word (.docx)"를 직접 선택해주세요.</p>
      <p><strong>3. 변환하기 클릭 후 다운로드.</strong> 브라우저 안에서 텍스트가 추출되어 .docx 파일로 만들어지고, 완료되면 바로 다운로드할 수 있습니다.</p>
      <p><a class="btn" href="pdf.html#pdfConvertUploadArea">지금 PDF를 워드로 변환하기 →</a></p>
    </section>

    <section class="info-section">
      <h2>알아두면 좋은 점</h2>
      <p>이 기능은 PDF 안의 텍스트를 문단 단위로 추출하는 방식이라, 표·이미지·글꼴 서식은 옮겨지지 않고 순수 텍스트만 남습니다. 문단 구분은 줄 간격을 기준으로 자동 판단하기 때문에 레이아웃이 단순한 문서(보고서, 공문, 계약서 등)에서 가장 정확하고, 다단 구성이나 표가 많은 문서는 문단이 원본과 다르게 나뉠 수 있습니다. 또한 사진을 스캔해서 만든 PDF처럼 텍스트 레이어가 없는 파일은 변환할 수 없으며, 이런 경우 화면에 "텍스트가 없는 스캔본" 안내가 표시됩니다 — 이때는 <a href="pdf-to-ppt.html">PDF→PPT 변환</a>을 이용하면 페이지를 이미지 그대로 옮길 수 있습니다.</p>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>스캔한 PDF도 워드로 변환되나요?</summary>
        <p>아니요. 이 기능은 PDF 안에 있는 실제 텍스트만 추출하기 때문에, 사진을 스캔해서 만든 이미지 기반 PDF는 지원하지 않습니다. 텍스트가 없는 스캔본은 대신 PDF→PPT 변환을 이용해주세요. 페이지를 이미지 그대로 슬라이드에 담을 수 있습니다.</p>
      </details>
      <details>
        <summary>표나 이미지, 서식도 그대로 옮겨지나요?</summary>
        <p>아니요. 텍스트만 문단 단위로 추출되며, 표·이미지·글꼴 서식은 옮겨지지 않습니다. 원본 PDF의 페이지가 바뀔 때마다 워드 문서에서도 페이지가 나뉩니다.</p>
      </details>
      <details>
        <summary>문단이 이상하게 나뉘거나 합쳐져요</summary>
        <p>문단 구분은 텍스트 사이의 줄 간격을 기준으로 자동 인식됩니다. 레이아웃이 복잡한 PDF(다단 구성, 표 안의 텍스트 등)에서는 문단이 원본과 다르게 나뉠 수 있습니다.</p>
      </details>
      <details>
        <summary>몇 페이지까지 변환할 수 있나요?</summary>
        <p>PDF 파일 최대 20MB, 최대 300페이지까지 지원합니다.</p>
      </details>
      <details>
        <summary>다운로드한 파일은 어떤 프로그램에서 열리나요?</summary>
        <p>.docx 형식으로 저장되며 Microsoft Word, 한글과컴퓨터의 한컴오피스, 구글 문서 등 대부분의 워드 프로세서에서 열 수 있습니다.</p>
      </details>
    </section>

    <section class="info-section">
      <h2>관련 페이지</h2>
      <p><a href="pdf-to-ppt.html">PDF를 파워포인트로 변환하는 방법</a></p>
      <p><a href="photos-to-pdf.html">여러 장 사진을 PDF로 합치는 방법</a></p>
      <p><a href="pdf.html">PDF 변환 도구 (이미지↔PDF, PDF→Office 문서)</a></p>
    </section>
  </main>

  <footer class="site-footer">
    <a href="privacy.html">개인정보처리방침</a>
  </footer>
</body>
</html>
```

- [ ] **Step 2: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: `pdf-to-word.html` 관련 4개 테스트 PASS 추가.

- [ ] **Step 3: 브라우저로 수동 확인**

"지금 PDF를 워드로 변환하기" 버튼 클릭 시 `pdf.html`의 "PDF → 문서 변환" 섹션으로 스크롤되는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add pdf-to-word.html
git commit -m "Add pdf-to-word.html long-tail keyword landing page"
```

---

## Task 4: `pdf-to-ppt.html` 작성

**Files:**
- Create: `pdf-to-ppt.html`

**Interfaces:**
- Consumes: `css/style.css`의 기존 클래스, `pdf.html`의 `id="pdfConvertUploadArea"` 앵커
- Produces: Task 1의 `pdf-to-ppt.html` 관련 테스트 4건이 통과하게 될 파일

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>PDF를 파워포인트(PPT)로 변환하는 방법 - 무료, 온라인</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="PDF 각 페이지를 파워포인트(.pptx) 슬라이드로 변환하는 방법을 단계별로 설명합니다. 스캔한 PDF도 가능하며, 서버 전송 없이 브라우저에서 무료로 처리합니다.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/pdf-to-ppt.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="PDF를 파워포인트(PPT)로 변환하는 방법 - 무료, 온라인">
  <meta property="og:description" content="PDF 각 페이지를 파워포인트(.pptx) 슬라이드로 변환하는 방법을 단계별로 설명합니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/pdf-to-ppt.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "PDF를 파워포인트(PPT)로 변환하는 방법",
    "description": "PDF 각 페이지를 파워포인트(.pptx) 슬라이드로 변환하는 방법",
    "step": [
      {
        "@type": "HowToStep",
        "name": "PDF 파일 선택",
        "text": "PDF → 문서 변환 섹션에서 PDF 파일을 선택하거나 업로드 영역에 끌어다 놓습니다."
      },
      {
        "@type": "HowToStep",
        "name": "출력 형식 확인",
        "text": "출력 형식의 기본값이 이미 PowerPoint이므로 별도 선택 없이 바로 진행할 수 있습니다."
      },
      {
        "@type": "HowToStep",
        "name": "변환하기 클릭 후 다운로드",
        "text": "변환하기 버튼을 누르면 브라우저 안에서 .pptx 파일이 만들어지고, 바로 다운로드할 수 있습니다."
      }
    ]
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "슬라이드 안의 텍스트를 파워포인트에서 수정할 수 있나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "아니요. 각 PDF 페이지를 이미지로 캡처해 슬라이드에 삽입하는 방식이라, 파워포인트에서 텍스트를 직접 수정할 수는 없습니다. 텍스트 편집이 필요하다면 PDF→Word 변환을 이용해주세요."
        }
      },
      {
        "@type": "Question",
        "name": "스캔한 PDF(이미지로 된 PDF)도 변환되나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "네. PPT 변환은 텍스트 유무와 상관없이 페이지를 이미지로 그대로 옮기기 때문에, 스캔본 PDF도 문제없이 변환됩니다. Word·Excel 변환과 달리 텍스트가 없어도 동작하는 이유입니다."
        }
      },
      {
        "@type": "Question",
        "name": "몇 페이지까지 변환할 수 있나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "메모리 보호를 위해 PPT 변환은 최대 100페이지까지 지원합니다. 더 많은 페이지가 있다면 PDF를 나눠서 여러 번 변환해주세요."
        }
      },
      {
        "@type": "Question",
        "name": "슬라이드 크기(비율)가 이상해요",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "슬라이드 크기는 표준 16:9가 아니라 원본 PDF 페이지의 실제 크기 그대로 고정됩니다. PDF가 A4 비율이라면 슬라이드도 A4 비율로 생성됩니다."
        }
      },
      {
        "@type": "Question",
        "name": "다운로드한 파일은 어떤 프로그램에서 열리나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": ".pptx 형식으로 저장되며 Microsoft PowerPoint, 한쇼, 구글 프레젠테이션 등에서 열 수 있습니다."
        }
      }
    ]
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>PDF를 파워포인트(PPT)로 변환하는 방법</h1>
    <p class="subtitle">설치나 회원가입 없이, 브라우저에서 바로 .pptx로 변환할 수 있습니다.</p>
    <p class="tool-nav"><a href="pdf.html">← PDF 변환 도구 전체 보기</a></p>
    <p class="tool-nav"><a href="guide.html">언제 어떤 도구가 필요할까? 가이드 보기 →</a></p>

    <section class="info-section">
      <h2>이런 상황에서 필요합니다</h2>
      <p>PDF로 받은 자료를 발표 자료로 재활용해야 할 때, 강의 자료나 보고서를 슬라이드 형태로 옮겨서 보여줘야 할 때, 스캔해서 이미지로만 존재하는 옛날 문서를 프레젠테이션에 끼워 넣어야 할 때처럼, PDF 페이지를 파워포인트 슬라이드로 옮겨야 하는 상황이 있습니다. 이 페이지에서는 image-toolbox의 PDF→문서 변환 기능으로 이를 처리하는 방법을 설명합니다.</p>
    </section>

    <section class="info-section">
      <h2>사용 방법</h2>
      <p><strong>1. PDF 파일 선택.</strong> "PDF → 문서 변환" 섹션에서 PDF 파일을 선택하거나 업로드 영역에 끌어다 놓습니다. 최대 20MB, PPT 변환은 최대 100페이지까지 지원합니다.</p>
      <p><strong>2. 출력 형식 확인.</strong> 출력 형식의 기본값이 이미 PowerPoint이므로 별도로 선택할 필요 없이 바로 진행할 수 있습니다.</p>
      <p><strong>3. 변환하기 클릭 후 다운로드.</strong> 브라우저 안에서 각 페이지가 이미지로 캡처되어 슬라이드로 만들어지고, 완료되면 .pptx 파일을 바로 다운로드할 수 있습니다.</p>
      <p><a class="btn" href="pdf.html#pdfConvertUploadArea">지금 PDF를 파워포인트로 변환하기 →</a></p>
    </section>

    <section class="info-section">
      <h2>알아두면 좋은 점</h2>
      <p>이 기능은 PDF의 각 페이지를 이미지로 캡처해서 슬라이드에 그대로 삽입하는 방식입니다. 그래서 파워포인트에서 슬라이드 안의 텍스트나 도형을 직접 수정할 수는 없지만, 반대로 텍스트가 없는 스캔본 PDF도 변환할 수 있다는 장점이 있습니다(Word·Excel 변환은 텍스트가 있는 PDF만 지원합니다). 슬라이드 크기는 표준 16:9가 아니라 원본 PDF 페이지 크기 그대로 고정되며, 메모리 보호를 위해 한 번에 최대 100페이지까지만 변환할 수 있습니다. 텍스트를 편집 가능한 형태로 옮기고 싶다면 <a href="pdf-to-word.html">PDF→Word 변환</a>을 이용해주세요.</p>
    </section>

    <section class="info-section">
      <h2>자주 묻는 질문</h2>
      <details>
        <summary>슬라이드 안의 텍스트를 파워포인트에서 수정할 수 있나요?</summary>
        <p>아니요. 각 PDF 페이지를 이미지로 캡처해 슬라이드에 삽입하는 방식이라, 파워포인트에서 텍스트를 직접 수정할 수는 없습니다. 텍스트 편집이 필요하다면 PDF→Word 변환을 이용해주세요.</p>
      </details>
      <details>
        <summary>스캔한 PDF(이미지로 된 PDF)도 변환되나요?</summary>
        <p>네. PPT 변환은 텍스트 유무와 상관없이 페이지를 이미지로 그대로 옮기기 때문에, 스캔본 PDF도 문제없이 변환됩니다. Word·Excel 변환과 달리 텍스트가 없어도 동작하는 이유입니다.</p>
      </details>
      <details>
        <summary>몇 페이지까지 변환할 수 있나요?</summary>
        <p>메모리 보호를 위해 PPT 변환은 최대 100페이지까지 지원합니다. 더 많은 페이지가 있다면 PDF를 나눠서 여러 번 변환해주세요.</p>
      </details>
      <details>
        <summary>슬라이드 크기(비율)가 이상해요</summary>
        <p>슬라이드 크기는 표준 16:9가 아니라 원본 PDF 페이지의 실제 크기 그대로 고정됩니다. PDF가 A4 비율이라면 슬라이드도 A4 비율로 생성됩니다.</p>
      </details>
      <details>
        <summary>다운로드한 파일은 어떤 프로그램에서 열리나요?</summary>
        <p>.pptx 형식으로 저장되며 Microsoft PowerPoint, 한쇼, 구글 프레젠테이션 등에서 열 수 있습니다.</p>
      </details>
    </section>

    <section class="info-section">
      <h2>관련 페이지</h2>
      <p><a href="pdf-to-word.html">PDF를 워드로 변환하는 방법</a></p>
      <p><a href="photos-to-pdf.html">여러 장 사진을 PDF로 합치는 방법</a></p>
      <p><a href="pdf.html">PDF 변환 도구 (이미지↔PDF, PDF→Office 문서)</a></p>
    </section>
  </main>

  <footer class="site-footer">
    <a href="privacy.html">개인정보처리방침</a>
  </footer>
</body>
</html>
```

- [ ] **Step 2: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: `pdf-to-ppt.html` 관련 4개 테스트 PASS 추가. 이 시점에 3개 신규 페이지 관련 테스트(12건)는 전부 PASS, `pdf.html`/`guide.html`/`sitemap.xml` 관련 4건만 FAIL로 남아있어야 함.

- [ ] **Step 3: 브라우저로 수동 확인**

"지금 PDF를 파워포인트로 변환하기" 버튼 클릭 시 `pdf.html`의 "PDF → 문서 변환" 섹션으로 스크롤되는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add pdf-to-ppt.html
git commit -m "Add pdf-to-ppt.html long-tail keyword landing page"
```

---

## Task 5: 내부 링크 연결 + sitemap.xml 갱신

**Files:**
- Modify: `pdf.html:116` (h2 "이미지 → PDF" 바로 아래), `pdf.html:171` (h2 "PDF → 문서 변환" 바로 아래)
- Modify: `guide.html:45`
- Modify: `sitemap.xml:17` (`</urlset>` 앞)

**Interfaces:**
- Consumes: Task 2~4에서 만든 3개 신규 파일
- Produces: Task 1 테스트의 나머지 4건이 통과

- [ ] **Step 1: `pdf.html`의 "이미지 → PDF" 섹션에 링크 추가**

`pdf.html`의 116번째 줄(`<h2>이미지 → PDF</h2>`) 바로 다음 줄에 아래 한 줄을 추가:

```html
      <h2>이미지 → PDF</h2>
      <p class="tool-nav"><a href="photos-to-pdf.html">여러 장 사진 PDF로 합치는 법 자세히 보기 →</a></p>
```

- [ ] **Step 2: `pdf.html`의 "PDF → 문서 변환" 섹션에 링크 추가**

`pdf.html`의 "PDF → 문서 변환"이라는 `<h2>` 바로 다음 줄에 아래 두 줄을 추가:

```html
      <h2>PDF → 문서 변환</h2>
      <p class="tool-nav"><a href="pdf-to-word.html">PDF→Word 자세히 보기 →</a></p>
      <p class="tool-nav"><a href="pdf-to-ppt.html">PDF→PPT 자세히 보기 →</a></p>
```

- [ ] **Step 3: `guide.html`의 2번 섹션에 링크 추가**

`guide.html`의 45번째 줄(2번 섹션 문단)을 아래로 교체:

기존:
```html
      <p>서류 제출, 스캔한 문서 정리, 포트폴리오 공유처럼 여러 장의 사진을 순서대로 하나의 파일로 묶어야 하는 상황이 있습니다. 반대로 PDF 안에 있는 페이지를 개별 이미지로 꺼내야 할 때도 있고요. <a href="pdf.html">PDF 변환 도구</a>에서 이미지→PDF, PDF→이미지 양방향 변환을 할 수 있습니다.</p>
```

변경:
```html
      <p>서류 제출, 스캔한 문서 정리, 포트폴리오 공유처럼 여러 장의 사진을 순서대로 하나의 파일로 묶어야 하는 상황이 있습니다. 반대로 PDF 안에 있는 페이지를 개별 이미지로 꺼내야 할 때도 있고요. <a href="pdf.html">PDF 변환 도구</a>에서 이미지→PDF, PDF→이미지 양방향 변환을 할 수 있습니다. 여러 장의 사진을 PDF로 합치는 자세한 방법은 <a href="photos-to-pdf.html">이 안내</a>를 참고하세요.</p>
```

- [ ] **Step 4: `sitemap.xml`에 3개 URL 추가**

`sitemap.xml`의 `</urlset>` 태그(17번째 줄 다음) 바로 앞에 아래 블록을 추가:

```xml
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/photos-to-pdf.html</loc>
  </url>
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/pdf-to-word.html</loc>
  </url>
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/pdf-to-ppt.html</loc>
  </url>
```

- [ ] **Step 5: 전체 테스트 실행 — 전부 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, `process.exitCode`가 설정되지 않음(0).

- [ ] **Step 6: 브라우저로 최종 수동 확인**

- `pdf.html`을 열어 "이미지 → PDF"와 "PDF → 문서 변환" 섹션 아래에 새로 추가된 링크가 보이는지, 클릭 시 신규 페이지로 이동하는지 확인
- `guide.html`을 열어 2번 섹션에 추가된 링크가 자연스럽게 붙어있는지 확인
- 3개 신규 페이지 각각에서 브라우저 개발자 도구 콘솔에 JSON 파싱 에러가 없는지 확인 (또는 각 페이지의 JSON-LD 블록을 복사해 Google 리치 결과 테스트에 붙여넣어 확인)

- [ ] **Step 7: 커밋**

```bash
git add pdf.html guide.html sitemap.xml
git commit -m "Wire long-tail keyword pages into pdf.html, guide.html, and sitemap.xml"
```

---

## Task 6: 배포

- [ ] **Step 1: 원격 저장소로 푸시**

```bash
git push origin master:main
```

- [ ] **Step 2: 배포 확인**

몇 분 뒤 아래 URL들이 실제로 열리는지 확인:
- `https://nwb010118.github.io/image-toolbox/photos-to-pdf.html`
- `https://nwb010118.github.io/image-toolbox/pdf-to-word.html`
- `https://nwb010118.github.io/image-toolbox/pdf-to-ppt.html`

- [ ] **Step 3: Google Search Console 사이트맵 재제출 (선택, 사용자 승인 후 진행)**

`https://search.google.com/search-console/sitemaps?resource_id=https%3A%2F%2Fnwb010118.github.io%2Fimage-toolbox%2F`에서 `sitemap.xml`을 재제출해 신규 3개 URL의 색인을 앞당긴다. Bing 웹마스터도구는 Google Search Console에서 자동으로 가져오도록 이미 연동되어 있으므로 별도 작업이 필요 없다(반영에는 다소 시간이 걸릴 수 있음).
