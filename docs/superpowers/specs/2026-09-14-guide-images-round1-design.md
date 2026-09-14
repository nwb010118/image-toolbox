# 가이드 글 이미지 추가 1차 배치(5개) 설계 문서

- 작성일: 2026-09-14
- 상태: 승인됨 (구현 계획 단계로 진행)

## 배경 및 목표

AdSense 반려 대응 5단계 계획 4단계에서 만든 정보성 가이드 글 16개는 전부 텍스트만으로 구성돼 있다. 외부 진단(사용자 제공)이 지적한 객관적 약점 중 하나가 "이미지 0개(텍스트만)"이며, 콘텐츠 originality/depth를 높이라는 기존 방침([[feedback_boost_content_originality_depth]])과도 맞물린다.

이번 라운드는 기존 16개 글 중 1차 콘텐츠 배치(2026-09-10)에 대응하는 5개 글에 실제 이미지를 추가한다. 이미지는 전부 다음 두 원칙을 지킨다:
1. **실제로 존재하는 것만 시각화한다** — 손으로 그린 듯한 박스 다이어그램 금지([[feedback_avoid_crude_diagrams]]), CSS로 흉내낸 목업 금지([[feedback_use_real_photos_not_css_mockups]]).
2. **저작권 문제가 없고 재현 가능해야 한다** — benchmark.html이 이미 확립한 "합성 테스트 이미지" 원칙을 그대로 따른다.

## 범위

기존 글 5개에 이미지를 추가한다 (신규 페이지 없음):

| 글 | 이미지 유형 | 내용 |
|---|---|---|
| `kakao-photo-quality.html` | A. 자사 도구 스크린샷 | index.html 압축 도구의 품질 슬라이더 패널 |
| `email-attachment-size.html` | B. 실측 데이터 시각화 | Gmail/네이버/다음 기본 첨부 용량 막대차트 (인라인 SVG) |
| `image-format-comparison.html` | B. 실측 데이터 시각화 | benchmark.html 실측값 인용 막대차트 2개 (인라인 SVG) |
| `photo-id-resize.html` | A. 자사 도구 스크린샷 | index.html 가로/세로 입력란에 413×531 입력한 화면 |
| `ai-upscaling-limits.html` | C. 합성 전/후 비교 | 실제 upscale.html로 합성 테스트 이미지를 4배 확대한 원본/결과 화면 |

그리고 `css/style.css`에 `.guide-image`/`.guide-image img`/`.guide-image svg`/`.guide-image figcaption` 클래스를 추가한다.

## 목표가 아닌 것 (Out of Scope)

- 2차(2026-09-13 배치 5개 대응)·3차(2026-09-13 배치 6개 대응) 이미지 배치 — 이번 라운드로 패턴을 확립한 뒤 다음 라운드에서 유형을 확정.
- `kakao-photo-quality.html`/`iphone-heic-photo-guide.html`이 원래 필요로 했던 "실기기 OS 설정 화면 캡처"(카카오톡 앱, 아이폰 설정) — 캡처 불가능해 이미 자사 도구 스크린샷(A)으로 대체 결정됨(이전 세션에서 확정, 손그림 다이어그램 대안은 기각).
- 신규 콘텐츠 문단 추가나 기존 텍스트 재작성 — 이번 라운드는 이미지 삽입만 다룬다(단, 이미지 바로 위/아래에 이미지를 소개하는 한 줄 문장 정도는 자연스럽게 필요할 수 있음).
- GA4, 백링크, 홍보 게시 등 신뢰 신호 문제 — 사용자가 보류 확정.

## 이미지 캡처/생성 방법 (기술 조사 완료)

### 공통: 합성 소스 이미지 생성

실제 사진 없이 Windows `System.Drawing`(PowerShell 내장, 추가 설치 불필요)으로 합성 이미지를 로컬에 만든다 — benchmark.html의 "합성 테스트 이미지" 원칙과 동일한 방식.
- 도구 스크린샷용(유형 A): 800×600 정도의 단순 도형 합성 JPG 1장 (`%TEMP%\sample-photo.jpg`) — 업로드 화면을 채우는 용도일 뿐이라 내용은 중요하지 않음.
- 업스케일링용(유형 C): 텍스트+도형+그라데이션이 섞인 240×180 PNG 1장 (`%TEMP%\sample-lowres.png`) — 확대 전후 차이가 눈에 보이려면 경계선과 디테일이 있어야 함. `upscale.html` 제약(가로세로 각 1000px 이하)을 만족.

### 유형 A: 자사 도구 스크린샷 (실제 배포 사이트, Playwright MCP)

`mcp__playwright__*` 도구로 실제 배포 사이트(`https://nwb010118.github.io/image-toolbox/`)를 조작하고, `browser_take_screenshot`의 `filename`(디스크에 직접 저장) + `element`(특정 DOM 영역만) 옵션으로 캡처한다. 브라우저의 시각적 스크린샷(computer-use 계열)은 대화에 이미지로만 보여줄 뿐 파일로 저장되지 않으므로 이번 작업엔 맞지 않음 — Playwright가 유일하게 파일 경로로 직접 저장되는 도구라 이걸 채택.

1. `index.html` 접속 → 업로드 버튼 클릭 → `browser_file_upload`로 `sample-photo.jpg` 업로드.
2. **kakao-photo-quality.html용**: 업로드 직후 기본 상태(품질 80%) 그대로 `.controls` 영역을 `element` 스크린샷 → `images/tool-quality-slider.png`.
3. **photo-id-resize.html용**: `resizeWidth`=413, `resizeHeight`=531 입력, `maintainAspectRatio` 체크 해제 → `.controls` 영역(또는 `.resize-fields`) `element` 스크린샷 → `images/tool-resize-413x531.png`.
4. 저장된 파일을 Playwright 출력 디렉터리에서 저장소 `images/`로 복사(Bash `cp`).

### 유형 B: 실측 데이터 시각화 (인라인 SVG, 별도 파일 없음)

이미지 파일이 아니라 `<figure class="guide-image">` 안에 `<svg>`를 직접 인라인으로 작성한다. 색상은 `css/style.css`의 기존 CSS 변수(`--color-accent` 등)를 그대로 참조.

- **email-attachment-size.html**: 막대차트 1개 — "기본 첨부 용량" Gmail 25MB / 네이버메일 10MB / 다음메일 25MB (본문에 이미 있는 수치, 재확인 불필요). 대용량 옵션(네이버 2GB, 다음 4GB)은 스케일 차이가 1000배 가까이 나서 같은 차트에 넣으면 왜곡되므로 차트에는 넣지 않고 기존 본문 서술로만 유지.
- **image-format-comparison.html**: 막대차트 2개.
  - 그래픽형 이미지(100% 품질, 실측 바이트 그대로): PNG 원본 22,791B vs JPG 35,171B vs WebP 6,010B — "JPG가 원본보다 커진다"는 반전을 시각적으로 보여줌 (benchmark.html:93-106 실측치 그대로 인용).
  - 사진형 이미지(80% 품질, 절감률 %): JPG 93.6% 감소 / WebP 93.2% 감소 (원본 1,808,456B → JPG 115,393B / WebP 123,720B, benchmark.html:51-68 실측치에서 계산). 원본이 절대 바이트 기준 1.7MB로 압도적으로 커서 같은 차트에 절대값으로 넣으면 다른 막대가 안 보이므로 절감률(%)로 표현.

### 유형 C: 합성 전/후 비교 (실제 upscale.html 실행, Playwright MCP)

1. `upscale.html` 접속 → `sample-lowres.png` 업로드 → "4배" 모드 선택 → 확대하기 클릭 → 처리 완료 대기(결과 `<img>`가 `hidden` 해제될 때까지 폴링, benchmark 측정 때 확립한 "고정 딜레이 대신 상태 변화 폴링" 패턴 재사용).
2. `#upscalePreviewArea` 전체(원본 박스 + 결과 박스가 나란히 배치된 실제 UI)를 `element` 스크린샷 한 장으로 캡처 → `images/upscale-before-after.png`. 사이트에 이미 있는 원본/결과 나란히 보여주는 레이아웃을 그대로 쓰는 것이라 별도 합성 작업 불필요.

## 구현 순서에 대한 중요한 제약

유형 A/C 이미지 캡처는 **오케스트레이터(현재 세션) 본인이 직접 수행**해야 한다. SDD 워크플로우로 디스패치하는 헤드리스 서브에이전트는 브라우저 제어 도구(Playwright MCP 등)에 접근 권한이 없을 가능성이 높다 — 이전 라운드들의 서브에이전트는 전부 파일 읽기/쓰기만 하는 순수 코드 작업이었다. 따라서 계획 문서(writing-plans 단계) 작성 시:
1. **선행 작업(오케스트레이터가 SDD 착수 전에 완료)**: 합성 소스 이미지 생성 → Playwright로 두 스크린샷(`tool-quality-slider.png`, `tool-resize-413x531.png`) + 업스케일 전후 캡처(`upscale-before-after.png`) 확보 → `images/`에 저장 → 실제 픽셀 내용을 눈으로 확인.
2. **SDD 태스크(서브에이전트가 수행)**: 이미 만들어진 이미지 파일 3개를 각 HTML에 `<figure class="guide-image">`로 삽입, 인라인 SVG 차트 2세트(email/format-comparison) 작성, CSS 클래스 추가, 테스트 추가 — 전부 파일 읽기/쓰기만으로 가능한 작업.

## 공통 CSS

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

`.info-section` 안에 `<figure class="guide-image">...<figcaption>...</figcaption></figure>` 형태로 삽입한다. 기존 `container`/`info-section`/`btn` 등은 그대로 재사용하고, 이번 라운드에 한해 신규 클래스 추가가 정당화된다(이미지 작업 자체가 목적).

## 각 글의 삽입 위치

- `kakao-photo-quality.html`: "반대로 용량을 더 줄여서 보내고 싶다면" 섹션 안, 이미지 압축 도구 링크 문장 다음.
- `email-attachment-size.html`: "서비스별 첨부 용량 제한" 섹션 안, 표 형태 설명 다음.
- `image-format-comparison.html`: "실측 데이터로 보면" 섹션 안, 두 문단 사이(그래픽형 차트) 및 문단 끝(사진형 차트) — 또는 두 차트를 한 섹션에 순서대로.
- `photo-id-resize.html`: "브라우저에서 규격에 맞게 리사이즈하는 법" 섹션 안, 설명 문장 다음.
- `ai-upscaling-limits.html`: "언제 특히 효과적인가요" 섹션 안, 도구 링크 문장 앞이나 뒤.

## 정직성 원칙 (기존 배치와 동일하게 유지)

- 스크린샷은 실제 배포된 사이트의 실제 동작을 그대로 캡처한 것이어야 한다 — 편집으로 없는 기능을 있는 것처럼 보이게 하지 않는다.
- `ai-upscaling-limits.html`의 전/후 비교는 "그럴듯한 디테일을 추론해 채우는 것이지 원본을 완벽 복원하는 게 아니다"라는 기존 본문의 정직한 주장과 모순되지 않는 이미지를 골라야 한다 — 과장된 극적 효과가 나는 이미지보다는 실제로 AI가 하는 일(경계·질감을 선명하게 다듬는 것)이 드러나는 정도의 합성 이미지를 쓴다.
- 차트 수치는 전부 기존에 이미 배포된 본문(benchmark.html, email-attachment-size.html)에 있는 실측/공식 수치를 그대로 인용한다 — 새로 측정하지 않는다.

## 테스트 방침

`tests/seoPagesIntegrity.test.js`에 다음을 추가한다:
- 대상 5개 파일 각각 `<figure class="guide-image">`가 최소 1개 존재.
- `<img>` 태그가 있는 경우 `alt` 속성이 비어있지 않음.
- `<svg>`가 있는 경우 `<figcaption>`이 같은 `<figure>` 안에 존재(접근성 대체 텍스트 역할).
- 유형 A 이미지 2개(`images/tool-quality-slider.png`, `images/tool-resize-413x531.png`)와 유형 C 이미지 1개(`images/upscale-before-after.png`)가 실제로 `images/` 디렉터리에 존재(`fs.existsSync`).
- `image-format-comparison.html`의 SVG 차트 안에 실측 수치 문자열(`22,791`, `35,171`, `6,010`, `93.6%` 등)이 그대로 포함되어 있는지 확인 — 차트와 본문 표의 숫자가 어긋나지 않도록.
- 기존 통과 중인 147개 테스트는 전부 회귀 없이 유지.

## 성공 기준

- 5개 글 각각에 실제(합성이든 실제 사이트 캡처든) 이미지가 최소 1개 이상 자연스럽게 삽입되어 있다.
- 어떤 이미지도 이 사이트 도구의 실제 동작과 다른 내용을 보여주지 않는다(과장·왜곡 없음).
- 차트의 수치가 기존 배포 페이지(benchmark.html 등)의 실측치와 셀 단위로 정확히 일치한다.
- 기존 텍스트 콘텐츠와 링크 구조에 회귀가 없다(147개 기존 테스트 유지 + 신규 테스트 통과).
- 라이트/모바일 환경에서도 이미지가 컨테이너 폭을 넘치지 않는다(`max-width: 100%`).
