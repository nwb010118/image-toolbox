# 가이드 글 이미지 추가 3차 배치(6개) + 1차 배치 기술 부채 정리 설계 문서

- 작성일: 2026-09-14
- 상태: 승인됨 (구현 계획 단계로 진행)

## 배경 및 목표

1차(5개)·2차(5개) 이미지 배치가 완료·배포됐다. 이번은 마지막 3차 콘텐츠 배치(2026-09-13, 6개 글)에 대응하는 이미지 작업이며, 목표 10~20개 글 중 16개 전부에 이미지가 붙어 4단계 이미지 작업이 완료된다.

**중요한 컨텍스트 변화**: 2차 배치 완료 후, 다른 세션이 사이트 전체를 리디자인하는 커밋(`1ad818e`, "Refresh image toolbox with a professional shared design")을 `master`에 직접 올렸다. `css/site.css`가 신규 추가되어 `css/style.css` 뒤에 로드되고, 색상 팔레트가 민트(`#14b8a6`)에서 틸그린(`#116b5d`)으로 바뀌었으며, 헤더/푸터/네비게이션이 전면 개편됐다. 확인 결과:
- `.guide-image` 관련 클래스는 그대로 살아있고, `site.css`가 오히려 `.guide-image img { height: auto; }`를 추가해 반응형 이미지 처리를 개선해줬다 — 2차 배치가 추가한 `width`/`height` 속성과 함께 정상 동작(표준 CLS 방지 패턴).
- 도구 페이지(`index.html`/`upscale.html`/`pdf.html`)의 모든 관련 엘리먼트 `id`는 변경되지 않았다 — 기존 캡처 절차를 그대로 재사용 가능.
- **문제**: 1차 배치의 인라인 SVG 차트 2개(`email-attachment-size.html`, `image-format-comparison.html`)가 색상을 하드코딩(`#14b8a6` 등)해뒀는데, 사이트 전체가 틸그린으로 바뀌면서 이 2개만 옛 민트색으로 남아 실제로 눈에 띄게 됐다. 2차 최종 리뷰가 이미 이 문제를 지적했었다.

이번 라운드는 **6개 신규 이미지 + 1차 배치 기술 부채 정리**를 함께 다룬다(사용자 승인).

## 2차 배치 최종 리뷰에서 이월된 교훈 반영

1. **같은 스크린샷 화면 반복 금지** — 2차 리뷰가 `sns-blog-image-size.html`(1080×1080 입력 화면)이 1차 `photo-id-resize.html`(413×531 입력 화면)과 거의 동일한 화면·문구 템플릿이라고 지적했다. 이번 라운드는 **입력 필드가 아닌 다른 화면 상태**(빈 업로드 영역, 비활성화된 옵션, 여러 파일 목록)를 사용해 이 패턴을 피한다.
2. **1차 배치 기술 부채 정리** — 정확한 실측값 확보됨: `tool-quality-slider.png`=768×341, `tool-resize-413x531.png`=768×341, `upscale-before-after.png`=768×428. 이 값으로 `width`/`height`/`loading="lazy"`/`decoding="async"`를 추가한다. SVG 2개의 하드코딩 hex(`#14b8a6`→`var(--color-accent)`, `#0d9488`→`var(--color-accent-dark)`, `#a7e8df`→`var(--color-border)`, `#1d1d1f`→`var(--color-text)`, `#5b6b6a`→`var(--color-text-secondary)`)를 CSS 변수로 교체한다.
3. **SVG 여백 실측 검증** — 1차·2차 모두 `text-anchor`/viewBox 여백에서 문제가 났었다. 이번 라운드는 좌표를 정할 때부터 각 요소의 예상 bbox를 계산해 최소 6px 이상 여유를 두고, 최종 리뷰에서 로컬 서버로 실제 렌더링해 `getBBox()` 실측을 요청한다.

## 범위

### 신규 이미지 6개

| 글 | 이미지 유형 | 내용 |
|---|---|---|
| `iphone-heic-photo-guide.html` | A. 자사 도구 스크린샷(새 화면) | index.html의 빈 업로드 영역 — 파일 선택 전, "JPG, PNG, WebP 지원" 문구가 보이는 화면 |
| `monitor-resolution-wallpaper-size.html` | A. 자사 도구 스크린샷(새 화면) | upscale.html에서 작은 이미지(240×180) 업로드 시 1440p/4K 옵션이 실제로 비활성화된 화면("최소 640px/960px 필요" 문구 포함) |
| `youtube-thumbnail-size.html` | B. 실측/공식 데이터 시각화(새 형태) | 업로드 용량 한도 스펙 카드 2개(모바일 2MB / 데스크톱 50MB) — 막대차트가 아닌 카드형, 25배 스케일 차이를 막대로 왜곡하지 않기 위함 |
| `old-photo-scan-digitize-workflow.html` | C. 합성 전/후 비교(새 이미지) | 세피아톤 합성 "오래된 사진" 이미지를 실제 업스케일링 도구로 4배 확대한 전/후 비교 — 1차의 `ai-upscaling-limits.html`과 같은 도구지만 완전히 다른 합성 이미지(추상 도형 대신 세피아 풍경) |
| `print-resolution-dpi-guide.html` | B. 실측/공식 데이터 시각화(새 형태) | DPI 계산 공식 + 두 계산 예시(10×15cm@300DPI→1200×1800px, A4@200DPI→1660×2340px)를 실제 비율로 비교하는 사각형 다이어그램 |
| `pdf-merge-multiple-files.html` | A. 자사 도구 스크린샷(새 화면) | pdf.html "이미지→PDF" 섹션에서 이미지 3장이 선택된 실제 파일 목록 화면(2차의 "PDF→이미지 결과 화면"과 다른 섹션·다른 상태) |

### 1차 배치 기술 부채 정리 (기존 파일 수정)

- `kakao-photo-quality.html`, `photo-id-resize.html`, `ai-upscaling-limits.html`의 `<img>`에 `width`/`height`/`loading="lazy"`/`decoding="async"` 추가.
- `email-attachment-size.html`, `image-format-comparison.html`의 인라인 SVG 색상을 하드코딩 hex → `var(--color-*)`로 교체(수치·좌표·구조는 그대로, 색상 값만 변경).

## 목표가 아닌 것 (Out of Scope)

- guide.html에 3차 이미지 배치 관련 신규 링크 추가 — 3차 콘텐츠 배치(2026-09-13)에서 이미 링크가 반영되어 있고, 리디자인 커밋도 이를 유지했다(확인 완료). 이번 라운드는 이미지 삽입만 다룬다.
- `css/site.css`/`css/style.css` 자체 리팩터링 — 다른 세션의 작업 범위이므로 손대지 않는다. `.guide-image` 클래스는 그대로 재사용.
- 새 사이트 디자인(헤더/푸터/네비게이션)에 대한 추가 변경 — 이번 라운드와 무관.

## 이미지별 상세 설계

### 1. `iphone-heic-photo-guide.html` — 빈 업로드 영역

`index.html`을 파일 업로드 없이 그대로 캡처 — `#uploadArea`(또는 그 안의 텍스트 영역)에 "JPG, PNG, WebP 지원 · 최대 20MB" 문구가 보이는 상태. 파일 상호작용이 전혀 필요 없어 가장 간단한 캡처.

### 2. `monitor-resolution-wallpaper-size.html` — 비활성화된 해상도 옵션

`upscale.html`에 합성 이미지(240×180, 1차 배치에서 쓴 것과 동일한 저해상도 샘플 재사용 가능)를 업로드하면 1440p(최소 640px 필요)·4K(최소 960px 필요) 옵션이 자동으로 비활성화되고 이유 문구가 표시된다. 이 실제 상태(`#upscaleControls`)를 캡처 — 확대 버튼은 누르지 않음(결과가 아니라 옵션 상태 자체가 요점).

### 3. `youtube-thumbnail-size.html` — 업로드 용량 스펙 카드

**정직성 문제**: 2MB와 50MB는 25배 차이라 같은 축의 막대로 그리면 2MB 막대가 사실상 안 보인다(1차 배치에서 사진형/그래픽형 압축률 차트를 만들 때 이미 겪은 문제와 동일). **해결책**: 비교 막대 대신, 각자의 값을 크게 보여주는 카드 2개(모바일/데스크톱)를 나란히 배치 — 막대 높이로 비교하지 않으므로 왜곡이 없다.

### 4. `old-photo-scan-digitize-workflow.html` — 세피아 합성 이미지 업스케일링

**합성 소스 이미지(신규)**: 240×180, 세피아 그라데이션 배경(밝은 탠→어두운 브라운) + 지평선 + 산 모양 삼각형 + 원(해/달) + "1985" 같은 작은 텍스트로 "오래된 풍경 사진" 느낌을 낸다. 1차 배치의 추상 도형(파란 그라데이션+흰 타원+검은 사각형+"TEST")과는 완전히 다른 합성물이라 같은 도구를 써도 화면이 겹치지 않는다.

**캡처**: `upscale.html`에 이 이미지를 업로드하고 4배 확대 실행 → `#upscalePreviewArea`(원본+결과 나란히) 캡처.

**정직성**: 1차 `ai-upscaling-limits.html`과 동일한 원칙 유지 — 캡션에 "원본에 없던 디테일이 새로 생기는 것은 아님"을 명시.

### 5. `print-resolution-dpi-guide.html` — DPI 계산 공식 + 예시 비율 다이어그램

**실측 정확성**: 본문에 이미 있는 계산 결과를 그대로 인용 — 10cm×15cm @300DPI = 1200×1800px, A4(약 8.3×11.7인치) @200DPI ≈ 1660×2340px. 두 결과 모두 실제 픽셀 단위라 같은 스케일(0.1px/실제px)로 그려도 왜곡이 없다(GB/MB 케이스와 달리 둘 다 "이미지 픽셀 크기"라는 동일 종류의 값이기 때문).

**시각화**: 상단에 공식 텍스트("필요 픽셀 = DPI × 인치"), 하단에 두 예시를 실제 비율 그대로인 사각형 2개로 나란히 비교(120×180 / 166×234, 0.1 스케일), 각 사각형 위에 조건 라벨, 아래에 정확한 픽셀값 라벨.

### 6. `pdf-merge-multiple-files.html` — 이미지→PDF 다중 파일 선택 화면

`pdf.html`의 "이미지 → PDF" 섹션에 서로 다른 합성 이미지 3장을 업로드 — 파일 목록(`#imgToPdfFileList`)에 3개 항목이 표시되고 "PDF로 변환" 버튼이 나타난 상태를 캡처(변환은 실행하지 않음 — 이 글의 핵심은 "여러 파일을 순서대로 배열해서 합친다"는 2단계이지 변환 결과 자체가 아님). 2차 배치의 `pdf-file-size-reduction.html`이 이미 "PDF→이미지 추출 결과" 화면을 썼으므로, 같은 페이지의 다른 섹션·다른 상태를 사용해 화면 중복을 피한다.

## 공통 사항

- 모든 신규 `<img>`: `width`/`height`/`loading="lazy"`/`decoding="async"` 포함(오케스트레이터가 Pre-step에서 실측한 정확한 값 사용).
- 모든 신규 인라인 SVG: 색상은 `var(--color-*)` 참조(하드코딩 금지, 1차 배치 실수 반복 방지).
- 텍스트가 있는 모든 SVG `<text>`는 `text-anchor` 명시 + viewBox 경계에서 최소 6px 여유(1차·2차보다 여유를 더 둠).
- `image-toolbox`는 git 명령 직접 실행 가능한 예외 저장소. 커밋 attribution은 `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## 이미지 캡처 순서 (오케스트레이터 전용)

유형 A 3장(빈 업로드 영역, 비활성화 옵션, 다중 파일 목록)과 유형 C 1장(세피아 업스케일 전후)은 **오케스트레이터가 SDD 착수 전에 직접** Playwright로 캡처한다 — 1·2차 배치와 동일한 이유(헤드리스 서브에이전트는 브라우저 도구 접근 불가 가능성). 유형 B 2개(스펙 카드, DPI 다이어그램)는 인라인 SVG로 코드 작성하므로 캡처 불필요.

## 테스트 방침

`tests/seoPagesIntegrity.test.js`에 다음을 추가한다:
- 신규 6개 파일 각각 `<figure class="guide-image">` 최소 1개, 관련 alt/figcaption/desc 고유 문자열 검사(1·2차와 동일 패턴).
- 유형 A/C 이미지 4개 파일이 `images/`에 실제 존재하는지 + `<img>`의 `width`/`height`가 실측값과 일치하는지.
- 1차 배치 기술 부채 정리 검증: 기존 3개 `<img>`가 이제 `width`/`height`/`loading`/`decoding`을 갖는지, 기존 2개 SVG가 더 이상 하드코딩 hex를 포함하지 않고 `var(--color-`로 시작하는 색상만 쓰는지.
- 기존 163개 테스트는 회귀 없이 유지.

## 성공 기준

- 6개 글 전부 실제 이미지가 자연스럽게 삽입되어 있고, 어떤 화면도 1·2차 배치와 완전히 동일한 패널/문구 템플릿을 반복하지 않는다.
- 1차 배치 3개 이미지가 CLS 방지 속성을 갖추고, 2개 SVG가 현재 사이트 팔레트(틸그린)를 자동으로 따라간다.
- 어떤 이미지도 이 사이트 도구의 실제 동작과 다른 내용을 보여주지 않는다.
- 기존 텍스트 콘텐츠·링크 구조·163개 기존 테스트에 회귀가 없다.
