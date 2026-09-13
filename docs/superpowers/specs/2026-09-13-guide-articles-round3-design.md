# 정보성 가이드 글 3차 라운드(6개) 설계 문서

- 작성일: 2026-09-13
- 상태: 승인됨 (구현 계획 단계로 진행)

## 배경 및 목표

AdSense 반려 대응 5단계 계획 4단계의 3차 배치. 1차(5개)·2차(5개) 배치는 이미 배포됐고(목표 10~20개 중 10개 완료), 이번 라운드에서 6개를 추가해 16개로 늘린다.

2차 배치 최종 리뷰에서 나온 두 가지 실수를 다시 반복하지 않는다:
1. **자사 도구 기능 오서술** — 도구가 실제로 못 하는 일(크롭, PDF 병합 등)을 서술할 때는 반드시 실제 `js/*.js` 코드로 먼저 확인한다.
2. **기존 글과의 준중복 콘텐츠** — 새 글이 이미 배포된 9개 글(1차 5개 + 2차 4개, `pdf-file-size-reduction.html` 포함 10개)과 문장 단위로 겹치지 않는지 작성 단계에서 직접 대조한다. 특히 도구 연결 문단(index.html 리사이즈 안내 등)은 매번 새로 쓰고, 절대 이전 글을 복사해 숫자만 바꾸지 않는다.

## 범위

저장소 루트에 신규 정적 페이지 6개를 추가한다.

1. `iphone-heic-photo-guide.html` — 아이폰 HEIC 사진이 안 열릴 때 대처법
2. `monitor-resolution-wallpaper-size.html` — 모니터 해상도별 배경화면 이미지 크기
3. `youtube-thumbnail-size.html` — 유튜브 썸네일 크기 (공식 스펙)
4. `old-photo-scan-digitize-workflow.html` — 오래된 사진 스캔 후 디지털 보관 워크플로우
5. `print-resolution-dpi-guide.html` — 인쇄용 사진 해상도(DPI) 완전정리
6. `pdf-merge-multiple-files.html` — PDF 여러 개 합치기(병합) — 직접은 안 되지만 이 방법으로

그리고 `guide.html`의 1번 섹션 목록에 3개, 2번 섹션 문단에 1개, 3번 섹션 문단에 2개 링크를 추가한다.

## 목표가 아닌 것 (Out of Scope)

- 온라인 쇼핑몰(스마트스토어/쿠팡 등) 상품 이미지 규격 — 공식 판매자센터 문서를 찾지 못했고, 나온 수치(1000×1000px 등)가 전부 서드파티 블로그 출처라 신뢰도 부족으로 제외한다(2차 배치에서 티스토리 이미지 규격을 같은 이유로 제외한 것과 동일한 원칙).
- 4차 이후 배치 — 이번 라운드 결과를 본 뒤 진행 여부 결정. 목표 10~20개 중 16개 도달.
- 5단계(사이트맵 재제출 → 애드센스 재신청) — 4단계 전체 배치가 끝난 뒤 한 번에.

## 글별 핵심 내용 (사실 확인 완료)

### 1. `iphone-heic-photo-guide.html`
**전제 확인(코드)**: `index.html`의 `#fileInput`은 `accept="image/jpeg,image/png,image/webp"`로 HEIC를 직접 지원하지 않는다(`index.html:101`). 이 사실을 숨기지 않고 명시한다.

**해결 방법(웹 검색 확인)**: 아이폰에서 **설정 → 카메라 → 포맷 → 호환성 우선**으로 바꾸면 이후 촬영하는 사진이 곧바로 JPG로 저장된다. 이미 찍어둔 HEIC 사진은 아이폰에서 공유(에어드롭/메일 등)하거나 다른 변환 앱을 거쳐야 JPG/PNG로 바뀐다는 점도 정직하게 언급한다(이 사이트는 HEIC→JPG 변환 기능이 없음).

**도구 연결**: JPG/PNG로 바뀐 뒤에는 이 사이트의 `index.html`(압축)로 용량을 더 줄일 수 있다.

### 2. `monitor-resolution-wallpaper-size.html`
**실측(웹 검색으로 확인한) 규격**: FHD 1920×1080px, QHD(WQHD) 2560×1440px, 4K(UHD) 3840×2160px.

**이 사이트 도구와의 연결(코드 확인)**: `upscale.html`의 `RESOLUTION_PRESETS`가 정확히 `1440p: 2560`, `4K: 3840`(긴 변 기준, `js/upscaleTools.js:7`)이라 이 세 해상도 표준과 그대로 맞아떨어진다. 원본 사진이 목표 해상도보다 작으면 업스케일링으로, 크면 이미지 압축 도구의 리사이즈로 맞추는 두 갈래를 모두 정직하게 설명한다(업스케일링은 없는 디테일을 만들어내는 것이 아니라는 `ai-upscaling-limits.html`의 기존 원칙과 모순되지 않게 서술).

### 3. `youtube-thumbnail-size.html`
**공식 출처 확인(support.google.com/youtube/answer/72431, WebFetch로 원문 직접 확인)** — 통설로 도는 "1280×720"이 아니라 공식 현재 기준을 사용한다:
- 동영상 썸네일: 권장 해상도 **3840×2160px**(최소 너비 640px), 가로세로 비율 **16:9**, 파일 형식 **JPG/PNG**, 파일 용량 모바일 **2MB**, 데스크톱 **50MB**.
- Shorts 썸네일(참고로만 언급): 2160×3840px(최소 높이 640px), 9:16.

**도구 연결**: `index.html`에서 가로/세로 픽셀을 직접 입력해 3840×2160으로 맞추고, 품질 조절로 용량을 2MB 이하로 줄일 수 있다.

### 4. `old-photo-scan-digitize-workflow.html`
**실측(웹 검색으로 확인한) 스캔 권장치**: 보관용 스캔은 300DPI, 확대·인화·복원 목적이라면 600DPI를 권장.

**도구 연결(코드 확인, 압축+업스케일 조합)**: 스캔한 사진 파일을 `index.html`로 압축해 저장 용량을 아끼고, 원본이 작거나 흐릿하면 `upscale.html`로 확대해 인화·인쇄용으로 키운다. `ai-upscaling-limits.html`이 이미 밝힌 한계(초점이 심하게 나간 사진은 개선 폭이 작음)를 그대로 인용하며 과장하지 않는다. 여러 장을 스캔했다면 `photos-to-pdf.html`로 한 파일에 모아 보관하는 방법도 연결한다.

### 5. `print-resolution-dpi-guide.html`
**수학적 사실(회사별 임의 규격이 아니라 계산 공식)**: 필요 픽셀 수 = DPI × 인쇄할 인치(cm ÷ 2.54). 인쇄 표준은 **300DPI**가 안전하지만, 사람이 멀리서 보는 대형 출력물(포스터 등)은 **150~200DPI**로도 충분하다는 점을 함께 밝힌다(무조건 300DPI를 강요하지 않음 — 정직성).

**도구 연결**: 계산한 목표 픽셀 값을 `index.html`의 가로/세로 입력란에 직접 넣어 맞출 수 있다. 원본이 계산된 목표 픽셀보다 작으면 `upscale.html`로 먼저 키운 뒤 정확한 크기로 맞추는 순서를 안내한다.

### 6. `pdf-merge-multiple-files.html`
**정직한 전제(코드 확인, `pdf.html`)**: 이 사이트의 PDF 도구는 이미지 여러 장을 하나의 PDF로 만들거나(최대 50장), PDF 페이지를 이미지로 추출하는(최대 300페이지) 기능만 있다. **이미 만들어진 PDF 파일 여러 개를 하나로 합치는(병합) 기능은 없다.**

**우회 방법**: 각 PDF를 `pdf.html`에서 이미지로 추출 → 원하는 순서대로 배열 → `photos-to-pdf.html`(이미지→PDF, 최대 50장)로 다시 하나의 PDF로 합친다.

**한계를 숨기지 않음**: 합치려는 PDF들의 총 페이지 수가 50장을 넘으면 이 방법으로 한 번에 합칠 수 없다는 점을 명시한다(이미지→PDF의 50장 상한이 그대로 병목이 됨). 이 경우 여러 묶음으로 나눠 합치거나 다른 PDF 병합 도구를 써야 한다고 정직하게 안내한다.

## 공통 콘텐츠 구조

1·2차 배치와 동일: H1 + 도입 → 본문 설명(실제 사실 기반) → 도구 연결 → FAQ 3~4개 → 관련 페이지. `container`/`subtitle`/`tool-nav`/`info-section`/`btn`/`site-footer` 클래스 재사용, 표준 footer(privacy/about/contact) 포함.

**도구 기능 서술 시 주의사항(2차 배치 사고 재발 방지)**: "이 도구는 ~할 수 없다/있다"는 문장을 쓰기 전 반드시 해당 `js/*.js`를 확인한다. 이번 라운드에서 특히 주의할 점: `index.html`은 크롭 기능이 없다(리사이즈만 가능) — 사진을 자르는 단계가 필요하면 "사진 편집 프로그램으로"라고 주체를 명시하고 이 사이트 도구가 자르는 것처럼 쓰지 않는다. `pdf.html`은 PDF+PDF 병합 기능이 없다.

**중복 콘텐츠 방지(2차 배치 사고 재발 방지)**: 새 글을 쓰기 전 기존 10개 글(특히 `photo-id-resize.html`, `sns-blog-image-size.html`처럼 "브라우저에서 규격에 맞게 크기 조정하는 법" 류의 도구 연결 문단이 있는 글)을 먼저 열어 문장 단위로 대조한다. 같은 지시사항(가로/세로 픽셀 입력, '비율 유지' 끄기)을 전달하더라도, 이번 라운드 6개 글은 각자의 맥락(HEIC 변환 후, 유튜브 썸네일, DPI 계산 결과 등)에 맞게 문장을 새로 구성한다.

## SEO 메타데이터 & 구조화 데이터

기존 페이지들과 동일한 패턴(`title`/`meta description`/`canonical`/`og:type`=article/`og:title`/`og:description`/`og:url`/`og:locale`). `Article` schema.org JSON-LD.

## `guide.html` 재구성

- 1번 섹션("사진 용량을 줄여야 할 때") `<ul>` 목록에 3개 추가: `iphone-heic-photo-guide.html`, `youtube-thumbnail-size.html`, `print-resolution-dpi-guide.html`. (기존 8개 + 신규 3개 = 11개)
- 2번 섹션("여러 장의 이미지를 PDF로 합쳐야 할 때") 문단에 1개 링크 추가: `pdf-merge-multiple-files.html`.
- 3번 섹션("저해상도 이미지를 확대해야 할 때")은 현재 링크가 1개(`ai-upscaling-limits.html`)뿐이라 목록화하지 않고, 문단에 자연스럽게 2개 링크를 추가한다: `monitor-resolution-wallpaper-size.html`, `old-photo-scan-digitize-workflow.html`.

## 내부 링크 연결

- `guide.html` 1번 섹션 목록에 3개, 2번 섹션 문단에 1개, 3번 섹션 문단에 2개 링크 추가.
- `pdf.html`의 기존 "여러 장의 이미지를 하나의 PDF로 합칠 수 있나요?" 근처 FAQ 답변 또는 새 FAQ 항목에 `pdf-merge-multiple-files.html` 링크 추가(자세한 우회법으로 유도).
- `upscale.html`의 "언제 필요한가요" 문단에 `monitor-resolution-wallpaper-size.html`과 `old-photo-scan-digitize-workflow.html` 링크 추가(선택적, 계획 단계에서 문구 확정).
- `sitemap.xml`에 6개 URL 추가.

## 에러 처리

해당 없음 — 순수 정적 콘텐츠 페이지.

## 테스트 방침

- 기존 `tests/seoPagesIntegrity.test.js`에 6개 페이지의 head 태그, Article JSON-LD, footer, `guide.html`/`sitemap.xml` 반영 여부, 그리고 핵심 사실 수치(HEIC 설정 경로, 모니터 해상도 3종, 유튜브 썸네일 공식 스펙, 스캔 DPI, 인쇄 DPI, PDF 병합 미지원 정직 고지) 검증 항목을 추가한다.
- `guide.html` 재구성 후에도 기존에 이미 배포된 링크(1차+2차 배치 9개 + `pdf-file-size-reduction.html` 포함 10개)가 전부 유지되는지 확인하는 테스트를 추가한다.
- 신규 글이 기존 글과 준중복이 아닌지는 자동 테스트로 완전히 잡을 수 없으므로(2차 배치 사고처럼 최종 전체 브랜치 리뷰에서만 잡힘), 계획 문서의 최종 리뷰 단계에서 명시적으로 "기존 10개 글과의 문장 단위 유사도 확인"을 리뷰어에게 요청한다.

## 성공 기준

- 6개 글이 각각 실제 확인된 사실에 기반한 콘텐츠를 갖추고 배포되어 있다.
- `iphone-heic-photo-guide.html`이 "이 도구가 HEIC를 직접 지원하지 않는다"는 점을, `pdf-merge-multiple-files.html`이 "PDF+PDF 병합 기능이 없다"는 점을 각각 숨기지 않고 명시한다.
- 어떤 글도 이 사이트 도구에 없는 기능(크롭, PDF 병합, HEIC 지원 등)을 있는 것처럼 서술하지 않는다.
- 어떤 글도 기존 10개 글과 문장 단위로 준중복되지 않는다(최종 리뷰에서 확인).
- `guide.html`(1·2·3번 섹션 전부), `pdf.html`, `upscale.html`, `sitemap.xml`에 관련 링크/URL이 반영되어 있다.
- 기존 페이지/기능에 회귀가 없다.
