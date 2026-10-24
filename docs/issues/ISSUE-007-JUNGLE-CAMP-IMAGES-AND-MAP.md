# ISSUE-007: 정글 캠프 인게임 이미지 + 맵 위치 표시

작성일: 2026-10-25
상태: **구현 완료** (2026-10-25)

---

## 1. 요구사항

1. 오브젝트 사전의 정글 캠프 몬스터 이미지를 인게임 이미지로 넣는다.
2. 정글 캠프를 클릭하면 상세 패널 하단에 소환사의 협곡 맵에서의 위치를 표시한다.

## 2. 현재 상태 (분석)

| id | 이름 | 현재 아이콘 |
|----|------|-------------|
| blue_sentinel | 푸른 파수꾼 | 미니맵 버프 아이콘 (`ux/minimap/icons/blue.png`, 32px 점 모양) |
| red_brambleback | 붉은 덩굴정령 | 미니맵 버프 아이콘 (`red.png`) |
| murk_wolves | 어스름 늑대 | 없음 → 이름 첫 글자 대체 표시 |
| gromp | 두꺼비 | 없음 |
| raptors | 칼날부리 | 없음 |
| krugs | 돌거북 | 없음 |
| scuttle_crab | 바위게 | 없음 |

- 에픽 몬스터(드래곤, 내셔 남작 등)는 이미 인게임 원형 초상화(`ux/announcements/*_circle.png`)를 쓴다.
- 미니언 4종도 이미지가 없다. 요청 범위 밖이라 3장에 선택 사항으로 둔다.

## 3. 계획

### 3-1. 인게임 이미지 (조사 완료)

CommunityDragon 에 인게임 HUD 초상화(128×128, 원형)가 있다. 에픽 몬스터와 같은 원형 스타일이라 그리드에서 통일감이 있다.

| id | 이미지 경로 (`https://raw.communitydragon.org/latest/game/assets/characters/...`) |
|----|------|
| blue_sentinel | `sru_blue/hud/bluesentinel_circle.png` |
| red_brambleback | `sru_red/hud/brambleback_circle.png` |
| murk_wolves | `sru_murkwolf/hud/greatermurkwolf_circle.png` |
| gromp | `sru_gromp/hud/gromp_circle.png` |
| raptors | `sru_razorbeak/hud/razorbeak_circle.png` |
| krugs | `sru_krug/hud/ancientkrug_circle.png` |
| scuttle_crab | `sru_crab/hud/crab_circle_0.png` |

- `data/objects.json` 의 `icon` 을 위 경로로 교체한다.
- 블루·레드의 기존 미니맵 아이콘(`blue.png`, `red.png`)은 드래곤처럼 `scoreboardIcon` 배지로 옮겨, 우측 하단에 작게 표시한다.
- 이미지 로드 실패 시 이름 첫 글자로 대체하는 기존 처리는 유지한다.

### 3-2. 맵 위치 표시

- **맵 이미지**: Data Dragon 의 소환사의 협곡 미니맵 `img/map/map11.png` (512×512, 인게임 미니맵과 같은 디자인)
  - 앱의 기존 Data Dragon 버전 로직을 따라 경로를 만든다.
- **위치 데이터**: `data/objects.json` 의 정글 캠프에 `mapPositions` 를 추가한다.
  - 형식: `[{ "side": "blue" | "red" | "river", "x": 26.1, "y": 46.9 }]`
  - x, y 는 맵 이미지 기준 % (좌하단 = 블루 진영). 인게임 월드 좌표(0~약 14,800)를 비율로 변환해 적는다.
  - 캠프마다 블루 진영·레드 진영 2곳, 바위게는 위·아래 강 2곳
- **표시 위치**: 상세 패널 하단, 설명·등장 시간 아래에 `맵 위치` 영역을 추가한다.
  - 맵 위에 마커를 표시한다. 블루 진영은 파랑, 레드 진영은 빨강, 강은 노랑이다.
  - 선택한 캠프 마커는 크게 하고 깜빡임 강조를 넣는다.
  - 다른 정글 캠프는 작은 회색 점으로 표시해 위치 관계를 알 수 있게 한다.
  - 마커에 진영 구분 범례(`블루 진영` `레드 진영` `강`)를 붙인다.
- **크기**: 데스크톱 약 260px 정사각형, 모바일은 패널 폭에 맞춰 최대 100%로 한다.
- **구현 단위**: 새 컴포넌트 `js/components/JungleMap.js` 가 맵 이미지와 마커를 그린다. `ObjectDictPage.updateDetailPanel()` 은 `obj.mapPositions` 가 있을 때만 이 컴포넌트를 붙인다. 다른 오브젝트에도 위치 데이터만 넣으면 바로 재사용할 수 있다.
- **글자색**: 범례와 라벨은 밝은 글자(`--color-text`, `--color-text-secondary`)만 쓴다.

### 3-3. 좌표 검증

- 좌표를 넣은 뒤 브라우저에서 맵 위 마커를 스크린샷으로 확인한다. 각 마커가 맵의 캠프 자리(정글 안 공터)에 놓였는지 보고 보정한다.
- 블루·레드 진영 좌표가 맵 중심 기준으로 점대칭인지도 확인한다.

## 4. 변경 파일 (예상)

| 파일 | 변경 |
|------|------|
| `data/objects.json` | 정글 캠프 `icon` 교체, 블루·레드 `scoreboardIcon`, `mapPositions` 추가 |
| `js/components/JungleMap.js` | 신규 - 맵 + 마커 렌더링 |
| `js/pages/ObjectDictPage.js` | 상세 패널 하단에 맵 위치 영역 |
| `css/dictionary.css` | 맵, 마커, 범례 스타일 (모바일 포함) |
| `docs/PROJECT_STRUCTURE.md`, `CHANGELOG.md` | 문서 갱신 |

## 5. 확인이 필요한 선택 사항

1. **에픽 몬스터 위치도 표시할지**: 드래곤 둥지, 내셔 남작·전령·공허 유충 둥지. 같은 컴포넌트로 좌표만 추가하면 된다.
2. **미니언 이미지도 바꿀지**: 인게임 미니언 초상화 경로 조사가 추가로 필요하다.
3. **다른 캠프를 회색 점으로 함께 표시할지**: 기본 계획은 표시한다.

## 6. 진행 순서

1. `objects.json` 아이콘 교체 → 그리드에서 이미지 확인
2. `JungleMap` 컴포넌트와 상세 패널 연결
3. 좌표 입력 → 브라우저 스크린샷으로 위치 보정
4. 전체 페이지 브라우저 테스트 (데스크톱·모바일 폭, 글자 대비 검사, 콘솔 오류)
5. 문서 갱신 후 보고

## 7. 구현 결과 (사용자 결정 반영)

- **에픽 몬스터 위치도 표시**: 드래곤 7종은 드래곤 둥지, 내셔 남작·전령·공허 유충은 내셔 남작 둥지에 표시 (보라 마커)
- **미니언 4종 인게임 이미지**: 블루 진영 미니언 초상화 (`sru_orderminion*/hud/*_circle.png`). 미니언은 맵 위치를 표시하지 않음
- **양쪽 진영 캠프 동시 표시**: 다른 캠프를 회색 점으로 보이는 대신, 선택한 캠프의 블루·레드 진영 위치를 파랑·빨강으로 함께 표시
- 좌표는 맵 이미지에 마커를 그려, 캠프 자리(벽으로 둘러싸인 공터)와 둥지 위치에 맞는지 확인함
