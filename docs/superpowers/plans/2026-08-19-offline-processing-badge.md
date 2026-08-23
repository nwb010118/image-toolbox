# 처리 버튼 옆 "오프라인 처리" 배지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사이트의 모든 처리 액션 지점(이미지 압축, 업스케일링, 이미지→PDF, PDF→이미지, PDF→문서변환)에 "서버 전송 없음" 배지를 정적으로 추가해, 사용자가 액션 버튼을 누르는 순간에도 신뢰 메시지가 눈에 보이게 한다.

**Architecture:** 빌드 도구·컴포넌트 시스템이 없는 순수 정적 사이트이므로, 동일한 배지 마크업(자물쇠 SVG 아이콘 + 텍스트)을 5개 위치에 그대로 반복 삽입한다. `css/style.css`에 새 클래스 2개(`.offline-badge`, `.offline-badge-icon`)를 한 번만 추가해 5곳에서 공유한다. JS 파일은 전혀 수정하지 않는다 — 배지는 페이지 로드 시부터 항상 보이는 정적 요소이며 처리 상태와 무관하다.

**Tech Stack:** HTML5, CSS3. JavaScript 변경 없음.

## Global Constraints

- 배지 마크업(아이콘 SVG + 텍스트)은 5곳 모두 완전히 동일해야 한다(들여쓰기 수준만 파일 문맥에 맞게 다름). (스펙: 기술 방식)
- 아이콘은 기존 `.upload-icon`과 동일한 속성으로 그린다: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.5"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `aria-hidden="true"`. 자물쇠 모양(사각형 몸통 + 위쪽 고리) SVG를 사용한다. 이모지는 쓰지 않는다. (스펙: 기술 방식)
- 배지 문구는 정확히 "서버 전송 없음 · 브라우저에서만 처리"로 통일한다. (스펙: 범위)
- 배지는 정적이다 — JS로 보이거나 숨기지 않는다. 어떤 JS 파일도 수정하지 않는다. (스펙: 목표가 아닌 것)
- 새 CSS 클래스는 `.offline-badge`(flex 정렬, `font-size: 12px`, `color: var(--color-text-secondary)`)와 `.offline-badge-icon`(`width/height: 14px`, `color: currentColor`)이다. (스펙: 기술 방식)

---

## File Structure

- `css/style.css` (수정) — `.offline-badge`, `.offline-badge-icon` 클래스 추가
- `index.html` (수정) — 이미지 압축 "적용하기" 버튼 아래에 배지 삽입
- `upscale.html` (수정) — "확대하기" 버튼 아래에 배지 삽입
- `pdf.html` (수정) — "PDF로 변환"(이미지→PDF) 버튼 아래, PDF→이미지 업로드 영역 아래, "변환하기"(PDF→문서변환) 버튼 아래 총 3곳에 배지 삽입

---

### Task 1: CSS 클래스 추가 + 5개 페이지에 배지 삽입

**Files:**
- Modify: `css/style.css`
- Modify: `index.html`
- Modify: `upscale.html`
- Modify: `pdf.html`

**Interfaces:**
- Consumes: 없음 (독립적인 마크업/스타일 추가)
- Produces: 없음 (이 작업이 최종 결과물 — 순수 콘텐츠/스타일 변경이라 이후 태스크가 없음)

- [ ] **Step 1: `css/style.css`에 배지 스타일 추가**

기존:
```css
.upload-formats {
  color: var(--color-text-secondary);
  font-size: 12px;
  margin: 10px 0 0;
}

.visually-hidden {
```

다음으로 교체:
```css
.upload-formats {
  color: var(--color-text-secondary);
  font-size: 12px;
  margin: 10px 0 0;
}

.offline-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 8px;
}

.offline-badge-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: currentColor;
}

.visually-hidden {
```

- [ ] **Step 2: `index.html` — 압축 "적용하기" 버튼 아래에 배지 삽입**

기존:
```html
      <button id="compressBtn">적용하기</button>
    </section>
```

다음으로 교체:
```html
      <button id="compressBtn">적용하기</button>
      <p class="offline-badge">
        <svg class="offline-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2"></rect>
          <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
        </svg>
        서버 전송 없음 · 브라우저에서만 처리
      </p>
    </section>
```

- [ ] **Step 3: `upscale.html` — "확대하기" 버튼 아래에 배지 삽입**

기존:
```html
      <button id="upscaleBtn">확대하기</button>
    </section>
    <p id="upscaleProgress" class="pdf-progress" hidden>처리 중...</p>
```

다음으로 교체:
```html
      <button id="upscaleBtn">확대하기</button>
      <p class="offline-badge">
        <svg class="offline-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2"></rect>
          <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
        </svg>
        서버 전송 없음 · 브라우저에서만 처리
      </p>
    </section>
    <p id="upscaleProgress" class="pdf-progress" hidden>처리 중...</p>
```

- [ ] **Step 4: `pdf.html` — "PDF로 변환"(이미지→PDF) 버튼 아래에 배지 삽입**

기존:
```html
      <button id="imgToPdfBtn" hidden>PDF로 변환</button>
      <a id="imgToPdfDownloadBtn" class="btn" href="#" download="images.pdf" hidden>PDF 다운로드</a>
    </section>

    <section class="pdf-section">
      <h2>PDF → 이미지</h2>
```

다음으로 교체:
```html
      <button id="imgToPdfBtn" hidden>PDF로 변환</button>
      <p class="offline-badge">
        <svg class="offline-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2"></rect>
          <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
        </svg>
        서버 전송 없음 · 브라우저에서만 처리
      </p>
      <a id="imgToPdfDownloadBtn" class="btn" href="#" download="images.pdf" hidden>PDF 다운로드</a>
    </section>

    <section class="pdf-section">
      <h2>PDF → 이미지</h2>
```

- [ ] **Step 5: `pdf.html` — PDF→이미지 업로드 영역 아래에 배지 삽입**

이 흐름은 별도 액션 버튼 없이 파일 선택 즉시 처리되므로 업로드 영역 바로 아래에 둔다.

기존:
```html
        <div id="pdfToImgError" class="error-message" hidden></div>
      </section>

      <p id="pdfToImgProgress" class="pdf-progress" hidden></p>
```

다음으로 교체:
```html
        <div id="pdfToImgError" class="error-message" hidden></div>
      </section>

      <p class="offline-badge">
        <svg class="offline-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2"></rect>
          <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
        </svg>
        서버 전송 없음 · 브라우저에서만 처리
      </p>

      <p id="pdfToImgProgress" class="pdf-progress" hidden></p>
```

- [ ] **Step 6: `pdf.html` — "변환하기"(PDF→문서변환) 버튼 아래에 배지 삽입**

기존:
```html
        <button id="pdfConvertBtn">변환하기</button>
      </section>

      <p id="pdfConvertProgress" class="pdf-progress" hidden></p>
```

다음으로 교체:
```html
        <button id="pdfConvertBtn">변환하기</button>
        <p class="offline-badge">
          <svg class="offline-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="4" y="11" width="16" height="10" rx="2"></rect>
            <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
          </svg>
          서버 전송 없음 · 브라우저에서만 처리
        </p>
      </section>

      <p id="pdfConvertProgress" class="pdf-progress" hidden></p>
```

- [ ] **Step 7: 브라우저에서 수동 확인**

다섯 페이지/위치를 모두 새로고침해서 확인한다:
- `index.html`: "적용하기" 버튼 아래에 자물쇠 아이콘 + "서버 전송 없음 · 브라우저에서만 처리" 문구가 보인다
- `upscale.html`: "확대하기" 버튼 아래에 동일한 배지가 보인다
- `pdf.html`: "PDF로 변환" 버튼 아래, PDF→이미지 업로드 영역 아래, "변환하기" 버튼 아래 총 3곳에 배지가 보인다
- 모바일 화면 크기(개발자 도구 반응형 보기, 375px 폭 등)에서 배지 텍스트가 줄바꿈되거나 아이콘이 찌그러지지 않는다
- 배지 추가로 인해 기존 업로드/변환/다운로드 동작에 변화가 없다(버튼 클릭, 파일 선택 등이 정상 동작한다)

- [ ] **Step 8: 커밋**

```bash
git add css/style.css index.html upscale.html pdf.html
git commit -m "Add offline-processing trust badge near every action button"
```

---

## 성공 기준 확인

- 5개 처리 지점 모두에 배지가 보인다.
- JS 파일이 전혀 수정되지 않았다(`git diff --stat`으로 확인 시 `.js` 파일이 나타나지 않아야 한다).
- 기존 기능에 회귀가 없다.
