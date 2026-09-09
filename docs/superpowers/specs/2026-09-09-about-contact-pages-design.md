# About/문의 페이지 설계 문서

- 작성일: 2026-09-09
- 상태: 승인됨 (구현 계획 단계로 진행)

## 배경 및 목표

사용자가 외부에서 받은 애드센스 반려 원인 진단(2개 문서 종합)을 공유했다. 핵심 진단은 "기능은 좋은 웹 도구이지만, 광고를 붙일 만한 정보성 콘텐츠 사이트로는 부족하다"는 것이며, 공통 원인 중 하나로 **"사이트 신뢰도/운영자 정보 부족 — About/운영자 소개/문의 페이지가 약함, 문의 방법도 GitHub Issues뿐"**이 지적됐다.

실제 저장소를 확인한 결과 진단이 정확했다: 현재 8개 페이지(`index`/`pdf`/`upscale`/`guide`/`privacy`/`photos-to-pdf`/`pdf-to-word`/`pdf-to-ppt`) 중 About이나 문의 전용 페이지는 하나도 없고, 사용자에게 노출되는 문의 경로도 없다.

사용자는 진단 문서의 제안 5가지(About/문의 페이지, 기존 도구 페이지 콘텐츠 보강, 실측 비교 데이터, 정보성 가이드 글 10~20개, 사이트맵 재제출)를 전부 적용하기로 했고, 그중 우선순위 1번인 이 작업(About/문의 페이지 신설)부터 진행한다.

## 범위

저장소 루트에 신규 정적 페이지 2개를 추가한다(빌드 도구 없는 순수 HTML, 기존 파일들과 동일 위치):

1. `about.html` — 프로젝트 소개 + 운영자 소개(닉네임 수준, 실명 비공개) + 사이트 운영 원칙
2. `contact.html` — 이메일(`nwb010118@gmail.com`, mailto 링크) 기반 문의 안내

그리고 **사이트 전체(기존 8개 페이지 + 신규 2개 페이지, 총 10개)의 `site-footer`**에 "About"과 "문의" 링크를 추가한다 — 진단이 지적한 "신뢰 페이지 접근성 약함"은 페이지 자체보다 그 페이지로 가는 길이 없다는 문제이기도 하므로, 신규 페이지 2개만 만들고 끝내지 않는다.

## 목표가 아닌 것 (Out of Scope)

- 기존 도구 페이지(index/pdf/upscale)의 콘텐츠 보강 — 다음 순서(2번) 작업.
- 압축률/화질 실측 비교 데이터 콘텐츠 — 3번 작업.
- 정보성 가이드 글 10~20개 — 4번 작업.
- 사이트맵을 통한 재심사 신청/Search Console 재제출 — 앞선 신규 페이지들이 다 나온 뒤 한 번에 처리(5번 작업).
- 실제 문의 폼(서버/서드파티 폼 서비스 연동) — 정적 사이트 컨셉과 무료 운영 원칙에 맞춰 mailto 링크로 충분하다고 판단, 폼 서비스 도입은 범위 밖.
- 실명 공개 — 사용자가 닉네임/프로젝트명 수준만 공개하기로 확정.

## 페이지별 콘텐츠 구조

### `about.html`

`guide.html`과 동일하게 `container`/`info-section`/`tool-nav` 클래스를 재사용하며, 아래 섹션으로 구성한다:

1. **H1 + 프로젝트 소개** — image-toolbox가 무엇인지(이미지 압축·PDF 변환·업스케일링을 브라우저에서 무료로 처리하는 도구 모음), 왜 만들었는지(개인정보 보호 원칙이 핵심 동기임을 서술)
2. **운영자 소개** — 닉네임/프로젝트명 수준으로만 소개, 1인 개발·운영 사이트임을 명시. 실명·소속 등 개인 식별 정보는 넣지 않는다.
3. **이 사이트의 원칙** — "무료", "회원가입 불필요", "서버로 파일 전송 안 함" 3가지를 막연한 슬로건이 아니라 각각 왜 그렇게 설계했는지(예: 서버 미전송은 신분증·계약서 같은 민감한 파일을 다루는 사용자가 많아서 등) 근거와 함께 설명한다.
4. **제공 도구 링크** — `index.html`/`pdf.html`/`upscale.html`/`guide.html`로 가는 링크 목록.
5. **문의 링크** — `contact.html`로 가는 링크 한 줄.

### `contact.html`

같은 클래스 재사용, 아래 섹션으로 구성한다:

1. **H1 + 문의 안내** — 버그 제보, 기능 제안, 기타 문의를 받는다는 설명과 `mailto:nwb010118@gmail.com` 링크.
2. **문의 전에 확인해보세요** — 자주 문의될 만한 내용(예: 왜 특정 페이지 수·용량 제한이 있는지, 스캔 PDF 변환이 왜 안 되는지)은 이미 각 도구의 FAQ나 `guide.html`에 설명돼 있으므로, 문의 전에 먼저 확인하도록 안내하고 관련 페이지 링크를 건다. 이는 실질적인 문의 감소 효과와 동시에 페이지 자체를 얕은 링크 나열이 아닌 콘텐츠로 만든다.
3. **응답 관련 안내** — 1인이 운영하는 사이트라 답변에 시간이 걸릴 수 있다는 점을 정직하게 안내(과도한 응답 시간 약속 없음).

## SEO 메타데이터 & 구조화 데이터

기존 페이지들과 동일한 패턴(`title`/`meta description`/`canonical`/`og:type`/`og:title`/`og:description`/`og:url`/`og:locale`)을 따르되, `og:type`은 `guide.html`과 동일하게 `article`을 사용한다(도구 페이지의 `website`와 구분).

- 구조화 데이터는 신규 schema.org 타입을 사용한다: `about.html`은 `AboutPage`, `contact.html`은 `ContactPage`. 둘 다 현재 사이트에 없는 타입으로, 신뢰도 신호로서 의미가 있다.
- 제목(안):
  - `about.html`: "About - image-toolbox 소개 및 운영 원칙"
  - `contact.html`: "문의하기 - image-toolbox"

## 내부 링크 연결 (사이트 전체 변경)

- 기존 8개 페이지(`index.html`/`pdf.html`/`upscale.html`/`guide.html`/`privacy.html`/`photos-to-pdf.html`/`pdf-to-word.html`/`pdf-to-ppt.html`)와 신규 2개 페이지, 총 10개 페이지의 `<footer class="site-footer">` 안에 "About"(→`about.html`)과 "문의"(→`contact.html`) 링크를 기존 "개인정보처리방침" 링크와 나란히 추가한다.
- `about.html`에서 `contact.html`로, `contact.html`에서 각 도구 FAQ/가이드 페이지로 가는 링크(위 콘텐츠 구조 참고).
- `sitemap.xml`에 `about.html`, `contact.html` 2개 URL을 추가한다.

## 에러 처리

해당 없음 — 순수 정적 콘텐츠 페이지로, 실패할 수 있는 로직이 없다.

## 테스트 방침

- 기존 `tests/seoPagesIntegrity.test.js`(Node, 무프레임워크)에 검증 항목을 추가한다:
  - `about.html`/`contact.html`이 존재하고 필수 head 태그(title/canonical/og:title)를 갖췄는지
  - 두 페이지 모두 유효한 JSON-LD(`AboutPage`/`ContactPage`)를 포함하는지
  - `contact.html`이 `mailto:nwb010118@gmail.com` 링크를 포함하는지
  - 기존 8개 페이지 + 신규 2개 페이지 **총 10개 전부**의 footer에 `about.html`과 `contact.html` 링크가 있는지
  - `sitemap.xml`에 두 URL이 반영됐는지
- 브라우저로 직접 열어 링크 클릭 흐름과 mailto 링크 동작을 수동 확인한다.

## 성공 기준

- `about.html`, `contact.html`이 요구된 콘텐츠(소개, 원칙, 문의 안내 등)를 갖추고 배포되어 있다.
- 기존 8개 페이지를 포함한 10개 페이지 전부의 footer에서 About/문의로 이동할 수 있다.
- `sitemap.xml`에 2개 URL이 반영되어 있다.
- 기존 기능(각 도구의 실제 처리 로직)에 회귀가 없다 — JS를 건드리지 않았으므로 자동으로 만족된다.
