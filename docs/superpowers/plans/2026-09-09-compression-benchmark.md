# 압축 실측 벤치마크 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이번 세션에 실제로 측정한 압축률 실측 데이터를 담은 `benchmark.html`을 신설하고, `index.html`/`guide.html`/`sitemap.xml`에 연결한다 (AdSense 반려 대응 5단계 계획의 3단계).

**Architecture:** 저장소 루트에 신규 정적 페이지 1개를 추가한다. 새 변환 로직은 없다 — 표에 들어가는 수치는 이미 브라우저 자동화로 실측 완료된 값을 그대로 옮겨 적는다. 기존 `container`/`info-section`/`tool-nav`/`btn`/`site-footer` 클래스를 재사용하고, 결과 표는 클래스 없이 최소한의 인라인 스타일만 사용한다(기존에 `privacy.html`도 인라인 스타일을 쓴 전례가 있음).

**Tech Stack:** 순수 HTML(신규 CSS 클래스 없음). Node 기반 무프레임워크 통합 테스트(`tests/seoPagesIntegrity.test.js`, 기존 파일에 이어서 작성).

## Global Constraints

- 새 CSS 클래스를 추가하지 않는다 — `container`, `subtitle`, `tool-nav`, `info-section`, `btn`, `site-footer`만 재사용한다. 표 스타일은 클래스 없이 인라인 `style` 속성만 사용한다.
- 새 JS 파일/함수를 추가하지 않는다.
- 표에 담기는 수치는 아래 "실측 데이터"에 명시된 값을 한 글자도 바꾸지 않고 그대로 옮긴다 — 이 값들은 실제로 측정된 결과다.
- `benchmark.html`은 `Article` schema.org JSON-LD를 포함하고, `og:type`은 `article`로 한다.
- `benchmark.html`은 모든 페이지의 footer에 넣지 않는다 — footer는 About/문의/개인정보 전용으로 유지하고, `index.html`/`guide.html` 본문 링크로만 연결한다.
- 언어는 한국어, 이모지 사용 금지, UTF-8.

## 실측 데이터 (그대로 사용할 값)

**사진형 이미지** (원본 PNG 1,808,456 B ≈ 1.72 MB):
- JPG: 100%→787,571 B(769 KB) / 80%→115,393 B(113 KB) / 60%→54,859 B(53.6 KB) / 40%→29,345 B(28.7 KB) / 20%→11,638 B(11.4 KB)
- WebP: 100%→1,019,768 B(996 KB) / 80%→123,720 B(121 KB) / 60%→39,472 B(38.5 KB) / 40%→14,514 B(14.2 KB) / 20%→7,114 B(6.9 KB)
- PNG: 100/50/10% 전부 1,808,456 B로 동일(변화 없음)

**그래픽형 이미지** (원본 PNG 22,791 B ≈ 22.3 KB):
- JPG: 100%→35,171 B(34.3 KB, 원본보다 큼) / 80%→18,709 B(18.3 KB) / 60%→16,544 B(16.2 KB) / 40%→14,908 B(14.6 KB) / 20%→13,105 B(12.8 KB)
- WebP: 100%→6,010 B(5.9 KB) / 80%→3,702 B(3.6 KB) / 60%→3,670 B(3.6 KB) / 40%→3,662 B(3.6 KB) / 20%→3,972 B(3.9 KB)
- PNG: 100/50% 전부 22,791 B로 동일(변화 없음)

---

## Task 1: 통합 검증 테스트 확장 (실패 확인)

**Files:**
- Modify: `tests/seoPagesIntegrity.test.js` (파일 끝에 이어서 작성 — 기존 테스트는 건드리지 않는다)

**Interfaces:**
- Consumes: 기존 `test`, `readRepoFile`, `extractJsonLdBlocks` 헬퍼 함수(파일 상단에 이미 정의됨, 재사용)
- Produces: `node tests/seoPagesIntegrity.test.js` 실행 시 신규 검증 항목이 실패로 나오는 RED 상태 확인

- [ ] **Step 1: 테스트 파일 끝에 아래 코드를 추가**

```javascript

test('benchmark.html exists and has required <head> tags', function () {
  const html = readRepoFile('benchmark.html');
  assert.ok(/<title>[^<]+<\/title>/.test(html), 'missing <title>');
  assert.ok(html.includes('rel="canonical"'), 'missing canonical link');
  assert.ok(html.includes('property="og:title"'), 'missing og:title');
});

test('benchmark.html has valid Article JSON-LD', function () {
  const html = readRepoFile('benchmark.html');
  const types = extractJsonLdBlocks(html).map(function (b) { return b['@type']; });
  assert.ok(types.includes('Article'), 'missing Article block');
});

test('benchmark.html links back to index.html', function () {
  const html = readRepoFile('benchmark.html');
  assert.ok(html.includes('href="index.html"'), 'benchmark.html missing link to index.html');
});

test('benchmark.html contains the measured photo-image byte values', function () {
  const html = readRepoFile('benchmark.html');
  assert.ok(html.includes('1,808,456'), 'missing original photo-image size');
  assert.ok(html.includes('787,571'), 'missing JPG 100% photo result');
  assert.ok(html.includes('115,393'), 'missing JPG 80% photo result');
});

test('benchmark.html contains the measured graphic-image byte values', function () {
  const html = readRepoFile('benchmark.html');
  assert.ok(html.includes('22,791'), 'missing original graphic-image size');
  assert.ok(html.includes('35,171'), 'missing JPG 100% graphic result (larger than original)');
  assert.ok(html.includes('6,010'), 'missing WebP 100% graphic result');
});

test('index.html links to benchmark.html', function () {
  const html = readRepoFile('index.html');
  assert.ok(html.includes('href="benchmark.html"'), 'index.html missing link to benchmark.html');
});

test('guide.html links to benchmark.html', function () {
  const html = readRepoFile('guide.html');
  assert.ok(html.includes('href="benchmark.html"'), 'guide.html missing link to benchmark.html');
});

test('sitemap.xml includes benchmark.html', function () {
  const xml = readRepoFile('sitemap.xml');
  assert.ok(xml.includes('/image-toolbox/benchmark.html'), 'sitemap.xml missing benchmark.html');
});
```

- [ ] **Step 2: 실행해서 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 기존 39개 테스트는 그대로 PASS. 새로 추가한 8개 테스트는 전부 FAIL(`benchmark.html`이 아직 없어서 ENOENT, 나머지 페이지들에 아직 링크가 없어서 실패). `process.exitCode`가 1로 설정됨.

- [ ] **Step 3: 커밋**

```bash
git add tests/seoPagesIntegrity.test.js
git commit -m "test: add integrity checks for compression benchmark page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: `benchmark.html` 작성

**Files:**
- Create: `benchmark.html`

**Interfaces:**
- Consumes: `css/style.css`의 `.container`/`.subtitle`/`.tool-nav`/`.info-section`/`.btn`/`.site-footer` 클래스, `css/style.css`의 `--color-border` CSS 변수(표 테두리에 인라인으로 사용)
- Produces: Task 1의 `benchmark.html` 관련 테스트 4건이 통과하게 될 파일

- [ ] **Step 1: 파일 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <title>이미지 압축, 실제로 얼마나 줄어들까 - 실측 데이터</title>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3608292673018037"
     crossorigin="anonymous"></script>
  <meta name="description" content="합성 테스트 이미지로 JPG·PNG·WebP 압축률을 직접 측정한 결과입니다. 품질 설정별 실제 파일 크기 변화를 확인하세요.">
  <link rel="canonical" href="https://nwb010118.github.io/image-toolbox/benchmark.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="이미지 압축, 실제로 얼마나 줄어들까 - 실측 데이터">
  <meta property="og:description" content="합성 테스트 이미지로 JPG·PNG·WebP 압축률을 직접 측정한 결과입니다.">
  <meta property="og:url" content="https://nwb010118.github.io/image-toolbox/benchmark.html">
  <meta property="og:locale" content="ko_KR">
  <link rel="stylesheet" href="css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "이미지 압축, 실제로 얼마나 줄어들까 - 실측 데이터",
    "url": "https://nwb010118.github.io/image-toolbox/benchmark.html",
    "description": "합성 테스트 이미지로 JPG·PNG·WebP 압축률을 직접 측정한 결과입니다.",
    "inLanguage": "ko",
    "datePublished": "2026-09-09"
  }
  </script>
</head>
<body>
  <main class="container">
    <h1>이미지 압축, 실제로 얼마나 줄어들까</h1>
    <p class="subtitle">막연한 설명 대신, 실제로 압축 도구를 돌려서 얻은 숫자입니다.</p>
    <p class="tool-nav"><a href="index.html">← 이미지 압축 도구</a></p>

    <section class="info-section">
      <h2>왜 이 페이지를 만들었나요</h2>
      <p>"압축하면 용량이 줄어듭니다"라는 설명은 흔하지만, 실제로 얼마나 줄어드는지 숫자로 보여주는 곳은 드뭅니다. 이 페이지는 image-toolbox의 압축 도구를 실제로 돌려서 측정한 결과를 그대로 정리한 것입니다.</p>
    </section>

    <section class="info-section">
      <h2>테스트 방법</h2>
      <p>저작권 문제가 없고 언제든 재현 가능하도록, 실제 사진 대신 브라우저에서 직접 그린 합성 테스트 이미지 2종을 사용했습니다.</p>
      <p><strong>사진형 이미지</strong> — 그라디언트와 노이즈로 만든, 실제 사진과 비슷한 고디테일 이미지(1200×800).</p>
      <p><strong>그래픽형 이미지</strong> — 단색 블록과 얇은 선으로 만든 UI 스크린샷 스타일 이미지(1200×800).</p>
      <p>각 이미지를 image-toolbox의 압축 도구로 품질 100/80/60/40/20%에서 JPG·WebP로 변환하고, PNG는 품질 설정과 무관하게 크기가 그대로인지도 함께 측정했습니다. 표에 적힌 숫자는 화면에 표시되는 반올림된 문구가 아니라, 실제로 생성된 파일의 정확한 바이트 수입니다.</p>
    </section>

    <section class="info-section">
      <h2>사진형 이미지 결과</h2>
      <p>원본(PNG): 1,808,456 바이트(약 1.72 MB)</p>
      <table style="width:100%; border-collapse:collapse; margin:12px 0;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px; border-bottom:1px solid var(--color-border);">품질</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid var(--color-border);">JPG</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid var(--color-border);">WebP</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">100%</td>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">787,571 B (769 KB)</td>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">1,019,768 B (996 KB)</td>
          </tr>
          <tr>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">80%</td>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">115,393 B (113 KB)</td>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">123,720 B (121 KB)</td>
          </tr>
          <tr>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">60%</td>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">54,859 B (53.6 KB)</td>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">39,472 B (38.5 KB)</td>
          </tr>
          <tr>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">40%</td>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">29,345 B (28.7 KB)</td>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">14,514 B (14.2 KB)</td>
          </tr>
          <tr>
            <td style="padding:8px;">20%</td>
            <td style="padding:8px;">11,638 B (11.4 KB)</td>
            <td style="padding:8px;">7,114 B (6.9 KB)</td>
          </tr>
        </tbody>
      </table>
      <p>PNG는 품질 100/50/10% 전부 1,808,456 바이트로 완전히 동일했습니다 — 이론이 아니라 실측으로도 품질 슬라이더가 PNG에는 영향을 주지 않는다는 것이 확인됩니다. 80% 품질의 JPG는 원본 대비 93.6% 용량이 줄었습니다.</p>
    </section>

    <section class="info-section">
      <h2>그래픽형 이미지 결과</h2>
      <p>원본(PNG): 22,791 바이트(약 22.3 KB)</p>
      <table style="width:100%; border-collapse:collapse; margin:12px 0;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px; border-bottom:1px solid var(--color-border);">품질</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid var(--color-border);">JPG</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid var(--color-border);">WebP</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">100%</td>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">35,171 B (34.3 KB)</td>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">6,010 B (5.9 KB)</td>
          </tr>
          <tr>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">80%</td>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">18,709 B (18.3 KB)</td>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">3,702 B (3.6 KB)</td>
          </tr>
          <tr>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">60%</td>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">16,544 B (16.2 KB)</td>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">3,670 B (3.6 KB)</td>
          </tr>
          <tr>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">40%</td>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">14,908 B (14.6 KB)</td>
            <td style="padding:8px; border-bottom:1px solid var(--color-border);">3,662 B (3.6 KB)</td>
          </tr>
          <tr>
            <td style="padding:8px;">20%</td>
            <td style="padding:8px;">13,105 B (12.8 KB)</td>
            <td style="padding:8px;">3,972 B (3.9 KB)</td>
          </tr>
        </tbody>
      </table>
      <p>가장 눈에 띄는 결과는 <strong>JPG 100% 품질이 원본 PNG(22.3 KB)보다 오히려 큰 34.3 KB로 나왔다는 점</strong>입니다. 단색과 선명한 경계가 많은 그래픽 콘텐츠에는 JPG의 압축 방식 자체가 맞지 않기 때문입니다. 반대로 WebP는 100% 품질에서도 원본보다 73.6% 작은 5.9 KB로 나왔습니다 — 그래픽·스크린샷 이미지에는 PNG보다 WebP가 유리하다는 것을 실측으로 확인할 수 있습니다.</p>
    </section>

    <section class="info-section">
      <h2>실측 기반 권장 설정</h2>
      <p><strong>사진이라면</strong> JPG나 WebP로 80% 품질 정도가 합리적인 시작점입니다. 90% 이상 용량이 줄어들면서도 품질 저하는 상대적으로 적은 구간입니다.</p>
      <p><strong>스크린샷·그래픽·로고라면</strong> JPG로 바꾸는 건 오히려 손해일 수 있습니다. 투명 배경이 필요 없다면 WebP가 PNG보다 훨씬 작습니다. 다만 WebP도 완전한 무손실 압축은 아니므로, 픽셀 단위 정확도가 중요한 경우에는 PNG를 유지하는 것이 안전합니다.</p>
      <p><a class="btn" href="index.html">지금 내 사진으로 직접 압축해보기 →</a></p>
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
Expected: `benchmark.html` 관련 4개 테스트(head 태그, Article JSON-LD, index.html 링크, 사진형/그래픽형 수치 포함) PASS. `index.html`/`guide.html`/`sitemap.xml` 관련 테스트는 여전히 FAIL(정상 — Task 3 전).

- [ ] **Step 3: 브라우저로 수동 확인**

`benchmark.html`을 열어 표 2개가 깨지지 않고 나오는지, "지금 내 사진으로 직접 압축해보기" 버튼이 `index.html`로 이동하는지 확인한다.

- [ ] **Step 4: 커밋**

```bash
git add benchmark.html
git commit -m "Add compression benchmark page with real measured data

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: `index.html`/`guide.html`/`sitemap.xml`에 연결

**Files:**
- Modify: `index.html:164` (`<h2>압축은 어떻게 동작하나요</h2>` 다음)
- Modify: `guide.html:40` (1번 섹션 문단 교체)
- Modify: `sitemap.xml:33` (`</urlset>` 앞)

**Interfaces:**
- Consumes: Task 2에서 만든 `benchmark.html`
- Produces: Task 1 테스트의 나머지 전부가 통과 — 전체 스위트 GREEN

- [ ] **Step 1: `index.html`에 링크 추가**

`index.html`의 164번째 줄(`<h2>압축은 어떻게 동작하나요</h2>`) 바로 다음 줄에 아래 한 줄을 추가한다:

```html
      <h2>압축은 어떻게 동작하나요</h2>
      <p class="tool-nav"><a href="benchmark.html">실제 압축률 비교 결과 보기 →</a></p>
```

- [ ] **Step 2: `guide.html`의 1번 섹션 문단 교체**

`guide.html`의 40번째 줄을 아래로 교체한다:

기존:
```html
      <p>웹사이트에 이미지를 그대로 올리면 페이지 로딩이 느려지고, 이는 방문자 이탈뿐 아니라 검색엔진 SEO 순위에도 불리하게 작용합니다. 이메일에 사진을 첨부할 때 용량 제한에 걸리는 경우, 클라우드 저장공간을 아끼고 싶은 경우에도 압축이 필요합니다. <a href="index.html">이미지 압축 도구</a>에서 품질과 가로세로 크기를 조절해 용량을 줄일 수 있습니다.</p>
```

변경:
```html
      <p>웹사이트에 이미지를 그대로 올리면 페이지 로딩이 느려지고, 이는 방문자 이탈뿐 아니라 검색엔진 SEO 순위에도 불리하게 작용합니다. 이메일에 사진을 첨부할 때 용량 제한에 걸리는 경우, 클라우드 저장공간을 아끼고 싶은 경우에도 압축이 필요합니다. <a href="index.html">이미지 압축 도구</a>에서 품질과 가로세로 크기를 조절해 용량을 줄일 수 있습니다. 실제로 얼마나 줄어드는지는 <a href="benchmark.html">실측 압축률 비교</a>에서 확인할 수 있습니다.</p>
```

- [ ] **Step 3: `sitemap.xml`에 URL 추가**

`sitemap.xml`의 `</urlset>` 태그(33번째 줄) 바로 앞에 아래 블록을 추가한다:

```xml
  <url>
    <loc>https://nwb010118.github.io/image-toolbox/benchmark.html</loc>
  </url>
```

- [ ] **Step 4: 전체 테스트 실행 — 전부 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS(기존 39개 + 신규 8개 = 47개), `process.exitCode`가 설정되지 않음(0).

- [ ] **Step 5: 브라우저로 최종 확인**

`index.html`과 `guide.html`에서 새로 추가된 링크가 `benchmark.html`로 정확히 이동하는지 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add index.html guide.html sitemap.xml
git commit -m "Wire compression benchmark page into index.html, guide.html, sitemap.xml

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: 배포

- [ ] **Step 1: 원격 저장소로 푸시**

```bash
git push origin master:main
```

- [ ] **Step 2: 배포 확인**

몇 분 뒤 `benchmark.html`이 실제로 열리는지, 표가 정상적으로 보이는지 확인한다.

- [ ] **Step 3: 다음 단계**

AdSense 반려 대응 계획의 4단계(정보성 가이드 글 10~20개)로 이어간다.
