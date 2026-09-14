# 가이드 글 이미지 추가 1차 배치(5개) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 가이드 글 5개(`kakao-photo-quality.html`, `email-attachment-size.html`, `image-format-comparison.html`, `photo-id-resize.html`, `ai-upscaling-limits.html`)에 실제 이미지(자사 도구 스크린샷 2장, 인라인 SVG 실측 차트 3개, 합성 전/후 업스케일 비교 1장)를 추가한다.

**Architecture:** 신규 페이지 없음, 기존 5개 HTML 파일에 `<figure class="guide-image">` 블록을 삽입하고 `css/style.css`에 관련 클래스 3개를 추가한다. 스크린샷 2장과 업스케일 전/후 비교 1장은 **오케스트레이터가 Pre-step에서 직접** Playwright MCP로 실제 배포 사이트(`https://nwb010118.github.io/image-toolbox/`)를 조작해 `images/`에 파일로 저장해두고, 이후 SDD 태스크들은 그 이미지 파일 경로를 참조하는 순수 파일 편집 작업만 한다.

**Tech Stack:** 순수 정적 HTML/CSS, 인라인 SVG(외부 라이브러리 없음), Node 무프레임워크 테스트(`tests/seoPagesIntegrity.test.js`에 이어서 추가), 이미지 캡처는 Playwright MCP(`mcp__playwright__*`) + Windows `System.Drawing`(합성 소스 이미지 생성).

## Global Constraints

- 기존 클래스(`container`/`subtitle`/`tool-nav`/`info-section`/`btn`/`site-footer`)는 그대로 재사용하고, 이번 라운드에서 신규로 허용된 클래스는 `.guide-image`/`.guide-image img`/`.guide-image svg`/`.guide-image figcaption` 뿐이다.
- 모든 `<img>` 태그는 비어있지 않은 `alt` 속성을 가져야 한다.
- 차트에 들어가는 모든 숫자는 이미 배포된 `benchmark.html`(실측치) 또는 각 글 본문(공식/이미 검증된 수치)에 있는 값을 그대로 인용한다 — 새로 측정하지 않는다. 정확한 값: 그래픽형 100% 품질 PNG 22,791B/JPG 35,171B/WebP 6,010B(`benchmark.html:93-106`), 사진형 80% 품질 원본 1,808,456B→JPG 115,393B(93.6% 감소)/WebP 123,720B(93.2% 감소, 123720/1808456에서 계산)(`benchmark.html:51-68`), 이메일 기본 첨부 Gmail 25MB/네이버메일 10MB/다음메일 25MB(`email-attachment-size.html:38-40`).
- `ai-upscaling-limits.html`의 전/후 비교 이미지는 이 글의 기존 주장("원본에 없는 정보를 만들어내는 게 아니다")과 모순되는 과장된 결과를 보여주면 안 된다.
- `image-toolbox`는 git 명령을 직접 실행해도 되는 문서화된 예외 저장소다 — 각 태스크 완료 후 직접 커밋한다. 커밋 메시지는 반드시 다음 trailer로 끝낸다: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` (서브에이전트가 자기 모델명으로 바꾸지 않도록 디스패치 프롬프트에 이 문구를 그대로 고정할 것 — 2차·3차 배치에서 두 번 재발한 실수).
- SDD 워크트리는 `git worktree add .worktrees/<plan-name> -b <plan-name> master` 수동 명령으로 만든다 (Agent `isolation` 파라미터 사용 금지).

---

## Pre-step: 이미지 캡처 (오케스트레이터 전용 — 서브에이전트에게 디스패치하지 말 것)

이 단계는 브라우저 자동화(Playwright MCP)가 필요해서 헤드리스 SDD 서브에이전트가 수행할 수 없다. **현재 세션(오케스트레이터)이 SDD 착수 전에 직접 실행**하고, 결과 이미지 3장이 저장소 `images/`에 실제로 존재하는 것을 확인한 뒤에만 Task 1로 넘어간다.

### P1. 합성 소스 이미지 2장 생성 (Windows System.Drawing, 추가 설치 불필요)

PowerShell로 실행:

```powershell
Add-Type -AssemblyName System.Drawing

# 도구 스크린샷용 업로드 샘플 (800x600 JPG)
$bmp = New-Object System.Drawing.Bitmap(800,600)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(238,249,251))
$g.FillEllipse([System.Drawing.Brushes]::SteelBlue, 150,120,300,300)
$g.FillRectangle([System.Drawing.Brushes]::Coral, 480,200,220,180)
$font = New-Object System.Drawing.Font("Arial",28,[System.Drawing.FontStyle]::Bold)
$g.DrawString("SAMPLE", $font, [System.Drawing.Brushes]::White, 300, 260)
$bmp.Save("$env:TEMP\sample-photo.jpg", [System.Drawing.Imaging.ImageFormat]::Jpeg)
$g.Dispose(); $bmp.Dispose()

# 업스케일링용 저해상도 샘플 (240x180 PNG, 경계선+텍스트+그라데이션 포함)
$bmp2 = New-Object System.Drawing.Bitmap(240,180)
$g2 = [System.Drawing.Graphics]::FromImage($bmp2)
$rect = New-Object System.Drawing.Rectangle(0,0,240,180)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, [System.Drawing.Color]::FromArgb(20,184,166), [System.Drawing.Color]::FromArgb(13,148,136), 45)
$g2.FillRectangle($brush, $rect)
$g2.FillEllipse([System.Drawing.Brushes]::White, 60,45,120,90)
$g2.DrawRectangle((New-Object System.Drawing.Pen([System.Drawing.Color]::Black,3)), 20,20,60,40)
$font2 = New-Object System.Drawing.Font("Arial",20,[System.Drawing.FontStyle]::Bold)
$g2.DrawString("TEST", $font2, [System.Drawing.Brushes]::Black, 78, 78)
$bmp2.Save("$env:TEMP\sample-lowres.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g2.Dispose(); $bmp2.Dispose()
```

확인: `Test-Path $env:TEMP\sample-photo.jpg`와 `Test-Path $env:TEMP\sample-lowres.png`가 둘 다 `True`.

### P2. `index.html` 스크린샷 2장 (Playwright MCP)

1. `mcp__playwright__browser_navigate`로 `https://nwb010118.github.io/image-toolbox/` 접속.
2. `mcp__playwright__browser_snapshot`으로 업로드 버튼("파일 선택") 참조 확보 후 클릭 → 파일 선택 대화상자가 뜨면 `mcp__playwright__browser_file_upload`에 `paths: ["<TEMP>\\sample-photo.jpg"]` 전달.
3. 업로드 완료 후 `.controls` 영역이 보이는 상태에서(품질 슬라이더 기본값 80% 그대로) `mcp__playwright__browser_take_screenshot`을 `element`(`.controls` 영역, snapshot에서 얻은 ref 또는 `#controls` 셀렉터)와 `filename: "tool-quality-slider.png"`로 호출.
4. `resizeWidth` 입력란에 `413`, `resizeHeight` 입력란에 `531` 입력, `maintainAspectRatio` 체크박스 해제.
5. 다시 `mcp__playwright__browser_take_screenshot`을 `element: "#controls"`, `filename: "tool-resize-413x531.png"`로 호출.
6. 두 파일을 Playwright 출력 디렉터리에서 저장소로 복사:
   ```bash
   cp "<playwright-output-dir>/tool-quality-slider.png" "C:/Users/A/projects/image-toolbox/images/tool-quality-slider.png"
   cp "<playwright-output-dir>/tool-resize-413x531.png" "C:/Users/A/projects/image-toolbox/images/tool-resize-413x531.png"
   ```
   (`images/` 디렉터리가 없으면 먼저 생성: `mkdir -p "C:/Users/A/projects/image-toolbox/images"`)

### P3. `upscale.html` 전/후 비교 스크린샷 1장 (Playwright MCP)

1. `mcp__playwright__browser_navigate`로 `https://nwb010118.github.io/image-toolbox/upscale.html` 접속.
2. 업로드 버튼 클릭 → `mcp__playwright__browser_file_upload`에 `paths: ["<TEMP>\\sample-lowres.png"]` 전달.
3. "4배" 라디오 버튼 선택 → "확대하기" 클릭.
4. 결과 `<img id="upscaleResultPreview">`의 `hidden` 속성이 사라질 때까지 `mcp__playwright__browser_snapshot`을 반복 호출해 상태를 확인(고정 딜레이 대신 상태 변화 폴링 — benchmark 측정 때 확립한 패턴, 최대 30초까지 폴링).
5. `#upscalePreviewArea` 전체(원본 박스+결과 박스가 나란히 보이는 영역)를 `element` 스크린샷, `filename: "upscale-before-after.png"`.
6. 저장소로 복사: `cp "<playwright-output-dir>/upscale-before-after.png" "C:/Users/A/projects/image-toolbox/images/upscale-before-after.png"`.

### P4. 확인

- `images/tool-quality-slider.png`, `images/tool-resize-413x531.png`, `images/upscale-before-after.png` 3개 파일이 실제로 존재하고, Read 도구로 열어서 실제 UI가 제대로 캡처됐는지(에러 메시지나 빈 화면이 아닌지) 육안으로 확인한다.
- 이 3개 파일을 `git add images/` 로 스테이징만 해두고, 커밋은 Task 2/3/6에서 해당 HTML과 함께 한다(이미지만 단독 커밋하지 않음 — 리뷰 시 "이 이미지가 왜 추가됐는지" 맥락이 커밋 안에 있어야 함).

---

## Task 1: `.guide-image` CSS 클래스 추가

**Files:**
- Modify: `css/style.css` (`.site-footer` 규칙 바로 앞에 삽입)
- Test: `tests/seoPagesIntegrity.test.js`

**Interfaces:**
- Produces: `.guide-image`, `.guide-image img`, `.guide-image svg`, `.guide-image figcaption` — Task 2~6이 전부 이 클래스를 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/seoPagesIntegrity.test.js` 맨 끝에 추가:

```js
test('css/style.css defines .guide-image classes', function () {
  const css = readRepoFile('css/style.css');
  assert.ok(css.includes('.guide-image {'), 'missing .guide-image rule');
  assert.ok(css.includes('.guide-image img'), 'missing .guide-image img rule');
  assert.ok(css.includes('.guide-image svg'), 'missing .guide-image svg rule');
  assert.ok(css.includes('.guide-image figcaption'), 'missing .guide-image figcaption rule');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: `FAIL: css/style.css defines .guide-image classes` (다른 기존 테스트는 전부 PASS 유지)

- [ ] **Step 3: CSS 추가**

`css/style.css`에서 `.site-footer {` 규칙 바로 앞에 삽입:

```css
.guide-image {
  margin: 20px 0;
  text-align: center;
}

.guide-image img,
.guide-image svg {
  max-width: 100%;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  display: block;
  margin: 0 auto;
  background: var(--color-surface);
}

.guide-image figcaption {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 8px;
}

```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트(신규 1개 포함) PASS, FAIL 0

- [ ] **Step 5: 커밋**

```bash
git add css/style.css tests/seoPagesIntegrity.test.js
git commit -m "$(cat <<'EOF'
Add .guide-image CSS classes for guide article images

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `kakao-photo-quality.html`에 이미지 삽입

**Files:**
- Modify: `kakao-photo-quality.html`
- Test: `tests/seoPagesIntegrity.test.js`
- 의존: Pre-step에서 만든 `images/tool-quality-slider.png`, Task 1의 `.guide-image` 클래스

**Interfaces:**
- Consumes: `images/tool-quality-slider.png`(Pre-step 산출물), `.guide-image` CSS(Task 1)

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/seoPagesIntegrity.test.js` 끝에 추가:

```js
test('kakao-photo-quality.html has a guide image with alt text', function () {
  const html = readRepoFile('kakao-photo-quality.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  const imgMatch = html.match(/<img[^>]*src="images\/tool-quality-slider\.png"[^>]*>/);
  assert.ok(imgMatch, 'missing tool-quality-slider.png image tag');
  assert.ok(/alt="[^"]+"/.test(imgMatch[0]), 'image missing non-empty alt text');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});

test('images/tool-quality-slider.png exists on disk', function () {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'images', 'tool-quality-slider.png')), 'tool-quality-slider.png missing from images/');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 위 2개 신규 테스트 FAIL (이미지 파일 자체는 Pre-step에서 이미 존재해야 하므로, 두 번째 테스트는 이미 PASS일 수 있음 — 그건 정상이며 첫 번째 테스트만 FAIL해도 무방)

- [ ] **Step 3: HTML에 이미지 삽입**

`kakao-photo-quality.html`에서:

```html
    <section class="info-section">
      <h2>반대로 용량을 더 줄여서 보내고 싶다면</h2>
      <p>사진을 여러 장 한꺼번에 보내야 하거나 상대방의 데이터를 아껴주고 싶을 때는 원본 대신 미리 압축해서 보내는 게 더 유리합니다. <a href="index.html">이미지 압축 도구</a>에서 품질을 조절해 용량을 줄인 뒤 전송하면 됩니다.</p>
    </section>
```

를

```html
    <section class="info-section">
      <h2>반대로 용량을 더 줄여서 보내고 싶다면</h2>
      <p>사진을 여러 장 한꺼번에 보내야 하거나 상대방의 데이터를 아껴주고 싶을 때는 원본 대신 미리 압축해서 보내는 게 더 유리합니다. <a href="index.html">이미지 압축 도구</a>에서 품질을 조절해 용량을 줄인 뒤 전송하면 됩니다.</p>
      <figure class="guide-image">
        <img src="images/tool-quality-slider.png" alt="이미지 압축 도구의 압축 품질 슬라이더 화면">
        <figcaption>이미지 압축 도구의 품질 슬라이더 — 값을 낮출수록 용량이 줄어듭니다.</figcaption>
      </figure>
    </section>
```

로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, FAIL 0

- [ ] **Step 5: 커밋**

```bash
git add kakao-photo-quality.html images/tool-quality-slider.png tests/seoPagesIntegrity.test.js
git commit -m "$(cat <<'EOF'
Add tool screenshot to kakao-photo-quality.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `photo-id-resize.html`에 이미지 삽입

**Files:**
- Modify: `photo-id-resize.html`
- Test: `tests/seoPagesIntegrity.test.js`
- 의존: Pre-step에서 만든 `images/tool-resize-413x531.png`, Task 1의 `.guide-image` 클래스

**Interfaces:**
- Consumes: `images/tool-resize-413x531.png`(Pre-step 산출물), `.guide-image` CSS(Task 1)

- [ ] **Step 1: 실패하는 테스트 작성**

```js
test('photo-id-resize.html has a guide image with alt text', function () {
  const html = readRepoFile('photo-id-resize.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  const imgMatch = html.match(/<img[^>]*src="images\/tool-resize-413x531\.png"[^>]*>/);
  assert.ok(imgMatch, 'missing tool-resize-413x531.png image tag');
  assert.ok(/alt="[^"]+"/.test(imgMatch[0]), 'image missing non-empty alt text');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});

test('images/tool-resize-413x531.png exists on disk', function () {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'images', 'tool-resize-413x531.png')), 'tool-resize-413x531.png missing from images/');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 첫 번째 신규 테스트 FAIL

- [ ] **Step 3: HTML에 이미지 삽입**

`photo-id-resize.html`에서:

```html
    <section class="info-section">
      <h2>브라우저에서 규격에 맞게 리사이즈하는 법</h2>
      <p><a href="index.html">이미지 압축 도구</a>의 가로/세로 픽셀 입력란에 원하는 규격(예: 413 × 531)을 직접 입력하면 해당 크기로 맞춰집니다. '비율 유지'를 꺼야 정확한 가로세로 값을 각각 지정할 수 있습니다. 원본 사진에서 얼굴 비율이 규격과 크게 다르다면, 먼저 사진 편집 프로그램으로 필요한 부분만 잘라낸 뒤 이 도구로 정확한 픽셀 크기로 맞추는 순서를 권장합니다.</p>
    </section>
```

를

```html
    <section class="info-section">
      <h2>브라우저에서 규격에 맞게 리사이즈하는 법</h2>
      <p><a href="index.html">이미지 압축 도구</a>의 가로/세로 픽셀 입력란에 원하는 규격(예: 413 × 531)을 직접 입력하면 해당 크기로 맞춰집니다. '비율 유지'를 꺼야 정확한 가로세로 값을 각각 지정할 수 있습니다. 원본 사진에서 얼굴 비율이 규격과 크게 다르다면, 먼저 사진 편집 프로그램으로 필요한 부분만 잘라낸 뒤 이 도구로 정확한 픽셀 크기로 맞추는 순서를 권장합니다.</p>
      <figure class="guide-image">
        <img src="images/tool-resize-413x531.png" alt="이미지 압축 도구에서 가로 413, 세로 531 픽셀을 입력하고 비율 유지를 끈 화면">
        <figcaption>가로 413 × 세로 531을 직접 입력하고 '비율 유지'를 끈 상태입니다.</figcaption>
      </figure>
    </section>
```

로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, FAIL 0

- [ ] **Step 5: 커밋**

```bash
git add photo-id-resize.html images/tool-resize-413x531.png tests/seoPagesIntegrity.test.js
git commit -m "$(cat <<'EOF'
Add tool screenshot to photo-id-resize.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `email-attachment-size.html`에 인라인 SVG 차트 삽입

**Files:**
- Modify: `email-attachment-size.html`
- Test: `tests/seoPagesIntegrity.test.js`
- 의존: Task 1의 `.guide-image` 클래스

**Interfaces:**
- Consumes: `.guide-image` CSS(Task 1)
- 새로운 이미지 파일 없음(인라인 SVG)

- [ ] **Step 1: 실패하는 테스트 작성**

```js
test('email-attachment-size.html has an inline SVG chart with correct capacity figures', function () {
  const html = readRepoFile('email-attachment-size.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  assert.ok(/<svg[^>]*role="img"/.test(html), 'missing inline svg chart');
  ['25MB', '10MB'].forEach(function (val) {
    assert.ok(html.includes(val), 'chart missing value ' + val);
  });
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 신규 테스트 FAIL

- [ ] **Step 3: HTML에 SVG 차트 삽입**

`email-attachment-size.html`에서:

```html
    <section class="info-section">
      <h2>서비스별 첨부 용량 제한</h2>
      <p><strong>Gmail</strong> — 기본 첨부 용량은 25MB입니다. 이를 초과하면 Gmail이 자동으로 첨부파일 대신 Google Drive 공유 링크로 바꿔서 보냅니다.</p>
      <p><strong>네이버메일</strong> — 기본 첨부 용량은 10MB입니다. 대용량 첨부 기능을 쓰면 파일당 최대 2GB(최대 10개, 총 20GB)까지 보낼 수 있습니다.</p>
      <p><strong>다음메일</strong> — 기본 첨부 용량은 25MB입니다. 대용량 첨부 기능을 쓰면 최대 4GB까지 보낼 수 있습니다.</p>
    </section>
```

를

```html
    <section class="info-section">
      <h2>서비스별 첨부 용량 제한</h2>
      <p><strong>Gmail</strong> — 기본 첨부 용량은 25MB입니다. 이를 초과하면 Gmail이 자동으로 첨부파일 대신 Google Drive 공유 링크로 바꿔서 보냅니다.</p>
      <p><strong>네이버메일</strong> — 기본 첨부 용량은 10MB입니다. 대용량 첨부 기능을 쓰면 파일당 최대 2GB(최대 10개, 총 20GB)까지 보낼 수 있습니다.</p>
      <p><strong>다음메일</strong> — 기본 첨부 용량은 25MB입니다. 대용량 첨부 기능을 쓰면 최대 4GB까지 보낼 수 있습니다.</p>
      <figure class="guide-image">
        <svg viewBox="0 0 400 220" role="img" aria-labelledby="emailChartTitle emailChartDesc" xmlns="http://www.w3.org/2000/svg">
          <title id="emailChartTitle">이메일 서비스별 기본 첨부 용량 비교</title>
          <desc id="emailChartDesc">Gmail 25MB, 네이버메일 10MB, 다음메일 25MB</desc>
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
        </svg>
        <figcaption>서비스별 기본 첨부 용량(대용량 첨부 기능 사용 시 네이버 2GB, 다음 4GB까지 별도 확장 가능).</figcaption>
      </figure>
    </section>
```

로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, FAIL 0

- [ ] **Step 5: 커밋**

```bash
git add email-attachment-size.html tests/seoPagesIntegrity.test.js
git commit -m "$(cat <<'EOF'
Add inline SVG capacity chart to email-attachment-size.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `image-format-comparison.html`에 인라인 SVG 차트 2개 삽입

**Files:**
- Modify: `image-format-comparison.html`
- Test: `tests/seoPagesIntegrity.test.js`
- 의존: Task 1의 `.guide-image` 클래스

**Interfaces:**
- Consumes: `.guide-image` CSS(Task 1)
- 새로운 이미지 파일 없음(인라인 SVG 2개)

- [ ] **Step 1: 실패하는 테스트 작성**

```js
test('image-format-comparison.html has inline SVG charts with exact benchmark figures', function () {
  const html = readRepoFile('image-format-comparison.html');
  const svgCount = (html.match(/<svg/g) || []).length;
  assert.ok(svgCount >= 2, 'expected at least 2 inline SVG charts, found ' + svgCount);
  ['22,791', '35,171', '6,010', '93.6%', '93.2%'].forEach(function (val) {
    assert.ok(html.includes(val), 'missing figure value ' + val);
  });
  const figureCount = (html.match(/<figure class="guide-image">/g) || []).length;
  assert.ok(figureCount >= 2, 'expected at least 2 guide-image figures, found ' + figureCount);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 신규 테스트 FAIL

- [ ] **Step 3: HTML에 SVG 차트 2개 삽입**

`image-format-comparison.html`에서:

```html
    <section class="info-section">
      <h2>실측 데이터로 보면</h2>
      <p>이론상의 설명만으로는 감이 잘 안 올 수 있어서, 실제로 두 종류의 테스트 이미지(사진형, 그래픽형)를 이 사이트의 압축 도구로 직접 압축해 정확한 바이트 수를 측정했습니다. 전체 결과는 <a href="benchmark.html">실측 압축률 비교</a>에서 확인할 수 있고, 핵심만 요약하면 다음과 같습니다.</p>
      <p>사진형 이미지에서는 JPG와 WebP 모두 80% 품질에서 원본 대비 90% 이상 용량이 줄었습니다. 반면 그래픽형(단색·UI) 이미지에서는 JPG 100% 품질이 오히려 원본 PNG보다 큰 파일로 나왔고, WebP는 100% 품질에서도 원본보다 73.6% 작았습니다. 즉 그래픽·스크린샷류에는 JPG가 잘 맞지 않는다는 것이 실측으로 확인됩니다.</p>
    </section>
```

를

```html
    <section class="info-section">
      <h2>실측 데이터로 보면</h2>
      <p>이론상의 설명만으로는 감이 잘 안 올 수 있어서, 실제로 두 종류의 테스트 이미지(사진형, 그래픽형)를 이 사이트의 압축 도구로 직접 압축해 정확한 바이트 수를 측정했습니다. 전체 결과는 <a href="benchmark.html">실측 압축률 비교</a>에서 확인할 수 있고, 핵심만 요약하면 다음과 같습니다.</p>
      <p>사진형 이미지에서는 JPG와 WebP 모두 80% 품질에서 원본 대비 90% 이상 용량이 줄었습니다. 반면 그래픽형(단색·UI) 이미지에서는 JPG 100% 품질이 오히려 원본 PNG보다 큰 파일로 나왔고, WebP는 100% 품질에서도 원본보다 73.6% 작았습니다. 즉 그래픽·스크린샷류에는 JPG가 잘 맞지 않는다는 것이 실측으로 확인됩니다.</p>
      <figure class="guide-image">
        <svg viewBox="0 0 400 220" role="img" aria-labelledby="graphicChartTitle graphicChartDesc" xmlns="http://www.w3.org/2000/svg">
          <title id="graphicChartTitle">그래픽형 이미지 100% 품질 실측 용량 비교</title>
          <desc id="graphicChartDesc">PNG 원본 22,791바이트, JPG 35,171바이트, WebP 6,010바이트</desc>
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
        </svg>
        <figcaption>그래픽형(단색·UI) 이미지 실측 결과 — JPG 100% 품질(35,171B)이 원본 PNG(22,791B)보다 오히려 큽니다.</figcaption>
      </figure>
      <figure class="guide-image">
        <svg viewBox="0 0 400 220" role="img" aria-labelledby="photoChartTitle photoChartDesc" xmlns="http://www.w3.org/2000/svg">
          <title id="photoChartTitle">사진형 이미지 80% 품질 용량 감소율</title>
          <desc id="photoChartDesc">원본 1,808,456바이트 대비 JPG 93.6% 감소, WebP 93.2% 감소</desc>
          <line x1="20" y1="20" x2="380" y2="20" stroke="#a7e8df" stroke-width="1" stroke-dasharray="4 4"></line>
          <text x="382" y="24" font-size="11" fill="#5b6b6a">100%(원본)</text>
          <line x1="20" y1="180" x2="380" y2="180" stroke="#a7e8df" stroke-width="2"></line>
          <rect x="120" y="30" width="70" height="150" rx="4" fill="#0d9488"></rect>
          <text x="155" y="22" text-anchor="middle" font-size="14" font-weight="600" fill="#1d1d1f">93.6%</text>
          <text x="155" y="200" text-anchor="middle" font-size="13" fill="#5b6b6a">JPG 감소율</text>
          <rect x="230" y="31" width="70" height="149" rx="4" fill="#14b8a6"></rect>
          <text x="265" y="23" text-anchor="middle" font-size="14" font-weight="600" fill="#1d1d1f">93.2%</text>
          <text x="265" y="200" text-anchor="middle" font-size="13" fill="#5b6b6a">WebP 감소율</text>
        </svg>
        <figcaption>사진형 이미지, 80% 품질 기준 용량 감소율 — 원본 1,808,456B → JPG 115,393B(93.6% 감소) / WebP 123,720B(93.2% 감소).</figcaption>
      </figure>
    </section>
```

로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, FAIL 0

- [ ] **Step 5: 커밋**

```bash
git add image-format-comparison.html tests/seoPagesIntegrity.test.js
git commit -m "$(cat <<'EOF'
Add inline SVG benchmark charts to image-format-comparison.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `ai-upscaling-limits.html`에 전/후 비교 이미지 삽입

**Files:**
- Modify: `ai-upscaling-limits.html`
- Test: `tests/seoPagesIntegrity.test.js`
- 의존: Pre-step에서 만든 `images/upscale-before-after.png`, Task 1의 `.guide-image` 클래스

**Interfaces:**
- Consumes: `images/upscale-before-after.png`(Pre-step 산출물), `.guide-image` CSS(Task 1)

- [ ] **Step 1: 실패하는 테스트 작성**

```js
test('ai-upscaling-limits.html has before/after upscale screenshot', function () {
  const html = readRepoFile('ai-upscaling-limits.html');
  assert.ok(html.includes('<figure class="guide-image">'), 'missing guide-image figure');
  const imgMatch = html.match(/<img[^>]*src="images\/upscale-before-after\.png"[^>]*>/);
  assert.ok(imgMatch, 'missing img tag for upscale-before-after.png');
  assert.ok(/alt="[^"]+"/.test(imgMatch[0]), 'image missing non-empty alt text');
  assert.ok(/<figcaption>[^<]+<\/figcaption>/.test(html), 'missing figcaption');
});

test('images/upscale-before-after.png exists on disk', function () {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'images', 'upscale-before-after.png')), 'upscale-before-after.png missing from images/');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 첫 번째 신규 테스트 FAIL

- [ ] **Step 3: HTML에 이미지 삽입**

`ai-upscaling-limits.html`에서:

```html
    <section class="info-section">
      <h2>언제 특히 효과적인가요</h2>
      <p>원본이 어느 정도 선명하지만 해상도만 낮은 경우(초점은 맞았는데 작게 찍힌 사진, 오래돼서 저해상도로만 남은 사진 등)에 가장 효과가 좋습니다. 이런 경우 AI가 참고할 실제 패턴 정보가 충분히 남아 있기 때문입니다.</p>
      <p><a href="upscale.html">이미지 업스케일링</a>에서 직접 확대해보고 결과를 확인해보세요.</p>
    </section>
```

를

```html
    <section class="info-section">
      <h2>언제 특히 효과적인가요</h2>
      <p>원본이 어느 정도 선명하지만 해상도만 낮은 경우(초점은 맞았는데 작게 찍힌 사진, 오래돼서 저해상도로만 남은 사진 등)에 가장 효과가 좋습니다. 이런 경우 AI가 참고할 실제 패턴 정보가 충분히 남아 있기 때문입니다.</p>
      <figure class="guide-image">
        <img src="images/upscale-before-after.png" alt="240x180 저해상도 합성 이미지를 이 사이트 업스케일링 도구로 4배 확대하기 전(원본)과 후(결과) 비교">
        <figcaption>240×180 저해상도 테스트 이미지를 4배 확대한 결과 — 경계와 질감이 더 선명해지지만, 원본에 없던 디테일이 새로 생기는 것은 아닙니다.</figcaption>
      </figure>
      <p><a href="upscale.html">이미지 업스케일링</a>에서 직접 확대해보고 결과를 확인해보세요.</p>
    </section>
```

로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS, FAIL 0

- [ ] **Step 5: 커밋**

```bash
git add ai-upscaling-limits.html images/upscale-before-after.png tests/seoPagesIntegrity.test.js
git commit -m "$(cat <<'EOF'
Add before/after upscale comparison to ai-upscaling-limits.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## 최종 브랜치 리뷰 시 특별히 확인할 항목 (2·3차 배치에서 반복된 실수 패턴)

- 서브에이전트 커밋이 `Co-Authored-By: Claude Sonnet 5`로 정확히 기록됐는지 태스크마다 `git log -1 --format='%B'`로 직접 확인(2차·3차 배치에서 두 번 연속 자기 모델명으로 잘못 커밋한 전례가 있음).
- 어떤 이미지도 이 사이트 도구가 실제로 못 하는 기능(크롭, HEIC 지원, PDF 병합 등)을 하는 것처럼 보이지 않는지 육안 확인.
- 차트 5개(이메일 1개, 포맷비교 2개, 없음)의 숫자가 `benchmark.html`/`email-attachment-size.html` 원문과 셀 단위로 일치하는지 대조.
- `images/` 디렉터리의 파일 3개가 전부 커밋에 포함되어 있고(`git show --stat`), `.gitignore`에 걸려 누락되지 않았는지 확인.
