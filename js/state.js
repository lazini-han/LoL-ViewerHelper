/**
 * 전역 상태 관리
 */

import { STORAGE_KEY, POSITIONS } from './utils/constants.js';

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
    blueTeam: {
      name: '',
      players: createDefaultPlayers()
    },
    redTeam: {
      name: '',
      players: createDefaultPlayers()
    },
    currentGame: 1,
    games: createDefaultGames(),
    globalBans: createDefaultGlobalBans()
  };
}

/**
 * 상태 관리 클래스
 */
class State {
  constructor() {
    this.data = createDefaultState();
    this.savedTeams = [];
    this.listeners = [];
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
   * LocalStorage에 상태 저장
   */
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('상태 저장 실패:', e);
    }
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
    this.data[teamKey] = {
      name: '',
      players: createDefaultPlayers()
    };
    this.save();
    this.notify();
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
   * 저장된 팀 목록 저장
   */
  saveSavedTeams() {
    try {
      localStorage.setItem(SAVED_TEAMS_KEY, JSON.stringify(this.savedTeams));
    } catch (e) {
      console.warn('팀 저장 실패:', e);
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

    const teamData = {
      id: Date.now(),
      name: team.name,
      players: team.players.map(p => ({ position: p.position, name: p.name }))
    };

    // 같은 이름의 팀이 있으면 업데이트
    const existingIndex = this.savedTeams.findIndex(t => t.name === team.name);
    if (existingIndex !== -1) {
      teamData.id = this.savedTeams[existingIndex].id;
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
   * 저장된 팀 정보를 현재 팀에 적용
   * @param {number} teamId
   * @param {'blueTeam'|'redTeam'} targetTeamKey
   */
  applySavedTeam(teamId, targetTeamKey) {
    const savedTeam = this.savedTeams.find(t => t.id === teamId);
    if (!savedTeam) return;

    const players = POSITIONS.map(position => {
      const savedPlayer = savedTeam.players.find(p => p.position === position);
      return {
        position,
        name: savedPlayer?.name || ''
      };
    });

    this.data[targetTeamKey] = {
      name: savedTeam.name,
      players
    };

    this.save();
    this.notify();
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
