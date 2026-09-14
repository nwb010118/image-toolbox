# 가이드 글 이미지 추가 2차 배치(5개) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 가이드 글 5개(`web-image-loading-speed.html`, `cloud-storage-photo-tips.html`, `pdf-file-size-reduction.html`, `sns-blog-image-size.html`, `favicon-og-image-size.html`)에 실제 이미지(SVG 차트/다이어그램 3개, 실제 도구 스크린샷 2장)를 추가한다.

**Architecture:** 신규 페이지 없음, 기존 5개 HTML 파일에 `<figure class="guide-image">` 블록을 삽입한다. CSS는 1차 배치(`css/style.css`의 `.guide-image` 계열 클래스, 커밋 `32c5374`)를 그대로 재사용하며 이번 라운드에서 수정하지 않는다. 스크린샷 2장(`images/tool-pdf-extract.png`, `images/tool-resize-1080x1080.png`)은 오케스트레이터가 이미 Pre-step에서 Playwright로 캡처해 `master`에 커밋 완료했다(커밋 `8df2dc7`) — 실제 픽셀 크기까지 확정됨(`tool-pdf-extract.png`=346×165, `tool-resize-1080x1080.png`=768×341).

**Tech Stack:** 순수 정적 HTML/CSS, 인라인 SVG(외부 라이브러리 없음), Node 무프레임워크 테스트(`tests/seoPagesIntegrity.test.js`에 이어서 추가).

## Global Constraints

- 이번 라운드는 `css/style.css`를 수정하지 않는다 — `.guide-image`/`.guide-image img`/`.guide-image svg`/`.guide-image figcaption`은 1차 배치에서 이미 존재한다.
- 모든 `<img>` 태그는 `alt`(비어있지 않음), `width`, `height`, `loading="lazy"`, `decoding="async"`를 전부 갖춰야 한다. 정확한 값: `images/tool-pdf-extract.png`는 `width="346" height="165"`, `images/tool-resize-1080x1080.png`는 `width="768" height="341"`(둘 다 오케스트레이터가 실제 파일에서 측정한 값, 임의 추정치 아님).
- 인라인 SVG의 색상은 `var(--color-accent)`/`var(--color-accent-dark)`/`var(--color-accent-soft)`/`var(--color-border)`/`var(--color-text)`/`var(--color-text-secondary)`로 참조한다. 단, `web-image-loading-speed.html`의 LCP 신호등 차트만 예외로 구글 Lighthouse/PageSpeed Insights의 실제 신호등 색(`#0cce6b`/`#ffa400`/`#ff4e42`)을 하드코딩한다(업계 표준 관례를 따르기 위한 의도적 예외, 설계 문서에 명시됨).
- 텍스트가 있는 모든 SVG `<text>`는 `text-anchor`를 명시하고, viewBox 오른쪽 경계에서 최소 4px 이상 여유를 둔다(1차 배치의 라벨 클리핑 사고 재발 방지).
- 차트 테스트는 본문에 이미 있는 짧은 숫자만이 아니라, `<desc>`의 전체 문장(차트에만 있는 고유 문자열)을 검사한다.
- `image-toolbox`는 git 명령을 직접 실행해도 되는 문서화된 예외 저장소다. 커밋 메시지는 반드시 다음 trailer로 끝낸다: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- SDD 워크트리는 `git worktree add .worktrees/<plan-name> -b <plan-name> master` 수동 명령으로 만든다 (Agent `isolation` 파라미터 사용 금지).
- 서브에이전트는 자기에게 배정된 태스크 파일만 건드리고, 계획 문서 전체를 읽거나 다른 태스크를 미리 하지 않는다 — 1차 배치에서 한 서브에이전트가 한도 초과 직전 범위를 벗어나 이후 태스크 내용을 임의로 작성해뒀다가 전부 폐기된 전례가 있다.

---

## Task 1: `web-image-loading-speed.html`에 LCP 판정 구간 차트 삽입

**Files:**
- Modify: `web-image-loading-speed.html`
- Test: `tests/seoPagesIntegrity.test.js`

**Interfaces:**
- Consumes: `.guide-image` CSS(1차 배치, 이미 존재)
- 새로운 이미지 파일 없음(인라인 SVG)

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/seoPagesIntegrity.test.js` 끝에 추가:

```js
test('web-image-loading-speed.html has an inline LCP threshold chart', function () {
  const html = readRepoFile('web-image-loading-speed.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  assert.ok(/<svg[^>]*role="img"/.test(html), 'missing inline svg chart');
  assert.ok(html.includes('그림으로 보는 LCP 구간: 2.5초까지 좋음, 4.0초까지 개선 필요, 4.0초 초과는 나쁨'), 'missing unique chart desc sentence');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 위 테스트 FAIL, 다른 기존 테스트는 전부 PASS 유지

- [ ] **Step 3: HTML에 SVG 차트 삽입**

`web-image-loading-speed.html`에서:

```html
    <section class="info-section">
      <h2>LCP(Largest Contentful Paint)란</h2>
      <p>구글이 검색 순위에 반영하는 페이지 경험 지표인 Core Web Vitals 중 하나로, 페이지에서 가장 큰 콘텐츠 요소가 화면에 그려지기까지 걸리는 시간을 측정합니다. 기준은 <strong>2.5초 이하면 양호, 2.5~4.0초는 개선 필요, 4.0초를 초과하면 나쁨</strong>으로 평가됩니다.</p>
      <p>많은 웹페이지에서 가장 큰 콘텐츠 요소는 이미지입니다. 히어로 이미지, 대표 사진, 배경 이미지처럼 화면에서 넓은 면적을 차지하는 이미지가 LCP 요소로 측정되는 경우가 흔합니다.</p>
    </section>
```

를

```html
    <section class="info-section">
      <h2>LCP(Largest Contentful Paint)란</h2>
      <p>구글이 검색 순위에 반영하는 페이지 경험 지표인 Core Web Vitals 중 하나로, 페이지에서 가장 큰 콘텐츠 요소가 화면에 그려지기까지 걸리는 시간을 측정합니다. 기준은 <strong>2.5초 이하면 양호, 2.5~4.0초는 개선 필요, 4.0초를 초과하면 나쁨</strong>으로 평가됩니다.</p>
      <figure class="guide-image">
        <svg viewBox="0 0 400 150" role="img" aria-labelledby="lcpChartTitle lcpChartDesc" xmlns="http://www.w3.org/2000/svg">
          <title id="lcpChartTitle">Core Web Vitals LCP 판정 구간</title>
          <desc id="lcpChartDesc">그림으로 보는 LCP 구간: 2.5초까지 좋음, 4.0초까지 개선 필요, 4.0초 초과는 나쁨</desc>
          <rect x="20" y="50" width="180" height="40" fill="#0cce6b"></rect>
          <rect x="200" y="50" width="108" height="40" fill="#ffa400"></rect>
          <rect x="308" y="50" width="72" height="40" fill="#ff4e42"></rect>
          <text x="110" y="75" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="600" fill="#ffffff">좋음</text>
          <text x="254" y="75" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="600" fill="#ffffff">개선 필요</text>
          <text x="344" y="75" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="600" fill="#ffffff">나쁨</text>
          <line x1="200" y1="45" x2="200" y2="95" stroke="var(--color-text-secondary)" stroke-width="1"></line>
          <line x1="308" y1="45" x2="308" y2="95" stroke="var(--color-text-secondary)" stroke-width="1"></line>
          <text x="200" y="112" text-anchor="middle" font-size="12" fill="var(--color-text-secondary)">2.5초</text>
          <text x="308" y="112" text-anchor="middle" font-size="12" fill="var(--color-text-secondary)">4.0초</text>
        </svg>
        <figcaption>Core Web Vitals의 LCP 판정 구간 — 2.5초 이하는 좋음, 4.0초를 넘으면 나쁨으로 평가됩니다.</figcaption>
      </figure>
      <p>많은 웹페이지에서 가장 큰 콘텐츠 요소는 이미지입니다. 히어로 이미지, 대표 사진, 배경 이미지처럼 화면에서 넓은 면적을 차지하는 이미지가 LCP 요소로 측정되는 경우가 흔합니다.</p>
    </section>
```

로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, FAIL 0

- [ ] **Step 5: 커밋**

```bash
git add web-image-loading-speed.html tests/seoPagesIntegrity.test.js
git commit -m "$(cat <<'EOF'
Add inline LCP threshold chart to web-image-loading-speed.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `cloud-storage-photo-tips.html`에 클라우드 용량 막대차트 삽입

**Files:**
- Modify: `cloud-storage-photo-tips.html`
- Test: `tests/seoPagesIntegrity.test.js`

**Interfaces:**
- Consumes: `.guide-image` CSS(1차 배치, 이미 존재)
- 새로운 이미지 파일 없음(인라인 SVG)

- [ ] **Step 1: 실패하는 테스트 작성**

```js
test('cloud-storage-photo-tips.html has an inline storage capacity chart', function () {
  const html = readRepoFile('cloud-storage-photo-tips.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  assert.ok(/<svg[^>]*role="img"/.test(html), 'missing inline svg chart');
  assert.ok(html.includes('서비스별 무료 저장공간 막대그래프: 구글 드라이브 15기가바이트, 아이클라우드 5기가바이트, 원드라이브 5기가바이트, 네이버 마이박스 30기가바이트'), 'missing unique chart desc sentence');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 위 테스트 FAIL

- [ ] **Step 3: HTML에 SVG 차트 삽입**

`cloud-storage-photo-tips.html`에서:

```html
    <section class="info-section">
      <h2>서비스별 무료 저장공간</h2>
      <p><strong>구글 드라이브</strong> — 15GB(드라이브, Gmail, 구글 포토가 이 용량을 함께 씁니다).</p>
      <p><strong>아이클라우드</strong> — 5GB.</p>
      <p><strong>원드라이브</strong> — 5GB.</p>
      <p><strong>네이버 마이박스</strong> — 30GB.</p>
      <p>구글 드라이브는 드라이브 파일뿐 아니라 Gmail 첨부파일, 구글 포토에 저장한 원본 품질 사진까지 15GB를 함께 나눠 쓰기 때문에, 사진이 많이 쌓이면 다른 용도로 쓸 공간이 빠르게 줄어듭니다.</p>
    </section>
```

를

```html
    <section class="info-section">
      <h2>서비스별 무료 저장공간</h2>
      <p><strong>구글 드라이브</strong> — 15GB(드라이브, Gmail, 구글 포토가 이 용량을 함께 씁니다).</p>
      <p><strong>아이클라우드</strong> — 5GB.</p>
      <p><strong>원드라이브</strong> — 5GB.</p>
      <p><strong>네이버 마이박스</strong> — 30GB.</p>
      <p>구글 드라이브는 드라이브 파일뿐 아니라 Gmail 첨부파일, 구글 포토에 저장한 원본 품질 사진까지 15GB를 함께 나눠 쓰기 때문에, 사진이 많이 쌓이면 다른 용도로 쓸 공간이 빠르게 줄어듭니다.</p>
      <figure class="guide-image">
        <svg viewBox="0 0 460 220" role="img" aria-labelledby="cloudChartTitle cloudChartDesc" xmlns="http://www.w3.org/2000/svg">
          <title id="cloudChartTitle">클라우드 서비스별 무료 저장공간 비교</title>
          <desc id="cloudChartDesc">서비스별 무료 저장공간 막대그래프: 구글 드라이브 15기가바이트, 아이클라우드 5기가바이트, 원드라이브 5기가바이트, 네이버 마이박스 30기가바이트</desc>
          <line x1="20" y1="180" x2="440" y2="180" stroke="var(--color-border)" stroke-width="2"></line>
          <rect x="20" y="105" width="80" height="75" rx="4" fill="var(--color-accent)"></rect>
          <text x="60" y="97" text-anchor="middle" font-size="14" font-weight="600" fill="var(--color-text)">15GB</text>
          <text x="60" y="200" text-anchor="middle" font-size="12" fill="var(--color-text-secondary)">구글 드라이브</text>
          <rect x="130" y="155" width="80" height="25" rx="4" fill="var(--color-accent)"></rect>
          <text x="170" y="147" text-anchor="middle" font-size="14" font-weight="600" fill="var(--color-text)">5GB</text>
          <text x="170" y="200" text-anchor="middle" font-size="12" fill="var(--color-text-secondary)">아이클라우드</text>
          <rect x="240" y="155" width="80" height="25" rx="4" fill="var(--color-accent)"></rect>
          <text x="280" y="147" text-anchor="middle" font-size="14" font-weight="600" fill="var(--color-text)">5GB</text>
          <text x="280" y="200" text-anchor="middle" font-size="12" fill="var(--color-text-secondary)">원드라이브</text>
          <rect x="350" y="30" width="80" height="150" rx="4" fill="var(--color-accent)"></rect>
          <text x="390" y="22" text-anchor="middle" font-size="14" font-weight="600" fill="var(--color-text)">30GB</text>
          <text x="390" y="200" text-anchor="middle" font-size="12" fill="var(--color-text-secondary)">네이버 마이박스</text>
        </svg>
        <figcaption>서비스별 무료 저장공간 — 네이버 마이박스가 30GB로 가장 넉넉하고, 아이클라우드·원드라이브는 5GB로 가장 적습니다.</figcaption>
      </figure>
    </section>
```

로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, FAIL 0

- [ ] **Step 5: 커밋**

```bash
git add cloud-storage-photo-tips.html tests/seoPagesIntegrity.test.js
git commit -m "$(cat <<'EOF'
Add inline storage capacity chart to cloud-storage-photo-tips.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `pdf-file-size-reduction.html`에 실제 PDF→이미지 추출 결과 스크린샷 삽입

**Files:**
- Modify: `pdf-file-size-reduction.html`
- Test: `tests/seoPagesIntegrity.test.js`
- 의존: Pre-step에서 만든 `images/tool-pdf-extract.png`(346×165), `.guide-image` CSS(1차 배치)

**Interfaces:**
- Consumes: `images/tool-pdf-extract.png`(Pre-step 산출물, 실제 크기 346×165)

- [ ] **Step 1: 실패하는 테스트 작성**

```js
test('pdf-file-size-reduction.html has the real PDF-to-image extraction screenshot', function () {
  const html = readRepoFile('pdf-file-size-reduction.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  const imgMatch = html.match(/<img[^>]*src="images\/tool-pdf-extract\.png"[^>]*>/);
  assert.ok(imgMatch, 'missing tool-pdf-extract.png image tag');
  assert.ok(/alt="[^"]+"/.test(imgMatch[0]), 'image missing non-empty alt text');
  assert.ok(imgMatch[0].includes('width="346"'), 'missing correct width attribute');
  assert.ok(imgMatch[0].includes('height="165"'), 'missing correct height attribute');
  assert.ok(imgMatch[0].includes('loading="lazy"'), 'missing loading=lazy attribute');
  assert.ok(imgMatch[0].includes('decoding="async"'), 'missing decoding=async attribute');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});

test('images/tool-pdf-extract.png exists on disk', function () {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'images', 'tool-pdf-extract.png')), 'tool-pdf-extract.png missing from images/');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 첫 번째 신규 테스트 FAIL(이미지 파일 자체는 이미 존재하므로 두 번째 테스트는 PASS일 수 있음 — 정상)

- [ ] **Step 3: HTML에 이미지 삽입**

`pdf-file-size-reduction.html`에서:

```html
    <section class="info-section">
      <h2>우회 방법: 추출 → 압축 → 재합치기</h2>
      <p>1) <a href="pdf.html">PDF 변환 도구</a>에서 PDF를 페이지별 이미지로 추출합니다. 2) 추출된 이미지를 <a href="index.html">이미지 압축 도구</a>에서 품질을 조절해 압축합니다. 3) 압축된 이미지를 다시 <a href="photos-to-pdf.html">이미지→PDF</a>로 합칩니다. 이 과정을 거치면 PDF 안에 들어있던 이미지의 용량이 줄어든 만큼 전체 PDF 파일의 용량도 줄어듭니다.</p>
    </section>
```

를

```html
    <section class="info-section">
      <h2>우회 방법: 추출 → 압축 → 재합치기</h2>
      <p>1) <a href="pdf.html">PDF 변환 도구</a>에서 PDF를 페이지별 이미지로 추출합니다. 2) 추출된 이미지를 <a href="index.html">이미지 압축 도구</a>에서 품질을 조절해 압축합니다. 3) 압축된 이미지를 다시 <a href="photos-to-pdf.html">이미지→PDF</a>로 합칩니다. 이 과정을 거치면 PDF 안에 들어있던 이미지의 용량이 줄어든 만큼 전체 PDF 파일의 용량도 줄어듭니다.</p>
      <figure class="guide-image">
        <img src="images/tool-pdf-extract.png" alt="PDF 변환 도구에서 2페이지 PDF를 이미지로 추출한 실제 결과 화면 — 페이지 1과 페이지 2 썸네일과 개별 다운로드 버튼" width="346" height="165" loading="lazy" decoding="async">
        <figcaption>실제로 2페이지 PDF를 업로드해 이미지로 추출한 화면입니다. 이렇게 추출된 이미지를 압축한 뒤 다시 PDF로 합치면 전체 용량이 줄어듭니다.</figcaption>
      </figure>
    </section>
```

로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, FAIL 0

- [ ] **Step 5: 커밋**

```bash
git add pdf-file-size-reduction.html tests/seoPagesIntegrity.test.js
git commit -m "$(cat <<'EOF'
Add real PDF-to-image extraction screenshot to pdf-file-size-reduction.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

(참고: `images/tool-pdf-extract.png`는 이미 `master`에 커밋되어 있으므로(Pre-step, 커밋 `8df2dc7`) 위 `git add`에 다시 포함시켜도 변경 사항 없이 무해합니다.)

---

## Task 4: `sns-blog-image-size.html`에 실제 리사이즈 스크린샷(1080×1080) 삽입

**Files:**
- Modify: `sns-blog-image-size.html`
- Test: `tests/seoPagesIntegrity.test.js`
- 의존: Pre-step에서 만든 `images/tool-resize-1080x1080.png`(768×341), `.guide-image` CSS(1차 배치)

**Interfaces:**
- Consumes: `images/tool-resize-1080x1080.png`(Pre-step 산출물, 실제 크기 768×341)

- [ ] **Step 1: 실패하는 테스트 작성**

```js
test('sns-blog-image-size.html has the real 1080x1080 resize screenshot', function () {
  const html = readRepoFile('sns-blog-image-size.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  const imgMatch = html.match(/<img[^>]*src="images\/tool-resize-1080x1080\.png"[^>]*>/);
  assert.ok(imgMatch, 'missing tool-resize-1080x1080.png image tag');
  assert.ok(/alt="[^"]+"/.test(imgMatch[0]), 'image missing non-empty alt text');
  assert.ok(imgMatch[0].includes('width="768"'), 'missing correct width attribute');
  assert.ok(imgMatch[0].includes('height="341"'), 'missing correct height attribute');
  assert.ok(imgMatch[0].includes('loading="lazy"'), 'missing loading=lazy attribute');
  assert.ok(imgMatch[0].includes('decoding="async"'), 'missing decoding=async attribute');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});

test('images/tool-resize-1080x1080.png exists on disk', function () {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'images', 'tool-resize-1080x1080.png')), 'tool-resize-1080x1080.png missing from images/');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 첫 번째 신규 테스트 FAIL

- [ ] **Step 3: HTML에 이미지 삽입**

`sns-blog-image-size.html`에서:

```html
    <section class="info-section">
      <h2>브라우저에서 규격에 맞게 크기 조정하는 법</h2>
      <p>스마트폰으로 찍은 사진은 대부분 4:3이나 1:1에 가까운 비율이라 인스타그램이 요구하는 4:5(피드)나 9:16(스토리) 비율과 그대로 맞아떨어지지 않는 경우가 많습니다. 이럴 때는 사진 편집 프로그램으로 원하는 비율에 맞게 먼저 잘라낸 다음, <a href="index.html">이미지 압축 도구</a>의 가로/세로 픽셀 입력란에 목표 규격(예: 1080 × 1350)을 직접 입력해 정확한 픽셀 크기로 맞추는 순서가 안전합니다. 이때 '비율 유지' 옵션을 꺼두어야 가로세로 값을 각각 원하는 숫자로 지정할 수 있습니다. 특히 스토리·릴스처럼 세로로 긴 화면은 기기에 따라 위아래 끝부분이 가려질 수 있으므로, 자르는 단계에서 글자나 얼굴 같은 중요한 내용은 화면 중앙에 가깝게 배치해두는 것이 좋습니다.</p>
    </section>
```

를

```html
    <section class="info-section">
      <h2>브라우저에서 규격에 맞게 크기 조정하는 법</h2>
      <p>스마트폰으로 찍은 사진은 대부분 4:3이나 1:1에 가까운 비율이라 인스타그램이 요구하는 4:5(피드)나 9:16(스토리) 비율과 그대로 맞아떨어지지 않는 경우가 많습니다. 이럴 때는 사진 편집 프로그램으로 원하는 비율에 맞게 먼저 잘라낸 다음, <a href="index.html">이미지 압축 도구</a>의 가로/세로 픽셀 입력란에 목표 규격(예: 1080 × 1350)을 직접 입력해 정확한 픽셀 크기로 맞추는 순서가 안전합니다. 이때 '비율 유지' 옵션을 꺼두어야 가로세로 값을 각각 원하는 숫자로 지정할 수 있습니다. 특히 스토리·릴스처럼 세로로 긴 화면은 기기에 따라 위아래 끝부분이 가려질 수 있으므로, 자르는 단계에서 글자나 얼굴 같은 중요한 내용은 화면 중앙에 가깝게 배치해두는 것이 좋습니다.</p>
      <figure class="guide-image">
        <img src="images/tool-resize-1080x1080.png" alt="이미지 압축 도구에서 가로 1080, 세로 1080 픽셀을 입력하고 비율 유지를 끈 화면" width="768" height="341" loading="lazy" decoding="async">
        <figcaption>인스타그램 정사각형 게시물 규격인 1080 × 1080을 직접 입력한 예시입니다. 다른 규격도 같은 방식으로 입력하면 됩니다.</figcaption>
      </figure>
    </section>
```

로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, FAIL 0

- [ ] **Step 5: 커밋**

```bash
git add sns-blog-image-size.html tests/seoPagesIntegrity.test.js
git commit -m "$(cat <<'EOF'
Add real 1080x1080 resize screenshot to sns-blog-image-size.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

(참고: `images/tool-resize-1080x1080.png`는 이미 `master`에 커밋되어 있으므로(Pre-step, 커밋 `8df2dc7`) 위 `git add`에 다시 포함시켜도 변경 사항 없이 무해합니다.)

---

## Task 5: `favicon-og-image-size.html`에 3단 비율 비교 다이어그램 삽입

**Files:**
- Modify: `favicon-og-image-size.html`
- Test: `tests/seoPagesIntegrity.test.js`

**Interfaces:**
- Consumes: `.guide-image` CSS(1차 배치, 이미 존재)
- 새로운 이미지 파일 없음(인라인 SVG)

- [ ] **Step 1: 실패하는 테스트 작성**

```js
test('favicon-og-image-size.html has the 3-panel proportion diagram', function () {
  const html = readRepoFile('favicon-og-image-size.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  assert.ok(/<svg[^>]*role="img"/.test(html), 'missing inline svg diagram');
  assert.ok(html.includes('실제 픽셀 크기 비교 다이어그램: 파비콘 16·32·48픽셀, 앱 아이콘 180·192·512픽셀, OG 이미지 1200×630픽셀. 각 그룹 내부는 실제 비율 그대로이며 그룹 간 배율은 다릅니다.'), 'missing unique diagram desc sentence');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 위 테스트 FAIL

- [ ] **Step 3: HTML에 SVG 다이어그램 삽입**

`favicon-og-image-size.html`에서:

```html
    <section class="info-section">
      <h2>브라우저에서 각 크기 만드는 법</h2>
      <p><a href="index.html">이미지 압축 도구</a>의 가로/세로 픽셀 입력란에 원하는 규격을 직접 입력해 필요한 크기로 만들 수 있습니다. 파비콘처럼 여러 크기가 필요하다면 원본 하나를 준비해두고 필요한 크기(16, 32, 48, 180, 192, 512px 등)마다 각각 리사이즈하면 됩니다. og:image는 사진 편집 프로그램으로 1200×630px 비율에 맞춰 미리 크롭한 뒤, 이 사이트의 도구로 정확한 픽셀 크기로 조정하는 것을 권장합니다.</p>
    </section>
```

를

```html
    <section class="info-section">
      <h2>브라우저에서 각 크기 만드는 법</h2>
      <p><a href="index.html">이미지 압축 도구</a>의 가로/세로 픽셀 입력란에 원하는 규격을 직접 입력해 필요한 크기로 만들 수 있습니다. 파비콘처럼 여러 크기가 필요하다면 원본 하나를 준비해두고 필요한 크기(16, 32, 48, 180, 192, 512px 등)마다 각각 리사이즈하면 됩니다. og:image는 사진 편집 프로그램으로 1200×630px 비율에 맞춰 미리 크롭한 뒤, 이 사이트의 도구로 정확한 픽셀 크기로 조정하는 것을 권장합니다.</p>
      <figure class="guide-image">
        <svg viewBox="0 0 460 560" role="img" aria-labelledby="faviconChartTitle faviconChartDesc" xmlns="http://www.w3.org/2000/svg">
          <title id="faviconChartTitle">파비콘·앱 아이콘·OG 이미지 크기 비율 비교</title>
          <desc id="faviconChartDesc">실제 픽셀 크기 비교 다이어그램: 파비콘 16·32·48픽셀, 앱 아이콘 180·192·512픽셀, OG 이미지 1200×630픽셀. 각 그룹 내부는 실제 비율 그대로이며 그룹 간 배율은 다릅니다.</desc>

          <text x="20" y="20" font-size="15" font-weight="600" fill="var(--color-text)">파비콘 (16 / 32 / 48px)</text>
          <line x1="20" y1="140" x2="440" y2="140" stroke="var(--color-border)" stroke-width="1"></line>
          <rect x="40" y="108" width="32" height="32" fill="var(--color-accent-soft)" stroke="var(--color-accent)" stroke-width="2"></rect>
          <text x="56" y="155" text-anchor="middle" font-size="12" fill="var(--color-text-secondary)">16px</text>
          <rect x="110" y="76" width="64" height="64" fill="var(--color-accent-soft)" stroke="var(--color-accent)" stroke-width="2"></rect>
          <text x="142" y="155" text-anchor="middle" font-size="12" fill="var(--color-text-secondary)">32px</text>
          <rect x="210" y="44" width="96" height="96" fill="var(--color-accent-soft)" stroke="var(--color-accent)" stroke-width="2"></rect>
          <text x="258" y="155" text-anchor="middle" font-size="12" fill="var(--color-text-secondary)">48px</text>

          <text x="20" y="200" font-size="15" font-weight="600" fill="var(--color-text)">앱 아이콘 (180 / 192 / 512px)</text>
          <line x1="20" y1="350" x2="440" y2="350" stroke="var(--color-border)" stroke-width="1"></line>
          <rect x="40" y="300" width="50" height="50" fill="var(--color-accent-soft)" stroke="var(--color-accent)" stroke-width="2"></rect>
          <text x="65" y="365" text-anchor="middle" font-size="12" fill="var(--color-text-secondary)">180px</text>
          <rect x="120" y="296" width="54" height="54" fill="var(--color-accent-soft)" stroke="var(--color-accent)" stroke-width="2"></rect>
          <text x="147" y="365" text-anchor="middle" font-size="12" fill="var(--color-text-secondary)">192px</text>
          <rect x="210" y="207" width="143" height="143" fill="var(--color-accent-soft)" stroke="var(--color-accent)" stroke-width="2"></rect>
          <text x="281" y="365" text-anchor="middle" font-size="12" fill="var(--color-text-secondary)">512px</text>

          <text x="20" y="410" font-size="15" font-weight="600" fill="var(--color-text)">OG 이미지 (1200 × 630px, 1.91:1)</text>
          <rect x="40" y="420" width="180" height="95" fill="var(--color-accent-soft)" stroke="var(--color-accent)" stroke-width="2"></rect>
          <text x="130" y="535" text-anchor="middle" font-size="12" fill="var(--color-text-secondary)">1200 × 630px</text>
        </svg>
        <figcaption>파비콘·앱 아이콘·OG 이미지의 실제 픽셀 크기를 그룹별로 정확한 비율로 비교했습니다(그룹 간 배율은 서로 다릅니다).</figcaption>
      </figure>
    </section>
```

로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, FAIL 0

- [ ] **Step 5: 커밋**

```bash
git add favicon-og-image-size.html tests/seoPagesIntegrity.test.js
git commit -m "$(cat <<'EOF'
Add 3-panel proportion diagram to favicon-og-image-size.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## 최종 브랜치 리뷰 시 특별히 확인할 항목

- 서브에이전트 커밋이 `Co-Authored-By: Claude Sonnet 5`로 정확히 기록됐는지 태스크마다 `git log -1 --format='%B'`로 직접 확인.
- 어떤 서브에이전트도 자신에게 배정된 태스크 범위를 벗어나지 않았는지(1차 배치 사고 재발 방지) — 각 태스크 커밋의 `git show --stat`가 브리프에 명시된 파일만 건드렸는지 확인.
- 모든 `<img>`에 `width`/`height`/`loading="lazy"`/`decoding="async"`가 실제 파일 크기와 정확히 일치하는 값으로 들어있는지.
- 인라인 SVG 색상이 `var(--color-*)`를 쓰는지(LCP 차트의 신호등 색 예외 제외).
- SVG `<text>` 라벨이 viewBox 밖으로 잘리지 않는지 — 특히 Task 5의 3단 다이어그램처럼 라벨이 많은 SVG는 육안으로 실제 렌더링을 확인할 것(1차 배치의 클리핑 사고 재발 방지).
- 차트 5개(LCP, 클라우드, 파비콘/OG)의 숫자가 각 파일 본문 및 공식 기준과 셀 단위로 일치하는지.
- `images/` 디렉터리의 `tool-pdf-extract.png`/`tool-resize-1080x1080.png`가 실제로 이 사이트 도구를 실행한 진짜 결과인지(육안 확인 — 이미 오케스트레이터가 캡처 시 확인했지만 재검증 권장).
