# 개발 가이드라인

이 문서는 AI와 협업하여 프로젝트를 개발할 때 따라야 할 원칙과 절차를 정의합니다.

---

## 1. 이슈 처리 프로세스

### 이슈 발생 시 절차

```
0. 프로젝트 구조 파악 (Project_Structure.md)
   ↓
1. 문제 파악
   ↓
2. 여러 해결 방안 모색
   ↓
3. 분석 보고서 작성 (docs/issues/ISSUE-XXX-제목.md)
   ↓
4. 사용자 검토 및 방안 선택
   ↓
5. 선택된 방안으로 구현
   ↓
6. 검증 및 문서 업데이트 (구현된 내용이 반영되어야 하는 모든 문서 대상)
```

### 보고서 필수 항목

- **문제 요약**: 무엇이 문제인지 간결하게 설명
- **원인 분석**: 왜 발생하는지
- **해결 방안 비교표**: 난이도, 영향력, 위험성 평가
- **각 방안 상세**: 장단점, 구현 방법
- **권장 사항**: AI의 추천과 그 이유
- **불확실한 요소**: AI가 판단하기 어렵거나 불확실한 점들

### 보고서 분량

- **5분 이내로 읽을 수 있는 분량**
- 핵심 정보 위주로 작성
- 불필요한 설명 제거

---

## 2. 변경 관리 원칙

### 즉시 변경하면 안 되는 경우

- 코드 구조에 영향을 주는 변경
- 여러 파일에 걸친 수정
- 기존 아키텍처를 변경하는 작업
- 되돌리기 어려운 변경

### 즉시 변경해도 되는 경우

- 단순 오타 수정
- CSS 스타일 미세 조정
- 주석 추가/수정
- 단일 파일 내 버그 수정

---

## 3. 코드 작성 원칙

### 파일 구조

```
js/
├── app.js              # 앱 진입점
├── state.js            # 상태 관리
├── pages/              # 페이지 컴포넌트
├── components/         # 재사용 컴포넌트
├── services/           # 데이터/API 서비스
└── utils/              # 유틸리티 함수
```

### 명명 규칙

| 유형 | 규칙 | 예시 |
|------|------|------|
| 파일 (페이지/컴포넌트) | PascalCase | `TeamSetupPage.js` |
| 파일 (유틸/서비스) | camelCase | `constants.js` |
| CSS 파일 | kebab-case | `team-setup.css` |
| 클래스명 | PascalCase | `class ChampionService` |
| 함수명 | camelCase | `function createSlot()` |
| 상수 | UPPER_SNAKE_CASE | `const POSITIONS = []` |

### CSS 규칙

- CSS 변수로 색상/크기 관리
- BEM 명명법 사용: `.block__element--modifier`
- **검은색·어두운 글자색 금지**: 어두운 테마라 보이지 않음. `var(--color-text)`, `var(--color-text-secondary)` 또는 흰색 사용
  - 브라우저 기본 버튼 글자색, 강조색 배경 위 `color: var(--color-bg)` 도 해당
  - 새 버튼·배지에는 밝은 글자색을 직접 지정
  - UI 변경 후에는 완료 보고 전에 브라우저에서 전 페이지 글자 대비를 검사

---

## 4. 테스트 절차

### 로컬 테스트 방법

ES6 모듈 사용으로 인해 `file://` 프로토콜에서 직접 열 수 없음.

**권장 방법**:

```bash
# 방법 1: VS Code Live Server 확장 사용
# index.html 우클릭 → "Open with Live Server"

# 방법 2: npx serve
npx serve

# 방법 3: Python
python -m http.server 8080
```

### 클라우드 세션(Claude Code 웹) 테스트 방법

- 저장소만으로 실행 가능 (설치할 의존성·`.env` 없음). 세션 안에서 `python3 -m http.server 8080` 으로 띄우고 헤드리스 브라우저로 확인
- 네트워크가 제한되면 아래 도메인 허용 필요
  - 데이터: `lol.fandom.com`, `static.wikia.nocookie.net`, `ddragon.leagueoflegends.com`, `raw.communitydragon.org`, `cdn.communitydragon.org`, `d28xe8vt774jo5.cloudfront.net`
  - 앱: `cdn.jsdelivr.net`, `www.gstatic.com`, `*.googleapis.com`
- 확인하지 못한 항목은 완료 보고에 그대로 적음
- 별도 브랜치·PR 없이 `main` 에서 바로 작업하고 커밋·푸시. 푸시하면 GitHub Pages 에 바로 배포되고, 개발자가 테스트 후 문제가 있으면 되돌림
- `tools/build-core-items.mjs`, `build-stacks.mjs`, `build-ultimates.mjs` 에 넘기는 조사 결과 JSON 은 세션이 끝나면 사라지므로 `tools/research/` 에 함께 커밋

### 테스트 체크리스트

- [ ] 팀 설정 → 챔피언 픽 → 경기 상황 전체 플로우
- [ ] 드래그앤드롭 기능 (배치, 교환, 제거)
- [ ] 검색 기능 (한글/영문)
- [ ] 브라우저 새로고침 후 데이터 유지
- [ ] 콘솔에 에러 없음

---

## 5. 문서 관리

### 필수 문서

| 문서 | 용도 |
|------|------|
| `PLAN.md` | 개발 계획서 |
| `Project_Structure.md` | 프로젝트 구조와 문서 정보들 |
| `CHANGELOG.md` | 버전별 변경 이력 |
| `DEV_GUIDELINES.md` | 개발 가이드라인 (이 문서) |
| `lessons_learned.md` | 교훈 및 시행착오 기록 |
| `issue.md` | 발생한 이슈 기록 |
| `docs/issues/` | 이슈별 상세 분석 보고서 |

### CHANGELOG 작성 규칙

```markdown
## [버전] - YYYY-MM-DD

### Added
- 새로 추가된 기능

### Changed
- 변경된 기능

### Fixed
- 수정된 버그

### Removed
- 제거된 기능
```

---

## 6. AI 협업 시 유의사항

### AI에게 명확히 전달해야 할 것

1. 변경의 목적과 배경
2. 제약 조건 (건드리면 안 되는 것)
3. 기대하는 결과

### AI가 따라야 할 것

1. **이슈는 분석 먼저, 해결은 승인 후**
2. 구조적 변경 전에 반드시 확인
3. 변경 사항은 작은 단위로 나누어 진행
4. 각 변경 후 동작 확인

---

*최종 수정: 2026-11-25*
