# 테스트 결과 발생한 이슈들 기록

*이슈 처리 프로세스는 [DEV_GUIDELINES.md](DEV_GUIDELINES.md) 참조*


## ISSUE-010: 디자인 수정

**상태**: ✅ 해결 완료

### 해결 내용

1. 헤더 제목을 'LoL 시청용'으로 변경하고 작은 폰트/컴팩트 여백 적용
2. 경기 화면 페이지 margin/padding 축소
3. 선수/챔피언 이름을 아이콘 좌측(블루), 우측(레드)에 배치

## ISSUE-009: 단계 전환 버튼 제거

**상태**: ✅ 해결 완료

### 해결 내용

- 팀 설정, 챔피언 픽, 경기 화면 페이지의 하단 네비게이션 버튼 제거
- 상단 네비게이터로 페이지 이동 통일

## ISSUE-008: 팀 정보 저장

**상태**: ✅ 해결 완료

### 해결 내용

- 팀별 저장 버튼(💾) 추가
- 저장된 팀 목록이 팀 설정 하단에 표시
- 저장된 팀을 드래그하여 블루/레드 팀 창에 드롭하면 정보 적용
- LocalStorage에 저장하여 다음 접속 시에도 유지
- 저장된 팀 삭제 기능

## ISSUE-007: Git 활용과 GitHub 연동

**상태**: ✅ 해결 완료

### 해결 내용
- Git 저장소 초기화 완료
- .gitignore 파일 생성
- 첫 번째 커밋 생성
- GitHub 연동 및 GitHub Pages 배포 가이드 작성

### 관련 문서
- [GitHub 연동 가이드](GITHUB_GUIDE.md) 

## ISSUE-006: 문서들의 이름 규칙 통일화 및 문서 위치 정돈

**상태**: ✅ 해결 완료

### 해결 내용

- 모든 문서를 대문자_스네이크케이스로 통일
- 문서들을 docs 폴더로 이동
- 문서 내 경로 참조 업데이트

### 변경된 파일

- `idea.md` → `docs/IDEA.md`
- `issue.md` → `docs/ISSUES.md`
- `lessons_learned.md` → `docs/LESSONS_LEARNED.md`
- `Project_Structure.md` → `docs/PROJECT_STRUCTURE.md`
- `PLAN.md` → `docs/PLAN.md`
- `DEV_GUIDELINES.md` → `docs/DEV_GUIDELINES.md`

## ISSUE-005: 경기 시작 화면 포지션 표시 변경

**상태**: ✅ 해결 완료

### 해결 내용

- 포지션 텍스트를 이미지 아이콘으로 변경
- 포지션 아이콘을 챔피언 아이콘과 동일한 크기(56px)로 설정
- 선수 이름과 챔피언 이름을 가운데 정렬로 변경

### 추가된 파일

- `assets/icons/Top.webp`
- `assets/icons/Jungle.webp`
- `assets/icons/Mid.webp`
- `assets/icons/ADC.webp`
- `assets/icons/Support.webp`

## ISSUE-004: 순차적 페이지 포기

**상태**: ✅ 해결 완료

### 해결 내용

- 헤더 아래에 컴팩트한 탭 스타일 네비게이터 추가
- 팀 설정 / 챔피언 픽 / 경기 화면 간 자유롭게 이동 가능
- 현재 페이지 활성 상태 표시

## ISSUE-003: 선택된 챔피언 색깔 표시 변경

**상태**: ✅ 해결 완료

### 해결 내용

- 배경색을 어두운 회색(#2a2a2a)으로 변경
- Blue 팀 선택: 선명한 파란색(#1e90ff) 3px 테두리 + 글로우 효과
- Red 팀 선택: 선명한 빨간색(#ff4444) 3px 테두리 + 글로우 효과
- 레이아웃 안정성을 위해 기본 투명 테두리 추가

## ISSUE-002: 팀 설정 유연화

**상태**: ✅ 해결 완료

### 해결 내용

- 팀 설정 페이지에 "진영 교환" 버튼(⇄) 추가
- 버튼 클릭 시 블루팀과 레드팀의 데이터(팀명, 선수, 챔피언)가 서로 교환됨
- 같은 팀이 다른 진영에서 경기할 때 쉽게 설정 변경 가능

## ISSUE-001: CORS 오류 (2026-01-26)

**상태**: ✅ 해결 완료

### 증상

로컬에서 `index.html`을 브라우저로 직접 열면 (`file://` 프로토콜) 앱이 동작하지 않음.

### 원인

ES6 모듈(`type="module"`)은 `file://` 프로토콜에서 CORS 정책으로 차단됨

### 해결 방법

**방안 A 선택**: 로컬 서버 사용

```bash
npx serve
```

### 관련 문서

- 분석 보고서: [issues/ISSUE-001-CORS.md](issues/ISSUE-001-CORS.md)
- 시행착오 기록: [LESSONS_LEARNED.md](LESSONS_LEARNED.md)

---
