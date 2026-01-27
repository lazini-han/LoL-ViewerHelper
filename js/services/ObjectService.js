/**
 * 게임 오브젝트 데이터 서비스
 */

class ObjectService {
  constructor() {
    this.objects = [];
    this.loaded = false;
  }

  /**
   * 오브젝트 데이터 로드
   * @returns {Promise<Array>}
   */
  async load() {
    if (this.loaded) {
      return this.objects;
    }

    try {
      const response = await fetch('./data/objects.json');
      if (!response.ok) {
        throw new Error('오브젝트 데이터를 불러올 수 없습니다.');
      }
      const data = await response.json();
      this.objects = data.objects || [];
      this.loaded = true;
      return this.objects;
    } catch (e) {
      console.error('오브젝트 데이터 로드 실패:', e);
      return [];
    }
  }

  /**
   * 모든 오브젝트 가져오기
   * @returns {Array}
   */
  getAll() {
    return this.objects;
  }

  /**
   * ID로 오브젝트 찾기
   * @param {string} id
   * @returns {Object|null}
   */
  getById(id) {
    return this.objects.find(o => o.id === id) || null;
  }

  /**
   * 오브젝트 검색 (한글)
   * @param {string} query
   * @returns {Array}
   */
  search(query) {
    if (!query || !query.trim()) {
      return this.objects;
    }

    const normalizedQuery = query.toLowerCase().trim();
    return this.objects.filter(obj =>
      obj.nameKr.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * 카테고리별 오브젝트 가져오기
   * @param {string} category
   * @returns {Array}
   */
  getByCategory(category) {
    if (!category || category === '전체') {
      return this.objects;
    }
    return this.objects.filter(obj => obj.category === category);
  }

  /**
   * 모든 카테고리 목록 가져오기
   * @returns {Array}
   */
  getCategories() {
    const categories = [...new Set(this.objects.map(obj => obj.category))];
    return ['전체', ...categories];
  }
}

// 싱글톤 인스턴스
export const objectService = new ObjectService();
