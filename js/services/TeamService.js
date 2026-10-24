/**
 * 프로 팀 데이터 서비스
 * data/teams.json (tools/build-teams.mjs 로 생성한 롤드컵 진출팀 선수 정보) 로드
 */

class TeamService {
  constructor() {
    this.teamsPromise = null;
  }

  /**
   * 팀 데이터 로드 (최초 1회만)
   * @returns {Promise<{event: string, updated: string, teams: Array}|null>}
   */
  async load() {
    if (!this.teamsPromise) {
      this.teamsPromise = fetch('./data/teams.json')
        .then(response => {
          if (!response.ok) throw new Error('팀 데이터를 불러올 수 없습니다.');
          return response.json();
        })
        .catch(e => {
          console.error('팀 데이터 로드 실패:', e);
          this.teamsPromise = null; // 다음 호출에서 재시도
          return null;
        });
    }
    return this.teamsPromise;
  }
}

// 싱글톤 인스턴스
export const teamService = new TeamService();
