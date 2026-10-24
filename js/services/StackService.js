/**
 * 스택 요소 데이터 서비스 (data/stacks.json)
 */

// 분류 필터 순서
const CATEGORIES = ['전체', '챔피언', '아이템', '룬', '오브젝트'];

class StackService {
  constructor() {
    this.stacks = [];
    this.loaded = false;
  }

  /**
   * 스택 요소 데이터 로드
   * @returns {Promise<Array>}
   */
  async load() {
    if (this.loaded) {
      return this.stacks;
    }

    try {
      const response = await fetch('./data/stacks.json');
      if (!response.ok) {
        throw new Error('스택 요소 데이터를 불러올 수 없습니다.');
      }
      const data = await response.json();
      this.stacks = data.stacks || [];
      this.loaded = true;
      return this.stacks;
    } catch (e) {
      console.error('스택 요소 데이터 로드 실패:', e);
      return [];
    }
  }

  /**
   * 분류 목록 가져오기
   * @returns {Array<string>}
   */
  getCategories() {
    return CATEGORIES;
  }

  /**
   * ID로 스택 요소 찾기
   * @param {string} id
   * @returns {Object|null}
   */
  getById(id) {
    return this.stacks.find(s => s.id === id) || null;
  }

  /**
   * 분류 + 검색어로 필터링 (이름/소유 챔피언 이름 검색)
   * @param {string} category
   * @param {string} query
   * @returns {Array}
   */
  getFiltered(category, query = '') {
    const normalized = query.trim().toLowerCase();
    return this.stacks.filter(s =>
      (category === '전체' || s.category === category) &&
      (!normalized ||
        s.name.toLowerCase().includes(normalized) ||
        s.owner.toLowerCase().includes(normalized))
    );
  }
}

// 싱글톤 인스턴스
export const stackService = new StackService();
