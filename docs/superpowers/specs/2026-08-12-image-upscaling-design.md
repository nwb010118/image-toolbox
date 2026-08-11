# 이미지 업스케일링 기능 Design

**Goal:** 별도 페이지(`upscale.html`)에서 이미지 한 장을 AI 모델로 2배 확대한다. 서버로 이미지를 전송하지 않고 브라우저 안에서만 처리한다 (기존 두 도구와 동일한 원칙).

**Architecture:** 기존 이미지/PDF 도구와 동일하게 빌드 도구 없는 순수 HTML/CSS/JavaScript 정적 페이지를 유지한다. 브라우저에 AI 추론 기능이 없으므로 TensorFlow.js(추론 엔진) + UpscalerJS(업스케일링 API) + `@upscalerjs/esrgan-slim`의 2배율 모델(가중치)을 CDN `<script>` 태그로 불러온다. 순수 검증/파일명 로직은 `js/upscaleTools.js`에 두고 Node로 유닛테스트하며, DOM 이벤트와 UpscalerJS 연동은 `js/upscaleApp.js`에서 그 함수들을 소비한다. `upscale.html`은 기존 `js/imageTools.js`도 함께 불러와 `formatBytes`, `isSupportedImageType`을 재사용한다. `index.html`, `pdf.html`은 상단에 새 도구로 가는 링크 한 줄만 추가되고, 무거운 AI 라이브러리는 `upscale.html`에서만 로드된다 (PDF 도구가 `pdf.js`/`jsPDF`를 자기 페이지에서만 로드하는 것과 동일한 패턴).

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES5 문법 위주), Canvas API, File API, TensorFlow.js 4.22.0 (CDN, UMD 빌드), UpscalerJS 1.0.0 (CDN, UMD 빌드), `@upscalerjs/esrgan-slim` 1.0.0의 2배율 모델 (CDN). 빌드 도구 없음. 테스트는 Node.js 내장 `assert` 모듈만 사용.

## 사전 검증 (실측)

라이브러리 3개를 CDN에서 실제로 불러와 16×16 테스트 이미지를 업스케일링해 32×32 PNG가 정상 생성되는 것을 브라우저에서 직접 확인했다 (공식 문서의 예시 경로 `dist/umd/2x.min.js`는 실제로 존재하지 않는 죽은 경로였음 — 실제 작동하는 경로를 jsDelivr 파일 트리에서 직접 확인해 아래에 반영함).

| 파일 | 실측 크기 | 역할 |
|---|---|---|
| `@tensorflow/tfjs@4.22.0/dist/tf.min.js` | 1,469,843 bytes (~1.4MB) | AI 추론 엔진 본체 |
| `@upscalerjs/esrgan-slim@1.0.0/dist/umd/models/esrgan-slim/src/x2/index.min.js` | 1,422 bytes | 2배율 모델 정의 (전역 `ESRGANSlim2x` 노출) |
| `upscaler@1.0.0/dist/browser/umd/upscaler.min.js` | 13,958 bytes | UpscalerJS 본체 |
| 모델 가중치 (`models/x2/model.json` + `.bin`, 런타임에 자동 다운로드) | 900,636 bytes (~880KB) | 실제 신경망 가중치 |

`upscale.html` 방문 시 총 다운로드량은 약 2.4MB — 이미지/PDF 도구 페이지에는 전혀 영향 없음 (별도 페이지이므로).

## 파일 구조

- `js/upscaleTools.js` (신규) — 파일 유효성 검사, 출력 파일명 생성 등 순수 함수
- `tests/upscaleTools.test.js` (신규) — 위 함수들에 대한 Node 기반 단위 테스트
- `upscale.html` (신규) — 업스케일링 페이지 마크업. TensorFlow.js/UpscalerJS/모델 CDN 스크립트, `js/imageTools.js`, `js/upscaleTools.js`, `js/upscaleApp.js` 로드
- `css/style.css` (수정) — `upscale.html` 전용 스타일(원본/결과 비교 영역) 추가. 기존 민트 테마 변수(`--color-accent` 등) 재사용, 새 변수 추가 없음
- `js/upscaleApp.js` (신규) — DOM 이벤트 와이어링, UpscalerJS 호출, 진행 상태 표시
- `index.html`, `pdf.html` (수정) — 상단에 `upscale.html`로 가는 링크 한 줄 추가

## 핵심 기능

- **입력:** 이미지 1장 (JPG/PNG/WebP, 기존 이미지 압축 도구와 동일하게 `isSupportedImageType`으로 검증). 최대 파일 크기 20MB (기존과 동일한 `MAX_FILE_SIZE`).
- **입력 크기 제한 (구현 안전장치, 스펙에 명시되지 않음):** 가로·세로 각각 최대 1000px. 그보다 큰 이미지를 AI 모델에 넣으면 브라우저 탭이 멈추거나 크래시할 수 있어 브라우저 메모리 보호 목적으로 제한한다. 초과 시 에러 메시지로 안내하고, 이미지 압축 도구에서 먼저 리사이즈하도록 링크를 안내한다.
- **배율:** 2배 고정 (`ESRGANSlim2x` 모델 하나만 사용, 배율 선택 UI 없음).
- **출력:** PNG 데이터 URL 형식으로 반환됨(UpscalerJS 자체 동작, 실측 확인). 원본과 결과를 나란히 비교 표시하고, 결과 다운로드 버튼 제공.
- **처리 시간:** 모델 추론에 수 초 소요될 수 있으므로 "처리 중..." 진행 상태를 표시한다.
- **메모리 정리:** 실측 시 콘솔에 `High memory usage in GPU: 0.00 MB` 경고가 떴으나, UpscalerJS 번들 코드를 직접 확인한 결과 `upscale()` 처리 파이프라인 내부에서 매 단계 텐서를 자체적으로 `.dispose()`하고 있음을 확인했다 (경고의 보고값 자체가 0.00MB인 것도 TFJS의 알려진 휴리스틱 기반 노이즈성 경고임을 뒷받침한다). 앱 코드에서 별도의 정리 로직을 추가하지 않는다 — 라이브러리가 이미 처리한다.

## 범위 밖

- 배율 선택(3배/4배/8배 등) — 2배만 지원
- 여러 장 일괄 업스케일링 — 1장만
- 노이즈 제거/디블러링 등 다른 MAXIM 계열 모델 — 업스케일링만
- 다크모드, 새 이미지/아이콘 파일 추가

## 검증

- `tests/upscaleTools.test.js`의 순수 함수 유닛테스트
- 브라우저에서 실제 이미지로 업로드 → 업스케일 → 다운로드 흐름 수동 확인
- 1000px 초과 이미지, 미지원 파일 형식, 20MB 초과 파일 각각 에러 메시지 확인
- 콘솔에 GPU 메모리 누수 경고가 반복되지 않는지 확인 (연속으로 여러 장 처리했을 때)
