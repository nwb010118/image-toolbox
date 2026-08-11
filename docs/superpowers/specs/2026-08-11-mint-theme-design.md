# 민트/하늘색 테마 리스킨 Design

**Goal:** 지금 무채색(흰 배경 + 회색)인 `index.html`, `pdf.html`, `privacy.html`을 부드러운 민트/하늘색 파스텔 톤으로 재도색한다. 구조(섹션 순서, 그리드, 마크업)는 바꾸지 않고 색상과 세부 스타일만 바꾼다.

**Scope:** `css/style.css` 한 파일만 수정한다. 세 페이지 모두 이 스타일시트 하나를 공유하므로 별도 마크업 변경 없이 자동으로 톤이 맞춰진다. 새 이미지/아이콘/일러스트 파일 추가는 하지 않는다. 다크모드는 범위 밖이다.

## 접근 방식

색상값을 `:root`에 CSS 커스텀 프로퍼티로 정의하고, 기존에 하드코딩된 색상(`#0071e3`, `#f5f5f7`, `#d0d0d5` 등)을 그 변수로 교체한다. 값을 한 곳에서 관리해 나중에 톤을 바꿀 때 여러 곳을 찾아 고칠 필요가 없게 한다.

## 색상 팔레트

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
```

- `--color-bg`: `body` 배경 (지금의 `#f5f5f7` 대체)
- `--color-accent` / `--color-accent-dark`: 버튼, 링크, 강조 텍스트, 호버 상태
- `--color-accent-soft`: 태그·배지·은은한 강조 배경
- `--color-surface`: 카드 배경 (흰색 유지)
- `--color-border`: 업로드 영역 점선 테두리, 카드 구분선 (지금의 회색 `#d0d0d5`, `#eee` 대체)
- `--color-text` / `--color-text-secondary`: 본문·보조 텍스트 (가독성 위해 톤 거의 그대로 유지)

## 적용 대상

- `body` 배경: `--color-bg`
- `.upload-area` 테두리: 점선 회색 → `--color-border`, hover/`.drag-over` 시 `--color-accent`
- 버튼류 (`button`, `#downloadBtn`, `.btn`, `.upload-btn`): 배경 `--color-accent`, 텍스트 흰색, hover 시 `--color-accent-dark`
- `h1`: 아래쪽에 `--color-accent` 색상의 얇은 포인트 라인 추가 (`border-bottom` 또는 `::after`)
- `.tag`, `.file-list`, `.pdf-page-item` 등 카드형 요소: 그림자를 회색(`rgba(0,0,0,0.08)`)에서 민트 톤(`rgba(20,184,166,0.12)` 등)으로
- `.info-section details`: 열렸을 때(`[open]`) 배경을 `--color-accent-soft`로 살짝 강조
- `a` (링크 전반): `--color-accent`

## 범위 밖

- 새 이미지/SVG 아이콘/일러스트 추가
- 다크모드
- 섹션 순서, 그리드 레이아웃, 마크업 구조 변경
- 폰트 교체

## 검증

- 세 페이지(`index.html`, `pdf.html`, `privacy.html`) 모두 로컬 서버로 열어서 시각적으로 확인
- 기존 단위 테스트(`tests/*.test.js`)는 CSS와 무관하므로 그대로 통과해야 함
- 콘솔 에러 없음 확인
