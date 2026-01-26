/**
 * 챔피언 데이터 서비스
 */

class ChampionService {
  constructor() {
    this.champions = [];
    this.loaded = false;
  }

  /**
   * 챔피언 데이터 로드
   * @returns {Promise<Array>}
   */
  async load() {
    if (this.loaded) {
      return this.champions;
    }

    try {
      const response = await fetch('./data/champions.json');
      if (!response.ok) {
        throw new Error('챔피언 데이터를 불러올 수 없습니다.');
      }
      const data = await response.json();
      this.champions = data.champions || [];
      this.loaded = true;
      return this.champions;
    } catch (e) {
      console.error('챔피언 데이터 로드 실패:', e);
      return [];
    }
  }

  /**
   * 모든 챔피언 가져오기
   * @returns {Array}
   */
  getAll() {
    return this.champions;
  }

  /**
   * ID로 챔피언 찾기
   * @param {number} id
   * @returns {Object|null}
   */
  getById(id) {
    return this.champions.find(c => c.id === id) || null;
  }

  /**
   * 챔피언 검색 (한글/영문)
   * @param {string} query
   * @returns {Array}
   */
  search(query) {
    if (!query || !query.trim()) {
      return this.champions;
    }

    const normalizedQuery = query.toLowerCase().trim();
    return this.champions.filter(champ =>
      champ.nameKr.toLowerCase().includes(normalizedQuery) ||
      champ.nameEn.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * 챔피언 이미지 URL 가져오기
   * @param {number} championId
   * @param {string} type - 'square' | 'tile' | 'splash-art'
   * @returns {string}
   */
  getImageUrl(championId, type = 'square') {
    return `https://cdn.communitydragon.org/latest/champion/${championId}/${type}`;
  }
}

// 싱글톤 인스턴스
export const championService = new ChampionService();
