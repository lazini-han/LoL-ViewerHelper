/**
 * 전역 상태 관리
 */

import { STORAGE_KEY, POSITIONS } from './utils/constants.js';

/**
 * 기본 선수 목록 생성
 * @returns {Array}
 */
function createDefaultPlayers() {
  return POSITIONS.map(position => ({
    position,
    name: '',
    champion: null
  }));
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
    }
  };
}

/**
 * 상태 관리 클래스
 */
class State {
  constructor() {
    this.data = createDefaultState();
    this.listeners = [];
    this.load();
  }

  /**
   * LocalStorage에서 상태 로드
   */
  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.data = { ...createDefaultState(), ...parsed };
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
   * 선수에게 챔피언 할당
   * @param {'blueTeam'|'redTeam'} teamKey
   * @param {string} position
   * @param {Object|null} champion
   */
  assignChampion(teamKey, position, champion) {
    const players = this.data[teamKey].players;
    const playerIndex = players.findIndex(p => p.position === position);
    if (playerIndex !== -1) {
      players[playerIndex].champion = champion;
      this.save();
      this.notify();
    }
  }

  /**
   * 두 선수의 챔피언 교환
   * @param {'blueTeam'|'redTeam'} teamKey1
   * @param {string} position1
   * @param {'blueTeam'|'redTeam'} teamKey2
   * @param {string} position2
   */
  swapChampions(teamKey1, position1, teamKey2, position2) {
    const player1 = this.data[teamKey1].players.find(p => p.position === position1);
    const player2 = this.data[teamKey2].players.find(p => p.position === position2);

    if (player1 && player2) {
      const temp = player1.champion;
      player1.champion = player2.champion;
      player2.champion = temp;
      this.save();
      this.notify();
    }
  }

  /**
   * 특정 챔피언이 이미 선택되었는지 확인
   * @param {number} championId
   * @returns {{team: string, position: string}|null}
   */
  findChampionAssignment(championId) {
    for (const teamKey of ['blueTeam', 'redTeam']) {
      for (const player of this.data[teamKey].players) {
        if (player.champion && player.champion.id === championId) {
          return { team: teamKey, position: player.position };
        }
      }
    }
    return null;
  }

  /**
   * 두 팀의 진영(데이터) 교환
   */
  swapTeams() {
    const temp = { ...this.data.blueTeam };
    this.data.blueTeam = { ...this.data.redTeam };
    this.data.redTeam = temp;
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
