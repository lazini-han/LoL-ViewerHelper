/**
 * 경기 일정 데이터 서비스
 * data/schedule.json (국제 대회·리그별 다음 시즌 일정, 공개된 범위만 정리) 로드
 */

class ScheduleService {
  constructor() {
    this.schedulePromise = null;
  }

  /**
   * 일정 데이터 로드 (최초 1회만)
   * @returns {Promise<{season: number, updated: string, international: Array, leagues: Array}|null>}
   */
  async load() {
    if (!this.schedulePromise) {
      this.schedulePromise = fetch('./data/schedule.json')
        .then(response => {
          if (!response.ok) throw new Error('일정 데이터를 불러올 수 없습니다.');
          return response.json();
        })
        .catch(e => {
          console.error('일정 데이터 로드 실패:', e);
          this.schedulePromise = null; // 다음 호출에서 재시도
          return null;
        });
    }
    return this.schedulePromise;
  }
}

// 싱글톤 인스턴스
export const scheduleService = new ScheduleService();
