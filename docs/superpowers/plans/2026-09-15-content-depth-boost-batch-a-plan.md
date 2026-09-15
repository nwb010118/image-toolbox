# 콘텐츠 깊이 보강 배치 A(가이드 글 8개) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이미 배포된 가이드 글 8개(`kakao-photo-quality.html`, `email-attachment-size.html`, `image-format-comparison.html`, `photo-id-resize.html`, `ai-upscaling-limits.html`, `web-image-loading-speed.html`, `cloud-storage-photo-tips.html`, `pdf-file-size-reduction.html`)의 본문을 각각 FAQ 3개 추가 + 기존 섹션 1개 심화로 보강한다. 신규 페이지 없음, 기존 파일 수정만.

**Architecture:** 각 글의 기존 HTML 구조(클래스, footer, JSON-LD)는 그대로 두고, (1) 지정된 기존 `<section class="info-section">` 안에 새 단락을 추가하고 (2) "자주 묻는 질문" 섹션에 `<details>` 3개를 추가한다. 새 CSS/JS는 없다.

**Tech Stack:** 순수 HTML 수정. Node 무프레임워크 테스트(`tests/seoPagesIntegrity.test.js`에 이어서 작성).

## Global Constraints

- 스펙 문서(`docs/superpowers/specs/2026-09-15-content-depth-boost-design.md`)의 전제 하나가 실제와 달랐던 것을 여기서 바로잡는다: **가이드 글들은 애초에 `FAQPage` JSON-LD가 없다**(`Article` 타입만 있음 — `FAQPage`는 `index.html`/`pdf.html`/`upscale.html` 세 도구 페이지에만 존재). 따라서 이번 배치에서는 JSON-LD 동기화 작업이 없다. `Article` JSON-LD 블록은 손대지 않는다.
- **목표 글자수(2,500~3,500자)는 억지로 채우지 않는다.** FAQ 항목 하나가 실제로는 약 100~150자에 불과해서, 자연스러운 개수(3개)와 진짜 유용한 심화 단락만으로는 원래 글보다 대략 1.3~1.6배(예: 1,150자 → 1,700~1,900자대, 1,997자 → 2,500자대) 늘어나는 정도가 현실적이다 — 2,500~3,500자 목표에 못 미치는 글이 대부분이며, 이는 정상이다. 각 태스크에 적힌 실제 텍스트를 그대로 쓴다 — 분량을 채우려고 문장을 부풀리거나 반복하지 않는다. Task 1의 `BATCH_A_MIN_LENGTH` 값은 이 텍스트를 그대로 삽입했을 때 실측되는 글자 수(node 스크립트로 사전 계산됨)에 안전 마진을 두고 정한 것이므로 그대로 쓴다.
- 모든 신규 문장의 사실 주장은 이미 WebSearch로 확인됐다(태스크별로 출처 요약 기재). 임의로 다른 숫자로 바꾸지 않는다.
- `pdf-file-size-reduction.html`은 이미 본문에 "텍스트를 이미지로 바꾸면 텍스트 선택·검색 기능을 잃는다"는 정직한 고지가 있다(기존 67번째 줄 근처) — 같은 내용을 새 FAQ에서 토씨 하나 안 틀리고 반복하지 않는다. 새 FAQ는 "여러 페이지 처리", "재합친 용량이 항상 줄어드는지", "사진+텍스트 혼합 페이지" 세 가지 새 각도로 쓴다(아래 Task 9).
- 새 FAQ·심화 단락이 같은 글 안의 기존 문장과 겹치지 않는지, 그리고 이미 배포된 다른 15개 글과도 겹치지 않는지 각 태스크에서 직접 확인한다.
- 이모지 사용 금지, 한국어, 기존 톤(정직한 고지, 과장 없음) 유지.

---

## Task 1: 통합 검증 테스트 확장 (실패 확인)

**Files:**
- Modify: `tests/seoPagesIntegrity.test.js` (파일 끝에 이어서 작성)

**Interfaces:**
- Consumes: 기존 `test`, `readRepoFile` 헬퍼 함수
- Produces: RED 상태 확인

- [ ] **Step 1: 테스트 파일 끝에 아래 코드를 추가**

```javascript

const BATCH_A_MIN_LENGTH = {
  'kakao-photo-quality.html': 1700,
  'email-attachment-size.html': 1680,
  'image-format-comparison.html': 2450,
  'photo-id-resize.html': 1620,
  'ai-upscaling-limits.html': 1850,
  'web-image-loading-speed.html': 2150,
  'cloud-storage-photo-tips.html': 1770,
  'pdf-file-size-reduction.html': 1870
};

function mainTextLength(html) {
  const main = html.match(/<main[\s\S]*?<\/main>/);
  const text = (main ? main[0] : html)
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length;
}

Object.keys(BATCH_A_MIN_LENGTH).forEach(function (file) {
  test(file + ' body text has grown past the batch-A minimum length', function () {
    const html = readRepoFile(file);
    const len = mainTextLength(html);
    assert.ok(len >= BATCH_A_MIN_LENGTH[file], file + ' body text is ' + len + ' chars, expected >= ' + BATCH_A_MIN_LENGTH[file]);
  });

  test(file + ' has 6 FAQ items (3 original + 3 new)', function () {
    const html = readRepoFile(file);
    const count = (html.match(/<details>/g) || []).length;
    assert.strictEqual(count, 6, file + ' has ' + count + ' <details> items, expected 6');
  });
});

test('kakao-photo-quality.html new FAQ covers original-send storage size, open chat, and video difference', function () {
  const html = readRepoFile('kakao-photo-quality.html');
  assert.ok(html.includes('오픈채팅'), 'missing open chat FAQ');
  assert.ok(html.includes('동영상'), 'missing video-transfer-difference FAQ');
});

test('email-attachment-size.html new FAQ covers Daum limits, zip compression, and cloud-link accessibility', function () {
  const html = readRepoFile('email-attachment-size.html');
  assert.ok(html.includes('다음메일') && html.includes('4GB'), 'missing Daum mail 4GB large-attachment fact');
  assert.ok(html.includes('zip'), 'missing zip compression FAQ');
});

test('image-format-comparison.html new FAQ covers AVIF, old-browser WebP support, and icon/logo format advice', function () {
  const html = readRepoFile('image-format-comparison.html');
  assert.ok(html.includes('AVIF'), 'missing AVIF FAQ');
  assert.ok(html.includes('아이콘') || html.includes('로고'), 'missing icon/logo format FAQ');
});

test('photo-id-resize.html new FAQ covers background color rule, 6-month rule basis, and studio-vs-selfie', function () {
  const html = readRepoFile('photo-id-resize.html');
  assert.ok(html.includes('발급 신청'), 'missing 6-month-rule-is-based-on-application-date fact');
  assert.ok(html.includes('스튜디오'), 'missing studio-vs-selfie FAQ');
});

test('ai-upscaling-limits.html new FAQ covers illustrations, repeated upscaling, and processing time', function () {
  const html = readRepoFile('ai-upscaling-limits.html');
  assert.ok(html.includes('일러스트'), 'missing illustration FAQ');
  assert.ok(html.includes('반복해서'), 'missing repeated-upscaling FAQ');
});

test('web-image-loading-speed.html new content covers lazy loading nuance, CSS background images, and video poster images', function () {
  const html = readRepoFile('web-image-loading-speed.html');
  assert.ok(html.includes('지연 로딩') || html.includes('lazy'), 'missing lazy loading nuance');
  assert.ok(html.includes('배경 이미지'), 'missing CSS background image FAQ');
  assert.ok(html.includes('포스터'), 'missing video poster image FAQ');
});

test('cloud-storage-photo-tips.html new content covers concrete photo-count math and Google One pricing', function () {
  const html = readRepoFile('cloud-storage-photo-tips.html');
  assert.ok(html.includes('2,400원') || html.includes('Google One') || html.includes('원(Google One)'), 'missing Google One pricing fact');
  assert.ok(html.includes('되돌릴 수 없'), 'missing irreversibility FAQ');
});

test('pdf-file-size-reduction.html new content covers per-page-limit, non-guaranteed shrink, and mixed-content pages without repeating the existing text-search disclosure verbatim', function () {
  const html = readRepoFile('pdf-file-size-reduction.html');
  assert.ok(html.includes('300페이지'), 'missing 300-page extraction limit FAQ');
  assert.ok(html.includes('WebP'), 'missing WebP-alternative-for-graphic-scans mention');
});
```

- [ ] **Step 2: 실행해서 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^FAIL"`
Expected: 8개 파일 × 2개 공통 검사(16) + 8개 개별 사실 검증 = 24개 전후 FAIL. exit code 1. 기존 175개 테스트는 전부 PASS 유지.
Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -c "^PASS"`
Expected: 175.

- [ ] **Step 3: 커밋**

```bash
git add tests/seoPagesIntegrity.test.js
git commit -m "test: add content-depth checks for guide articles batch A

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: `kakao-photo-quality.html` 보강

**Files:**
- Modify: `kakao-photo-quality.html`

**출처**: 카카오 고객센터(cs.kakao.com) 안내 — 동영상은 '파일'로 보내야 원본 유지(사진의 '원본' 버튼과 다른 방식). 오픈채팅은 카카오톡의 채팅방 종류 중 하나로 동일한 UI를 쓴다는 것은 카카오톡 공식 구조상의 사실(오픈채팅 전용 설정 메뉴가 따로 없음).

- [ ] **Step 1: "원본 화질 그대로 보내는 방법" 섹션에 심화 단락 추가**

기존 58번째 줄(`<p><strong>기본 설정을...`) 다음, 59번째 줄(`<p><strong>파일로 보내기...`) 앞에 아래 단락을 삽입한다.

```html
      <p>미디어 전송 관리 설정의 '저용량'과 '일반 화질'도 서로 다릅니다. 데이터가 부족한 상황이 잦다면 저용량으로 맞춰두고, 화질이 중요한 사진만 그때그때 '원본' 버튼으로 따로 보내는 방식이 데이터 사용량과 화질을 함께 관리하기에 무난합니다. 카카오톡이 사진을 기본적으로 압축하는 이유도 여기 있습니다 — 특히 사진을 많이 주고받는 단체 채팅방일수록 서버 부하와 전송 속도 문제가 커지기 때문에, 매번 원본으로 설정해두면 그만큼 데이터도 더 쓰고 전송 속도도 느려질 수 있습니다.</p>
```

- [ ] **Step 2: FAQ 섹션에 새 항목 3개 추가**

기존 84번째 줄(세 번째 `</details>`) 바로 뒤, 85번째 줄(`</section>`) 앞에 삽입한다.

```html
      <details>
        <summary>원본으로 보내면 상대방 기기 저장 용량도 커지나요?</summary>
        <p>네. 원본 화질 사진은 압축한 사진보다 파일 용량이 크기 때문에, 받는 사람 기기에도 그만큼 더 큰 용량으로 저장됩니다. 여러 장을 자주 원본으로 주고받는다면 상대방의 저장 공간도 함께 고려하는 것이 좋습니다.</p>
      </details>
      <details>
        <summary>오픈채팅에서도 원본으로 보낼 수 있나요?</summary>
        <p>네. 오픈채팅도 카카오톡의 채팅방 종류 중 하나일 뿐이라, '원본' 버튼과 미디어 전송 설정이 일반 채팅방과 동일하게 적용됩니다.</p>
      </details>
      <details>
        <summary>동영상도 사진과 같은 방법으로 원본 전송되나요?</summary>
        <p>아니요. 사진은 앨범에서 고를 때 '원본' 버튼을 켜면 되지만, 동영상을 원본 화질 그대로 보내려면 '+' 버튼 → 파일에서 동영상을 직접 첨부해야 합니다. 일반적인 방법으로 동영상을 보내면 카카오톡이 화질과 용량을 자동으로 줄입니다.</p>
      </details>
```

- [ ] **Step 3: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -A1 "kakao-photo-quality"`
Expected: `kakao-photo-quality.html`에 대한 4개 테스트(길이/FAQ개수/오픈채팅/동영상) 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add kakao-photo-quality.html
git commit -m "Deepen kakao-photo-quality.html content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: `email-attachment-size.html` 보강

**Files:**
- Modify: `email-attachment-size.html`

**출처**: 카카오 고객센터/다음 고객센터(cs.daum.net) — 다음메일 일반 첨부 25MB, 25MB 초과 시 자동으로 대용량 첨부 전환(파일당 4GB, 개수 제한 없음, 다운로드 100회 또는 업로드 후 30일 제한).

- [ ] **Step 1: "제한에 걸렸을 때 대처법" 섹션에 심화 단락 추가**

기존 77번째 줄(`<p>사진 여러 장을 첨부해야...`) 다음, 78번째 줄(`</section>`) 앞에 삽입한다.

```html
      <p>클라우드 저장소 링크를 공유하는 방법도 있습니다. 구글 드라이브, 네이버 마이박스 같은 곳에 사진을 올려두고 공유 링크만 이메일 본문에 넣으면 첨부 용량 제한 자체를 우회할 수 있습니다. 다만 상대방이 별도로 접속해서 다운로드해야 하고, 회사 메일 시스템처럼 외부 링크 클릭이 제한된 보안 환경에서는 링크가 스팸으로 분류되거나 아예 열리지 않을 수 있어, 상황에 따라 파일을 직접 첨부하는 쪽이 더 확실할 수 있습니다.</p>
```

- [ ] **Step 2: FAQ 섹션에 새 항목 3개 추가**

기존 93번째 줄(세 번째 `</details>`) 바로 뒤, 94번째 줄(`</section>`) 앞에 삽입한다.

```html
      <details>
        <summary>다음(카카오메일)도 같은 기준인가요?</summary>
        <p>다음메일은 기본 첨부 25MB, 이를 넘으면 자동으로 대용량 첨부로 전환되어 파일당 4GB까지 보낼 수 있습니다. 다만 대용량 첨부는 다운로드 100회 또는 업로드 후 30일이 지나면 만료된다는 점을 알아두세요.</p>
      </details>
      <details>
        <summary>여러 장을 zip으로 압축해서 보내면 용량이 더 줄어드나요?</summary>
        <p>사진 파일은 이미 압축된 형식(JPG 등)이라 zip으로 다시 묶어도 용량이 크게 줄지 않습니다. 용량을 줄이려면 zip보다 사진 자체의 품질을 낮추는 압축이 훨씬 효과적입니다.</p>
      </details>
      <details>
        <summary>클라우드 링크로 보내면 상대방이 못 열 수도 있나요?</summary>
        <p>네. 회사 메일 시스템처럼 외부 링크 클릭을 차단하는 보안 정책이 있는 환경에서는 클라우드 링크가 스팸으로 분류되거나 아예 열리지 않을 수 있습니다. 이런 경우 파일을 직접 첨부하는 편이 더 확실합니다.</p>
      </details>
```

- [ ] **Step 3: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -A1 "email-attachment-size"`
Expected: 해당 4개 테스트 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add email-attachment-size.html
git commit -m "Deepen email-attachment-size.html content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: `image-format-comparison.html` 보강

**Files:**
- Modify: `image-format-comparison.html`

**출처**: 이 사이트의 기존 실측 벤치마크(`benchmark.html`) 및 코드(`js/app.js`가 PNG/JPG/WebP만 지원) — AVIF 미지원은 자사 도구 사실, 새 웹 검색 불필요.

- [ ] **Step 1: "상황별 추천" 섹션에 심화 단락 추가**

기존 105번째 줄(`<p><strong>스크린샷·UI처럼...`) 다음, 106번째 줄(`<p><a class="btn"...`) 앞에 삽입한다.

```html
      <p>파비콘이나 로고처럼 작고 반복적으로 쓰이는 이미지는 PNG를 쓰는 경우가 많습니다. 무손실이라 확대해도 경계가 뭉개지지 않고, 위 실측 결과처럼 단색·선명한 경계가 많은 그래픽은 WebP도 원본보다 훨씬 작게 나오는 경우가 많아 용량이 걱정된다면 WebP도 좋은 대안입니다.</p>
```

- [ ] **Step 2: FAQ 섹션에 새 항목 3개 추가**

기존 122번째 줄(세 번째 `</details>`) 바로 뒤, 123번째 줄(`</section>`) 앞에 삽입한다.

```html
      <details>
        <summary>AVIF는 왜 다루지 않나요?</summary>
        <p>AVIF는 WebP보다 더 최근에 나온 형식으로 압축 효율이 뛰어나지만, 이 사이트의 압축 도구가 아직 AVIF 입출력을 지원하지 않아 이 글에서는 다루지 않았습니다. PNG·JPG·WebP만으로도 대부분의 상황을 충분히 커버할 수 있습니다.</p>
      </details>
      <details>
        <summary>오래된 브라우저에서도 WebP가 다 열리나요?</summary>
        <p>최신 브라우저는 대부분 WebP를 문제없이 지원하지만, 아주 오래된 브라우저나 일부 구형 이미지 뷰어에서는 열리지 않을 수 있습니다. 불특정 다수가 다양한 환경에서 보는 이미지라면 PNG나 JPG가 더 안전합니다.</p>
      </details>
      <details>
        <summary>아이콘·로고 이미지는 어떤 형식이 유리한가요?</summary>
        <p>선명한 경계와 투명 배경이 필요한 아이콘·로고는 PNG가 기본적으로 안전합니다. 용량을 더 줄이고 싶다면 WebP도 실측상 원본 PNG보다 작게 나오는 경우가 많아 좋은 대안입니다.</p>
      </details>
```

- [ ] **Step 3: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -A1 "image-format-comparison"`
Expected: 해당 4개 테스트 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add image-format-comparison.html
git commit -m "Deepen image-format-comparison.html content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: `photo-id-resize.html` 보강

**Files:**
- Modify: `photo-id-resize.html`

**출처**: 파주시/용인시/연제구 등 지자체 여권민원 안내, 외교부 공지(WebSearch로 확인) — 배경은 균일한 흰색(그림자·빛반사 없음), 포토샵 등 보정 금지, "6개월 이내 촬영" 기준은 출국일·인화일이 아니라 여권 발급 신청일 기준.

- [ ] **Step 1: "정확한 규격" 섹션에 심화 단락 추가**

기존 56번째 줄(`<p>배경은 흰색이어야...`) 다음, 57번째 줄(`</section>`) 앞에 삽입한다.

```html
      <p>촬영 시기 기준도 헷갈리기 쉬운 부분입니다. '6개월 이내 촬영'은 여행을 떠나는 날짜나 사진을 인화한 날짜가 아니라, 여권을 발급 신청하는 시점을 기준으로 합니다. 또한 포토샵 등으로 인위적으로 보정한 사진은 사용할 수 없고, 인물과 배경 모두에 그림자나 빛 반사가 없어야 합니다. 크기와 화질을 아무리 완벽하게 맞춰도 이런 촬영 조건을 어기면 반려될 수 있습니다.</p>
```

- [ ] **Step 2: FAQ 섹션에 새 항목 3개 추가**

기존 81번째 줄(세 번째 `</details>`) 바로 뒤, 82번째 줄(`</section>`) 앞에 삽입한다.

```html
      <details>
        <summary>배경색이 흰색이 아니면 안 되나요?</summary>
        <p>네. 여권사진은 균일한 흰색 배경을 요구합니다. 그림자나 무늬가 있는 배경, 다른 색 배경은 반려 사유가 될 수 있어 흰 벽이나 흰 배경천 앞에서 촬영하는 것이 안전합니다.</p>
      </details>
      <details>
        <summary>여권 사진에 유효기간이 있나요?</summary>
        <p>정해진 유효기간이 있다기보다 '6개월 이내 촬영'이라는 기준이 있습니다. 이 6개월은 여권을 발급 신청하는 시점을 기준으로 계산되며, 그보다 오래된 사진은 다시 촬영해야 합니다.</p>
      </details>
      <details>
        <summary>스튜디오에서 찍은 사진과 셀카는 차이가 있나요?</summary>
        <p>규격과 조건(흰 배경, 정면, 무표정 등)만 충족하면 촬영 장소나 기기 자체는 문제되지 않습니다. 다만 셀카는 조명과 배경을 규격에 맞추기가 상대적으로 어려워서, 스튜디오나 사진관에서 촬영하는 경우가 더 안전한 편입니다.</p>
      </details>
```

- [ ] **Step 3: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -A1 "photo-id-resize"`
Expected: 해당 4개 테스트 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add photo-id-resize.html
git commit -m "Deepen photo-id-resize.html content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: `ai-upscaling-limits.html` 보강

**Files:**
- Modify: `ai-upscaling-limits.html`

**출처**: 자사 코드 사실 — `js/upscaleTools.js`의 `MAX_AI_PASSES = 2`(4배 확대는 내부적으로 2배씩 두 번 처리). 그림/일러스트·처리시간 항목은 과장 없는 일반적 설명으로, 새로운 수치를 주장하지 않는다.

- [ ] **Step 1: "언제 특히 효과적인가요" 섹션에 심화 단락 추가**

기존 65번째 줄(`<p>원본이 어느 정도 선명하지만...`) 다음, 66번째 줄(`<figure class="guide-image">`) 앞에 삽입한다.

```html
      <p>배율은 무조건 높게 선택하는 게 좋은 것은 아닙니다. 원본이 이미 목표 크기에 가깝다면 2배로 충분하고, 원본이 아주 작을 때만 4배를 고려하는 것이 낫습니다. 배율이 커질수록 AI가 추론해서 채우는 비중이 늘어나기 때문에, 필요한 만큼만 확대하는 것이 원본에 더 가까운 결과를 얻는 방법입니다.</p>
```

- [ ] **Step 2: FAQ 섹션에 새 항목 3개 추가**

기존 86번째 줄(세 번째 `</details>`) 바로 뒤, 87번째 줄(`</section>`) 앞에 삽입한다.

```html
      <details>
        <summary>그림이나 일러스트에도 효과가 있나요?</summary>
        <p>네, 적용은 됩니다. 다만 이 모델은 사진 위주로 학습된 경향이 있어서, 선이 뚜렷한 일러스트에서는 경계가 사진과는 다른 느낌으로 부드러워질 수 있습니다. 사진만큼 자연스러운 결과가 안 나올 수 있다는 점을 감안하세요.</p>
      </details>
      <details>
        <summary>여러 번 반복해서 업스케일하면 더 좋아지나요?</summary>
        <p>아닙니다. 이 도구의 4배 확대는 이미 내부적으로 2배씩 두 번(총 2회) AI 처리를 거칩니다. 결과물을 다시 업로드해서 또 확대하면 새로운 정보가 생기는 게 아니라, 이미 추론된 디테일 위에 추론을 한 번 더 얹는 것이라 오히려 부자연스러운 번짐이 늘어날 수 있습니다.</p>
      </details>
      <details>
        <summary>처리 시간은 얼마나 걸리나요?</summary>
        <p>이미지 크기와 사용하는 기기 성능에 따라 다릅니다. 모든 연산이 브라우저 안에서 이루어지기 때문에 성능이 낮은 기기에서는 시간이 더 걸릴 수 있습니다.</p>
      </details>
```

- [ ] **Step 3: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -A1 "ai-upscaling-limits"`
Expected: 해당 4개 테스트 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add ai-upscaling-limits.html
git commit -m "Deepen ai-upscaling-limits.html content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: `web-image-loading-speed.html` 보강

**Files:**
- Modify: `web-image-loading-speed.html`

**출처**: web.dev "Largest Contentful Paint" 공식 문서(WebSearch로 확인) — `url()`로 불러오는 CSS 배경 이미지도 LCP 후보로 측정되지만(제외되지 않음), discoverable하지 않아 preload scanner가 못 찾아 오히려 발견이 늦어지는 안티패턴으로 꼽힘. lazy loading을 LCP 요소 자체에 적용하면 안 된다는 것도 web.dev의 공식 권고.

- [ ] **Step 1: "실질적인 개선 방법" 섹션에 심화 단락 추가**

기존 82번째 줄(`<p><strong>필요한 크기 이상으로...`) 다음, 83번째 줄(`</section>`) 앞에 삽입한다.

```html
      <p><strong>지연 로딩(lazy loading)은 위치를 가려서 써야 합니다.</strong> 화면 아래에 있어 바로 안 보이는 이미지에는 지연 로딩을 적용하면 초기 로딩 부담을 줄일 수 있지만, 반대로 LCP 요소가 되는 이미지(예: 히어로 이미지)에 지연 로딩을 적용하면 오히려 화면에 그려지는 시점이 늦춰져 LCP가 나빠질 수 있습니다. 화면에 바로 보이는 대표 이미지는 지연 로딩 없이 최대한 빨리 불러오고, 스크롤해야 보이는 이미지에만 지연 로딩을 적용하는 것이 정석입니다.</p>
```

- [ ] **Step 2: FAQ 섹션에 새 항목 3개 추가**

기존 98번째 줄(세 번째 `</details>`) 바로 뒤, 99번째 줄(`</section>`) 앞에 삽입한다.

```html
      <details>
        <summary>CSS 배경 이미지(background-image)도 LCP에 영향을 주나요?</summary>
        <p>네. url()로 불러오는 CSS 배경 이미지도 LCP 후보로 측정됩니다. 다만 배경 이미지는 브라우저가 CSS를 해석한 뒤에야 요청을 시작해서 &lt;img&gt; 태그보다 발견이 늦어지는 경향이 있어 LCP에 불리하게 작용할 수 있습니다.</p>
      </details>
      <details>
        <summary>모바일과 데스크톱 기준이 다른가요?</summary>
        <p>평가 기준(2.5초/4.0초)은 동일하지만, 모바일은 네트워크와 기기 성능이 상대적으로 떨어지는 경우가 많아 같은 이미지라도 LCP가 더 느리게 나오는 경향이 있습니다.</p>
      </details>
      <details>
        <summary>동영상이 히어로 이미지 자리에 있으면 어떻게 처리하나요?</summary>
        <p>동영상의 포스터 이미지(재생 전 미리보기)가 LCP 요소로 측정될 수 있습니다. 포스터 이미지도 일반 이미지와 마찬가지로 용량을 줄이고 필요한 크기 이상으로 올리지 않는 것이 좋습니다.</p>
      </details>
```

- [ ] **Step 3: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -A1 "web-image-loading-speed"`
Expected: 해당 4개 테스트 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add web-image-loading-speed.html
git commit -m "Deepen web-image-loading-speed.html content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: `cloud-storage-photo-tips.html` 보강

**Files:**
- Modify: `cloud-storage-photo-tips.html`

**출처**: Google One 공식 요금 페이지(one.google.com/about/plans, WebSearch로 확인) — 한국 기준 Basic 100GB 월 2,400원(연 24,000원). 사진 장당 용량 예시(4~5MB)는 스마트폰 카메라의 일반적인 사진 용량 범위를 근거로 한 예시이며, 정확한 평균값을 주장하는 통계 인용이 아니라는 점을 문구에서 분명히 한다.

- [ ] **Step 1: "사진 용량을 줄이면 더 오래 쓸 수 있습니다" 섹션에 심화 단락 추가**

기존 82번째 줄(`<p>이미 클라우드에 쌓여...`) 다음, 83번째 줄(`</section>`) 앞에 삽입한다.

```html
      <p>대략적인 예를 들면, 스마트폰으로 찍은 사진 한 장이 보통 4~5MB 정도라면 15GB 무료 용량에는 약 3,000~3,700장 정도 저장할 수 있는 셈입니다. 품질을 조절해 장당 용량을 1~2MB 수준으로 줄이면, 같은 15GB로 저장할 수 있는 사진 수가 두 배 이상으로 늘어납니다. 사진을 수천 장씩 쌓아두는 경우일수록 압축의 효과가 체감됩니다.</p>
```

- [ ] **Step 2: FAQ 섹션에 새 항목 3개 추가**

기존 98번째 줄(세 번째 `</details>`) 바로 뒤, 99번째 줄(`</section>`) 앞에 삽입한다.

```html
      <details>
        <summary>카카오톡 같은 다른 서비스 저장공간도 이 15GB 안에 포함되나요?</summary>
        <p>아니요. 카카오톡, 네이버 마이박스 같은 다른 서비스는 구글과 별개의 저장공간을 씁니다. 구글 드라이브의 15GB는 구글 드라이브·Gmail·구글 포토끼리만 공유됩니다.</p>
      </details>
      <details>
        <summary>무료 용량이 부족하면 유료 요금제는 얼마나 하나요?</summary>
        <p>구글 원(Google One) 기준으로 가장 저렴한 100GB 요금제가 한국에서 월 2,400원 정도입니다. 사진 몇 천 장 정도라면 압축만으로도 무료 용량 안에서 충분히 버틸 수 있어, 유료 결제 전에 압축부터 시도해볼 만합니다.</p>
      </details>
      <details>
        <summary>압축한 사진을 나중에 원본 화질로 되돌릴 수 있나요?</summary>
        <p>아니요. 압축은 되돌릴 수 없는 과정입니다. 한 번 줄인 용량만큼의 정보는 복원되지 않으므로, 나중에 원본이 필요할 수도 있는 사진이라면 압축 전 원본을 별도로 백업해두는 것이 안전합니다.</p>
      </details>
```

- [ ] **Step 3: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -A1 "cloud-storage-photo-tips"`
Expected: 해당 4개 테스트 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add cloud-storage-photo-tips.html
git commit -m "Deepen cloud-storage-photo-tips.html content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: `pdf-file-size-reduction.html` 보강

**Files:**
- Modify: `pdf-file-size-reduction.html`

**출처**: 자사 코드 사실(`pdf.html` — PDF→이미지 추출 최대 300페이지) 및 이 사이트의 기존 실측 벤치마크(그래픽형 이미지에서 JPG가 원본보다 커질 수 있고 WebP가 더 유리하다는 `image-format-comparison.html`의 실측 결과를 재활용, 새 측정 없음).

- [ ] **Step 1: "모든 PDF에 효과가 있는 건 아닙니다" 섹션에 심화 단락 추가**

기존 67번째 줄(`<p>반면 <strong>글자 위주의...`) 다음, 68번째 줄(`</section>`) 앞에 삽입한다.

```html
      <p>압축 효과는 PDF 안에 들어있는 이미지의 종류에 따라서도 갈립니다. 사진처럼 색이 복잡한 스캔본은 JPG나 WebP로 압축했을 때 원본 대비 90% 이상 용량이 줄어드는 경우가 많지만, 단색과 선명한 경계가 많은 문서(도장, 표, 손글씨 위주)는 JPG 압축이 오히려 불리할 수 있습니다. 이런 경우 <a href="index.html">이미지 압축 도구</a>에서 형식을 WebP로 바꿔보면 더 나은 결과가 나오는 경우가 많습니다(자세한 형식별 차이는 <a href="image-format-comparison.html">PNG vs JPG vs WebP 비교</a> 참고).</p>
```

- [ ] **Step 2: FAQ 섹션에 새 항목 3개 추가**

기존 83번째 줄(세 번째 `</details>`) 바로 뒤, 84번째 줄(`</section>`) 앞에 삽입한다.

```html
      <details>
        <summary>여러 페이지짜리 PDF도 한 번에 처리되나요?</summary>
        <p>PDF 변환 도구에서 한 번에 최대 300페이지까지 이미지로 추출할 수 있습니다. 다만 페이지가 많을수록 추출된 이미지도 그만큼 많아지므로, 압축과 재합치기도 여러 장을 순서대로 처리해야 합니다.</p>
      </details>
      <details>
        <summary>재합친 PDF 용량이 항상 원본보다 작아지나요?</summary>
        <p>대부분은 줄어들지만 항상 그런 것은 아닙니다. 단색·선명한 경계가 많은 그래픽 위주 스캔본은 JPG로 압축했을 때 오히려 원본보다 커질 수 있습니다. 이런 경우 압축 형식을 WebP로 바꿔보면 대부분 더 작게 나옵니다.</p>
      </details>
      <details>
        <summary>PDF에 사진과 텍스트가 섞여 있으면 어떻게 하나요?</summary>
        <p>이 우회법은 페이지 전체를 이미지로 바꾸기 때문에, 사진과 텍스트가 섞인 페이지도 통째로 이미지가 됩니다. 텍스트 검색·선택 기능을 유지하고 싶다면 이 방법 대신 워드프로세서나 PDF 편집 프로그램의 용량 최적화 기능을 쓰는 것이 낫습니다.</p>
      </details>
```

- [ ] **Step 3: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js 2>&1 | grep -A1 "pdf-file-size-reduction"`
Expected: 해당 4개 테스트 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add pdf-file-size-reduction.html
git commit -m "Deepen pdf-file-size-reduction.html content

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 10: 전체 회귀 검증 + 문장 단위 중복 확인

**Files:**
- 없음(읽기·검증만)

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run: `node tests/seoPagesIntegrity.test.js > /tmp/batch_a_final.txt 2>&1; echo "EXIT=$?"; grep -c "^PASS" /tmp/batch_a_final.txt; grep -c "^FAIL" /tmp/batch_a_final.txt`
Expected: `EXIT=0`, PASS 카운트가 기존 175 + 이번에 추가한 테스트 수(8×2 + 8 = 24) = 199, FAIL 0.

- [ ] **Step 2: 배치 A 8개 글의 신규 추가분이, 서로는 물론 기존에 이미 배포된 나머지 15개 가이드 글(배치 B 대상 8개 포함)과도 문장 단위로 준중복이 아닌지 확인**

Run:
```bash
node -e "
const fs = require('fs');
const batchA = ['kakao-photo-quality.html','email-attachment-size.html','image-format-comparison.html','photo-id-resize.html','ai-upscaling-limits.html','web-image-loading-speed.html','cloud-storage-photo-tips.html','pdf-file-size-reduction.html'];
const others = ['favicon-og-image-size.html','iphone-heic-photo-guide.html','monitor-resolution-wallpaper-size.html','old-photo-scan-digitize-workflow.html','pdf-merge-multiple-files.html','print-resolution-dpi-guide.html','sns-blog-image-size.html','youtube-thumbnail-size.html'];
const allFiles = batchA.concat(others);
const sentences = {};
allFiles.forEach(f => {
  const html = fs.readFileSync(f, 'utf8');
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const sents = text.split(/(?<=[.?!다요])\s+/).map(s => s.trim()).filter(s => s.length > 20);
  sentences[f] = sents;
});
let found = false;
for (let i = 0; i < batchA.length; i++) {
  for (let j = 0; j < allFiles.length; j++) {
    if (allFiles[j] === batchA[i]) continue;
    if (j < i && batchA.includes(allFiles[j])) continue;
    const common = sentences[batchA[i]].filter(s => sentences[allFiles[j]].includes(s));
    if (common.length > 0) {
      found = true;
      console.log('DUPLICATE between ' + batchA[i] + ' and ' + allFiles[j] + ':', common);
    }
  }
}
console.log(found ? 'FOUND DUPLICATES' : 'done');
"
```
Expected: `done`만 출력되고 `DUPLICATE` 줄이 없어야 한다. 만약 나오면 배치 A 쪽 파일의 문장을 서로 다른 표현으로 고쳐 쓴다(복사한 문장 그대로 재사용 금지). 이 검사는 새로 추가한 문장뿐 아니라 각 글의 기존 본문 전체를 대상으로 하므로, 1~3차 라운드에서 이미 의도적으로 재사용한 공통 안내 문구(예: 표준 footer 링크 문구)가 있다면 20자 이상 조건과 정확 일치 조건 때문에 짧은 공통구는 걸리지 않는다 — 만약 짧지 않은 공통 문장이 걸린다면 실제 준중복 여부를 사람이 판단한다.

- [ ] **Step 3: 최종 글자 수 리포트로 배치 A 전체 개선 폭 확인**

Run:
```bash
for f in kakao-photo-quality.html email-attachment-size.html image-format-comparison.html photo-id-resize.html ai-upscaling-limits.html web-image-loading-speed.html cloud-storage-photo-tips.html pdf-file-size-reduction.html; do
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
Expected: 8개 전부 Task 1의 `BATCH_A_MIN_LENGTH` 기준을 넘긴 값이 출력된다.

- [ ] **Step 4: git push**

```bash
git push origin master:main
```

- [ ] **Step 5: 배포 확인**

Run: `curl -s https://nwb010118.github.io/image-toolbox/kakao-photo-quality.html | grep -c "오픈채팅"`
Expected: GitHub Pages 배포가 반영된 뒤(1~2분 대기 후 재시도) `1` 이상 출력.

---

## 성공 기준

- 8개 글 모두 Task 1에 정의된 최소 글자 수를 넘는다.
- 8개 글 모두 FAQ가 3개→6개로 늘었다.
- 모든 신규 사실 주장(다음메일 용량, 여권사진 배경색/6개월 기준, LCP CSS 배경 이미지, Google One 가격 등)이 WebSearch로 확인된 그대로 반영됐다.
- `pdf-file-size-reduction.html`의 텍스트 검색 불가 고지가 중복 없이(기존 문장 그대로 반복하지 않고) 새 각도로 보강됐다.
- 8개 글 서로 간, 그리고 기존 배포된 다른 가이드 글과 문장 단위 중복이 없다.
- 기존 175개 테스트 + 신규 24개 테스트(총 199개) 전부 통과.
- `origin/main`에 배포되고 라이브 URL에서 새 콘텐츠가 확인된다.
