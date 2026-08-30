# ISSUE-004: Data Dragon 버전 고정으로 인한 신규 챔피언/아이템 누락 및 2026 시즌 데이터 동기화

작성일: 2026-08-31
상태: 해결 (일부 불확실 항목은 사용자 확인 필요)

---

## 1. 문제 요약

- 챔피언 **유나라(Yunara)** 클릭 시 상세 정보 로드 실패
  ```
  챔피언 상세 정보 로드 실패: Error: 챔피언 상세 정보를 불러올 수 없습니다.
      at ChampionService.getChampionDetail (ChampionService.js:102:15)
  ```
- 같은 원인으로 **피들스틱**, 그리고 2025~2026년에 추가된 **아이템 전체**가 누락되거나 오류 발생
- `data/champions.json` 목록에 2026년 신규 챔피언 **로크(Locke)** 미포함
- `data/objects.json` 의 스폰 시간이 2026 시즌 변경 이전 수치

## 2. 원인 분석

| 항목 | 원인 |
|------|------|
| 유나라 상세 실패 | `ChampionService.js` / `ItemService.js` 가 Data Dragon 버전을 `14.24.1` 로 **하드코딩**. 유나라는 2025년 추가 챔피언이라 해당 버전 데이터에 존재하지 않음 (`14.24.1/champion/Yunara.json` → HTTP 403) |
| 피들스틱 상세 실패 | 로컬 `nameEn` 이 `FiddleSticks` 인데, 최신 Data Dragon 키는 `Fiddlesticks` (대소문자 변경) → 404 |
| 아이템 누락 | `ItemService` 도 `14.24.1` 고정 → 2025/2026 시즌 신규·개편 아이템 미반영 |
| 로크 누락 | `champions.json` 이 수동 관리 목록이라 신규 챔피언 추가 시 갱신 필요 |
| 스폰 시간 불일치 | 2026 시즌에서 게임 진행 가속화(시작 35초 단축) 반영 안 됨 |

## 3. 해결 방안 비교

| 방안 | 난이도 | 영향력 | 위험성 |
|------|--------|--------|--------|
| A. 버전 상수만 최신값으로 교체 | 낮음 | 중 | 높음 (패치마다 재수정 필요, 같은 문제 재발) |
| B. `versions.json` 조회로 최신 버전 동적 사용 | 낮음 | 높음 | 낮음 (실패 시 폴백 버전 사용) |
| C. 챔피언/아이템 데이터 전체를 로컬 스냅샷으로 관리 | 높음 | 높음 | 중 (오프라인 대응은 좋지만 수동 갱신 부담) |

**채택: B** — 패치가 올라가도 코드 수정 없이 최신 데이터를 따라감. 네트워크 실패 시에는 폴백 버전(`15.24.1`)으로 동작.

## 4. 구현 내용

1. `js/utils/ddragon.js` 신규 추가
   - `getDDragonVersion()` : `https://ddragon.leagueoflegends.com/api/versions.json` 에서 최신 버전 1회 조회 후 캐시
   - `ddragonBase(version)` / `getCachedDDragonVersion()` 헬퍼
   - 조회 실패 시 `DDRAGON_FALLBACK_VERSION` 사용
2. `ChampionService` / `ItemService` 의 하드코딩 버전 제거 → 공용 유틸 사용
3. `data/champions.json`
   - `FiddleSticks` → `Fiddlesticks` 로 수정
   - 로크(Locke, id 805) 추가 → 총 173종, Data Dragon 로스터와 일치
4. `data/objects.json` 2026 시즌 스폰 시간 반영
   - 미니언 첫 웨이브 `1분 5초` → `30초` (14분 후 25초, 30분 후 20초 주기)
   - 정글 캠프 `1분 30초` → `55초`, 리스폰 `2분 15초` → `2분`

## 5. 검증

- `14.24.1/champion/Yunara.json` → 403 / `16.17.1/champion/Yunara.json` → 200 확인
- 로컬 챔피언 목록과 Data Dragon 로스터 차집합 = 공집합
- 전 JS 파일 `node --check` 통과, 전 JSON 파싱 통과

## 6. 불확실한 요소 (사용자 확인 필요)

| 항목 | 현재 값 | 비고 |
|------|---------|------|
| 대포 미니언 | `2분 5초 (90초마다, 후반 60초)` | 첫 웨이브가 30초로 당겨졌으므로 첫 대포도 앞당겨졌을 가능성이 높으나, 공식 수치를 확인하지 못해 **미수정** |
| 바위게 | `3분 30초 (리스폰 2분 30초)` | 동일 사유로 **미수정** |
| 공허 유충 / 전령 | `5분` / `8분` | 2026 시즌 변경 여부 미확인 |
| 아타칸 | 목록에 없음 | 2026 시즌에 **삭제**된 오브젝트이므로 현재 상태가 정확함 (추가 불필요) |
| LCK 2026 팀/선수 명단 | 앱에서 수동 입력 | 코드에 하드코딩된 명단이 없어 동기화 대상 아님 |

## 참고

- https://esports.gg/news/league-of-legends/atakhan-feats-of-strength-league-of-legends-2026/
- https://www.junglediff.net/2025/12/01/season-2026-dev-blog/
- https://www.altchar.com/game-news/league-of-legends-2026-s1-gameplay-changes-atakhan-removed-new-turret-plates-faster-minions-and-vision-upgrades-aXwcS6Y1psgZ
