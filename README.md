# 이미지 압축 도구

브라우저에서만 동작하는 무료 이미지 압축 도구입니다. 사진이 서버로 전송되지 않고, 이 페이지 안에서만 처리됩니다.

PDF 변환 도구(`pdf.html`)도 함께 제공됩니다. 이미지를 PDF로, PDF를 이미지로 변환할 수 있으며 마찬가지로 브라우저 안에서만 처리됩니다.

## 로컬에서 테스트하기

`index.html` 파일을 더블클릭하면 브라우저에서 바로 열립니다.

## 배포 (GitHub Pages)

1. https://github.com 에서 계정을 만든다 (이미 있으면 로그인).
2. 오른쪽 위 `+` 버튼 → `New repository` 클릭. 저장소 이름을 `image-toolbox`로 입력하고 `Public`으로 설정한 뒤 `Create repository`.
3. 생성된 저장소 페이지에서 `uploading an existing file` 링크를 클릭.
4. 이 프로젝트 폴더 안의 모든 파일과 폴더(`index.html`, `pdf.html`, `css`, `js`, `README.md`)를 그대로 끌어다 놓는다 (`docs`, `tests`, `.git` 폴더는 올리지 않아도 됨).
5. 아래 `Commit changes` 버튼 클릭.
6. 저장소 상단 메뉴에서 `Settings` → 왼쪽 메뉴 `Pages` 클릭.
7. `Build and deployment` → `Branch`를 `main`, 폴더를 `/ (root)`로 선택하고 `Save`.
8. 1~2분 기다리면 같은 화면에 `https://<사용자명>.github.io/image-toolbox/` 형태의 주소가 표시된다. 그 주소로 접속해서 실제로 이미지 압축이 되는지 확인한다.
