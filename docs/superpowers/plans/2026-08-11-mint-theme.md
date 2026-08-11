# 민트/하늘색 테마 리스킨 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `css/style.css` 하나를 재작성해서 `index.html`, `pdf.html`, `privacy.html` 세 페이지 전부를 무채색(흰 배경 + 회색)에서 부드러운 민트/하늘색 팔레트로 바꾼다.

**Architecture:** `:root`에 CSS 커스텀 프로퍼티로 색상 팔레트를 정의하고, 파일 안의 하드코딩된 색상값을 그 변수로 교체한다. 마크업(HTML)은 건드리지 않는다 — 세 페이지가 이 스타일시트 하나를 공유하므로 파일 하나만 바꾸면 전부 반영된다.

**Tech Stack:** 순수 CSS (프레임워크/전처리기 없음, 기존과 동일)

## Global Constraints

- 색상값은 스펙에 명시된 값을 정확히 사용한다: 배경 `#eef9fb`, 포인트 `#14b8a6`(진한 톤 `#0d9488`), 은은한 강조 배경 `#ccfbf1`, 카드 `#ffffff`, 테두리 `#a7e8df`, 본문 텍스트 `#1d1d1f`, 보조 텍스트 `#5b6b6a`.
- 새 이미지/아이콘/일러스트 파일을 추가하지 않는다.
- 다크모드는 범위 밖이다.
- 섹션 순서, 그리드 레이아웃, HTML 마크업 구조를 변경하지 않는다 — `css/style.css` 한 파일만 수정한다.
- 경고 메시지(`.compress-warning`)와 에러 메시지(`.error-message`)의 색상(호박색/빨강)은 의미 전달용 색이므로 민트 팔레트로 바꾸지 않고 그대로 유지한다.
- 폰트는 교체하지 않는다.

---

### Task 1: 민트 팔레트 적용

**Files:**
- Modify: `css/style.css` (전체 교체)

**Interfaces:**
- Consumes: 없음 (기존 CSS 클래스명은 그대로 유지 — `index.html`, `pdf.html`, `privacy.html`의 마크업이 참조하는 클래스명과 id는 이 작업으로 바뀌지 않는다)
- Produces: `:root`에 정의되는 CSS 커스텀 프로퍼티 `--color-bg`, `--color-accent`, `--color-accent-dark`, `--color-accent-soft`, `--color-surface`, `--color-border`, `--color-text`, `--color-text-secondary` (이후 색상 조정이 필요하면 이 변수들만 고치면 됨)

- [ ] **Step 1: `css/style.css` 전체 교체**

```css
:root {
  --color-bg: #eef9fb;
  --color-accent: #14b8a6;
  --color-accent-dark: #0d9488;
  --color-accent-soft: #ccfbf1;
  --color-surface: #ffffff;
  --color-border: #a7e8df;
  --color-text: #1d1d1f;
  --color-text-secondary: #5b6b6a;
}

* {
  box-sizing: border-box;
}

[hidden] {
  display: none !important;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Malgun Gothic", sans-serif;
  margin: 0;
  padding: 0;
  background: var(--color-bg);
  color: var(--color-text);
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 16px 64px;
}

h1 {
  font-size: 28px;
  margin-bottom: 4px;
  padding-bottom: 8px;
  border-bottom: 3px solid var(--color-accent);
  display: inline-block;
}

.subtitle {
  color: var(--color-text-secondary);
  margin-top: 12px;
  margin-bottom: 24px;
}

.upload-area, .controls, .preview-area {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(20, 184, 166, 0.12);
}

.upload-area {
  position: relative;
  border: 2px dashed var(--color-border);
  border-radius: 16px;
  min-height: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 16px 24px;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}

.upload-area.drag-over {
  border-color: var(--color-accent);
  background-color: var(--color-accent-soft);
}

.upload-icon {
  width: 28px;
  height: 28px;
  margin-bottom: 8px;
  color: var(--color-accent);
}

.upload-btn {
  border-radius: 999px;
  padding: 14px 36px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 14px;
}

.upload-hint {
  color: var(--color-text-secondary);
  font-size: 15px;
  margin: 0;
}

.upload-formats {
  color: var(--color-text-secondary);
  font-size: 12px;
  margin: 10px 0 0;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.compress-warning {
  color: #9a6700;
  background: #fff8e5;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  margin: 8px 0;
}

.error-message {
  color: #d70015;
  margin-top: 12px;
}

.controls label {
  display: block;
  margin-bottom: 8px;
}

.controls input[type="range"] {
  width: 100%;
  margin-bottom: 16px;
}

button, #downloadBtn, .btn {
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 15px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}

button:hover, #downloadBtn:hover, .btn:hover {
  background: var(--color-accent-dark);
}

.preview-area {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.preview-box {
  flex: 1;
  min-width: 240px;
}

.preview-box img {
  max-width: 100%;
  border-radius: 8px;
  display: block;
  margin-bottom: 8px;
}

@media (max-width: 600px) {
  .preview-area {
    flex-direction: column;
  }
}

.resize-fields {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.controls .resize-label {
  display: flex;
  flex-direction: column;
  font-size: 13px;
  color: var(--color-text-secondary);
  gap: 4px;
}

.resize-label input[type="number"] {
  width: 90px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
}

.controls .checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text);
  margin-bottom: 8px;
}

#formatSelect {
  display: block;
  width: 100%;
  max-width: 200px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
}

.tool-nav {
  margin: 0 0 20px;
}

.tool-nav a {
  color: var(--color-accent);
  text-decoration: none;
  font-size: 14px;
}

.pdf-section {
  margin-bottom: 32px;
}

.pdf-section h2 {
  font-size: 20px;
  margin-bottom: 12px;
}

.file-list {
  list-style: none;
  padding: 0;
  margin: 12px 0;
  background: var(--color-surface);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(20, 184, 166, 0.12);
}

.file-list:empty {
  display: none;
}

.file-list li {
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-border);
  font-size: 14px;
  display: flex;
  justify-content: space-between;
}

.file-list li:last-child {
  border-bottom: none;
}

.pdf-progress {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin: 12px 0;
}

.pdf-page-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.pdf-page-item {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(20, 184, 166, 0.12);
  width: 160px;
  text-align: center;
}

.pdf-page-item img {
  max-width: 100%;
  border-radius: 8px;
  display: block;
  margin-bottom: 8px;
  border: 1px solid var(--color-border);
}

.pdf-page-item a {
  font-size: 13px;
  padding: 6px 12px;
}

.info-section {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(20, 184, 166, 0.12);
}

.info-section h2 {
  font-size: 18px;
  margin-top: 0;
}

.info-section details {
  border-top: 1px solid var(--color-border);
  padding: 12px 0;
}

.info-section details:first-of-type {
  border-top: none;
}

.info-section details[open] {
  background: var(--color-accent-soft);
}

.info-section summary {
  cursor: pointer;
  font-weight: 600;
}

.info-section summary + p {
  color: var(--color-text-secondary);
  margin: 10px 0 0;
}

.site-footer {
  text-align: center;
  padding: 24px 0;
  font-size: 13px;
}

.site-footer a {
  color: var(--color-text-secondary);
  text-decoration: none;
}

.site-footer a:hover {
  text-decoration: underline;
  color: var(--color-accent);
}
```

Path: `css/style.css`

- [ ] **Step 2: 문법 확인**

Run: `node -e "require('fs').readFileSync('css/style.css','utf8')"`
Expected: 에러 없이 종료 (파일이 존재하고 읽을 수 있는지만 확인)

- [ ] **Step 3: 기존 단위 테스트가 영향받지 않았는지 확인**

Run: `node tests/pdfTools.test.js && node tests/imageTools.test.js`
Expected: 둘 다 마지막 줄에 `모든 테스트 통과` 출력, exit code 0 (CSS만 바꿨으므로 이 테스트들은 원래 그대로 통과해야 함 — 회귀 확인용)

- [ ] **Step 4: 로컬 서버로 세 페이지 렌더링 확인**

Run: `python -m http.server 8123` (별도 터미널/백그라운드)

Claude Browser MCP로 아래 세 URL을 각각 열어서 확인:
- `http://localhost:8123/index.html`
- `http://localhost:8123/pdf.html`
- `http://localhost:8123/privacy.html`

Expected 체크리스트 (`read_console_messages`로 에러 없는지 확인, `get_page_text`로 텍스트가 그대로인지 확인 — 이 환경은 스크린샷 합성이 안 될 수 있으므로 시각적 확인이 어려우면 `javascript_tool`로 `getComputedStyle(document.body).backgroundColor`가 `rgb(238, 249, 251)`(= `#eef9fb`)인지, 버튼 요소의 `getComputedStyle(...).backgroundColor`가 `rgb(20, 184, 166)`(= `#14b8a6`)인지 확인):
- 콘솔 에러 없음
- 페이지 텍스트/구조가 이전과 동일 (마크업 안 바꿨으므로)
- `body` 배경색이 `#eef9fb`로 적용됨
- 버튼 배경색이 `#14b8a6`로 적용됨

- [ ] **Step 5: Commit**

```bash
git add css/style.css
git commit -m "style: reskin site with mint/sky-blue palette"
```

---

## Self-Review Notes

- **스펙 커버리지:** 스펙의 8개 색상 변수 전부 `:root`에 정의됨. "적용 대상" 목록의 모든 항목(배경, 업로드 영역 테두리/드래그 상태, 버튼+호버, h1 포인트 라인, 카드 그림자, info-section details 열림 강조, 링크 색상)이 코드에 반영됨. "범위 밖" 항목(새 이미지/아이콘, 다크모드, 마크업 구조 변경, 폰트 교체)은 이번 변경에서 손대지 않음으로써 자연히 충족. 경고/에러 메시지 색상은 Global Constraints에 따라 원래 색 유지.
- **타입/인터페이스 일관성:** CSS이므로 별도 함수 시그니처는 없음. 클래스명/id는 기존 HTML과 정확히 동일한 문자열을 그대로 사용(교체 없음)해서 마크업과의 연결이 끊기지 않음.
- **플레이스홀더 검사:** TBD/TODO 없음. 전체 CSS 파일 내용이 실제로 붙여넣어 사용 가능한 완성 코드임.
