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

// 챔피언 역할 한글명 (Data Dragon tags)
export const ROLE_NAMES = {
  Fighter: '전사',
  Tank: '탱커',
  Mage: '마법사',
  Assassin: '암살자',
  Marksman: '원거리 딜러',
  Support: '서포터'
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
  MATCH_VIEW: 'match-view',
  OBJECT_DICT: 'object-dict',
  ETC: 'etc'
};

// LocalStorage 키
export const STORAGE_KEY = 'lol-viewer-helper-state';
export const TOOLTIP_SETTING_KEY = 'lol-viewer-helper-tooltips'; // 호버창 켜기/끄기 (기기별 설정)

// 국가 국기 이미지 (flag-icons, ISO 3166-1 alpha-2 코드)
export const FLAG_ICON_BASE = 'https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/flags/4x3';
export const COUNTRY_FLAG_CODES = {
  '한국': 'kr', '중국': 'cn', '대만': 'tw', '홍콩': 'hk', '일본': 'jp', '베트남': 'vn',
  '태국': 'th', '필리핀': 'ph', '싱가포르': 'sg', '말레이시아': 'my', '인도네시아': 'id',
  '호주': 'au', '미국': 'us', '캐나다': 'ca', '멕시코': 'mx', '브라질': 'br',
  '아르헨티나': 'ar', '칠레': 'cl', '독일': 'de', '프랑스': 'fr', '스페인': 'es',
  '영국': 'gb', '이탈리아': 'it', '덴마크': 'dk', '스웨덴': 'se', '노르웨이': 'no',
  '핀란드': 'fi', '폴란드': 'pl', '네덜란드': 'nl', '벨기에': 'be', '포르투갈': 'pt',
  '체코': 'cz', '그리스': 'gr', '튀르키예': 'tr', '터키': 'tr', '러시아': 'ru'
};

// 저장된 팀 리그별 묶음 순서 (목록에 없는 리그는 그 뒤 이름순, 리그가 없는 팀은 맨 끝)
export const LEAGUE_ORDER = ['LCK', 'LPL', 'LEC', 'LCS', 'LCP', 'CBLOL'];

// 리그 풀 네임 (리그별 묶음 제목에 괄호로 표시)
export const LEAGUE_FULL_NAMES = {
  LCK: 'League of Legends Champions Korea',
  LPL: 'League of Legends Pro League',
  LEC: 'League of Legends EMEA Championship',
  LCS: 'League of Legends Championship Series',
  LCP: 'League of Legends Championship Pacific',
  CBLOL: 'Campeonato Brasileiro de League of Legends',
  LTA: 'League of Legends Championship of The Americas',
  LJL: 'League of Legends Japan League',
  VCS: 'Vietnam Championship Series',
  PCS: 'Pacific Championship Series',
  LLA: 'Liga Latinoamérica',
  TCL: 'Turkish Championship League'
};
