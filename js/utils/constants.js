/**
 * 상수 정의
 */

// 포지션 목록
export const POSITIONS = ['TOP', 'JG', 'MID', 'ADC', 'SUP'];

// 포지션 한글명
export const POSITION_NAMES = {
  TOP: '탑',
  JG: '정글',
  MID: '미드',
  ADC: '원딜',
  SUP: '서포터'
};

// 포지션 아이콘 경로
export const POSITION_ICONS = {
  TOP: 'assets/icons/Top.webp',
  JG: 'assets/icons/Jungle.webp',
  MID: 'assets/icons/Mid.webp',
  ADC: 'assets/icons/ADC.webp',
  SUP: 'assets/icons/Support.webp'
};

// 챔피언 픽 페이지의 슬롯 순서
// 블루팀: 왼쪽부터 SUP(5), ADC(4), MID(3), JG(2), TOP(1)
export const BLUE_SLOT_ORDER = ['SUP', 'ADC', 'MID', 'JG', 'TOP'];
// 레드팀: 왼쪽부터 TOP(1), JG(2), MID(3), ADC(4), SUP(5)
export const RED_SLOT_ORDER = ['TOP', 'JG', 'MID', 'ADC', 'SUP'];

// 팀 타입
export const TEAM_BLUE = 'blue';
export const TEAM_RED = 'red';

// 라우트 경로
export const ROUTES = {
  TEAM_SETUP: 'team-setup',
  CHAMPION_PICK: 'champion-pick',
  MATCH_VIEW: 'match-view'
};

// LocalStorage 키
export const STORAGE_KEY = 'lol-viewer-helper-state';
