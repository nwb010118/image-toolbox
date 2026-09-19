# 콘텐츠 깊이 보강 배치 B(가이드 글 8개 + 루트 페이지) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이미 배포된 가이드 글 8개(`sns-blog-image-size.html`, `favicon-og-image-size.html`, `iphone-heic-photo-guide.html`, `monitor-resolution-wallpaper-size.html`, `youtube-thumbnail-size.html`, `old-photo-scan-digitize-workflow.html`, `print-resolution-dpi-guide.html`, `pdf-merge-multiple-files.html`)의 본문을 배치 A와 동일한 방식(FAQ 3개 추가 + 기존 섹션 1개 심화)으로 보강하고, 루트 도메인(`nwb010118.github.io/index.html`, 별도 저장소)을 링크 하나짜리 스텁에서 짧은 소개 콘텐츠로 확장한다.

**Architecture:** 기존 파일들에 대한 타겟 수정만 — 새 페이지 생성 없음, 새 CSS/JS 없음. `image-toolbox` 저장소(8개 글)와 `nwb010118.github.io` 저장소(루트 페이지)는 서로 다른 git 저장소이므로 별도 커밋·푸시가 필요하다.

**Tech Stack:** 순수 HTML 수정. `image-toolbox` 쪽은 Node 무프레임워크 테스트(`tests/seoPagesIntegrity.test.js`에 이어서 작성). `nwb010118.github.io`는 테스트 스위트가 없음 — 수동 검증.

## Global Constraints

- 목표 글자수는 2,500~3,500자가 아니라 배치 A와 같은 현실적 기준(원래 대비 약 1.3~1.6배, FAQ 1개당 실제로는 100~150자)이다. 억지로 채우지 않는다.
- 각 태스크에 적힌 실제 텍스트를 그대로 삽입한다 — 파라프레이즈하거나 문구를 개선하지 않는다.
- 새 CSS 클래스, 새 JSON-LD 타입을 추가하지 않는다. 가이드 글들은 `FAQPage` JSON-LD가 없다(`Article`만 있음) — 이번에도 JSON-LD는 건드리지 않는다.
- 이모지 사용 금지, 한국어, 기존 톤(정직한 고지, 과장 없음) 유지.
- **배치 A 최종 리뷰에서 나온 교훈을 이번 배치의 태스크 브리프 작성 단계에서 미리 반영했다** — 각 태스크의 신규 텍스트는 그 페이지의 변경 전 기존 콘텐츠와 대조해 주제가 겹치지 않도록 이미 설계돼 있다(예: `pdf-merge-multiple-files.html`의 신규 FAQ는 `pdf-file-size-reduction.html`이 이미 다루는 "텍스트 검색 불가" 사실을 다른 질문·다른 문장으로 다룬다 — 완전히 같은 문장이 되지 않도록 주의). 그래도 최종 전체 브랜치 리뷰에서 다시 한번 (a) 각 파일 내부 중복, (b) 이미 배포된 다른 15개 글과의 중복, (c) 자사 도구 능력 관련 신규 주장이 자매 글과 모순되지 않는지를 확인한다.
- 모든 신규 사실 주장은 WebSearch로 확인됨(각 태스크에 출처 요약 기재). 자사 도구 능력 관련 주장은 실제 코드로 확인된 기존 사실(단일 파일 처리, 크롭 기능 없음, HEIC 미지원 등)과 일치해야 한다.
- 루트 페이지(`nwb010118.github.io/index.html`) 신규 문장은 `about.html`(image-toolbox 소개 페이지, 같은 애드센스 계정)과 다른 각도(개인 관점 vs 서비스 관점)로 쓴다 — `about.html`의 문장을 재사용하지 않는다.

---

## Task 1: 통합 검증 테스트 확장 (실패 확인)

**Files:**
- Modify: `tests/seoPagesIntegrity.test.js` (파일 끝에 이어서 작성)

- [ ] **Step 1: 테스트 파일 끝에 아래 코드를 추가**

```javascript

const BATCH_B_MIN_LENGTH = {
  'sns-blog-image-size.html': 1780,
  'favicon-og-image-size.html': 2030,
  'iphone-heic-photo-guide.html': 1870,
  'monitor-resolution-wallpaper-size.html': 1970,
  'youtube-thumbnail-size.html': 1750,
  'old-photo-scan-digitize-workflow.html': 1700,
  'print-resolution-dpi-guide.html': 2050,
  'pdf-merge-multiple-files.html': 1550
};

Object.keys(BATCH_B_MIN_LENGTH).forEach(function (file) {
  test(file + ' body text has grown past the batch-B minimum length', function () {
    const html = readRepoFile(file);
    const len = mainTextLength(html);
    assert.ok(len >= BATCH_B_MIN_LENGTH[file], file + ' body text is ' + len + ' chars, expected >= ' + BATCH_B_MIN_LENGTH[file]);
  });

  test(file + ' has 6 FAQ items (3 original + 3 new)', function () {
    const html = readRepoFile(file);
    const count = (html.match(/<details>/g) || []).length;
    assert.strictEqual(count, 6, file + ' has ' + count + ' <details> items, expected 6');
  });
});

test('sns-blog-image-size.html new FAQ covers X/Twitter similarity, single-file limitation, and no-auto-crop honesty', function () {
  const html = readRepoFile('sns-blog-image-size.html');
  assert.ok(html.includes('트위터') || html.includes('X('), 'missing X/Twitter FAQ');
  assert.ok(html.includes('한 번에 한 장씩'), 'missing single-file-processing honesty');
});

test('favicon-og-image-size.html new FAQ covers missing og:image behavior, favicon format flexibility, and dark mode', function () {
  const html = readRepoFile('favicon-og-image-size.html');
  assert.ok(html.includes('og:image가 없으면'), 'missing og:image-absent FAQ');
  assert.ok(html.includes('다크모드'), 'missing dark mode favicon FAQ');
});

test('iphone-heic-photo-guide.html new FAQ covers iCloud download options, Mac native support, and metadata', function () {
  const html = readRepoFile('iphone-heic-photo-guide.html');
  assert.ok(html.includes('아이클라우드') || html.includes('iCloud'), 'missing iCloud FAQ');
  assert.ok(html.includes('메타데이터'), 'missing metadata FAQ');
});

test('monitor-resolution-wallpaper-size.html new FAQ covers laptop resolution, dual monitor sizing, and vertical wallpaper', function () {
  const html = readRepoFile('monitor-resolution-wallpaper-size.html');
  assert.ok(html.includes('노트북'), 'missing laptop resolution FAQ');
  assert.ok(html.includes('듀얼모니터'), 'missing dual monitor FAQ');
});

test('youtube-thumbnail-size.html new content covers phone verification, thumbnail re-editing, and Shorts thumbnails', function () {
  const html = readRepoFile('youtube-thumbnail-size.html');
  assert.ok(html.includes('전화번호 인증'), 'missing phone verification requirement');
  assert.ok(html.includes('Shorts'), 'missing Shorts thumbnail FAQ');
});

test('old-photo-scan-digitize-workflow.html new content covers scanner types and honestly discloses no color-fade restoration', function () {
  const html = readRepoFile('old-photo-scan-digitize-workflow.html');
  assert.ok(html.includes('필름스캐너'), 'missing scanner type distinction');
  assert.ok(html.includes('색 보정 기능을 제공하지 않습니다'), 'missing honest color-fade-restoration disclosure');
});

test('print-resolution-dpi-guide.html new content covers business-card/banner examples and PPI-vs-DPI distinction', function () {
  const html = readRepoFile('print-resolution-dpi-guide.html');
  assert.ok(html.includes('명함'), 'missing business card DPI example');
  assert.ok(html.includes('PPI'), 'missing PPI-vs-DPI FAQ');
});

test('pdf-merge-multiple-files.html new content covers filename ordering tip, password-protected PDFs, and page rotation, phrased distinctly from pdf-file-size-reduction.html', function () {
  const html = readRepoFile('pdf-merge-multiple-files.html');
  assert.ok(html.includes('001'), 'missing filename-numbering ordering tip');
  assert.ok(html.includes('암호'), 'missing password-protected-PDF FAQ');
  const otherHtml = readRepoFile('pdf-file-size-reduction.html');
  const thisText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const otherText = otherHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const thisSents = thisText.split(/(?<=[.?!다요])\s+/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 20; });
  const otherSents = otherText.split(/(?<=[.?!다요])\s+/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 20; });
  const common = thisSents.filter(function (s) { return otherSents.includes(s); });
  assert.strictEqual(common.length, 0, 'pdf-merge-multiple-files.html shares a verbatim sentence with pdf-file-size-reduction.html: ' + JSON.stringify(common));
});
```

- [ ] **Step 2: 실행해서 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^FAIL"`
Expected: 8개 파일 × 2개 공통 검사(16) + 8개 개별 사실 검증 = 24개 전후 FAIL. exit code 1. 기존 199개 테스트(배치 A까지 포함)는 전부 PASS 유지.
Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^PASS"`
Expected: 199.

- [ ] **Step 3: 커밋**

```bash
git add tests/seoPagesIntegrity.test.js
git commit -m "test: add content-depth checks for guide articles batch B

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: `sns-blog-image-size.html` 보강

**Files:**
- Modify: `sns-blog-image-size.html`

**출처**: X(트위터) 이미지 규격은 picssizer.com/influencermarketinghub.com 2026 가이드(WebSearch로 확인) — 세로형 1080×1350px(4:5), 정사각형 1080×1080px, 헤더 1500×500px. 단일 파일 처리·크롭 기능 없음은 자사 코드 사실(`js/app.js`의 `selectedFile` 단수, `accept` 크롭 UI 없음 — 이미 배치 A `image-format-comparison.html` 태스크에서 확인된 것과 동일한 사실).

- [ ] **Step 1: "브라우저에서 규격에 맞게 크기 조정하는 법" 섹션에 심화 단락 추가**

파일의 66-69번째 줄(`<figure class="guide-image">`...`</figure>`) 다음, 70번째 줄(`</section>`) 앞에 삽입한다.

```html
      <p>플랫폼별로 매번 다른 사진을 준비하기 번거롭다면, 가장 넓은 비율(9:16 스토리용)로 원본을 하나 마련해두고 필요할 때마다 4:5나 1:1로 다시 잘라 쓰는 방법도 있습니다. 세로로 긴 원본에서 가운데 부분을 잘라내면 정사각형이나 4:5 비율로도 자연스럽게 재사용할 수 있지만, 반대로 정사각형 원본에서 세로로 긴 스토리 비율을 만들려면 위아래에 여백을 채워야 해서, 화질 손해가 없는 방향(넓은 비율 → 좁은 비율)으로 원본을 준비하는 것이 유리합니다.</p>
```

- [ ] **Step 2: FAQ 섹션에 새 항목 3개 추가**

85번째 줄(세 번째 `</details>`) 바로 뒤, 86번째 줄(`</section>`) 앞에 삽입한다.

```html
      <details>
        <summary>페이스북이나 X(트위터)에도 비슷한 규격을 쓸 수 있나요?</summary>
        <p>X(트위터)는 세로형 이미지 1080×1350px(4:5), 정사각형 1080×1080px을 지원해 인스타그램 피드 규격과 거의 같습니다. 페이스북은 위치마다 표시 방식이 조금씩 달라서, 여러 플랫폼에 두루 쓸 사진이라면 가장 넓은 비율로 원본을 만들어두고 필요할 때 다시 자르는 방법을 권장합니다.</p>
      </details>
      <details>
        <summary>여러 장을 한 번에 규격에 맞게 변환할 수 있나요?</summary>
        <p>아니요. 이 사이트의 압축 도구는 한 번에 한 장씩 처리합니다. 여러 장을 같은 규격으로 맞추려면 한 장씩 순서대로 업로드해서 처리해야 합니다.</p>
      </details>
      <details>
        <summary>규격보다 훨씬 큰 사진을 올리면 자동으로 잘리나요?</summary>
        <p>아니요. 이 도구는 자르기(크롭)가 아니라 가로세로 값을 직접 지정해 늘리거나 줄이는 방식입니다. 원본 비율이 목표 규격과 다르면 화면이 눌리거나 늘어나 보일 수 있어, 먼저 사진 편집 프로그램으로 원하는 비율에 맞게 잘라내는 과정이 필요합니다.</p>
      </details>
```

- [ ] **Step 3: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -A1 "sns-blog-image-size"`
Expected: 해당 테스트 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add sns-blog-image-size.html
git commit -m "Deepen sns-blog-image-size.html content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: `favicon-og-image-size.html` 보강

**Files:**
- Modify: `favicon-og-image-size.html`

**출처**: 카카오 데브톡(devtalk.kakao.com, WebSearch로 확인) — og:image가 없으면 카카오톡 등 플랫폼이 페이지에서 임의로 이미지를 골라 보여줌(의도치 않은 노출). 파비콘 형식(wearetenet.com 등, WebSearch로 확인) — PNG가 현재 가장 널리 쓰이는 단일 선택지이며 .ico는 필수가 아니라 구형 브라우저용 폴백.

- [ ] **Step 1: "og:image(소셜 공유 미리보기 이미지)" 섹션에 심화 단락 추가**

파일의 63번째 줄(`<p>카카오톡, 페이스북...`) 다음, 64번째 줄(`</section>`) 앞에 삽입한다.

```html
      <p>카카오톡은 별도의 전용 태그 없이 표준 og:image만 인식합니다. 다만 og:image를 설정하지 않으면 카카오톡을 포함한 대부분의 플랫폼이 페이지 안에서 임의로 이미지를 찾아 보여주기 때문에, 의도하지 않은 이미지가 미리보기에 노출될 수 있습니다. 링크를 공유하기 전에 원하는 이미지가 제대로 나오는지 미리 확인하는 것이 안전합니다.</p>
```

- [ ] **Step 2: FAQ 섹션에 새 항목 3개 추가**

113번째 줄(세 번째 `</details>`) 바로 뒤, 114번째 줄(`</section>`) 앞에 삽입한다.

```html
      <details>
        <summary>og:image가 없으면 어떻게 되나요?</summary>
        <p>카카오톡을 포함한 대부분의 플랫폼이 페이지 안에서 임의로 이미지를 골라 보여줍니다. 의도한 이미지가 아니거나 아예 이미지 없이 텍스트만 보일 수도 있어, og:image를 직접 지정해두는 것이 안전합니다.</p>
      </details>
      <details>
        <summary>파비콘 파일 형식은 꼭 .ico여야 하나요?</summary>
        <p>아니요. 요즘은 PNG를 파비콘으로 쓰는 경우가 가장 많고, 투명 배경을 지원해 밝은 화면과 어두운 화면 모두에서 무난하게 보입니다. .ico는 구형 브라우저를 위한 호환용으로만 함께 준비해두면 충분합니다.</p>
      </details>
      <details>
        <summary>다크모드 파비콘도 따로 만들어야 하나요?</summary>
        <p>필수는 아닙니다. 다만 흰색이나 밝은 색 위주의 파비콘은 어두운 배경의 브라우저 탭에서 잘 안 보일 수 있어, 투명 배경에 테두리를 살짝 넣는 등으로 대비를 확보해두면 도움이 됩니다.</p>
      </details>
```

- [ ] **Step 3: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -A1 "favicon-og-image-size"`
Expected: 해당 테스트 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add favicon-og-image-size.html
git commit -m "Deepen favicon-og-image-size.html content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: `iphone-heic-photo-guide.html` 보강

**Files:**
- Modify: `iphone-heic-photo-guide.html`

**출처**: Apple 공식 지원 문서(support.apple.com, WebSearch로 확인) — 아이클라우드닷컴 다운로드 시 '원본 그대로'/'최고 해상도(HEIC)'/'가장 호환 가능(JPEG)' 3가지 옵션 제공. 맥에서 HEIC는 우클릭 '미리보기로 열기' 또는 사진 앱으로 기본 지원.

- [ ] **Step 1: "해결 방법 2: 이미 찍어둔 HEIC 사진 변환하기" 섹션에 심화 단락 추가**

파일의 67번째 줄(`<p>이미 찍어둔 HEIC 사진은...`) 다음, 68번째 줄(`</section>`) 앞에 삽입한다.

```html
      <p>에어드롭으로 다른 아이폰이나 맥에 보낼 때는 HEIC 그대로 전달되는 경우가 많습니다(받는 기기도 애플 제품이라 문제없이 열리기 때문입니다). 반면 카카오톡으로 사진을 보내면 카카오톡이 자동으로 JPG로 변환해서 전송하는 경우가 대부분이라, 굳이 별도 변환 없이도 카카오톡을 거치면 JPG로 바뀝니다.</p>
```

- [ ] **Step 2: FAQ 섹션에 새 항목 3개 추가**

88번째 줄(세 번째 `</details>`) 바로 뒤, 89번째 줄(`</section>`) 앞에 삽입한다.

```html
      <details>
        <summary>아이클라우드에 저장된 사진도 HEIC인가요?</summary>
        <p>아이클라우드닷컴에서 사진을 내려받을 때는 '원본 그대로', '최고 해상도(HEIC)', '가장 호환 가능(JPEG)' 중에서 고를 수 있습니다. '가장 호환 가능'을 선택하면 변환 과정 없이 바로 JPEG로 받을 수 있습니다.</p>
      </details>
      <details>
        <summary>맥으로 옮기면 바로 열리나요?</summary>
        <p>네. HEIC는 애플이 만든 형식이라 맥에서는 파일을 우클릭해 '미리보기로 열기'를 선택하거나 사진 앱으로 가져오면 별도 변환 없이 바로 열립니다.</p>
      </details>
      <details>
        <summary>변환하면 원본 위치나 촬영 정보(메타데이터)가 사라지나요?</summary>
        <p>사용하는 변환 방법에 따라 다릅니다. 아이폰의 공유 기능을 거치는 경우 대부분 촬영 날짜 등 기본 정보는 유지되지만, 일부 변환 앱은 메타데이터를 유지하지 않을 수 있어 중요한 사진이라면 변환 후 정보가 남아있는지 확인하는 것이 안전합니다.</p>
      </details>
```

- [ ] **Step 3: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -A1 "iphone-heic-photo-guide"`
Expected: 해당 테스트 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add iphone-heic-photo-guide.html
git commit -m "Deepen iphone-heic-photo-guide.html content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: `monitor-resolution-wallpaper-size.html` 보강

**Files:**
- Modify: `monitor-resolution-wallpaper-size.html`

**출처**: 노트북 표준 해상도 1366×768px(WebSearch로 확인, 저가형 노트북에 여전히 널리 쓰임). 듀얼모니터·세로형 계산은 기존 페이지에 이미 확인된 FHD/QHD/4K 수치를 그대로 활용한 산술로, 새 외부 사실 불필요.

- [ ] **Step 1: "원본 사진이 작다면" 섹션에 심화 단락 추가**

파일의 64번째 줄(`<p>AI 업스케일링은 있던 픽셀...`) 다음, 65번째 줄(`</section>`) 앞에 삽입한다.

```html
      <p>요즘 스마트폰으로 찍은 사진은 대부분 가로세로 3000px 이상이라, 이 도구의 입력 제한(1000px 이하)을 넘어서는 경우가 많습니다. 이런 사진은 애초에 업스케일링이 필요 없고, 이미지 압축 도구로 목표 해상도에 맞게 줄이기만 하면 됩니다. 반대로 오래된 스캔본이나 캡처 이미지처럼 원본이 작은 경우에만 업스케일링이 필요합니다.</p>
```

- [ ] **Step 2: FAQ 섹션에 새 항목 3개 추가**

85번째 줄(세 번째 `</details>`) 바로 뒤, 86번째 줄(`</section>`) 앞에 삽입한다.

```html
      <details>
        <summary>노트북 화면도 같은 기준인가요?</summary>
        <p>노트북은 화면 크기가 작아도 해상도는 다양합니다. 저가형 노트북은 아직 1366×768px을 쓰는 경우가 많고, 그 외에는 데스크톱과 마찬가지로 FHD·QHD·4K 중 하나를 씁니다. 배경화면을 만들 때는 실제 노트북 화면 해상도를 먼저 확인하는 것이 정확합니다.</p>
      </details>
      <details>
        <summary>듀얼모니터는 배경화면을 두 배 크기로 만들어야 하나요?</summary>
        <p>듀얼모니터를 하나의 넓은 배경화면으로 쓰고 싶다면 각 모니터 해상도를 가로로 합친 크기(예: FHD 두 대면 3840×1080px)로 준비해야 합니다. 모니터마다 다른 사진을 쓴다면 각각 해당 모니터 해상도에 맞추면 됩니다.</p>
      </details>
      <details>
        <summary>세로형(모바일) 배경화면은 어떻게 다른가요?</summary>
        <p>가로세로가 뒤바뀐 크기로 준비하면 됩니다. 예를 들어 FHD 모니터가 1920×1080px이라면, 세로형은 1080×1920px입니다.</p>
      </details>
```

- [ ] **Step 3: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -A1 "monitor-resolution-wallpaper-size"`
Expected: 해당 테스트 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add monitor-resolution-wallpaper-size.html
git commit -m "Deepen monitor-resolution-wallpaper-size.html content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: `youtube-thumbnail-size.html` 보강

**Files:**
- Modify: `youtube-thumbnail-size.html`

**출처**: YouTube 공식 고객센터(support.google.com/youtube, WebSearch로 확인) — 맞춤 썸네일은 전화번호 인증 필요, 반복적 가이드 위반 시 30일 제한. Shorts 썸네일은 2026년 기준 모바일 전용으로 프레임 선택 방식이 기본이며 유튜브 파트너 프로그램 채널은 직접 만든 이미지 업로드 가능(WebSearch로 확인, 여러 출처 교차 확인).

- [ ] **Step 1: "유튜브 공식 기준" 섹션에 심화 단락 추가**

파일의 69번째 줄(`<p>블로그나 커뮤니티에...`) 다음, 70번째 줄(`</section>`) 앞에 삽입한다.

```html
      <p>맞춤 썸네일을 올리려면 먼저 계정 인증이 필요합니다. 전화번호 인증만으로도 업로드 권한을 받을 수 있고, 더 많은 기능이 필요하면 영상이나 신분증 인증, 채널 활동 기록으로도 인증할 수 있습니다. 커뮤니티 가이드를 반복해서 위반하면 30일 동안 맞춤 썸네일 기능이 제한될 수 있습니다.</p>
```

- [ ] **Step 2: FAQ 섹션에 새 항목 3개 추가**

90번째 줄(세 번째 `</details>`) 바로 뒤, 91번째 줄(`</section>`) 앞에 삽입한다.

```html
      <details>
        <summary>썸네일 기능이 계정에서 비활성화돼 있으면 어떻게 하나요?</summary>
        <p>맞춤 썸네일은 전화번호 인증을 마쳐야 사용할 수 있습니다. 유튜브 스튜디오에서 전화번호 인증을 진행하면 대부분 바로 업로드 권한이 생깁니다.</p>
      </details>
      <details>
        <summary>이미 업로드한 영상의 썸네일도 나중에 바꿀 수 있나요?</summary>
        <p>네. 유튜브 스튜디오에서 언제든지 기존 영상의 썸네일을 새 이미지로 교체할 수 있습니다.</p>
      </details>
      <details>
        <summary>Shorts는 썸네일을 따로 설정할 수 있나요?</summary>
        <p>네, 되지만 방식이 다릅니다. Shorts는 PC가 아닌 모바일 앱에서만 썸네일을 바꿀 수 있고, 기본적으로는 영상 속 원하는 프레임을 표지로 고르는 방식입니다. 유튜브 파트너 프로그램에 가입된 채널이라면 직접 만든 이미지를 썸네일로 올리는 것도 가능합니다.</p>
      </details>
```

- [ ] **Step 3: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -A1 "youtube-thumbnail-size"`
Expected: 해당 테스트 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add youtube-thumbnail-size.html
git commit -m "Deepen youtube-thumbnail-size.html content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: `old-photo-scan-digitize-workflow.html` 보강

**Files:**
- Modify: `old-photo-scan-digitize-workflow.html`

**출처**: 스캐너 종류 비교(WebSearch로 확인) — 필름스캐너가 필름·네거티브에는 플랫베드보다 초점·해상도가 유리함. 색바램은 스캔 자체로 보정되지 않으며 별도 사진 편집 프로그램이 필요하다는 것은 이 사이트에 색보정 기능이 없다는 자사 코드 사실과 결합한 정직 고지.

- [ ] **Step 1: "1단계: 몇 DPI로 스캔해야 할까" 섹션에 심화 단락 추가**

파일의 52번째 줄(`<p>단순히 보관만 할 목적이라면...`) 다음, 53번째 줄(`</section>`) 앞에 삽입한다.

```html
      <p>스캐너 종류도 결과에 영향을 줍니다. 일반적인 평판(플랫베드) 스캐너는 인화된 사진을 스캔하기에 적합하지만, 필름이나 네거티브 원본이 있다면 전용 필름스캐너가 초점과 해상도 면에서 더 좋은 결과를 냅니다. 컬러 사진은 컬러로, 흑백 사진은 흑백 모드로 스캔해야 불필요하게 파일이 커지지 않습니다.</p>
```

- [ ] **Step 2: FAQ 섹션에 새 항목 3개 추가**

87번째 줄(세 번째 `</details>`) 바로 뒤, 88번째 줄(`</section>`) 앞에 삽입한다.

```html
      <details>
        <summary>스캔 앱(스마트폰 카메라)으로 찍어도 되나요?</summary>
        <p>전용 스캐너보다는 화질이 떨어지지만, 스캐너가 없을 때 대안으로는 쓸 수 있습니다. 빛 반사와 그림자가 생기지 않도록 조명에 신경 쓰고, 사진을 최대한 평평하게 펴서 촬영하는 것이 중요합니다.</p>
      </details>
      <details>
        <summary>여러 장을 한 번에 스캔하면 나중에 어떻게 나누나요?</summary>
        <p>스캐너로 여러 장을 한 번에 스캔한 뒤에는 사진 편집 프로그램으로 각 사진 영역만 따로 잘라내야 합니다. 이 사이트의 도구는 한 이미지 안에서 특정 영역만 잘라내는 기능은 없습니다.</p>
      </details>
      <details>
        <summary>색이 바랜 사진도 스캔하면 원래 색으로 돌아오나요?</summary>
        <p>아니요. 스캔은 있는 그대로를 디지털로 옮기는 과정이라 색 바램 자체가 없어지지는 않습니다. 색 보정은 스캔 후 별도의 사진 편집 프로그램에서 진행해야 하며, 이 사이트는 색 보정 기능을 제공하지 않습니다.</p>
      </details>
```

- [ ] **Step 3: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -A1 "old-photo-scan-digitize-workflow"`
Expected: 해당 테스트 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add old-photo-scan-digitize-workflow.html
git commit -m "Deepen old-photo-scan-digitize-workflow.html content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: `print-resolution-dpi-guide.html` 보강

**Files:**
- Modify: `print-resolution-dpi-guide.html`

**출처**: 명함(90×50mm)·현수막 DPI 권장치(printrobo.co.kr, threads 디자인 계정 등 복수 출처 교차 확인, WebSearch) — 명함류 300DPI(고급은 350DPI), 대형 현수막·배너 100~150DPI. PPI/DPI 용어 구분은 일반적으로 통용되는 기술 정의.

- [ ] **Step 1: "인쇄물별 권장 DPI" 섹션에 심화 단락 추가**

파일의 57번째 줄(`<p>안전하게 인쇄하려면...`) 다음, 58번째 줄(`</section>`) 앞에 삽입한다.

```html
      <p>구체적인 인쇄물 예시로 감을 잡아보면, 명함(보통 90×50mm)처럼 가까이서 보는 작은 인쇄물은 300DPI가 표준입니다. 현수막이나 대형 배너처럼 사람이 멀리서 보는 인쇄물은 100~150DPI 정도로도 충분한 경우가 많아, 무조건 300DPI를 고집하면 필요 이상으로 큰 파일이 됩니다.</p>
```

- [ ] **Step 2: FAQ 섹션에 새 항목 3개 추가**

98번째 줄(세 번째 `</details>`) 바로 뒤, 99번째 줄(`</section>`) 앞에 삽입한다.

```html
      <details>
        <summary>인쇄소마다 요구하는 DPI가 다른가요?</summary>
        <p>네. 인쇄소나 인쇄 방식에 따라 권장 DPI가 조금씩 다를 수 있습니다. 정확한 기준은 실제로 인쇄를 맡길 업체에 미리 확인하는 것이 가장 안전합니다.</p>
      </details>
      <details>
        <summary>PPI와 DPI는 같은 말인가요?</summary>
        <p>엄밀히는 다릅니다. PPI(Pixels Per Inch)는 화면이나 이미지 파일의 픽셀 밀도를, DPI(Dots Per Inch)는 프린터가 실제로 찍는 잉크 점의 밀도를 가리킵니다. 다만 일상적으로는 두 용어가 거의 같은 의미로 섞여 쓰이는 경우가 많습니다.</p>
      </details>
      <details>
        <summary>인쇄물이 흐려 보이면 항상 DPI가 원인인가요?</summary>
        <p>아닙니다. DPI(해상도)가 충분해도 원본 사진 자체가 흔들렸거나 초점이 안 맞았다면 인쇄해도 선명해지지 않습니다. 흐림의 원인이 해상도 부족인지 원본 화질 문제인지 먼저 확인하는 것이 좋습니다.</p>
      </details>
```

- [ ] **Step 3: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -A1 "print-resolution-dpi-guide"`
Expected: 해당 테스트 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add print-resolution-dpi-guide.html
git commit -m "Deepen print-resolution-dpi-guide.html content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: `pdf-merge-multiple-files.html` 보강

**Files:**
- Modify: `pdf-merge-multiple-files.html`

**출처**: 파일명 정렬 팁은 일반적인 파일 관리 상식(외부 검색 불필요). 텍스트 검색 불가 사실은 이 사이트의 이미지 기반 재조립 방식(자사 코드 사실, `pdf-file-size-reduction.html`이 이미 같은 사실을 다른 질문·다른 문장으로 다룸 — Task 1의 자동 검사가 두 파일 간 문장 겹침이 없는지 확인한다). 암호 걸린 PDF·페이지 회전은 이 사이트에 해당 처리 기능이 없다는 정직 고지(자사 코드에 암호 해제·회전 기능 없음, 코드 확인 완료).

- [ ] **Step 1: "우회 방법: 이미지로 추출 → 순서대로 배열 → 다시 합치기" 섹션에 심화 단락 추가**

파일의 58-61번째 줄(`<figure class="guide-image">`...`</figure>`) 다음, 62번째 줄(`</section>`) 앞에 삽입한다.

```html
      <p>순서를 정확히 맞추려면 추출한 이미지 파일명에 001, 002처럼 앞자리에 번호를 붙여두는 것이 편합니다. 파일 탐색기나 갤러리 앱에서 파일명 기준으로 정렬하면 의도한 순서 그대로 나열되고, 이 순서대로 이미지→PDF에 업로드하면 됩니다.</p>
```

- [ ] **Step 2: FAQ 섹션에 새 항목 3개 추가**

82번째 줄(세 번째 `</details>`) 바로 뒤, 83번째 줄(`</section>`) 앞에 삽입한다.

```html
      <details>
        <summary>재합친 PDF도 텍스트를 검색하거나 복사할 수 있나요?</summary>
        <p>아니요. 이 우회법은 PDF 페이지를 이미지로 바꿔서 다시 합치는 방식이라, 결과물은 텍스트 레이어가 없는 이미지 기반 PDF가 됩니다. 원본에 있던 글자를 검색하거나 마우스로 선택하는 기능은 사라집니다.</p>
      </details>
      <details>
        <summary>암호가 걸린 PDF도 합칠 수 있나요?</summary>
        <p>먼저 암호를 풀어야 이미지로 추출할 수 있습니다. 이 사이트는 PDF 암호 해제 기능을 제공하지 않으므로, 별도 프로그램으로 암호를 해제한 뒤 이 방법을 이용해야 합니다.</p>
      </details>
      <details>
        <summary>페이지 방향(회전)이 다른 PDF끼리도 합쳐지나요?</summary>
        <p>이미지로 추출된 각 페이지는 원본 PDF에 표시된 방향 그대로 이미지가 됩니다. 방향이 제각각이면 합친 뒤에도 그대로 제각각으로 보이므로, 필요하면 이미지 편집 프로그램으로 방향을 맞춘 뒤 합치는 것이 좋습니다.</p>
      </details>
```

- [ ] **Step 3: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -A1 "pdf-merge-multiple-files"`
Expected: 해당 테스트 전부 PASS(문장 겹침 검사 포함).

- [ ] **Step 4: 커밋**

```bash
git add pdf-merge-multiple-files.html
git commit -m "Deepen pdf-merge-multiple-files.html content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 10: 루트 페이지(`nwb010118.github.io/index.html`) 보강

**Files:**
- Modify: `C:\Users\A\projects\nwb010118.github.io\index.html` (별도 저장소, `image-toolbox`와 다른 git remote — 이 태스크는 `C:\Users\A\projects\nwb010118.github.io`에서 작업한다)

**출처 없음(창작 콘텐츠)** — 개인 소개글이라 외부 사실 확인 불필요. `about.html`(image-toolbox, 같은 애드센스 계정)과 겹치지 않는 각도(개인 관점)로 작성됨을 아래에서 확인한다: `about.html`은 "신분증, 계약서, 사적인 사진처럼 민감한 파일을... 서버에 저장되거나 남는 건 아닌지 걱정되는 경우가 많습니다"(서비스 원칙 관점)로 시작하는데, 아래 신규 문구는 "광고·회원가입이 번거로웠다"(개인 동기 관점)로 완전히 다른 이유를 제시한다 — 절대 `about.html` 문장을 재사용하지 않는다.

- [ ] **Step 1: `<body>` 내용을 교체**

기존:
```html
<body>
  <h1>nwb010118</h1>
  <ul>
    <li><a href="/image-toolbox/">이미지 압축 · PDF 변환 도구</a></li>
  </ul>
</body>
```

다음으로 교체:
```html
<body>
  <h1>nwb010118</h1>
  <p>안녕하세요, nwb010118입니다. 이 도메인은 제가 취미 삼아 만든 작은 웹 프로젝트들을 모아두는 공간입니다.</p>
  <p>평소 온라인에서 이미지나 PDF를 다루는 도구를 찾아보면, 광고가 화면을 가득 채우거나 회원가입을 요구하는 경우가 많았습니다. 정작 필요한 건 파일 하나 빠르게 처리하는 것뿐인데 말이죠. 그래서 제가 직접 쓰고 싶은 수준으로 간단하고 빠른 도구를 만들어보기 시작했습니다.</p>
  <p>지금은 이미지 압축·PDF 변환·AI 업스케일링을 다루는 image-toolbox를 운영하고 있습니다. 혼자 만들고 관리하는 프로젝트라 기능이 많지는 않지만, 필요한 순간에 방해받지 않고 쓸 수 있게 만드는 것을 목표로 하고 있습니다.</p>
  <ul>
    <li><a href="/image-toolbox/">이미지 압축 · PDF 변환 도구</a></li>
  </ul>
</body>
```

- [ ] **Step 2: 파일 유효성 수동 확인**

Run (working directory: `C:\Users\A\projects\nwb010118.github.io`): `node -e "const fs=require('fs'); const html=fs.readFileSync('index.html','utf8'); console.log(html.includes('<h1>nwb010118</h1>') && html.includes('image-toolbox') ? 'OK: structure intact' : 'FAIL: structure broken');"`
Expected: `OK: structure intact`

Run: `node -e "const fs=require('fs'); const html=fs.readFileSync('index.html','utf8'); const text=html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); console.log('body text length: ' + text.length);"`
Expected: 400자 이상(이전 대비 대폭 증가 — 이전에는 'nwb010118 이미지 압축 · PDF 변환 도구'뿐이었음).

- [ ] **Step 3: `about.html`과 문장 단위 중복이 없는지 확인**

Run (working directory: `C:\Users\A\projects\image-toolbox`): 
```bash
node -e "
const fs = require('fs');
const rootHtml = fs.readFileSync('../nwb010118.github.io/index.html', 'utf8');
const aboutHtml = fs.readFileSync('about.html', 'utf8');
const rootText = rootHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const aboutText = aboutHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const rootSents = rootText.split(/(?<=[.?!다요])\s+/).map(s => s.trim()).filter(s => s.length > 15);
const aboutSents = aboutText.split(/(?<=[.?!다요])\s+/).map(s => s.trim()).filter(s => s.length > 15);
const common = rootSents.filter(s => aboutSents.includes(s));
console.log(common.length === 0 ? 'done: no overlap' : 'FOUND OVERLAP: ' + JSON.stringify(common));
"
```
Expected: `done: no overlap`

- [ ] **Step 4: 커밋 (이 저장소는 로컬 브랜치 `main`)**

```bash
cd "C:\Users\A\projects\nwb010118.github.io"
git add index.html
git commit -m "Expand root page from a link-only stub to a short intro

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 11: 전체 회귀 검증 + 문장 단위 중복 확인 (image-toolbox 저장소)

**Files:**
- 없음(읽기·검증만)

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run (working directory: `C:\Users\A\projects\image-toolbox`): `node tests/seoPagesIntegrity.test.js > /tmp/batch_b_final.txt 2>&1; echo "EXIT=$?"; grep -c "^PASS" /tmp/batch_b_final.txt; grep -c "^FAIL" /tmp/batch_b_final.txt`
Expected: `EXIT=0`, PASS 카운트가 기존 199 + 이번에 추가한 테스트 수(8×2 + 8 = 24) = 223, FAIL 0.

- [ ] **Step 2: 배치 B 8개 글이 서로, 그리고 기존 배포된 다른 15개 글(배치 A 8개 포함)과 문장 단위로 준중복이 아닌지 확인**

Run:
```bash
node -e "
const fs = require('fs');
const batchB = ['sns-blog-image-size.html','favicon-og-image-size.html','iphone-heic-photo-guide.html','monitor-resolution-wallpaper-size.html','youtube-thumbnail-size.html','old-photo-scan-digitize-workflow.html','print-resolution-dpi-guide.html','pdf-merge-multiple-files.html'];
const others = ['kakao-photo-quality.html','email-attachment-size.html','image-format-comparison.html','photo-id-resize.html','ai-upscaling-limits.html','web-image-loading-speed.html','cloud-storage-photo-tips.html','pdf-file-size-reduction.html'];
const allFiles = batchB.concat(others);
const sentences = {};
allFiles.forEach(f => {
  const html = fs.readFileSync(f, 'utf8');
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const sents = text.split(/(?<=[.?!다요])\s+/).map(s => s.trim()).filter(s => s.length > 20);
  sentences[f] = sents;
});
let found = false;
for (let i = 0; i < batchB.length; i++) {
  for (let j = 0; j < allFiles.length; j++) {
    if (allFiles[j] === batchB[i]) continue;
    if (j < i && batchB.includes(allFiles[j])) continue;
    const common = sentences[batchB[i]].filter(s => sentences[allFiles[j]].includes(s));
    if (common.length > 0) {
      found = true;
      console.log('DUPLICATE between ' + batchB[i] + ' and ' + allFiles[j] + ':', common);
    }
  }
}
console.log(found ? 'FOUND DUPLICATES' : 'done');
"
```
Expected: `done`만 출력되거나, 사이트 공통 footer 문구("일상의 이미지 작업을, 간편하고 안전하게.")나 "관련 페이지" 링크 목록 겹침만 나온다면 정상(배치 A 최종 검증 때도 동일한 종류의 false positive였음). 그 외의 실제 산문 문장이 겹치면 해당 배치 B 파일의 문장을 고쳐 쓴다.

- [ ] **Step 3: 최종 글자 수 리포트**

Run:
```bash
for f in sns-blog-image-size.html favicon-og-image-size.html iphone-heic-photo-guide.html monitor-resolution-wallpaper-size.html youtube-thumbnail-size.html old-photo-scan-digitize-workflow.html print-resolution-dpi-guide.html pdf-merge-multiple-files.html; do
  node -e "
const fs=require('fs');
let html=fs.readFileSync('$f','utf8');
const main = html.match(/<main[\s\S]*?<\/main>/);
let text = main ? main[0] : html;
text = text.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
console.log('$f: ' + text.length + '자');
"
done
```
Expected: 8개 전부 Task 1의 `BATCH_B_MIN_LENGTH` 기준을 넘긴 값이 출력된다.

- [ ] **Step 4: image-toolbox 저장소 push**

```bash
git push origin master:main
```

- [ ] **Step 5: nwb010118.github.io 저장소 push**

```bash
cd "C:\Users\A\projects\nwb010118.github.io"
git push origin main
```

- [ ] **Step 6: 배포 확인**

Run: `curl -s https://nwb010118.github.io/image-toolbox/sns-blog-image-size.html | grep -c "한 번에 한 장씩"` (GitHub Pages 배포 반영까지 1~2분 소요 가능, 실패 시 잠시 후 재시도)
Expected: `1` 이상.
Run: `curl -s https://nwb010118.github.io/ | grep -c "이미지나 PDF를 다루는 도구"`
Expected: `1` 이상.

---

## 성공 기준

- 배치 B 8개 글 모두 Task 1에 정의된 최소 글자 수를 넘는다.
- 8개 글 모두 FAQ가 3개→6개로 늘었다.
- 모든 신규 사실 주장이 WebSearch로 확인된 그대로 반영됐다.
- `pdf-merge-multiple-files.html`의 텍스트 검색 불가 FAQ가 `pdf-file-size-reduction.html`의 기존 문장과 문장 단위로 겹치지 않는다(자동 테스트로 검증).
- 어떤 배치 B 글도 기존 15개 글(배치 A 8개 포함)과 문장 단위로 준중복되지 않는다.
- 루트 페이지가 실제 소개 콘텐츠를 갖추고 `about.html`과 겹치지 않는다.
- 기존 199개 테스트 + 신규 24개 테스트(총 223개) 전부 통과.
- `image-toolbox` 저장소가 `origin/main`에, `nwb010118.github.io` 저장소가 `origin/main`에 각각 배포되고 라이브 URL에서 새 콘텐츠가 확인된다.
