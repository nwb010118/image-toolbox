# 핵심 도구 3페이지 영어 버전 설계 문서

- 작성일: 2026-09-30
- 상태: 승인됨 (구현 계획 단계로 진행)

## 배경 및 목표

Product Hunt 런칭을 준비 중인데, 사이트 전체가 `lang="ko"`이고 한국어 전용이다. Product Hunt 트래픽은 거의 전부 영어권이라, 영어 버전 없이 런칭하면 방문자가 도구 UI(버튼/안내 문구)를 읽지 못해 이탈할 가능성이 크다. 반면 가이드 글 18개를 포함한 사이트 전체를 다국어화하는 것은 런칭 전에 하기엔 과하다.

목표는 실제 도구 기능이 있는 핵심 3페이지(`index.html` 압축, `upscale.html` 업스케일링, `pdf.html` PDF 변환)만 영어 버전을 만들어, Product Hunt 링크를 그쪽으로 연결하는 것.

## 범위

`en/index.html`, `en/upscale.html`, `en/pdf.html` 3개 신규 파일을 서브디렉토리에 추가한다. 사이트는 빌드 도구/템플릿 시스템이 없는 순수 정적 HTML이므로, 영어 페이지도 완전히 독립된 HTML 파일로 작성한다.

## 목표가 아닌 것 (Out of Scope)

- 가이드 글 18개, `about.html`/`contact.html`/`privacy.html`/`benchmark.html`/`guide.html` 등 나머지 페이지의 번역 — 전부 한국어 그대로 유지.
- 새로운 기능/JS 로직 — 기존 JS를 그대로 재사용한다.
- 사이트 전체 다국어 프레임워크(언어 감지, i18n 라이브러리 도입 등) — 정적 파일 복제로 충분한 규모다.
- `manifest.json`, `og-image.png` 등 언어 중립적인 공용 자산 변경.

## 파일 구조 및 코드 재사용

- 신규 경로: `en/index.html`, `en/upscale.html`, `en/pdf.html`
- CSS(`css/style.css`, `css/site.css`)와 JS(`js/imageTools.js`, `js/app.js`, `js/shareUtil.js`, `js/upscaleTools.js`, `js/upscaleApp.js`, `js/pdfTools.js`, `js/pdfApp.js`, `js/pdfConvertTools.js`, `js/pdfConvertApp.js` 등 각 페이지가 쓰는 파일)는 **전혀 수정하지 않고 그대로 재사용**한다. `en/` 하위 파일에서는 상대경로를 `../css/style.css`, `../js/app.js`처럼 한 단계 올려서 참조한다.
- **엘리먼트 id/class, `<input>`의 `name`/`accept` 등 JS가 참조하는 모든 속성은 한국어판과 완전히 동일하게 유지**해야 기존 스크립트가 그대로 동작한다. 번역 대상은 화면에 보이는 텍스트(제목, 안내문, 버튼 라벨, FAQ, meta 태그, JSON-LD 문자열)로 한정한다.
- `images/`, `favicon.svg`, `manifest.json` 등 공용 자산은 `en/`에서도 `../images/...` 형태로 그대로 참조(복제하지 않음).

## 번역 범위 및 내용 원칙

- 각 페이지의 `<title>`, `meta description`, OG/Twitter 태그, `<h1>`/`<h2>` 및 본문 안내문, 버튼/폼 라벨, FAQ(`<details>`) 전부 영어로 새로 작성한다.
- 직역이 아니라 **자연스러운 영어 카피**로 작성하되, 수치·사실(지원 형식, 용량 상한, 페이지 상한, 압축률 실측값 등)은 한국어판과 동일해야 한다 — 이 프로젝트가 반복적으로 지켜온 "자사 도구 능력 과대·오서술 금지" 원칙을 영어판에도 동일 적용한다.
- FAQPage/SoftwareApplication JSON-LD도 영어로 새로 작성하고, FAQ 개수는 화면에 보이는 `<details>` 개수와 정확히 일치시킨다(이 프로젝트에서 과거 여러 번 발생했던 "신규 FAQ를 JSON-LD에 반영 안 함" 실수를 재발시키지 않도록 태스크 체크리스트에 명시).
- `SoftwareApplication.offers.priceCurrency`는 영어판에서 `"USD"`로 조정(가격은 계속 `"0"`), `og:locale`은 `en_US`로 지정.
- noscript 배너 문구도 영어로 번역한다.

## 교차 링크 처리

- **영어판 nav**: `Compress` / `PDF Tools` / `Upscale` 3개 링크만 포함하고, 가이드 링크는 제외한다(가이드는 한국어 전용 콘텐츠라 영어 방문자에게 안내할 가치가 낮음).
- **영어판 footer**: `About` / `Contact` / `Privacy Policy` 링크는 기존 한국어 페이지(`../about.html` 등)로 그대로 연결한다 — 법적/신뢰 요소라 아예 없애는 것보다 한국어로라도 남기는 편이 낫다고 판단.
- `index.html`의 "실측 결과 예시" 박스(`benchmark.html` 링크)도 같은 원칙으로 한국어 `benchmark.html`을 그대로 링크한다.
- **언어 전환 링크**: 한국어 3페이지(`index.html`/`upscale.html`/`pdf.html`) 헤더 nav 끝에 작은 `EN` 링크를 추가해 대응하는 `en/` 페이지로 연결하고, 영어 3페이지 헤더에는 `한국어` 링크를 추가해 대응하는 한국어 페이지로 연결한다(1:1 대응이라 구현이 단순함).

## SEO 배선

- 각 페이지 `<head>`에 상호 참조하는 `hreflang` 링크 3개를 추가한다: 해당 언어, 반대 언어, 그리고 `x-default`는 한국어 버전을 가리킨다(주 시장이 한국이므로).
  - 예 (`index.html`): `<link rel="alternate" hreflang="ko" href=".../index.html">`, `<link rel="alternate" hreflang="en" href=".../en/index.html">`, `<link rel="alternate" hreflang="x-default" href=".../index.html">` — `en/index.html`에도 동일한 3개를 대칭으로 추가.
- 각 페이지의 `canonical`은 **자기 자신**을 가리킨다(서로를 중복 콘텐츠로 취급하지 않음 — hreflang은 "번역본" 관계를 알려줄 뿐 정규화 대상이 아니다).
- `sitemap.xml`에 `en/index.html`, `en/upscale.html`, `en/pdf.html` 3개 URL을 추가한다(lastmod는 신규 커밋일 기준).

## 에러 처리

해당 없음 — 순수 정적 콘텐츠 페이지이고 JS 로직은 기존 그대로이므로 새로운 실패 지점이 없다.

## 테스트 방침

- `tests/seoPagesIntegrity.test.js`에 영어 3페이지용 검증을 추가한다:
  - 3개 파일이 존재하고 유효한 HTML(핵심 엘리먼트 id 보존)을 갖는지
  - 한국어↔영어 페이지 간 `hreflang` 상호 참조가 정확한지(양쪽에서 서로를 가리키는지)
  - JSON-LD가 파싱 가능하고, FAQPage의 `mainEntity` 개수가 화면의 `<details>` 개수와 일치하는지
  - `sitemap.xml`에 3개 URL이 반영됐는지
  - 사이트 전체 상대링크(href/src) 깨짐 검사에 `en/` 경로도 포함되는지(기존 스캔 로직이 하위 디렉터리를 다루는지 확인, 안 되면 확장)
- 기존 223개 테스트가 회귀 없이 통과하는지 확인한다.
- 수동 확인: 로컬 서버로 `en/index.html`/`en/upscale.html`/`en/pdf.html` 각각에서 실제로 파일 업로드→처리까지 라이브 테스트(JS가 한국어판과 동일하게 동작하는지, id 불일치로 인한 미동작이 없는지가 가장 위험한 실패 지점).

## 성공 기준

- `en/index.html`, `en/upscale.html`, `en/pdf.html` 3개가 배포되어 실제로 압축/업스케일링/PDF 변환 기능이 정상 동작한다.
- 한국어 3페이지와 영어 3페이지 사이에 언어 전환 링크가 양방향으로 존재한다.
- `hreflang`이 양쪽에서 정확히 상호 참조하고, `sitemap.xml`에 반영되어 있다.
- 기존 한국어 페이지·기존 기능에 회귀가 없다(JS 미수정, 기존 223개 테스트 통과).
