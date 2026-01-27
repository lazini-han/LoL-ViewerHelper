/**
 * 아이템 데이터 서비스
 */

class ItemService {
  constructor() {
    this.items = [];
    this.loaded = false;
  }

  /**
   * 아이템 데이터 로드
   * @returns {Promise<Array>}
   */
  async load() {
    if (this.loaded) {
      return this.items;
    }

    try {
      const response = await fetch('./data/items.json');
      if (!response.ok) {
        throw new Error('아이템 데이터를 불러올 수 없습니다.');
      }
      const data = await response.json();
      this.items = data.items || [];
      this.loaded = true;
      return this.items;
    } catch (e) {
      console.error('아이템 데이터 로드 실패:', e);
      return [];
    }
  }

  /**
   * 모든 아이템 가져오기
   * @returns {Array}
   */
  getAll() {
    return this.items;
  }

  /**
   * ID로 아이템 찾기
   * @param {number} id
   * @returns {Object|null}
   */
  getById(id) {
    return this.items.find(i => i.id === id) || null;
  }

  /**
   * 아이템 검색 (한글)
   * @param {string} query
   * @returns {Array}
   */
  search(query) {
    if (!query || !query.trim()) {
      return this.items;
    }

    const normalizedQuery = query.toLowerCase().trim();
    return this.items.filter(item =>
      item.nameKr.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * 카테고리별 아이템 가져오기
   * @param {string} category
   * @returns {Array}
   */
  getByCategory(category) {
    if (!category || category === '전체') {
      return this.items;
    }
    return this.items.filter(item => item.category === category);
  }

  /**
   * 모든 카테고리 목록 가져오기
   * @returns {Array}
   */
  getCategories() {
    const categories = [...new Set(this.items.map(item => item.category))];
    return ['전체', ...categories];
  }

  /**
   * 아이템 아이콘 URL 가져오기 (Data Dragon - Riot 공식 CDN)
   * @param {number} itemId
   * @returns {string}
   */
  getIconUrl(itemId) {
    return `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/${itemId}.png`;
  }
}

// 싱글톤 인스턴스
export const itemService = new ItemService();
