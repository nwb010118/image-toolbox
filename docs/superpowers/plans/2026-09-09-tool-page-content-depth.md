# 기존 도구 페이지 콘텐츠 보강 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `index.html`, `upscale.html`, `pdf.html` 세 핵심 도구 페이지에 원리·비교·개요 설명 섹션을 추가해 텍스트 콘텐츠 분량을 늘린다 (AdSense 반려 대응 5단계 계획의 2단계).

**Architecture:** 세 파일 모두 도구 UI(업로드/설정/미리보기 영역) 다음, 기존 FAQ 섹션 앞에 `info-section` 블록을 삽입한다. 새 파일·새 CSS·새 JS는 만들지 않는다. 콘텐츠는 실제 코드 동작(`js/imageTools.js`/`js/app.js`/`js/upscaleTools.js`, `upscale.html`의 CDN 라이브러리)에 근거해 작성됐다.

**Tech Stack:** 순수 HTML(기존 `info-section` 클래스 재사용). Node 기반 무프레임워크 통합 테스트(`tests/seoPagesIntegrity.test.js`, 기존 파일에 이어서 작성).

## Global Constraints

- 새 CSS 클래스를 추가하지 않는다 — `info-section` 클래스만 재사용한다.
- 새 JS 파일/함수를 추가하지 않는다.
- 기존 FAQ 섹션(질문/답변)과 `SoftwareApplication`/`FAQPage` JSON-LD는 수정하지 않는다.
- 새 섹션은 기존 FAQ와 내용이 겹치지 않아야 한다(원리·비교·개요에 집중).
- `pdf.html`의 새 섹션은 짧은 개요만 담고, 상세 설명은 이미 있는 3개 롱테일 페이지(`photos-to-pdf.html`, `pdf-to-word.html`, `pdf-to-ppt.html`)로 링크한다 — 콘텐츠 중복 금지.
- 언어는 한국어, 이모지 사용 금지, UTF-8.

---

## Task 1: 통합 검증 테스트 확장 (실패 확인)

**Files:**
- Modify: `tests/seoPagesIntegrity.test.js` (파일 끝, 현재 176번째 줄 이후 이어서 작성 — 기존 테스트는 건드리지 않는다)

**Interfaces:**
- Consumes: 기존 `test`, `readRepoFile` 헬퍼 함수(파일 상단에 이미 정의됨, 재사용)
- Produces: `node tests/seoPagesIntegrity.test.js` 실행 시 신규 검증 항목이 실패로 나오는 RED 상태 확인

- [ ] **Step 1: 테스트 파일 끝에 아래 코드를 추가**

`tests/seoPagesIntegrity.test.js`의 마지막 줄(현재 176번째 줄, `privacy.html points to contact.html...` 테스트) 바로 다음에 이어서 추가한다:

```javascript

test('index.html has the compression-mechanics content sections', function () {
  const html = readRepoFile('index.html');
  assert.ok(html.includes('<h2>압축은 어떻게 동작하나요</h2>'), 'missing 압축은 어떻게 동작하나요 section');
  assert.ok(html.includes('<h2>어떤 형식을 골라야 할까요</h2>'), 'missing 어떤 형식을 골라야 할까요 section');
});

test('upscale.html has the AI-upscaling mechanics content sections', function () {
  const html = readRepoFile('upscale.html');
  assert.ok(html.includes('<h2>AI 업스케일링은 어떻게 동작하나요</h2>'), 'missing AI 업스케일링은 어떻게 동작하나요 section');
  assert.ok(html.includes('<h2>언제 필요한가요</h2>'), 'missing 언제 필요한가요 section');
});

test('pdf.html has the tool-overview content section linking to all 3 long-tail pages', function () {
  const html = readRepoFile('pdf.html');
  assert.ok(html.includes('<h2>이 도구로 무엇을 할 수 있나요</h2>'), 'missing 이 도구로 무엇을 할 수 있나요 section');
  ['photos-to-pdf.html', 'pdf-to-word.html', 'pdf-to-ppt.html'].forEach(function (page) {
    assert.ok(html.includes('href="' + page + '"'), 'pdf.html missing link to ' + page);
  });
});
```

- [ ] **Step 2: 실행해서 실패 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 기존 36개 테스트는 그대로 PASS. 새로 추가한 3개 테스트는 전부 FAIL — 아직 각 페이지에 새 섹션이 없어서 `<h2>...</h2>` 문자열이 없음. `process.exitCode`가 1로 설정됨.

- [ ] **Step 3: 커밋**

```bash
git add tests/seoPagesIntegrity.test.js
git commit -m "test: add integrity checks for tool-page content depth sections

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: `index.html`에 압축 원리/형식 비교 섹션 추가

**Files:**
- Modify: `index.html:161-163` (`</section>`로 끝나는 `preview-area` 섹션과 `<section class="info-section">`로 시작하는 FAQ 섹션 사이)

**Interfaces:**
- Consumes: 없음(순수 콘텐츠)
- Produces: Task 1의 `index.html has the compression-mechanics content sections` 테스트가 통과하게 될 변경

- [ ] **Step 1: 새 섹션 2개 삽입**

`index.html`의 161번째 줄(`</section>`, `preview-area` 섹션의 닫는 태그) 바로 다음, 163번째 줄(`<section class="info-section">`, FAQ 섹션 시작) 바로 앞에 아래 두 섹션을 삽입한다:

```html
    <section class="info-section">
      <h2>압축은 어떻게 동작하나요</h2>
      <p>이 도구는 브라우저의 Canvas API로 이미지를 다시 인코딩하는 방식으로 압축합니다. 원본을 캔버스에 그린 뒤, 선택한 형식과 품질로 다시 저장하는 원리입니다.</p>
      <p>JPG와 WebP는 손실 압축 형식이라 품질 슬라이더 값을 낮출수록 실제로 파일 크기가 줄어듭니다. 반면 PNG는 무손실 형식이라 품질 슬라이더를 조절해도 파일 크기에는 영향이 없습니다 — 이는 이 도구만의 제약이 아니라 브라우저의 표준 동작입니다. PNG 사진의 용량을 줄이고 싶다면 출력 형식을 JPG나 WebP로 바꾸거나, 가로세로 크기(해상도) 자체를 줄이는 것을 권장합니다.</p>
    </section>

    <section class="info-section">
      <h2>어떤 형식을 골라야 할까요</h2>
      <p><strong>JPG</strong>는 사진처럼 색이 복잡한 이미지에 적합하고, 압축률이 좋아 용량이 작습니다. 다만 투명 배경은 지원하지 않습니다.</p>
      <p><strong>PNG</strong>는 무손실 형식이라 화질 손상이 없고 투명 배경을 지원합니다. 스크린샷, 로고, 텍스트가 포함된 그래픽에 적합하지만 사진에 쓰면 용량이 커집니다.</p>
      <p><strong>WebP</strong>는 JPG와 비슷한 화질을 더 작은 용량으로 담을 수 있는 비교적 최신 형식입니다. 대부분의 최신 브라우저에서 지원하지만, 오래된 프로그램에서는 열리지 않을 수 있습니다.</p>
    </section>

```

- [ ] **Step 2: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: `index.html has the compression-mechanics content sections` PASS. 나머지 신규 테스트 2개는 여전히 FAIL(정상 — Task 3~4 전).

- [ ] **Step 3: 브라우저로 수동 확인**

`index.html`을 열어 새 섹션 2개가 미리보기 영역과 FAQ 사이에 자연스럽게 보이는지, 실제 압축 기능(파일 선택 → 적용하기 → 다운로드)이 그대로 동작하는지 확인한다.

- [ ] **Step 4: 커밋**

```bash
git add index.html
git commit -m "Add compression-mechanics content sections to index.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: `upscale.html`에 AI 업스케일링 원리/사용 시나리오 섹션 추가

**Files:**
- Modify: `upscale.html:155-157` (`</section>`로 끝나는 `upscalePreviewArea` 섹션과 `<section class="info-section">`로 시작하는 FAQ 섹션 사이)

**Interfaces:**
- Consumes: 없음
- Produces: Task 1의 `upscale.html has the AI-upscaling mechanics content sections` 테스트가 통과하게 될 변경

- [ ] **Step 1: 새 섹션 2개 삽입**

`upscale.html`의 155번째 줄(`</section>`, `upscalePreviewArea` 섹션의 닫는 태그) 바로 다음, 157번째 줄(`<section class="info-section">`, FAQ 섹션 시작) 바로 앞에 아래 두 섹션을 삽입한다:

```html
    <section class="info-section">
      <h2>AI 업스케일링은 어떻게 동작하나요</h2>
      <p>단순히 이미지를 크게 늘리기만 하면(리사이즈) 픽셀 사이가 보간되면서 화질이 뭉개집니다. 이 도구는 ESRGAN 계열의 경량 AI 모델을 브라우저 안에서 직접 실행해(TensorFlow.js 기반, 서버로 전송하지 않음) 주변 픽셀 패턴을 학습한 결과를 바탕으로 디테일을 추론하며 확대합니다.</p>
      <p>이 AI 모델은 한 번에 2배씩만 확대할 수 있습니다. 4배 확대는 내부적으로 2배 확대를 두 번 반복해서 처리하는 방식이며, 1440p·4K 같은 해상도 옵션은 목표 크기(긴 변 기준)까지 AI로 확대한 뒤 초과분을 캔버스로 정밀하게 축소해 맞춥니다.</p>
    </section>

    <section class="info-section">
      <h2>언제 필요한가요</h2>
      <p>오래되거나 작게 찍힌 사진을 인쇄하거나 크게 써야 할 때, 저해상도 이미지를 배경화면처럼 큰 화면에 띄워야 할 때, 원본을 잃어버려 남은 사본밖에 없는 사진을 최대한 선명하게 살리고 싶을 때 유용합니다.</p>
    </section>

```

- [ ] **Step 2: 테스트 재실행**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: `upscale.html has the AI-upscaling mechanics content sections` PASS. `pdf.html` 관련 신규 테스트만 여전히 FAIL(정상 — Task 4 전).

- [ ] **Step 3: 브라우저로 수동 확인**

`upscale.html`을 열어 새 섹션 2개가 미리보기 영역과 FAQ 사이에 자연스럽게 보이는지, 실제 업스케일링 기능이 그대로 동작하는지 확인한다.

- [ ] **Step 4: 커밋**

```bash
git add upscale.html
git commit -m "Add AI-upscaling mechanics content sections to upscale.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: `pdf.html`에 도구 개요 섹션 추가

**Files:**
- Modify: `pdf.html:216-218` (`</section>`로 끝나는 "PDF → 문서 변환" 섹션과 `<section class="info-section">`로 시작하는 FAQ 섹션 사이)

**Interfaces:**
- Consumes: 기존에 배포된 `photos-to-pdf.html`, `pdf-to-word.html`, `pdf-to-ppt.html`(전부 존재함, 링크만 검)
- Produces: Task 1의 `pdf.html has the tool-overview content section linking to all 3 long-tail pages` 테스트가 통과하게 될 변경. 이 시점에 전체 테스트 스위트가 GREEN이 된다.

- [ ] **Step 1: 새 섹션 1개 삽입**

`pdf.html`의 216번째 줄(`</section>`, "PDF → 문서 변환" 섹션의 닫는 태그) 바로 다음, 218번째 줄(`<section class="info-section">`, FAQ 섹션 시작) 바로 앞에 아래 섹션을 삽입한다:

```html
    <section class="info-section">
      <h2>이 도구로 무엇을 할 수 있나요</h2>
      <p>여러 장의 사진을 순서대로 하나의 PDF로 합칠 수 있습니다. 자세한 방법은 <a href="photos-to-pdf.html">여러 장 사진을 PDF로 합치는 방법</a>을 참고하세요.</p>
      <p>PDF 페이지를 개별 이미지로 추출할 수 있습니다.</p>
      <p>PDF를 워드, 파워포인트, 엑셀로 바꿀 수 있습니다. 자세한 방법은 <a href="pdf-to-word.html">PDF를 워드로 변환하는 방법</a>과 <a href="pdf-to-ppt.html">PDF를 파워포인트로 변환하는 방법</a>을 참고하세요.</p>
    </section>

```

- [ ] **Step 2: 전체 테스트 실행 — 전부 통과 확인**

Run: `node tests/seoPagesIntegrity.test.js`
Expected: 모든 테스트 PASS(기존 36개 + 신규 3개 = 39개), `process.exitCode`가 설정되지 않음(0).

- [ ] **Step 3: 브라우저로 최종 수동 확인**

- `pdf.html`을 열어 새 섹션이 "PDF → 문서 변환"과 FAQ 사이에 자연스럽게 보이는지 확인
- 새 섹션의 3개 링크(`photos-to-pdf.html`, `pdf-to-word.html`, `pdf-to-ppt.html`)를 클릭해 정상 이동하는지 확인
- 세 페이지(`index.html`/`upscale.html`/`pdf.html`) 전부에서 기존 FAQ 아코디언과 도구 UI가 그대로 정상 동작하는지 최종 확인

- [ ] **Step 4: 커밋**

```bash
git add pdf.html
git commit -m "Add tool-overview content section to pdf.html

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: 배포

- [ ] **Step 1: 원격 저장소로 푸시**

```bash
git push origin master:main
```

- [ ] **Step 2: 배포 확인**

몇 분 뒤 `index.html`/`upscale.html`/`pdf.html`을 열어 새 섹션이 실제로 보이는지, 기존 도구 기능(압축/업스케일링/PDF 변환)이 정상 동작하는지 확인한다.

- [ ] **Step 3: 다음 단계**

AdSense 반려 대응 계획의 3단계(직접 테스트한 압축률/화질 비교 실측 데이터)로 이어간다 — 별도 브레인스토밍·설계·계획이 필요하다.
