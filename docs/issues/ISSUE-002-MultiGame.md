# ISSUE-002: 멀티 게임 지원 (최대 5게임 BO5)

**작성일**: 2026-02-01  
**상태**: ✅ 구현 완료

---

## 문제 요약

현재 앱은 단일 경기만 지원합니다. LoL 대회에서는 동일한 두 팀이 진영(블루/레드)을 교대하며 최대 5번까지 경기하는 BO5(Best of 5) 형식이 일반적입니다. 이를 지원하기 위해 다음 기능이 필요합니다:

1. **멀티 게임 관리**: 최대 5경기까지 개별 관리
2. **누적 챔피언 밴**: 한 경기에서 픽된 챔피언은 다른 경기에서 선택 불가
3. **글로벌 밴**: 전체 시리즈에서 밴된 챔피언 10개(팀당 5개) 표시
4. **경기 선택 UI**: 챔피언 픽/경기 화면에서 경기 번호 선택

---

## 원인 분석

현재 `state.js`의 상태 구조:
```javascript
{
  blueTeam: { name, players: [{position, name, champion}] },
  redTeam: { name, players: [{position, name, champion}] }
}
```

- 단일 경기만 고려한 flat 구조
- 게임별 챔피언 정보 분리 없음
- 밴 챔피언 필드 없음

---

## 해결 방안 비교표

| 항목 | 방안 A: 상태 구조 확장 | 방안 B: games 배열 추가 |
|------|------------------------|-------------------------|
| **난이도** | 중 | 상 |
| **영향력** | 높음 (state, 2개 페이지) | 높음 (전체 구조 변경) |
| **위험성** | 낮음 | 중간 |
| **확장성** | 좋음 | 매우 좋음 |
| **구현 시간** | 2-3시간 | 4-5시간 |

---

## 방안 상세

### 방안 A: 상태 구조 확장 (권장)

기존 팀 정보는 유지하고, 게임별 챔피언 정보와 글로벌 밴을 별도로 관리합니다.

**새로운 상태 구조**:
```javascript
{
  // 팀 기본 정보 (모든 게임 공통)
  blueTeam: { name, players: [{position, name}] },
  redTeam: { name, players: [{position, name}] },
  
  // 현재 선택된 게임 번호
  currentGame: 1,
  
  // 게임별 챔피언 픽 정보
  games: {
    1: {
      blueTeam: { TOP: championObj, JGL: null, ... },
      redTeam: { TOP: championObj, JGL: null, ... }
    },
    2: { ... },
    // ... 최대 5게임
  },
  
  // 글로벌 밴 (전체 시리즈 공통)
  globalBans: {
    blue: [championObj, null, null, null, null],  // 5개
    red: [championObj, null, null, null, null]    // 5개
  }
}
```

**장점**:
- 기존 팀 설정 로직 최소한 변경
- 명확한 데이터 분리
- LocalStorage 마이그레이션 용이

**단점**:
- `champion` 필드가 players에서 games로 이동 → 기존 코드 수정 필요

**수정 필요 파일**:
1. `js/state.js` - 상태 구조 변경, 새 메서드 추가
2. `js/pages/ChampionPickPage.js` - 게임 선택 UI, 밴 영역, 회색 표시
3. `js/pages/MatchViewPage.js` - 게임 선택 UI
4. `css/champion-pick.css` - 밴 영역 스타일, 회색 테두리

### 방안 B: games 배열로 완전 재구성

모든 게임 정보를 배열로 관리합니다.

```javascript
{
  teams: { blue: {...}, red: {...} },
  games: [
    { blueTeam: {...}, redTeam: {...} },
    // ...
  ],
  globalBans: {...}
}
```

**장점**:
- 더 정규화된 구조
- 미래 확장에 유리

**단점**:
- 기존 코드 대부분 재작성 필요
- 마이그레이션 복잡

---

## 권장 사항

**방안 A를 권장합니다.**

이유:
1. 기존 팀 설정 로직(`TeamSetupPage`)을 거의 그대로 유지
2. 변경 범위가 상대적으로 작음
3. 현재 LocalStorage 데이터와의 호환성 유지 가능
4. 단계적 구현 가능

---

## 구현 계획 (방안 A 선택 시)

### 1단계: 상태 구조 변경 (`state.js`)
- `createDefaultState()` 수정
- 새 메서드 추가:
  - `setCurrentGame(gameNumber)`
  - `getCurrentGameChampions()`
  - `assignChampionToGame(gameNumber, teamKey, position, champion)`
  - `getPickedChampionsInOtherGames(currentGame)`
  - `addGlobalBan(team, champion)`
  - `removeGlobalBan(team, index)`
- LocalStorage 마이그레이션 로직

### 2단계: ChampionPickPage 수정
- 게임 선택 탭 UI (1 | 2 | 3 | 4 | 5)
- 글로벌 밴 영역 (상단에 블루밴 5개 + 레드밴 5개)
- 다른 게임에서 픽된 챔피언 회색 테두리 표시
- 밴된 챔피언 선택 불가 처리

### 3단계: MatchViewPage 수정
- 게임 선택 탭 UI
- 선택된 게임의 챔피언 표시

### 4단계: CSS 스타일
- 게임 탭 스타일
- 밴 영역 스타일
- 회색 테두리 스타일 (`.champion-item--picked-other-game`)

---

## 불확실한 요소

1. **글로벌 밴 드래그앤드롭**: 챔피언 픽과 동일한 방식으로 밴 영역에도 드래그앤드롭 적용할지?
2. **게임 삭제/초기화**: 특정 게임만 초기화하는 기능 필요한지?
3. **진영 교환**: 게임마다 진영이 바뀔 때 어떻게 표시할지? (현재는 swapTeams로 팀 전체 교환)
4. **UI 배치**: 게임 선택 탭을 어디에 배치할지 (상단 고정 vs 팀 슬롯 위)

---

## 다음 단계

사용자께서 다음을 결정해 주시면 구현을 시작하겠습니다:

1. **방안 선택**: A 또는 B
2. **글로벌 밴 입력 방식**: 드래그앤드롭 vs 클릭
3. **게임 탭 위치**: 상단 vs 팀 슬롯 근처
4. **불확실한 요소들에 대한 결정**
