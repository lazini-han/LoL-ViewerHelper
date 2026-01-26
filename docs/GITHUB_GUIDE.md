# GitHub 연동 및 GitHub Pages 배포 가이드

## 1. GitHub 저장소 생성

1. [GitHub](https://github.com)에 로그인
2. 우측 상단 `+` 버튼 클릭 → `New repository` 선택
3. Repository name: `LoL-ViewerHelper` (원하는 이름)
4. Public 또는 Private 선택
5. `Create repository` 클릭

## 2. 로컬 저장소와 GitHub 연결

GitHub에서 저장소 생성 후 표시되는 명령어를 참고하거나 아래 명령어 실행:

```bash
# GitHub 저장소 주소 추가 (본인 username으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/LoL-ViewerHelper.git

# 현재 브랜치 이름을 main으로 변경
git branch -M main

# 첫 번째 커밋
git add .
git commit -m "Initial commit: LoL Viewer Helper 프로젝트"

# GitHub에 푸시
git push -u origin main
```

## 3. GitHub Pages 설정

### 방법 A: Settings에서 직접 설정

1. GitHub 저장소 페이지에서 `Settings` 탭 클릭
2. 좌측 메뉴에서 `Pages` 클릭
3. Source 섹션에서:
   - Branch: `main` 선택
   - Folder: `/ (root)` 선택
4. `Save` 클릭
5. 몇 분 후 페이지 상단에 배포 URL 표시됨

### 방법 B: gh-pages 브랜치 사용 (선택사항)

```bash
# gh-pages 브랜치 생성 및 푸시
git checkout -b gh-pages
git push -u origin gh-pages
git checkout main
```

## 4. 배포 URL

설정 완료 후 다음 형식의 URL로 접속 가능:

```
https://YOUR_USERNAME.github.io/LoL-ViewerHelper/
```

## 5. 변경사항 배포

코드 수정 후 배포하려면:

```bash
git add .
git commit -m "변경 내용 설명"
git push
```

푸시 후 1-2분 내에 자동으로 GitHub Pages에 반영됩니다.

## 6. 유용한 Git 명령어

```bash
# 상태 확인
git status

# 변경 내역 확인
git log --oneline

# 브랜치 목록
git branch -a

# 원격 저장소 확인
git remote -v
```

## 주의사항

- `index.html`이 루트 디렉토리에 있어야 GitHub Pages가 정상 작동합니다
- Private 저장소의 GitHub Pages는 유료 플랜에서만 사용 가능합니다
- CORS 이슈 없이 정상 작동합니다 (HTTPS로 서비스되므로)
