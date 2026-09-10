# 정보성 가이드 글 2차 라운드(5개) 설계 문서

- 작성일: 2026-09-10
- 상태: 승인됨 (구현 계획 단계로 진행)

## 배경 및 목표

AdSense 반려 대응 5단계 계획 4단계의 2차 배치. 1차 배치(5개, 배포됨)와 동일한 방식으로 진행하되, 최종 리뷰에서 나온 두 가지 개선점을 함께 반영한다: (1) `guide.html`의 링크 과밀 문단을 목록으로 재구성, (2) 도구 자체 기능을 설명할 때는 실제 코드를 먼저 확인한다(1차 배치에서 `index.html` 압축 도구가 단일 파일 전용인데 "여러 장 한꺼번에"라고 잘못 쓴 사고가 있었음).

## 범위

저장소 루트에 신규 정적 페이지 5개를 추가한다.

1. `web-image-loading-speed.html` — 웹사이트 이미지 로딩 속도 개선(Core Web Vitals)
2. `cloud-storage-photo-tips.html` — 클라우드 저장공간 아끼는 사진 압축 팁
3. `pdf-file-size-reduction.html` — PDF 파일 용량 줄이는 방법 총정리
4. `sns-blog-image-size.html` — 인스타그램·네이버 블로그 이미지 최적 크기
5. `favicon-og-image-size.html` — 파비콘·OG 이미지 정확한 크기

그리고 `guide.html`의 1번 섹션 문단(현재 링크 6개가 몰려 있음)을 목록(`<ul>`)으로 재구성한다.

## 목표가 아닌 것 (Out of Scope)

- 3차 이후 배치 — 이번 라운드 효과를 본 뒤 진행 여부 결정.
- 티스토리 이미지 규격 — 웹 검색으로 공식적인 픽셀 수치를 확인하지 못해 이번 글에서 제외한다(확인 안 된 수치를 추측해서 쓰지 않는다는 원칙 유지).
- 5단계(사이트맵 재제출 → 애드센스 재신청) — 4단계 전체 배치가 끝난 뒤 한 번에.

## 글별 핵심 내용 (사실 확인 완료)

### 1. `web-image-loading-speed.html`
Core Web Vitals의 LCP(Largest Contentful Paint) 기준: **2.5초 이하 양호, 2.5~4.0초 개선 필요, 4.0초 초과 나쁨**. 이미지는 페이지에서 가장 큰 콘텐츠인 경우가 많아 LCP에 직접 영향을 준다. 이미지 용량을 줄이고, WebP 같은 효율적인 형식을 쓰고, 필요한 크기 이상으로 올리지 않는 것이 실질적인 개선 방법이라는 점을 이 사이트의 압축 도구와 연결해 설명한다.

### 2. `cloud-storage-photo-tips.html`
실측(웹 검색으로 확인한) 무료 저장공간:
- **구글 드라이브**: 15GB(드라이브·Gmail·구글 포토 통합 용량).
- **아이클라우드**: 5GB.
- **원드라이브**: 5GB.
- **네이버 마이박스**: 30GB.

사진 용량을 줄이면 같은 무료 용량으로 더 많은 사진을 보관할 수 있다는 흐름으로 `index.html`을 연결한다.

### 3. `pdf-file-size-reduction.html`
**정직한 전제**: 이 사이트의 PDF 도구는 PDF 파일 자체를 압축하는 기능이 없다(기존 `pdf.html` FAQ에 이미 명시된 내용). 대신 우회 방법을 안내한다 — PDF를 이미지로 추출 → 이미지 압축 도구로 용량 줄이기 → 다시 이미지→PDF로 합치기. 이 방법은 **스캔본처럼 이미지가 용량 대부분을 차지하는 PDF에는 효과적이지만, 텍스트 위주 PDF에는 효과가 적다**는 점도 솔직하게 언급한다(텍스트는 이미 용량이 작아서 압축 여지가 거의 없음).

### 4. `sns-blog-image-size.html`
실측(웹 검색으로 확인한) 규격:
- **인스타그램**: 피드 게시물 1080×1350px(4:5), 정사각형 1080×1080px(1:1), 스토리·릴스 1080×1920px(9:16).
- **네이버 블로그**: 게시글 썸네일(검색 노출용) 1300×885px, 모바일 앱 커버 이미지 1080×1300px.

`index.html`의 가로/세로 픽셀 입력으로 각 규격에 맞추는 방법을 안내한다.

### 5. `favicon-og-image-size.html`
실측(웹 검색으로 확인한) 규격:
- **파비콘**: 16×16, 32×32, 48×48px(favicon.ico에 여러 크기 포함 권장).
- **Apple Touch Icon**: 180×180px(iOS 홈 화면 추가 시).
- **Android/PWA 아이콘**: 192×192px, 512×512px.
- **og:image**(소셜 공유 미리보기): 1200×630px(1.91:1 비율).

`index.html`의 리사이즈 기능으로 각 크기를 만드는 방법을 안내한다. (참고: 이 사이트 자체도 아직 `og:image`를 설정하지 못한 상태라는 걸 굳이 언급하지 않는다 — 독자에게 불필요한 정보이며, 이 글의 신뢰도와는 무관한 내부 사정이다.)

## 공통 콘텐츠 구조

1차 배치와 동일: H1 + 도입 → 본문 설명(실제 사실 기반) → 도구 연결 → FAQ 3~4개 → 관련 페이지. `container`/`subtitle`/`tool-nav`/`info-section`/`btn`/`site-footer` 클래스 재사용, 표준 footer(privacy/about/contact) 포함.

**도구 기능 서술 시 주의사항(1차 배치 사고 재발 방지)**: 이 사이트의 도구가 "무엇을 할 수 있는지/없는지"를 서술하는 모든 문장은, 작성 전에 실제 `js/*.js` 코드를 확인해 검증한다. 특히 `index.html`(단일 파일 전용), `pdf.html`의 이미지→PDF(최대 50장 배치 가능)처럼 도구마다 배치 처리 가능 여부가 다르므로 혼동하지 않는다.

## SEO 메타데이터 & 구조화 데이터

기존 페이지들과 동일한 패턴(`title`/`meta description`/`canonical`/`og:type`=article/`og:title`/`og:description`/`og:url`/`og:locale`). `Article` schema.org JSON-LD.

## `guide.html` 재구성

1번 섹션("사진 용량을 줄여야 할 때")의 현재 한 문단짜리 링크 나열을, 짧은 도입 문장 + `<ul>` 목록(각 항목이 관련 글로 링크)으로 바꾼다. 새로 추가되는 5개 글 중 문맥상 맞는 것(`web-image-loading-speed.html`, `cloud-storage-photo-tips.html`, `sns-blog-image-size.html`, `favicon-og-image-size.html`)도 이 목록에 포함한다. `pdf-file-size-reduction.html`은 2번 섹션("PDF로 합쳐야 할 때")에 링크를 추가한다.

## 내부 링크 연결

- `guide.html` 1번 섹션(재구성된 목록에 4개), 2번 섹션(1개: PDF 용량) 링크 추가.
- `pdf.html`의 기존 "PDF 파일 용량도 줄일 수 있나요?" FAQ 답변에 `pdf-file-size-reduction.html` 링크 추가(더 자세한 안내로 유도).
- `sitemap.xml`에 5개 URL 추가.

## 에러 처리

해당 없음 — 순수 정적 콘텐츠 페이지.

## 테스트 방침

- 기존 `tests/seoPagesIntegrity.test.js`에 5개 페이지의 head 태그, Article JSON-LD, footer, `guide.html`/`sitemap.xml` 반영 여부, 그리고 핵심 사실 수치(클라우드 용량, LCP 기준, SNS/파비콘 규격) 검증 항목을 추가한다.
- `guide.html` 재구성 후에도 기존에 이미 배포된 링크(1차 배치 5개 포함)가 전부 유지되는지 확인하는 테스트를 추가한다(재구성 과정에서 실수로 링크가 누락되는 것을 방지).

## 성공 기준

- 5개 글이 각각 실제 확인된 사실에 기반한 콘텐츠를 갖추고 배포되어 있다.
- `pdf-file-size-reduction.html`이 "이 도구로 PDF 직접 압축은 안 된다"는 점을 숨기지 않고 명시한다.
- `guide.html`의 1번 섹션이 목록 형태로 재구성되어 있고, 1차+2차 배치 링크(9개)가 전부 유지된다.
- `pdf.html`, `sitemap.xml`에 관련 링크/URL이 반영되어 있다.
- 기존 페이지/기능에 회귀가 없다.
