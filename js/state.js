/**
 * 전역 상태 관리
 */

import { STORAGE_KEY, POSITIONS } from './utils/constants.js';
import { syncService } from './services/syncService.js';

const SAVED_TEAMS_KEY = 'lol-viewer-helper-saved-teams';
const MAX_GAMES = 5;

/**
 * 기본 선수 목록 생성 (챔피언 정보 제외)
 * @returns {Array}
 */
function createDefaultPlayers() {
  return POSITIONS.map(position => ({
    position,
    name: ''
  }));
}

/**
 * 기본 팀 정보 생성 (subs: 후보 선수, region/country: 소속 리그·국가 태그)
 * @returns {Object}
 */
function createDefaultTeam() {
  return {
    name: '',
    players: createDefaultPlayers(),
    subs: []
  };
}

/**
 * 저장된 팀 데이터를 현재 팀 형식으로 복사
 * @param {Object} team - { name, players, subs?, fullName?, logo?, region?, country? }
 * @returns {Object}
 */
function toTeamData(team) {
  return {
    name: team.name,
    ...(team.fullName ? { fullName: team.fullName } : {}),
    ...(team.logo ? { logo: team.logo } : {}),
    players: POSITIONS.map(position => ({
      position,
      name: team.players?.find(p => p.position === position)?.name || ''
    })),
    subs: (team.subs || []).map(sub => ({ position: sub.position, name: sub.name })),
    ...(team.region ? { region: team.region } : {}),
    ...(team.country ? { country: team.country } : {})
  };
}

/**
 * 기본 게임 챔피언 데이터 생성
 * @returns {Object}
 */
function createDefaultGameChampions() {
  const teamChampions = {};
  POSITIONS.forEach(pos => {
    teamChampions[pos] = null;
  });
  return {
    blueTeam: { ...teamChampions },
    redTeam: { ...teamChampions }
  };
}

/**
 * 기본 게임들 데이터 생성
 * @returns {Object}
 */
function createDefaultGames() {
  const games = {};
  for (let i = 1; i <= MAX_GAMES; i++) {
    games[i] = createDefaultGameChampions();
  }
  return games;
}

/**
 * 기본 글로벌 밴 생성
 * @returns {Object}
 */
function createDefaultGlobalBans() {
  return {
    blue: [null, null, null, null, null],
    red: [null, null, null, null, null]
  };
}

/**
 * 기본 상태
 */
function createDefaultState() {
  return {
    blueTeam: createDefaultTeam(),
    redTeam: createDefaultTeam(),
    currentGame: 1,
    games: createDefaultGames(),
    globalBans: createDefaultGlobalBans(),
    // 챔피언 선택 화면의 팀별 포지션 순서 뒤집기 여부
    slotOrderReversed: { blue: false, red: false }
  };
}

/**
 * 키 순서와 무관하게 비교하기 위한 직렬화 (Firestore 는 키 순서를 보장하지 않음)
 * @param {*} value
 * @returns {string}
 */
function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * 상태 관리 클래스
 */
class State {
  constructor() {
    this.data = createDefaultState();
    this.savedTeams = [];
    this.listeners = [];
    this._isRemoteUpdate = false;
    this.load();
    this.loadSavedTeams();
  }

  /**
   * LocalStorage에서 상태 로드 (마이그레이션 포함)
   */
  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // 마이그레이션: 기존 데이터 구조 변환
        if (!parsed.games) {
          // 기존 players에서 champion 정보 추출하여 games[1]로 이동
          const defaultState = createDefaultState();
          
          if (parsed.blueTeam?.players) {
            parsed.blueTeam.players.forEach(player => {
              if (player.champion) {
                defaultState.games[1].blueTeam[player.position] = player.champion;
              }
            });
            // players에서 champion 제거
            parsed.blueTeam.players = parsed.blueTeam.players.map(p => ({
              position: p.position,
              name: p.name
            }));
          }
          
          if (parsed.redTeam?.players) {
            parsed.redTeam.players.forEach(player => {
              if (player.champion) {
                defaultState.games[1].redTeam[player.position] = player.champion;
              }
            });
            // players에서 champion 제거
            parsed.redTeam.players = parsed.redTeam.players.map(p => ({
              position: p.position,
              name: p.name
            }));
          }
          
          this.data = {
            ...defaultState,
            blueTeam: parsed.blueTeam || defaultState.blueTeam,
            redTeam: parsed.redTeam || defaultState.redTeam
          };
        } else {
          this.data = { ...createDefaultState(), ...parsed };
        }
      }
    } catch (e) {
      console.warn('상태 로드 실패:', e);
    }
  }

  /**
   * LocalStorage에 상태 저장 + 클라우드 동기화
   */
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('상태 저장 실패:', e);
    }

    if (!this._isRemoteUpdate && syncService.isActive()) {
      syncService.saveToCloud(this.data, this.savedTeams);
    }
  }

  /**
   * 클라우드에서 받은 데이터로 로컬 상태 덮어쓰기
   * @param {Object} cloudData - Firestore 문서 데이터
   */
  loadFromCloud(cloudData) {
    if (!cloudData) return;

    this._isRemoteUpdate = true;

    if (cloudData.state) {
      this.data = { ...createDefaultState(), ...cloudData.state };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) {
        console.warn('상태 저장 실패:', e);
      }
    }

    if (cloudData.savedTeams) {
      this.savedTeams = cloudData.savedTeams;
      try {
        localStorage.setItem(SAVED_TEAMS_KEY, JSON.stringify(this.savedTeams));
      } catch (e) {
        console.warn('팀 저장 실패:', e);
      }
    }

    this.notify();
    this._isRemoteUpdate = false;
  }

  /**
   * 사용자가 입력한 데이터가 있는지 (팀/선수 이름, 픽, 밴, 저장된 팀)
   * @returns {boolean}
   */
  hasUserData() {
    const { blueTeam, redTeam, games, globalBans } = this.data;
    const hasTeamInfo = [blueTeam, redTeam].some(team =>
      team?.name?.trim() || team?.players?.some(player => player.name?.trim())
    );
    const hasPicks = Object.values(games || {}).some(game =>
      ['blueTeam', 'redTeam'].some(teamKey => Object.values(game?.[teamKey] || {}).some(Boolean))
    );
    const hasBans = Object.values(globalBans || {}).some(bans => bans?.some(Boolean));
    return Boolean(hasTeamInfo || hasPicks || hasBans || this.savedTeams.length > 0);
  }

  /**
   * 현재 로컬 데이터가 클라우드 데이터와 같은지
   * @param {Object} cloudData - Firestore 문서 데이터
   * @returns {boolean}
   */
  isSameAsCloud(cloudData) {
    const cloudState = { ...createDefaultState(), ...cloudData?.state };
    return stableStringify(cloudState) === stableStringify(this.data)
      && stableStringify(cloudData?.savedTeams || []) === stableStringify(this.savedTeams);
  }

  /**
   * 현재 로컬 데이터를 클라우드에 업로드 (로그인 시 로컬 데이터 유지 선택)
   */
  uploadToCloud() {
    syncService.saveToCloud(this.data, this.savedTeams);
  }

  /**
   * 상태 가져오기
   * @returns {Object}
   */
  get() {
    return this.data;
  }

  /**
   * 상태 업데이트
   * @param {Object} newData
   */
  update(newData) {
    this.data = { ...this.data, ...newData };
    this.save();
    this.notify();
  }

  /**
   * 팀 정보 업데이트
   * @param {'blueTeam'|'redTeam'} teamKey
   * @param {Object} teamData
   */
  updateTeam(teamKey, teamData) {
    this.data[teamKey] = { ...this.data[teamKey], ...teamData };
    this.save();
    this.notify();
  }

  /**
   * 팀 정보 비우기
   * @param {'blueTeam'|'redTeam'} teamKey
   */
  clearTeam(teamKey) {
    this.data[teamKey] = createDefaultTeam();
    this.save();
    this.notify();
  }

  /**
   * 후보 선수를 같은 포지션 주전과 맞바꿈 (기존 주전은 후보로)
   * @param {'blueTeam'|'redTeam'} teamKey
   * @param {number} subIndex
   */
  swapWithSub(teamKey, subIndex) {
    const team = this.data[teamKey];
    const subs = [...(team.subs || [])];
    const sub = subs[subIndex];
    if (!sub) return;

    const players = team.players.map(player => ({ ...player }));
    const starter = players.find(player => player.position === sub.position);
    if (!starter) return;

    if (starter.name.trim()) {
      subs[subIndex] = { position: sub.position, name: starter.name };
    } else {
      subs.splice(subIndex, 1); // 빈 자리에 넣는 경우
    }
    starter.name = sub.name;

    this.updateTeam(teamKey, { players, subs });
  }

  /**
   * 후보 선수 추가
   * @param {'blueTeam'|'redTeam'} teamKey
   * @param {string} position
   * @param {string} name
   */
  addSub(teamKey, position, name) {
    if (!name.trim()) return;
    const subs = [...(this.data[teamKey].subs || []), { position, name: name.trim() }];
    this.updateTeam(teamKey, { subs });
  }

  /**
   * 후보 선수 삭제
   * @param {'blueTeam'|'redTeam'} teamKey
   * @param {number} subIndex
   */
  removeSub(teamKey, subIndex) {
    const subs = (this.data[teamKey].subs || []).filter((_, i) => i !== subIndex);
    this.updateTeam(teamKey, { subs });
  }

  /**
   * 현재 게임 번호 설정
   * @param {number} gameNumber
   */
  setCurrentGame(gameNumber) {
    if (gameNumber >= 1 && gameNumber <= MAX_GAMES) {
      this.data.currentGame = gameNumber;
      this.save();
      this.notify();
    }
  }

  /**
   * 현재 게임 번호 가져오기
   * @returns {number}
   */
  getCurrentGame() {
    return this.data.currentGame;
  }

  /**
   * 현재 게임의 챔피언 정보 가져오기
   * @returns {Object}
   */
  getCurrentGameChampions() {
    return this.data.games[this.data.currentGame];
  }

  /**
   * 특정 게임의 챔피언 정보 가져오기
   * @param {number} gameNumber
   * @returns {Object}
   */
  getGameChampions(gameNumber) {
    return this.data.games[gameNumber];
  }

  /**
   * 선수에게 챔피언 할당 (현재 게임)
   * @param {'blueTeam'|'redTeam'} teamKey
   * @param {string} position
   * @param {Object|null} champion
   */
  assignChampion(teamKey, position, champion) {
    const currentGame = this.data.currentGame;
    this.data.games[currentGame][teamKey][position] = champion;
    this.save();
    this.notify();
  }

  /**
   * 두 선수의 챔피언 교환 (현재 게임)
   * @param {'blueTeam'|'redTeam'} teamKey1
   * @param {string} position1
   * @param {'blueTeam'|'redTeam'} teamKey2
   * @param {string} position2
   */
  swapChampions(teamKey1, position1, teamKey2, position2) {
    const currentGame = this.data.currentGame;
    const game = this.data.games[currentGame];
    const temp = game[teamKey1][position1];
    game[teamKey1][position1] = game[teamKey2][position2];
    game[teamKey2][position2] = temp;
    this.save();
    this.notify();
  }

  /**
   * 현재 게임에서 특정 챔피언이 이미 선택되었는지 확인
   * @param {number} championId
   * @returns {{team: string, position: string}|null}
   */
  findChampionAssignment(championId) {
    const currentGame = this.data.currentGame;
    const game = this.data.games[currentGame];
    
    for (const teamKey of ['blueTeam', 'redTeam']) {
      for (const position of POSITIONS) {
        const champion = game[teamKey][position];
        if (champion && champion.id === championId) {
          return { team: teamKey, position };
        }
      }
    }
    return null;
  }

  /**
   * 다른 게임에서 픽된 챔피언 ID 목록 가져오기
   * @returns {Set<number>}
   */
  getPickedChampionsInOtherGames() {
    const currentGame = this.data.currentGame;
    const pickedIds = new Set();
    
    for (let i = 1; i <= MAX_GAMES; i++) {
      if (i === currentGame) continue;
      const game = this.data.games[i];
      for (const teamKey of ['blueTeam', 'redTeam']) {
        for (const position of POSITIONS) {
          const champion = game[teamKey][position];
          if (champion) {
            pickedIds.add(champion.id);
          }
        }
      }
    }
    
    return pickedIds;
  }

  /**
   * 글로벌 밴된 챔피언 ID 목록 가져오기
   * @returns {Set<number>}
   */
  getGlobalBannedChampionIds() {
    const bannedIds = new Set();
    const { globalBans } = this.data;
    
    [...globalBans.blue, ...globalBans.red].forEach(champion => {
      if (champion) {
        bannedIds.add(champion.id);
      }
    });
    
    return bannedIds;
  }

  /**
   * 글로벌 밴 추가
   * @param {'blue'|'red'} team
   * @param {number} index
   * @param {Object} champion
   */
  addGlobalBan(team, index, champion) {
    if (index >= 0 && index < 5) {
      this.data.globalBans[team][index] = champion;
      this.save();
      this.notify();
    }
  }

  /**
   * 글로벌 밴 제거
   * @param {'blue'|'red'} team
   * @param {number} index
   */
  removeGlobalBan(team, index) {
    if (index >= 0 && index < 5) {
      this.data.globalBans[team][index] = null;
      this.save();
      this.notify();
    }
  }

  /**
   * 글로벌 밴 슬롯 교환
   * @param {'blue'|'red'} team1
   * @param {number} index1
   * @param {'blue'|'red'} team2
   * @param {number} index2
   */
  swapGlobalBans(team1, index1, team2, index2) {
    const temp = this.data.globalBans[team1][index1];
    this.data.globalBans[team1][index1] = this.data.globalBans[team2][index2];
    this.data.globalBans[team2][index2] = temp;
    this.save();
    this.notify();
  }

  /**
   * 글로벌 밴에서 특정 챔피언 위치 찾기
   * @param {number} championId
   * @returns {{team: string, index: number}|null}
   */
  findGlobalBanAssignment(championId) {
    const { globalBans } = this.data;
    
    for (const team of ['blue', 'red']) {
      for (let i = 0; i < 5; i++) {
        if (globalBans[team][i]?.id === championId) {
          return { team, index: i };
        }
      }
    }
    return null;
  }

  /**
   * 두 팀의 진영(데이터) 교환 (현재 게임만)
   */
  swapTeams() {
    // 팀 기본 정보 교환
    const temp = { ...this.data.blueTeam };
    this.data.blueTeam = { ...this.data.redTeam };
    this.data.redTeam = temp;
    
    // 현재 게임 챔피언 정보도 교환
    const currentGame = this.data.currentGame;
    const game = this.data.games[currentGame];
    const tempChampions = { ...game.blueTeam };
    game.blueTeam = { ...game.redTeam };
    game.redTeam = tempChampions;
    
    // 글로벌 밴도 교환
    const tempBans = [...this.data.globalBans.blue];
    this.data.globalBans.blue = [...this.data.globalBans.red];
    this.data.globalBans.red = tempBans;
    
    this.save();
    this.notify();
  }

  /**
   * 챔피언 선택 화면의 팀 포지션 순서 뒤집기 토글
   * @param {'blue'|'red'} team
   */
  toggleSlotOrder(team) {
    const reversed = { blue: false, red: false, ...this.data.slotOrderReversed };
    reversed[team] = !reversed[team];
    this.data.slotOrderReversed = reversed;
    this.save();
    this.notify();
  }

  /**
   * 상태 초기화
   */
  reset() {
    this.data = createDefaultState();
    this.save();
    this.notify();
  }

  /**
   * 특정 게임 초기화
   * @param {number} gameNumber
   */
  resetGame(gameNumber) {
    if (gameNumber >= 1 && gameNumber <= MAX_GAMES) {
      this.data.games[gameNumber] = createDefaultGameChampions();
      this.save();
      this.notify();
    }
  }

  /**
   * 현재 게임 픽과 글로벌 밴 모두 초기화
   */
  resetCurrentGameAndBans() {
    this.data.games[this.data.currentGame] = createDefaultGameChampions();
    this.data.globalBans = createDefaultGlobalBans();
    this.save();
    this.notify();
  }

  /**
   * 1~5경기 전체 픽과 글로벌 밴 모두 초기화 (팀/선수 정보는 유지)
   */
  resetAllGamesAndBans() {
    this.data.games = createDefaultGames();
    this.data.globalBans = createDefaultGlobalBans();
    this.save();
    this.notify();
  }

  /**
   * 저장된 팀 목록 로드
   */
  loadSavedTeams() {
    try {
      const saved = localStorage.getItem(SAVED_TEAMS_KEY);
      if (saved) {
        this.savedTeams = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('저장된 팀 로드 실패:', e);
      this.savedTeams = [];
    }
  }

  /**
   * 저장된 팀 목록 저장 + 클라우드 동기화
   */
  saveSavedTeams() {
    try {
      localStorage.setItem(SAVED_TEAMS_KEY, JSON.stringify(this.savedTeams));
    } catch (e) {
      console.warn('팀 저장 실패:', e);
    }

    if (!this._isRemoteUpdate && syncService.isActive()) {
      syncService.saveToCloud(this.data, this.savedTeams);
    }
  }

  /**
   * 저장된 팀 목록 가져오기
   * @returns {Array}
   */
  getSavedTeams() {
    return this.savedTeams;
  }

  /**
   * 현재 팀 정보를 저장된 팀 목록에 추가/업데이트
   * @param {'blueTeam'|'redTeam'} teamKey
   */
  saveTeamToList(teamKey) {
    const team = this.data[teamKey];
    if (!team.name.trim()) return false;

    const teamData = { id: Date.now(), ...toTeamData(team) };

    // 같은 이름의 팀이 있으면 업데이트
    const existingIndex = this.savedTeams.findIndex(t => t.name === team.name);
    if (existingIndex !== -1) {
      teamData.id = this.savedTeams[existingIndex].id;
      if (this.savedTeams[existingIndex].inactive) teamData.inactive = true; // 비활성 상태 유지
      this.savedTeams[existingIndex] = teamData;
    } else {
      this.savedTeams.push(teamData);
    }

    this.saveSavedTeams();
    return true;
  }

  /**
   * 저장된 팀 삭제
   * @param {number} teamId
   */
  deleteSavedTeam(teamId) {
    this.savedTeams = this.savedTeams.filter(t => t.id !== teamId);
    this.saveSavedTeams();
  }

  /**
   * 저장된 팀 비활성화 켜기/끄기 (탈락 팀 등을 목록에서 어둡게 표시)
   * @param {number} teamId
   */
  toggleSavedTeamInactive(teamId) {
    const savedTeam = this.savedTeams.find(t => t.id === teamId);
    if (!savedTeam) return;

    if (savedTeam.inactive) {
      delete savedTeam.inactive;
    } else {
      savedTeam.inactive = true;
    }
    this.saveSavedTeams();
  }

  /**
   * 저장된 팀 정보를 현재 팀에 적용
   * @param {number} teamId
   * @param {'blueTeam'|'redTeam'} targetTeamKey
   */
  applySavedTeam(teamId, targetTeamKey) {
    const savedTeam = this.savedTeams.find(t => t.id === teamId);
    if (!savedTeam) return;

    this.data[targetTeamKey] = toTeamData(savedTeam);

    this.save();
    this.notify();
  }

  /**
   * 외부 팀 데이터(롤드컵 팀 등)를 저장된 팀 목록에 추가
   * @param {Array} teams - [{ name, players, subs, region, country }]
   * @param {Set<string>} overwriteNames - 이미 있는 팀 중 덮어쓸 팀 이름
   * @returns {{added: number, overwritten: number, skipped: number}}
   */
  importTeams(teams, overwriteNames = new Set()) {
    const result = { added: 0, overwritten: 0, skipped: 0 };
    let nextId = Date.now();

    teams.forEach(team => {
      const index = this.savedTeams.findIndex(t => t.name === team.name);
      if (index === -1) {
        this.savedTeams.push({ id: nextId++, ...toTeamData(team) });
        result.added++;
      } else if (overwriteNames.has(team.name)) {
        this.savedTeams[index] = {
          id: this.savedTeams[index].id,
          ...toTeamData(team),
          ...(this.savedTeams[index].inactive ? { inactive: true } : {}) // 비활성 상태 유지
        };
        result.overwritten++;
      } else {
        result.skipped++;
      }
    });

    this.saveSavedTeams();
    return result;
  }

  /**
   * 리스너 등록
   * @param {Function} listener
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * 리스너들에게 알림
   */
  notify() {
    this.listeners.forEach(listener => listener(this.data));
  }
}

// 싱글톤 인스턴스
export const state = new State();

// 상수 export
export { MAX_GAMES };
