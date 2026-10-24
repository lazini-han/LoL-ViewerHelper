/**
 * 롤드컵 진출팀 선수 문서(data/teams.json, data/teams.md)를 생성하는 스크립트
 *
 * 출처: Leaguepedia Cargo (Special:CargoExport)
 *   - TournamentRosters: 대회 등록 팀 / 코치 구분
 *   - ScoreboardPlayers: 경기별 출전 선수 → 가장 최근 경기 라인업을 주전으로 사용
 *   - Players: 현재 팀 소속 선수 → 주전이 아닌 선수는 후보
 *   - Teams: 팀 연고 국가
 *
 * 사용법: node tools/build-teams.mjs [대회 OverviewPage]
 *   기본값: "2026 Season World Championship"
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_PATH = join(ROOT, 'data', 'teams.json');
const MD_PATH = join(ROOT, 'data', 'teams.md');
const CARGO = 'https://lol.fandom.com/wiki/Special:CargoExport';

const EVENT = process.argv[2] || '2026 Season World Championship';
// 주전 판정에 쓰는 경기 범위 (대회 직전 지역 리그 포함)
const RECENT_SINCE = '2026-07-01';

const ROLE_TO_POSITION = { Top: 'TOP', Jungle: 'JG', Mid: 'MID', Bot: 'ADC', Support: 'SUP' };
const POSITION_ORDER = ['TOP', 'JG', 'MID', 'ADC', 'SUP'];
const POSITION_NAMES = { TOP: '탑', JG: '정글', MID: '미드', ADC: '원딜', SUP: '서포터' };

// Leaguepedia 팀명 → 앱에 표시할 이름 (중계에서 쓰는 약칭)
const TEAM_NAMES = {
  'T1': 'T1',
  'Gen.G': 'Gen.G',
  'Hanwha Life Esports': 'HLE',
  'Dplus Kia': 'DK',
  'Bilibili Gaming': 'BLG',
  "Anyone's Legend": 'AL',
  'Top Esports': 'TES',
  'Invictus Gaming': 'IG',
  'G2 Esports': 'G2',
  'Karmine Corp': 'KC',
  'Movistar KOI': 'MKOI',
  'Team Liquid': 'TL',
  'LYON (2024 American Team)': 'LYON',
  'Cloud9': 'C9',
  'CTBC Flying Oyster': 'CFO',
  'Team Secret Whales': 'TSW',
  'MVK Esports': 'MVK',
  'LØS': 'LØS',
  'FURIA': 'FURIA'
};

const REGION_NAMES = { KR: 'LCK', CN: 'LPL', EMEA: 'LEC', NA: 'LCS', BR: 'CBLOL', Brazil: 'CBLOL', APAC: 'LCP' };
const REGION_ORDER = ['LCK', 'LPL', 'LEC', 'LCS', 'CBLOL', 'LCP'];

// Leaguepedia 국가명 → 한글
const COUNTRY_NAMES = {
  'South Korea': '한국', 'China': '중국', 'Taiwan': '대만', 'Vietnam': '베트남', 'Japan': '일본',
  'United States': '미국', 'Canada': '캐나다', 'Brazil': '브라질', 'Mexico': '멕시코',
  'Germany': '독일', 'France': '프랑스', 'Spain': '스페인', 'United Kingdom': '영국', 'Netherlands': '네덜란드'
};
// Teams 테이블에 연고지가 없는 팀 보정
const COUNTRY_OVERRIDES = { 'LYON (2024 American Team)': 'United States' };

async function cargo(params) {
  const query = new URLSearchParams({ ...params, limit: '5000', format: 'json' });
  const res = await fetch(`${CARGO}?${query}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) {
    throw new Error(`Leaguepedia 조회 실패 (${params.tables}): HTTP ${res.status}`);
  }
  return res.json();
}

// "Doran (Choi Hyeon-jun)" → "Doran"
const playerName = link => String(link).replace(/\s*\(.*\)$/, '').trim();
const quoteList = values => values.map(v => `"${v.replace(/"/g, '\\"')}"`).join(',');

const rosters = await cargo({
  tables: 'TournamentRosters',
  fields: 'Team,OverviewPage,RosterLinks,Roles,Region',
  where: `OverviewPage LIKE "${EVENT}%"`
});
if (rosters.length === 0) {
  throw new Error(`대회를 찾을 수 없습니다: ${EVENT}`);
}

// 팀별 등록 정보 (본선 등록이 있으면 본선 우선)
const registered = new Map();
for (const roster of rosters) {
  const stage = roster.OverviewPage.endsWith('/Main Event') ? 'main' : 'playin';
  const prev = registered.get(roster.Team);
  const links = String(roster.RosterLinks).split(';;');
  const roles = String(roster.Roles).split(';;');
  const staff = new Set(links.filter((_, i) => !ROLE_TO_POSITION[roles[i]]).map(playerName));
  if (!prev || stage === 'main') {
    registered.set(roster.Team, { stage, region: roster.Region, staff });
  }
}
const teamNames = [...registered.keys()];

const scoreboard = await cargo({
  tables: 'ScoreboardPlayers',
  fields: 'Team,Link,Role,DateTime_UTC,GameId,OverviewPage',
  where: `Team IN (${quoteList(teamNames)}) AND DateTime_UTC > "${RECENT_SINCE}"`,
  'order by': 'DateTime_UTC DESC'
});

const members = await cargo({
  tables: 'Players',
  fields: 'ID,Team,Role',
  where: `Team IN (${quoteList(teamNames)}) AND IsRetired="0"`
});

const teamInfo = await cargo({
  tables: 'Teams',
  fields: 'Name,Location,TeamLocation',
  where: `Name IN (${quoteList(teamNames)})`
});
const countryOf = team => {
  const info = teamInfo.find(t => t.Name === team);
  const country = COUNTRY_OVERRIDES[team] || info?.TeamLocation || info?.Location || '';
  return COUNTRY_NAMES[country] || country;
};

const missing = [];
const teams = [];

for (const team of teamNames) {
  const info = registered.get(team);
  const games = scoreboard
    .filter(row => row.Team === team)
    .sort((a, b) => b['DateTime UTC'].localeCompare(a['DateTime UTC']));
  if (games.length === 0) {
    missing.push(team);
    continue;
  }

  // 가장 최근 경기(같은 GameId)의 출전 선수 = 주전
  const last = games[0];
  const players = games
    .filter(row => row.GameId === last.GameId && ROLE_TO_POSITION[row.Role])
    .map(row => ({ position: ROLE_TO_POSITION[row.Role], name: playerName(row.Link) }))
    .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position));

  // 현재 소속 선수 중 주전이 아닌 선수 = 후보 (코치로 등록된 사람 제외)
  // 표기 대소문자가 다른 경우가 있어(POUT / Pout) 소문자로 비교
  const starters = new Set(players.map(p => p.name.toLowerCase()));
  const staff = new Set([...info.staff].map(name => name.toLowerCase()));
  const subs = members
    .filter(m => m.Team === team)
    .flatMap(m => {
      const position = String(m.Role).split(',').map(r => ROLE_TO_POSITION[r.trim()]).find(Boolean);
      const name = playerName(m.ID);
      return position && !starters.has(name.toLowerCase()) && !staff.has(name.toLowerCase()) ? [{ position, name }] : [];
    })
    .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position));

  teams.push({
    name: TEAM_NAMES[team] || team,
    fullName: team.replace(/\s*\(.*\)$/, ''),
    region: REGION_NAMES[info.region] || info.region,
    country: countryOf(team),
    stage: info.stage,
    players,
    subs,
    lastMatch: last['DateTime UTC'].slice(0, 10),
    lastMatchEvent: last.OverviewPage,
    source: `https://lol.fandom.com/wiki/${encodeURIComponent(last.OverviewPage.replace(/ /g, '_'))}`
  });
}

teams.sort((a, b) =>
  (a.stage === b.stage ? 0 : a.stage === 'main' ? -1 : 1) ||
  REGION_ORDER.indexOf(a.region) - REGION_ORDER.indexOf(b.region) ||
  a.name.localeCompare(b.name)
);

const invalid = teams.filter(t => t.players.length !== 5 || new Set(t.players.map(p => p.position)).size !== 5);
const today = new Date().toLocaleDateString('sv-SE'); // 로컬 기준 YYYY-MM-DD

writeFileSync(
  JSON_PATH,
  JSON.stringify({ event: EVENT, updated: today, teams }, null, 2) + '\n',
  'utf8'
);

// 사람이 검토하기 위한 읽기용 문서
const lines = [
  `# ${EVENT} 진출팀 선수`,
  '',
  `> 작성일: ${today} / 출처: Leaguepedia (TournamentRosters, ScoreboardPlayers, Players)`,
  '> 주전: 팀의 가장 최근 공식 경기 출전 선수 / 후보: 현재 소속 선수 중 주전이 아닌 선수',
  '> 팀 설정 페이지의 `롤드컵 팀 불러오기` 로 저장된 팀에 추가됩니다.',
  '> 원본 데이터는 `data/teams.json` 이며, 이 문서는 `tools/build-teams.mjs` 로 함께 생성됩니다.',
  ''
];

for (const team of teams) {
  lines.push(`## ${team.name} (${team.fullName}) - ${team.region} / ${team.country || '?'}${team.stage === 'playin' ? ', 플레이인 탈락' : ''}`, '');
  lines.push('| 포지션 | 주전 | 후보 |', '|--------|------|------|');
  for (const position of POSITION_ORDER) {
    const starter = team.players.find(p => p.position === position)?.name || '-';
    const subs = team.subs.filter(s => s.position === position).map(s => s.name).join(', ') || '';
    lines.push(`| ${POSITION_NAMES[position]} | ${starter} | ${subs} |`);
  }
  lines.push('', `- 최근 경기: ${team.lastMatch} (${team.lastMatchEvent})`, `- 출처: ${team.source}`, '');
}

writeFileSync(MD_PATH, lines.join('\n'), 'utf8');

console.log(`대회: ${EVENT}`);
console.log(`작성한 팀: ${teams.length}개 (본선 ${teams.filter(t => t.stage === 'main').length})`);
console.log(`국가 없음: ${teams.filter(t => !t.country).map(t => t.name).join(', ') || '없음'}`);
console.log(`경기 기록 없음: ${missing.join(', ') || '없음'}`);
console.log(`주전 5명이 아닌 팀: ${invalid.map(t => t.name).join(', ') || '없음'}`);
console.log(`후보: ${teams.filter(t => t.subs.length).map(t => `${t.name}(${t.subs.map(s => s.name).join(', ')})`).join(' / ') || '없음'}`);
