# 가이드 글 이미지 추가 3차 배치(6개) + 1차 배치 기술 부채 정리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마지막 6개 가이드 글(`iphone-heic-photo-guide.html`, `monitor-resolution-wallpaper-size.html`, `youtube-thumbnail-size.html`, `old-photo-scan-digitize-workflow.html`, `print-resolution-dpi-guide.html`, `pdf-merge-multiple-files.html`)에 이미지를 추가하고, 1차 배치의 기술 부채(이미지 속성 누락, SVG 색상 하드코딩)를 정리해 16개 글 전체의 이미지 작업을 완료한다.

**Architecture:** 신규 페이지 없음. 6개 기존 HTML 파일에 `<figure class="guide-image">` 블록을 삽입하고, 1차 배치 5개 파일(이미지 3개 + SVG 2개)을 수정한다. CSS는 수정하지 않는다 — `.guide-image` 계열 클래스는 1차 배치에서 정의됐고, 이후 사이트 리디자인 커밋(`1ad818e`)이 `css/site.css`에서 `height: auto` 등 보완만 추가했을 뿐 그대로 유지된다. 스크린샷 4장(`images/tool-empty-upload.png`, `images/tool-upscale-disabled-options.png`, `images/tool-sepia-upscale-before-after.png`, `images/tool-pdf-multi-file-select.png`)은 오케스트레이터가 이미 Pre-step에서 Playwright로 실제 배포 사이트(리디자인 이후 버전)를 조작해 캡처하고 `master`에 커밋 완료했다(커밋 `855c310`) — 실제 픽셀 크기 확정됨.

**Tech Stack:** 순수 정적 HTML/CSS, 인라인 SVG(외부 라이브러리 없음), Node 무프레임워크 테스트(`tests/seoPagesIntegrity.test.js`에 이어서 추가).

## Global Constraints

- 이번 라운드는 `css/style.css`·`css/site.css`를 수정하지 않는다.
- 모든 신규 `<img>` 태그는 `alt`(비어있지 않음), `width`, `height`, `loading="lazy"`, `decoding="async"`를 전부 갖춰야 한다. 정확한 값(오케스트레이터 실측): `images/tool-empty-upload.png`=564×348, `images/tool-upscale-disabled-options.png`=858×350, `images/tool-sepia-upscale-before-after.png`=858×443, `images/tool-pdf-multi-file-select.png`=858×639.
- 1차 배치 기술 부채 정리 대상 이미지의 정확한 실측 크기: `images/tool-quality-slider.png`=768×341, `images/tool-resize-413x531.png`=768×341, `images/upscale-before-after.png`=768×428.
- 모든 신규 인라인 SVG 색상은 `var(--color-accent)`/`var(--color-accent-dark)`/`var(--color-accent-soft)`/`var(--color-border)`/`var(--color-text)`/`var(--color-text-secondary)`로 참조한다(하드코딩 hex 금지 — 1차 배치 실수 반복 방지).
- 텍스트가 있는 모든 SVG `<text>`는 `text-anchor`를 명시하고, viewBox 경계에서 최소 6px 이상 여유를 둔다(1·2차 배치의 클리핑/근접 사고 재발 방지 — 아래 각 Task의 좌표는 이미 이 여유를 두고 계산됨).
- `image-toolbox`는 git 명령 직접 실행 가능한 예외 저장소. 커밋 메시지는 반드시 `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`로 끝난다.
- SDD 워크트리는 `git worktree add .worktrees/<plan-name> -b <plan-name> master` 수동 명령으로 만든다(Agent `isolation` 파라미터 사용 금지).
- 서브에이전트는 자기에게 배정된 태스크 파일만 건드리고, 계획 문서 전체를 읽거나 다른 태스크를 미리 하지 않는다.
- **화면 반복 금지**: 이번 6개 신규 이미지는 전부 1·2차 배치와 다른 화면 상태를 쓴다(빈 업로드 영역, 비활성화 옵션, 다중 파일 목록, 세피아 합성 이미지, 신규 형태의 SVG). 어떤 태스크도 이미 배포된 이미지와 동일한 패널·문구 템플릿을 재사용하지 않는다.

---

## Task 1: `iphone-heic-photo-guide.html`에 빈 업로드 영역 스크린샷 삽입

**Files:**
- Modify: `iphone-heic-photo-guide.html`
- Test: `tests/seoPagesIntegrity.test.js`
- 의존: Pre-step에서 만든 `images/tool-empty-upload.png`(564×348)

**Interfaces:**
- Consumes: `images/tool-empty-upload.png`(Pre-step 산출물, 실제 크기 564×348), `.guide-image` CSS(1차 배치, 이미 존재)

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/seoPagesIntegrity.test.js` 끝에 추가:

```js
test('iphone-heic-photo-guide.html has the empty upload area screenshot', function () {
  const html = readRepoFile('iphone-heic-photo-guide.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  const imgMatch = html.match(/<img[^>]*src="images\/tool-empty-upload\.png"[^>]*>/);
  assert.ok(imgMatch, 'missing tool-empty-upload.png image tag');
  assert.ok(/alt="[^"]+"/.test(imgMatch[0]), 'image missing non-empty alt text');
  assert.ok(imgMatch[0].includes('width="564"'), 'missing correct width attribute');
  assert.ok(imgMatch[0].includes('height="348"'), 'missing correct height attribute');
  assert.ok(imgMatch[0].includes('loading="lazy"'), 'missing loading=lazy attribute');
  assert.ok(imgMatch[0].includes('decoding="async"'), 'missing decoding=async attribute');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});

test('images/tool-empty-upload.png exists on disk', function () {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'images', 'tool-empty-upload.png')), 'tool-empty-upload.png missing from images/');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 첫 번째 신규 테스트 FAIL

- [ ] **Step 3: HTML에 이미지 삽입**

`iphone-heic-photo-guide.html`에서:

```html
    <section class="info-section">
      <h2>HEIC가 뭐길래 안 열릴까</h2>
      <p>아이폰은 iOS 11부터 사진을 기본적으로 HEIC(고효율 이미지 포맷)로 저장합니다. 같은 화질에서 JPG보다 용량이 훨씬 작다는 장점이 있지만, 비교적 최신 형식이라 일부 구형 프로그램이나 안드로이드 기기, 웹사이트에서는 열리지 않을 수 있습니다.</p>
      <p>이 사이트의 <a href="index.html">이미지 압축 도구</a>도 마찬가지입니다. 업로드 창이 JPG, PNG, WebP 파일만 받도록 되어 있어서, HEIC 파일을 그대로 올리면 선택되지 않습니다. HEIC를 직접 변환해주는 기능은 이 사이트에 없습니다.</p>
    </section>
```

를

```html
    <section class="info-section">
      <h2>HEIC가 뭐길래 안 열릴까</h2>
      <p>아이폰은 iOS 11부터 사진을 기본적으로 HEIC(고효율 이미지 포맷)로 저장합니다. 같은 화질에서 JPG보다 용량이 훨씬 작다는 장점이 있지만, 비교적 최신 형식이라 일부 구형 프로그램이나 안드로이드 기기, 웹사이트에서는 열리지 않을 수 있습니다.</p>
      <p>이 사이트의 <a href="index.html">이미지 압축 도구</a>도 마찬가지입니다. 업로드 창이 JPG, PNG, WebP 파일만 받도록 되어 있어서, HEIC 파일을 그대로 올리면 선택되지 않습니다. HEIC를 직접 변환해주는 기능은 이 사이트에 없습니다.</p>
      <figure class="guide-image">
        <img src="images/tool-empty-upload.png" alt="이미지 압축 도구의 업로드 영역 — JPG, PNG, WebP 지원 문구가 보이는 화면" width="564" height="348" loading="lazy" decoding="async">
        <figcaption>이 도구의 업로드 창은 JPG, PNG, WebP만 받습니다 — HEIC 파일은 선택되지 않습니다.</figcaption>
      </figure>
    </section>
```

로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, FAIL 0

- [ ] **Step 5: 커밋**

```bash
git add iphone-heic-photo-guide.html tests/seoPagesIntegrity.test.js
git commit -m "$(cat <<'EOF'
Add empty upload area screenshot to iphone-heic-photo-guide.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

(참고: `images/tool-empty-upload.png`는 이미 `master`에 커밋되어 있으므로 위 `git add`에 다시 포함시켜도 변경 사항 없이 무해합니다.)

---

## Task 2: `monitor-resolution-wallpaper-size.html`에 비활성화 옵션 스크린샷 삽입

**Files:**
- Modify: `monitor-resolution-wallpaper-size.html`
- Test: `tests/seoPagesIntegrity.test.js`
- 의존: Pre-step에서 만든 `images/tool-upscale-disabled-options.png`(858×350)

**Interfaces:**
- Consumes: `images/tool-upscale-disabled-options.png`(Pre-step 산출물, 실제 크기 858×350)

- [ ] **Step 1: 실패하는 테스트 작성**

```js
test('monitor-resolution-wallpaper-size.html has the disabled-options screenshot', function () {
  const html = readRepoFile('monitor-resolution-wallpaper-size.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  const imgMatch = html.match(/<img[^>]*src="images\/tool-upscale-disabled-options\.png"[^>]*>/);
  assert.ok(imgMatch, 'missing tool-upscale-disabled-options.png image tag');
  assert.ok(/alt="[^"]+"/.test(imgMatch[0]), 'image missing non-empty alt text');
  assert.ok(imgMatch[0].includes('width="858"'), 'missing correct width attribute');
  assert.ok(imgMatch[0].includes('height="350"'), 'missing correct height attribute');
  assert.ok(imgMatch[0].includes('loading="lazy"'), 'missing loading=lazy attribute');
  assert.ok(imgMatch[0].includes('decoding="async"'), 'missing decoding=async attribute');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});

test('images/tool-upscale-disabled-options.png exists on disk', function () {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'images', 'tool-upscale-disabled-options.png')), 'tool-upscale-disabled-options.png missing from images/');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 첫 번째 신규 테스트 FAIL

- [ ] **Step 3: HTML에 이미지 삽입**

`monitor-resolution-wallpaper-size.html`에서:

```html
    <section class="info-section">
      <h2>원본 사진이 작다면 — AI 업스케일링이 될지 확인하기</h2>
      <p>이 사이트의 <a href="upscale.html">이미지 업스케일링</a> 도구는 원본 이미지가 가로세로 각각 1000px 이하일 때만 입력받습니다. 그리고 목표 해상도에 따라 확대 가능 여부가 갈립니다 — QHD(1440p 옵션, 목표 2560px)는 원본의 긴 변이 최소 640px 이상, 4K 옵션(목표 3840px)은 최소 960px 이상이어야 AI가 도달할 수 있습니다. 원본이 이보다 작으면 해당 해상도 옵션이 비활성화됩니다. 다만 정해진 배율인 2배·4배 확대는 원본 크기와 관계없이 항상 선택할 수 있습니다.</p>
      <p>AI 업스케일링은 있던 픽셀 패턴을 분석해 경계와 질감을 더 선명하게 만드는 것이지, 원본에 없던 정보를 되살리는 것은 아닙니다. 초점이 심하게 나간 사진은 확대해도 개선 폭이 작다는 점은 <a href="ai-upscaling-limits.html">이 글</a>에서 자세히 다룹니다.</p>
    </section>
```

를

```html
    <section class="info-section">
      <h2>원본 사진이 작다면 — AI 업스케일링이 될지 확인하기</h2>
      <p>이 사이트의 <a href="upscale.html">이미지 업스케일링</a> 도구는 원본 이미지가 가로세로 각각 1000px 이하일 때만 입력받습니다. 그리고 목표 해상도에 따라 확대 가능 여부가 갈립니다 — QHD(1440p 옵션, 목표 2560px)는 원본의 긴 변이 최소 640px 이상, 4K 옵션(목표 3840px)은 최소 960px 이상이어야 AI가 도달할 수 있습니다. 원본이 이보다 작으면 해당 해상도 옵션이 비활성화됩니다. 다만 정해진 배율인 2배·4배 확대는 원본 크기와 관계없이 항상 선택할 수 있습니다.</p>
      <figure class="guide-image">
        <img src="images/tool-upscale-disabled-options.png" alt="240x180 원본을 업로드했을 때 1440p와 4K 옵션이 비활성화되고 최소 크기 안내 문구가 표시된 화면" width="858" height="350" loading="lazy" decoding="async">
        <figcaption>원본이 작으면 도달 불가능한 해상도 옵션이 실제로 이렇게 비활성화됩니다.</figcaption>
      </figure>
      <p>AI 업스케일링은 있던 픽셀 패턴을 분석해 경계와 질감을 더 선명하게 만드는 것이지, 원본에 없던 정보를 되살리는 것은 아닙니다. 초점이 심하게 나간 사진은 확대해도 개선 폭이 작다는 점은 <a href="ai-upscaling-limits.html">이 글</a>에서 자세히 다룹니다.</p>
    </section>
```

로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, FAIL 0

- [ ] **Step 5: 커밋**

```bash
git add monitor-resolution-wallpaper-size.html tests/seoPagesIntegrity.test.js
git commit -m "$(cat <<'EOF'
Add disabled-options screenshot to monitor-resolution-wallpaper-size.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `youtube-thumbnail-size.html`에 업로드 용량 스펙 카드 삽입

**Files:**
- Modify: `youtube-thumbnail-size.html`
- Test: `tests/seoPagesIntegrity.test.js`

**Interfaces:**
- Consumes: `.guide-image` CSS(1차 배치, 이미 존재)
- 새로운 이미지 파일 없음(인라인 SVG)

- [ ] **Step 1: 실패하는 테스트 작성**

```js
test('youtube-thumbnail-size.html has the upload-limit spec cards', function () {
  const html = readRepoFile('youtube-thumbnail-size.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  assert.ok(/<svg[^>]*role="img"/.test(html), 'missing inline svg');
  assert.ok(html.includes('업로드 용량 한도: 모바일 2메가바이트, 데스크톱 50메가바이트'), 'missing unique chart desc sentence');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 위 테스트 FAIL

- [ ] **Step 3: HTML에 SVG 삽입**

`youtube-thumbnail-size.html`에서:

```html
    <section class="info-section">
      <h2>유튜브 공식 기준</h2>
      <p>유튜브 고객센터의 맞춤 썸네일 안내에 따르면, 동영상 썸네일의 권장 해상도는 <strong>3840×2160px</strong>이고 최소 너비는 640px입니다. 가로세로 비율은 <strong>16:9</strong>를 권장하며, 파일 형식은 <strong>JPG 또는 PNG</strong>입니다.</p>
      <p>파일 용량 제한은 업로드하는 기기에 따라 다릅니다 — <strong>모바일에서는 2MB</strong>, <strong>데스크톱에서는 50MB</strong>까지 허용됩니다.</p>
      <p>블로그나 커뮤니티에 "1280×720이 유튜브 썸네일 표준"이라고 알려진 경우가 많은데, 이는 예전에 널리 퍼진 수치이고 현재 유튜브 고객센터가 안내하는 권장 해상도는 3840×2160px입니다. 1280×720으로 만들어도 업로드는 되지만, 공식 권장 해상도에 맞추는 것이 더 안전합니다.</p>
    </section>
```

를

```html
    <section class="info-section">
      <h2>유튜브 공식 기준</h2>
      <p>유튜브 고객센터의 맞춤 썸네일 안내에 따르면, 동영상 썸네일의 권장 해상도는 <strong>3840×2160px</strong>이고 최소 너비는 640px입니다. 가로세로 비율은 <strong>16:9</strong>를 권장하며, 파일 형식은 <strong>JPG 또는 PNG</strong>입니다.</p>
      <p>파일 용량 제한은 업로드하는 기기에 따라 다릅니다 — <strong>모바일에서는 2MB</strong>, <strong>데스크톱에서는 50MB</strong>까지 허용됩니다.</p>
      <figure class="guide-image">
        <svg viewBox="0 0 400 200" role="img" aria-labelledby="uploadLimitTitle uploadLimitDesc" xmlns="http://www.w3.org/2000/svg">
          <title id="uploadLimitTitle">기기별 업로드 용량 한도</title>
          <desc id="uploadLimitDesc">업로드 용량 한도: 모바일 2메가바이트, 데스크톱 50메가바이트</desc>
          <rect x="30" y="20" width="160" height="150" rx="14" fill="var(--color-accent-soft)" stroke="var(--color-accent)" stroke-width="2"></rect>
          <text x="110" y="55" text-anchor="middle" font-size="14" font-weight="600" fill="var(--color-text)">모바일 업로드</text>
          <text x="110" y="110" text-anchor="middle" font-size="34" font-weight="700" fill="var(--color-accent)">2MB</text>
          <text x="110" y="140" text-anchor="middle" font-size="13" fill="var(--color-text-secondary)">까지</text>
          <rect x="210" y="20" width="160" height="150" rx="14" fill="var(--color-accent-soft)" stroke="var(--color-accent)" stroke-width="2"></rect>
          <text x="290" y="55" text-anchor="middle" font-size="14" font-weight="600" fill="var(--color-text)">데스크톱 업로드</text>
          <text x="290" y="110" text-anchor="middle" font-size="34" font-weight="700" fill="var(--color-accent)">50MB</text>
          <text x="290" y="140" text-anchor="middle" font-size="13" fill="var(--color-text-secondary)">까지</text>
        </svg>
        <figcaption>모바일에서는 2MB, 데스크톱에서는 50MB까지 업로드할 수 있습니다 — 막대 비교 대신 각 한도를 그대로 표시했습니다(25배 차이를 막대 높이로 그리면 작은 쪽이 보이지 않기 때문입니다).</figcaption>
      </figure>
      <p>블로그나 커뮤니티에 "1280×720이 유튜브 썸네일 표준"이라고 알려진 경우가 많은데, 이는 예전에 널리 퍼진 수치이고 현재 유튜브 고객센터가 안내하는 권장 해상도는 3840×2160px입니다. 1280×720으로 만들어도 업로드는 되지만, 공식 권장 해상도에 맞추는 것이 더 안전합니다.</p>
    </section>
```

로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, FAIL 0

- [ ] **Step 5: 커밋**

```bash
git add youtube-thumbnail-size.html tests/seoPagesIntegrity.test.js
git commit -m "$(cat <<'EOF'
Add upload-limit spec cards to youtube-thumbnail-size.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `old-photo-scan-digitize-workflow.html`에 세피아 업스케일 전/후 스크린샷 삽입

**Files:**
- Modify: `old-photo-scan-digitize-workflow.html`
- Test: `tests/seoPagesIntegrity.test.js`
- 의존: Pre-step에서 만든 `images/tool-sepia-upscale-before-after.png`(858×443)

**Interfaces:**
- Consumes: `images/tool-sepia-upscale-before-after.png`(Pre-step 산출물, 실제 크기 858×443)

- [ ] **Step 1: 실패하는 테스트 작성**

```js
test('old-photo-scan-digitize-workflow.html has the sepia upscale before/after screenshot', function () {
  const html = readRepoFile('old-photo-scan-digitize-workflow.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  const imgMatch = html.match(/<img[^>]*src="images\/tool-sepia-upscale-before-after\.png"[^>]*>/);
  assert.ok(imgMatch, 'missing tool-sepia-upscale-before-after.png image tag');
  assert.ok(/alt="[^"]+"/.test(imgMatch[0]), 'image missing non-empty alt text');
  assert.ok(imgMatch[0].includes('width="858"'), 'missing correct width attribute');
  assert.ok(imgMatch[0].includes('height="443"'), 'missing correct height attribute');
  assert.ok(imgMatch[0].includes('loading="lazy"'), 'missing loading=lazy attribute');
  assert.ok(imgMatch[0].includes('decoding="async"'), 'missing decoding=async attribute');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});

test('images/tool-sepia-upscale-before-after.png exists on disk', function () {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'images', 'tool-sepia-upscale-before-after.png')), 'tool-sepia-upscale-before-after.png missing from images/');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 첫 번째 신규 테스트 FAIL

- [ ] **Step 3: HTML에 이미지 삽입**

`old-photo-scan-digitize-workflow.html`에서:

```html
    <section class="info-section">
      <h2>3단계: 흐릿하거나 작게 나온 사진은 AI로 확대</h2>
      <p>오래된 사진 중에는 원본 자체가 작게 인화됐거나 스캔 결과가 흐릿한 경우가 있습니다. 이런 사진은 <a href="upscale.html">이미지 업스케일링</a>으로 더 선명하게 키울 수 있습니다. 다만 이 도구는 원본이 가로세로 각각 1000px 이하일 때만 입력받고, 초점이 심하게 나가거나 심하게 훼손된 사진은 AI가 참고할 정보 자체가 부족해 개선 폭이 작습니다. 이 한계는 <a href="ai-upscaling-limits.html">이 글</a>에서 자세히 다룹니다.</p>
    </section>
```

를

```html
    <section class="info-section">
      <h2>3단계: 흐릿하거나 작게 나온 사진은 AI로 확대</h2>
      <p>오래된 사진 중에는 원본 자체가 작게 인화됐거나 스캔 결과가 흐릿한 경우가 있습니다. 이런 사진은 <a href="upscale.html">이미지 업스케일링</a>으로 더 선명하게 키울 수 있습니다. 다만 이 도구는 원본이 가로세로 각각 1000px 이하일 때만 입력받고, 초점이 심하게 나가거나 심하게 훼손된 사진은 AI가 참고할 정보 자체가 부족해 개선 폭이 작습니다. 이 한계는 <a href="ai-upscaling-limits.html">이 글</a>에서 자세히 다룹니다.</p>
      <figure class="guide-image">
        <img src="images/tool-sepia-upscale-before-after.png" alt="세피아톤 합성 풍경 이미지를 이 사이트 업스케일링 도구로 4배 확대하기 전(원본)과 후(결과) 비교" width="858" height="443" loading="lazy" decoding="async">
        <figcaption>오래된 사진 느낌의 합성 이미지를 4배 확대한 실제 결과 — 경계가 더 선명해지지만, 원본에 없던 디테일이 새로 생기는 것은 아닙니다.</figcaption>
      </figure>
    </section>
```

로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, FAIL 0

- [ ] **Step 5: 커밋**

```bash
git add old-photo-scan-digitize-workflow.html tests/seoPagesIntegrity.test.js
git commit -m "$(cat <<'EOF'
Add sepia upscale before/after screenshot to old-photo-scan-digitize-workflow.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `print-resolution-dpi-guide.html`에 DPI 공식 + 예시 비율 다이어그램 삽입

**Files:**
- Modify: `print-resolution-dpi-guide.html`
- Test: `tests/seoPagesIntegrity.test.js`

**Interfaces:**
- Consumes: `.guide-image` CSS(1차 배치, 이미 존재)
- 새로운 이미지 파일 없음(인라인 SVG)

- [ ] **Step 1: 실패하는 테스트 작성**

```js
test('print-resolution-dpi-guide.html has the DPI formula diagram', function () {
  const html = readRepoFile('print-resolution-dpi-guide.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  assert.ok(/<svg[^>]*role="img"/.test(html), 'missing inline svg diagram');
  assert.ok(html.includes('필요 픽셀 계산 공식과 실제 비율로 비교한 두 예시: 10×15cm 300DPI는 1200×1800픽셀, A4 포스터 200DPI는 1660×2340픽셀'), 'missing unique diagram desc sentence');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 위 테스트 FAIL

- [ ] **Step 3: HTML에 SVG 삽입**

`print-resolution-dpi-guide.html`에서:

```html
    <section class="info-section">
      <h2>계산 예시</h2>
      <p>10cm × 15cm(약 4×6인치) 사진을 300DPI로 인쇄하려면, 4 × 300 = 1200px, 6 × 300 = 1800px, 즉 약 1200×1800px가 필요합니다. A4 크기(약 8.3×11.7인치) 포스터를 200DPI로 인쇄한다면 약 1660×2340px면 충분합니다.</p>
    </section>
```

를

```html
    <section class="info-section">
      <h2>계산 예시</h2>
      <p>10cm × 15cm(약 4×6인치) 사진을 300DPI로 인쇄하려면, 4 × 300 = 1200px, 6 × 300 = 1800px, 즉 약 1200×1800px가 필요합니다. A4 크기(약 8.3×11.7인치) 포스터를 200DPI로 인쇄한다면 약 1660×2340px면 충분합니다.</p>
      <figure class="guide-image">
        <svg viewBox="0 0 420 330" role="img" aria-labelledby="dpiChartTitle dpiChartDesc" xmlns="http://www.w3.org/2000/svg">
          <title id="dpiChartTitle">DPI 계산 공식과 예시 두 가지</title>
          <desc id="dpiChartDesc">필요 픽셀 계산 공식과 실제 비율로 비교한 두 예시: 10×15cm 300DPI는 1200×1800픽셀, A4 포스터 200DPI는 1660×2340픽셀</desc>
          <text x="210" y="20" text-anchor="middle" font-size="17" font-weight="700" fill="var(--color-text)">필요 픽셀 = DPI × 인치</text>
          <text x="110" y="95" text-anchor="middle" font-size="12" fill="var(--color-text-secondary)">10×15cm · 300DPI</text>
          <rect x="50" y="108" width="120" height="180" fill="var(--color-accent-soft)" stroke="var(--color-accent)" stroke-width="2"></rect>
          <text x="303" y="42" text-anchor="middle" font-size="12" fill="var(--color-text-secondary)">A4 포스터 · 200DPI</text>
          <rect x="220" y="54" width="166" height="234" fill="var(--color-accent-soft)" stroke="var(--color-accent)" stroke-width="2"></rect>
          <line x1="30" y1="288" x2="400" y2="288" stroke="var(--color-border)" stroke-width="2"></line>
          <text x="110" y="308" text-anchor="middle" font-size="13" font-weight="600" fill="var(--color-text)">1200 × 1800px</text>
          <text x="303" y="308" text-anchor="middle" font-size="13" font-weight="600" fill="var(--color-text)">1660 × 2340px</text>
        </svg>
        <figcaption>두 예시를 같은 비율(1/10 축소)로 그려 실제 크기 차이를 그대로 비교할 수 있습니다.</figcaption>
      </figure>
    </section>
```

로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, FAIL 0

- [ ] **Step 5: 커밋**

```bash
git add print-resolution-dpi-guide.html tests/seoPagesIntegrity.test.js
git commit -m "$(cat <<'EOF'
Add DPI formula and example-ratio diagram to print-resolution-dpi-guide.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `pdf-merge-multiple-files.html`에 다중 파일 선택 스크린샷 삽입

**Files:**
- Modify: `pdf-merge-multiple-files.html`
- Test: `tests/seoPagesIntegrity.test.js`
- 의존: Pre-step에서 만든 `images/tool-pdf-multi-file-select.png`(858×639)

**Interfaces:**
- Consumes: `images/tool-pdf-multi-file-select.png`(Pre-step 산출물, 실제 크기 858×639)

- [ ] **Step 1: 실패하는 테스트 작성**

```js
test('pdf-merge-multiple-files.html has the multi-file selection screenshot', function () {
  const html = readRepoFile('pdf-merge-multiple-files.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  const imgMatch = html.match(/<img[^>]*src="images\/tool-pdf-multi-file-select\.png"[^>]*>/);
  assert.ok(imgMatch, 'missing tool-pdf-multi-file-select.png image tag');
  assert.ok(/alt="[^"]+"/.test(imgMatch[0]), 'image missing non-empty alt text');
  assert.ok(imgMatch[0].includes('width="858"'), 'missing correct width attribute');
  assert.ok(imgMatch[0].includes('height="639"'), 'missing correct height attribute');
  assert.ok(imgMatch[0].includes('loading="lazy"'), 'missing loading=lazy attribute');
  assert.ok(imgMatch[0].includes('decoding="async"'), 'missing decoding=async attribute');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});

test('images/tool-pdf-multi-file-select.png exists on disk', function () {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'images', 'tool-pdf-multi-file-select.png')), 'tool-pdf-multi-file-select.png missing from images/');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 첫 번째 신규 테스트 FAIL

- [ ] **Step 3: HTML에 이미지 삽입**

`pdf-merge-multiple-files.html`에서:

```html
    <section class="info-section">
      <h2>우회 방법: 이미지로 추출 → 순서대로 배열 → 다시 합치기</h2>
      <p>1) 합치고 싶은 각 PDF를 <a href="pdf.html">PDF 변환 도구</a>에서 페이지별 이미지로 추출합니다(PDF 한 개당 최대 300페이지). 2) 추출된 이미지 파일들을 원하는 최종 순서대로 정렬합니다. 3) 정렬한 이미지를 <a href="photos-to-pdf.html">이미지→PDF</a>로 다시 하나의 PDF로 합칩니다.</p>
    </section>
```

를

```html
    <section class="info-section">
      <h2>우회 방법: 이미지로 추출 → 순서대로 배열 → 다시 합치기</h2>
      <p>1) 합치고 싶은 각 PDF를 <a href="pdf.html">PDF 변환 도구</a>에서 페이지별 이미지로 추출합니다(PDF 한 개당 최대 300페이지). 2) 추출된 이미지 파일들을 원하는 최종 순서대로 정렬합니다. 3) 정렬한 이미지를 <a href="photos-to-pdf.html">이미지→PDF</a>로 다시 하나의 PDF로 합칩니다.</p>
      <figure class="guide-image">
        <img src="images/tool-pdf-multi-file-select.png" alt="이미지→PDF 섹션에서 이미지 3장이 선택되어 파일 목록에 표시되고 PDF로 변환 버튼이 나타난 실제 화면" width="858" height="639" loading="lazy" decoding="async">
        <figcaption>3단계 중 마지막 단계 — 정렬한 이미지 여러 장을 한 번에 올리면 이렇게 목록으로 표시되고, 이 순서 그대로 하나의 PDF가 만들어집니다.</figcaption>
      </figure>
    </section>
```

로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, FAIL 0

- [ ] **Step 5: 커밋**

```bash
git add pdf-merge-multiple-files.html tests/seoPagesIntegrity.test.js
git commit -m "$(cat <<'EOF'
Add multi-file selection screenshot to pdf-merge-multiple-files.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 1차 배치 기술 부채 정리 (이미지 속성 + SVG 색상 통일)

**Files:**
- Modify: `kakao-photo-quality.html`, `photo-id-resize.html`, `ai-upscaling-limits.html`, `email-attachment-size.html`, `image-format-comparison.html`
- Test: `tests/seoPagesIntegrity.test.js`

**Interfaces:**
- 새로운 이미지 파일 없음. 기존 이미지 3개(`images/tool-quality-slider.png`=768×341, `images/tool-resize-413x531.png`=768×341, `images/upscale-before-after.png`=768×428)는 이미 존재 — 수정하지 않음, `<img>` 속성만 추가.
- SVG 2개의 좌표·수치·구조는 전혀 바꾸지 않는다 — `fill`/`stroke` 색상값만 hex→`var()`로 교체.

- [ ] **Step 1: 실패하는 테스트 작성**

```js
test('round 1 images have width/height/loading/decoding attributes', function () {
  const kakao = readRepoFile('kakao-photo-quality.html');
  const kakaoImg = kakao.match(/<img[^>]*src="images\/tool-quality-slider\.png"[^>]*>/)[0];
  assert.ok(kakaoImg.includes('width="768"') && kakaoImg.includes('height="341"'), 'kakao image missing correct width/height');
  assert.ok(kakaoImg.includes('loading="lazy"') && kakaoImg.includes('decoding="async"'), 'kakao image missing loading/decoding attributes');

  const photoId = readRepoFile('photo-id-resize.html');
  const photoIdImg = photoId.match(/<img[^>]*src="images\/tool-resize-413x531\.png"[^>]*>/)[0];
  assert.ok(photoIdImg.includes('width="768"') && photoIdImg.includes('height="341"'), 'photo-id-resize image missing correct width/height');
  assert.ok(photoIdImg.includes('loading="lazy"') && photoIdImg.includes('decoding="async"'), 'photo-id-resize image missing loading/decoding attributes');

  const upscale = readRepoFile('ai-upscaling-limits.html');
  const upscaleImg = upscale.match(/<img[^>]*src="images\/upscale-before-after\.png"[^>]*>/)[0];
  assert.ok(upscaleImg.includes('width="768"') && upscaleImg.includes('height="428"'), 'ai-upscaling-limits image missing correct width/height');
  assert.ok(upscaleImg.includes('loading="lazy"') && upscaleImg.includes('decoding="async"'), 'ai-upscaling-limits image missing loading/decoding attributes');
});

test('round 1 SVG charts use CSS variable colors, not hardcoded hex', function () {
  const email = readRepoFile('email-attachment-size.html');
  const emailSvgMatch = email.match(/<svg[^>]*role="img"[\s\S]*?<\/svg>/);
  assert.ok(emailSvgMatch, 'email-attachment-size.html missing inline svg');
  assert.ok(!/#[0-9a-fA-F]{6}/.test(emailSvgMatch[0]), 'email-attachment-size.html svg still has hardcoded hex color');
  assert.ok(emailSvgMatch[0].includes('var(--color-'), 'email-attachment-size.html svg missing CSS variable colors');

  const format = readRepoFile('image-format-comparison.html');
  const formatSvgMatches = format.match(/<svg[^>]*role="img"[\s\S]*?<\/svg>/g);
  assert.ok(formatSvgMatches && formatSvgMatches.length >= 2, 'image-format-comparison.html missing both inline svgs');
  formatSvgMatches.forEach(function (svg) {
    assert.ok(!/#[0-9a-fA-F]{6}/.test(svg), 'image-format-comparison.html svg still has hardcoded hex color');
    assert.ok(svg.includes('var(--color-'), 'image-format-comparison.html svg missing CSS variable colors');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 위 2개 신규 테스트 FAIL

- [ ] **Step 3a: `kakao-photo-quality.html` 이미지 속성 추가**

`kakao-photo-quality.html`에서:

```html
        <img src="images/tool-quality-slider.png" alt="이미지 압축 도구의 압축 품질 슬라이더 화면">
```

를

```html
        <img src="images/tool-quality-slider.png" alt="이미지 압축 도구의 압축 품질 슬라이더 화면" width="768" height="341" loading="lazy" decoding="async">
```

로 교체.

- [ ] **Step 3b: `photo-id-resize.html` 이미지 속성 추가**

`photo-id-resize.html`에서:

```html
        <img src="images/tool-resize-413x531.png" alt="이미지 압축 도구에서 가로 413, 세로 531 픽셀을 입력하고 비율 유지를 끈 화면">
```

를

```html
        <img src="images/tool-resize-413x531.png" alt="이미지 압축 도구에서 가로 413, 세로 531 픽셀을 입력하고 비율 유지를 끈 화면" width="768" height="341" loading="lazy" decoding="async">
```

로 교체.

- [ ] **Step 3c: `ai-upscaling-limits.html` 이미지 속성 추가**

`ai-upscaling-limits.html`에서:

```html
        <img src="images/upscale-before-after.png" alt="240x180 저해상도 합성 이미지를 이 사이트 업스케일링 도구로 4배 확대하기 전(원본)과 후(결과) 비교">
```

를

```html
        <img src="images/upscale-before-after.png" alt="240x180 저해상도 합성 이미지를 이 사이트 업스케일링 도구로 4배 확대하기 전(원본)과 후(결과) 비교" width="768" height="428" loading="lazy" decoding="async">
```

로 교체.

- [ ] **Step 3d: `email-attachment-size.html` SVG 색상을 CSS 변수로 교체**

`email-attachment-size.html`에서 다음 10줄을 (좌표·구조는 그대로, 색상값만 변경):

```html
          <line x1="20" y1="180" x2="380" y2="180" stroke="#a7e8df" stroke-width="2"></line>
          <rect x="40" y="40" width="70" height="140" rx="4" fill="#14b8a6"></rect>
          <text x="75" y="32" text-anchor="middle" font-size="14" font-weight="600" fill="#1d1d1f">25MB</text>
          <text x="75" y="200" text-anchor="middle" font-size="13" fill="#5b6b6a">Gmail</text>
          <rect x="150" y="124" width="70" height="56" rx="4" fill="#14b8a6"></rect>
          <text x="185" y="116" text-anchor="middle" font-size="14" font-weight="600" fill="#1d1d1f">10MB</text>
          <text x="185" y="200" text-anchor="middle" font-size="13" fill="#5b6b6a">네이버메일</text>
          <rect x="260" y="40" width="70" height="140" rx="4" fill="#14b8a6"></rect>
          <text x="295" y="32" text-anchor="middle" font-size="14" font-weight="600" fill="#1d1d1f">25MB</text>
          <text x="295" y="200" text-anchor="middle" font-size="13" fill="#5b6b6a">다음메일</text>
```

를

```html
          <line x1="20" y1="180" x2="380" y2="180" stroke="var(--color-border)" stroke-width="2"></line>
          <rect x="40" y="40" width="70" height="140" rx="4" fill="var(--color-accent)"></rect>
          <text x="75" y="32" text-anchor="middle" font-size="14" font-weight="600" fill="var(--color-text)">25MB</text>
          <text x="75" y="200" text-anchor="middle" font-size="13" fill="var(--color-text-secondary)">Gmail</text>
          <rect x="150" y="124" width="70" height="56" rx="4" fill="var(--color-accent)"></rect>
          <text x="185" y="116" text-anchor="middle" font-size="14" font-weight="600" fill="var(--color-text)">10MB</text>
          <text x="185" y="200" text-anchor="middle" font-size="13" fill="var(--color-text-secondary)">네이버메일</text>
          <rect x="260" y="40" width="70" height="140" rx="4" fill="var(--color-accent)"></rect>
          <text x="295" y="32" text-anchor="middle" font-size="14" font-weight="600" fill="var(--color-text)">25MB</text>
          <text x="295" y="200" text-anchor="middle" font-size="13" fill="var(--color-text-secondary)">다음메일</text>
```

로 교체.

- [ ] **Step 3e: `image-format-comparison.html` SVG 색상을 CSS 변수로 교체**

`image-format-comparison.html`에서 다음 17줄을(좌표·구조는 그대로, 색상값만 변경):

```html
          <line x1="20" y1="180" x2="380" y2="180" stroke="#a7e8df" stroke-width="2"></line>
          <rect x="40" y="89" width="70" height="91" rx="4" fill="#5b6b6a"></rect>
          <text x="75" y="81" text-anchor="middle" font-size="13" font-weight="600" fill="#1d1d1f">22,791B</text>
          <text x="75" y="200" text-anchor="middle" font-size="13" fill="#5b6b6a">PNG(원본)</text>
          <rect x="150" y="40" width="70" height="140" rx="4" fill="#0d9488"></rect>
          <text x="185" y="32" text-anchor="middle" font-size="13" font-weight="600" fill="#1d1d1f">35,171B</text>
          <text x="185" y="200" text-anchor="middle" font-size="13" fill="#5b6b6a">JPG 100%</text>
          <rect x="260" y="156" width="70" height="24" rx="4" fill="#14b8a6"></rect>
          <text x="295" y="148" text-anchor="middle" font-size="13" font-weight="600" fill="#1d1d1f">6,010B</text>
          <text x="295" y="200" text-anchor="middle" font-size="13" fill="#5b6b6a">WebP 100%</text>
```

를

```html
          <line x1="20" y1="180" x2="380" y2="180" stroke="var(--color-border)" stroke-width="2"></line>
          <rect x="40" y="89" width="70" height="91" rx="4" fill="var(--color-text-secondary)"></rect>
          <text x="75" y="81" text-anchor="middle" font-size="13" font-weight="600" fill="var(--color-text)">22,791B</text>
          <text x="75" y="200" text-anchor="middle" font-size="13" fill="var(--color-text-secondary)">PNG(원본)</text>
          <rect x="150" y="40" width="70" height="140" rx="4" fill="var(--color-accent-dark)"></rect>
          <text x="185" y="32" text-anchor="middle" font-size="13" font-weight="600" fill="var(--color-text)">35,171B</text>
          <text x="185" y="200" text-anchor="middle" font-size="13" fill="var(--color-text-secondary)">JPG 100%</text>
          <rect x="260" y="156" width="70" height="24" rx="4" fill="var(--color-accent)"></rect>
          <text x="295" y="148" text-anchor="middle" font-size="13" font-weight="600" fill="var(--color-text)">6,010B</text>
          <text x="295" y="200" text-anchor="middle" font-size="13" fill="var(--color-text-secondary)">WebP 100%</text>
```

로 교체. 이어서 같은 파일에서 다음 7줄을:

```html
          <line x1="20" y1="20" x2="380" y2="20" stroke="#a7e8df" stroke-width="1" stroke-dasharray="4 4"></line>
          <text x="378" y="14" text-anchor="end" font-size="11" fill="#5b6b6a">100%(원본)</text>
          <line x1="20" y1="180" x2="380" y2="180" stroke="#a7e8df" stroke-width="2"></line>
          <rect x="120" y="30" width="70" height="150" rx="4" fill="#0d9488"></rect>
          <text x="155" y="22" text-anchor="middle" font-size="14" font-weight="600" fill="#1d1d1f">93.6%</text>
          <text x="155" y="200" text-anchor="middle" font-size="13" fill="#5b6b6a">JPG 감소율</text>
          <rect x="230" y="31" width="70" height="149" rx="4" fill="#14b8a6"></rect>
          <text x="265" y="23" text-anchor="middle" font-size="14" font-weight="600" fill="#1d1d1f">93.2%</text>
          <text x="265" y="200" text-anchor="middle" font-size="13" fill="#5b6b6a">WebP 감소율</text>
```

를

```html
          <line x1="20" y1="20" x2="380" y2="20" stroke="var(--color-border)" stroke-width="1" stroke-dasharray="4 4"></line>
          <text x="378" y="14" text-anchor="end" font-size="11" fill="var(--color-text-secondary)">100%(원본)</text>
          <line x1="20" y1="180" x2="380" y2="180" stroke="var(--color-border)" stroke-width="2"></line>
          <rect x="120" y="30" width="70" height="150" rx="4" fill="var(--color-accent-dark)"></rect>
          <text x="155" y="22" text-anchor="middle" font-size="14" font-weight="600" fill="var(--color-text)">93.6%</text>
          <text x="155" y="200" text-anchor="middle" font-size="13" fill="var(--color-text-secondary)">JPG 감소율</text>
          <rect x="230" y="31" width="70" height="149" rx="4" fill="var(--color-accent)"></rect>
          <text x="265" y="23" text-anchor="middle" font-size="14" font-weight="600" fill="var(--color-text)">93.2%</text>
          <text x="265" y="200" text-anchor="middle" font-size="13" fill="var(--color-text-secondary)">WebP 감소율</text>
```

로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, FAIL 0 (이 태스크는 기존 이미지 3개·SVG 2개의 시각적 결과가 이전과 동일하게 유지되는지도 육안 확인 권장 — 색상만 바뀌고 레이아웃은 그대로여야 함)

- [ ] **Step 5: 커밋**

```bash
git add kakao-photo-quality.html photo-id-resize.html ai-upscaling-limits.html email-attachment-size.html image-format-comparison.html tests/seoPagesIntegrity.test.js
git commit -m "$(cat <<'EOF'
Add CLS-prevention image attributes and unify SVG colors to CSS variables (round 1 tech debt)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## 최종 브랜치 리뷰 시 특별히 확인할 항목

- 서브에이전트 커밋이 `Co-Authored-By: Claude Sonnet 5`로 정확히 기록됐는지 태스크마다 `git log -1 --format='%B'`로 직접 확인.
- 어떤 서브에이전트도 자신에게 배정된 태스크 범위를 벗어나지 않았는지 — 각 태스크 커밋의 `git show --stat`가 브리프에 명시된 파일만 건드렸는지 확인.
- 모든 신규 `<img>`에 `width`/`height`/`loading="lazy"`/`decoding="async"`가 실제 파일 크기와 정확히 일치하는지.
- Task 7 이후 `email-attachment-size.html`/`image-format-comparison.html`의 렌더링 결과가 색상만 바뀌고(민트→틸그린 계열) 레이아웃·수치는 1차 배치 최종 리뷰가 검증한 것과 동일한지 실제 렌더링으로 확인.
- 6개 신규 이미지 중 어느 것도 1·2차 배치와 동일한 화면·문구 템플릿을 반복하지 않는지 — 특히 Task 4(세피아 업스케일)가 1차의 `ai-upscaling-limits.html`과 톤·캡션에서 명확히 구별되는지.
- SVG `<text>` 라벨이 viewBox 밖으로 잘리지 않는지 — 로컬 서버로 실제 렌더링해 `getBBox()` 실측 권장(Task 3, Task 5 신규 SVG가 주요 대상).
- 16개 가이드 글 전체에 이미지가 있는지 최종 확인(4단계 완료 여부).
