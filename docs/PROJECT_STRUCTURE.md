# 프로젝트 구조 가이드

이 문서는 AI가 프로젝트를 빠르게 이해할 수 있도록 전체 구조와 핵심 정보를 정리합니다.

---

## 1. 프로젝트 개요

**프로젝트명**: LoL 대회 시청 도우미

**목적**: 리그 오브 레전드 지식이 부족한 시청자들이 대회를 더 재밌게 이해할 수 있도록 돕는 웹사이트

**기술 스택**:

- Frontend: HTML5, CSS3, JavaScript (ES6+)
- 모듈 시스템: ES6 Modules
- 데이터: JSON 파일 + Community Dragon CDN
- 저장소: LocalStorage
- 호스팅: GitHub Pages (예정)

---

## 2. 폴더 구조

```
PJ.LoL-ViewerHelper/
├── index.html                    # 앱 진입점 (SPA)
│
├── css/                          # 스타일시트
│   ├── variables.css             # CSS 변수 (색상, 크기, 폰트)
│   ├── reset.css                 # CSS 리셋
│   ├── layout.css                # 공통 레이아웃
│   ├── components.css            # 공통 컴포넌트 (버튼, 입력 등)
│   ├── team-setup.css            # 팀 설정 페이지 스타일
│   ├── champion-pick.css         # 챔피언 픽 페이지 스타일
│   └── match-view.css            # 경기 상황 페이지 스타일
│
├── js/                           # JavaScript
│   ├── app.js                    # 앱 진입점, 라우터
│   ├── state.js                  # 전역 상태 관리 (LocalStorage 연동)
│   │
│   ├── pages/                    # 페이지 컴포넌트
│   │   ├── TeamSetupPage.js      # 팀 설정 페이지
│   │   ├── ChampionPickPage.js   # 챔피언 픽 페이지
│   │   └── MatchViewPage.js      # 경기 상황 페이지
│   │
│   ├── services/                 # 데이터 서비스
│   │   └── ChampionService.js    # 챔피언 데이터 로딩/검색
│   │
│   └── utils/                    # 유틸리티
│       ├── constants.js          # 상수 정의
│       └── dom.js                # DOM 헬퍼 함수
│
├── data/                         # 데이터 파일
│   ├── champions.json            # 챔피언 데이터 (172개)
│   └── champions.md              # 원본 데이터 (참고용)
│
├── docs/                         # 문서
│   └── issues/                   # 이슈별 분석 보고서
│       └── ISSUE-001-CORS.md
│
└── [문서 파일들]                  # 프로젝트 문서
    ├── Project_Structure.md      # 이 문서
    ├── PLAN.md                   # 개발 계획서
    ├── DEV_GUIDELINES.md         # 개발 가이드라인
    ├── CHANGELOG.md              # 변경 이력
    ├── issue.md                  # 이슈 기록
    ├── lessons_learned.md        # 교훈 기록
    └── idea.md                   # 원본 아이디어
```

---

## 3. 핵심 파일 설명

### 3.1 진입점

| 파일 | 역할 |
|------|------|
| `index.html` | HTML 템플릿, CSS/JS 로드 |
| `js/app.js` | 앱 초기화, 해시 기반 라우터 |

### 3.2 상태 관리

| 파일 | 역할 |
|------|------|
| `js/state.js` | 전역 상태 관리 싱글톤, LocalStorage 저장/로드 |

**상태 구조** (v0.5.0 멀티게임 지원):

```javascript
{
  // 팀 기본 정보 (모든 게임 공통)
  blueTeam: { name: "팀명", players: [{ position, name }] },
  redTeam: { name: "팀명", players: [{ position, name }] },
  
  // 현재 선택된 게임 번호 (1~5)
  currentGame: 1,
  
  // 게임별 챔피언 픽 정보
  games: {
    1: { blueTeam: { TOP: championObj, ... }, redTeam: { ... } },
    2: { ... },
    // ... 최대 5게임
  },
  
  // 글로벌 밴 (전체 시리즈 공통, 팀당 5개)
  globalBans: {
    blue: [championObj, null, null, null, null],
    red: [championObj, null, null, null, null]
  }
}
```

### 3.3 페이지 컴포넌트

| 파일 | 역할 | 주요 기능 |
|------|------|----------|
| `TeamSetupPage.js` | 팀/선수 설정 | 팀명, 선수명 입력, 비우기 버튼 |
| `ChampionPickPage.js` | 챔피언 할당 | 드래그앤드롭, 검색, 글로벌 밴, 진영 교환, 초기화, 포지션 아이콘 |
| `MatchViewPage.js` | 경기 정보 표시 | 챔피언 클릭 시 상세 정보, 스킬 비디오 재생 |

### 3.4 서비스

| 파일 | 역할 |
|------|------|
| `ChampionService.js` | 챔피언 데이터 로딩, 검색, 상세 정보 (Data Dragon API), 스킬 비디오 (Community Dragon API), 캐싱 |
| `ItemService.js` | 아이템 데이터 로딩 |
| `ObjectService.js` | 오브젝트 데이터 로딩 |

### 3.5 유틸리티

| 파일 | 내용 |
|------|------|
| `constants.js` | 포지션 목록, 라우트 경로, 슬롯 순서 |
| `dom.js` | `$`, `$$`, `createElement`, `clearElement` |

---

## 4. 데이터 흐름

```
[사용자 입력]
     ↓
[페이지 컴포넌트] ←→ [state.js (전역 상태)]
     ↓                    ↓
[DOM 업데이트]      [LocalStorage 저장]
```

### 라우팅 흐름

```
URL 해시 변경 (#team-setup, #champion-pick, #match-view)
     ↓
Router.handleRoute()
     ↓
해당 페이지의 render(container) 호출
```

---

## 5. 주요 상수

```javascript
// 포지션
POSITIONS = ['TOP', 'JG', 'MID', 'ADC', 'SUP']

// 챔피언 픽 페이지 슬롯 순서
BLUE_SLOT_ORDER = ['SUP', 'ADC', 'MID', 'JG', 'TOP']  // 좌→우
RED_SLOT_ORDER = ['TOP', 'JG', 'MID', 'ADC', 'SUP']   // 좌→우

// 라우트
ROUTES = {
  TEAM_SETUP: 'team-setup',
  CHAMPION_PICK: 'champion-pick',
  MATCH_VIEW: 'match-view'
}
```

---

## 6. 외부 의존성

| 리소스 | URL | 용도 |
|--------|-----|------|
| Pretendard 폰트 | jsdelivr CDN | 한글 폰트 |
| Community Dragon | `cdn.communitydragon.org` | 챔피언 이미지 |

---

## 7. 개발 환경

### 로컬 테스트

ES6 모듈 사용으로 `file://` 프로토콜에서 직접 실행 불가.

```bash
# 로컬 서버 실행 (권장)
npx serve

# 또는 VS Code Live Server 확장 사용
```

### 코딩 컨벤션

- 상세 내용: [DEV_GUIDELINES.md](DEV_GUIDELINES.md)
- 파일명: PascalCase (페이지/컴포넌트), camelCase (유틸)
- CSS: BEM 명명법, CSS 변수 사용

---

## 8. 문서 목록

| 문서 | 용도 | 우선 참조 |
|------|------|----------|
| **Project_Structure.md** | 프로젝트 전체 구조 (이 문서) | ⭐ 필수 |
| **DEV_GUIDELINES.md** | 개발 원칙, 이슈 처리 프로세스 | ⭐ 필수 |
| PLAN.md | 개발 계획서, 기능 명세 | 기능 추가 시 |
| idea.md | 원본 아이디어, 요구사항 | 요구사항 확인 시 |
| CHANGELOG.md | 버전별 변경 이력 | 변경 내역 확인 시 |
| issue.md | 발생한 이슈 기록 | 이슈 참조 시 |
| lessons_learned.md | 교훈 및 시행착오 | 실수 방지 |

---

## 9. 현재 상태 (MVP)

### 구현 완료

- [x] 팀 설정 페이지
- [x] 챔피언 픽 페이지 (드래그앤드롭)
- [x] 경기 상황 페이지
- [x] LocalStorage 저장/복원
- [x] 챔피언 검색 (한글/영문)

### 미구현 (Phase 2 이후)

- [ ] 챔피언 스킬 정보
- [ ] 아이템/오브젝트 백과사전
- [ ] 다크 모드
- [ ] 팀 프리셋 저장

---

## 10. AI 협업 시 주의사항

1. **이슈 발생 시**: 즉시 해결하지 말고 분석 보고서 먼저 작성
2. **구조적 변경 시**: 반드시 사용자 승인 후 진행
3. **문서 참조**: `DEV_GUIDELINES.md`의 이슈 처리 프로세스 준수
4. **테스트**: 로컬 서버(`npx serve`)로 테스트

---

*최종 수정: 2026-01-26*
