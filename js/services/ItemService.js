/**
 * 아이템 데이터 서비스
 * Data Dragon API를 사용하여 전체 아이템 데이터를 가져옴
 */

const DDRAGON_VERSION = '14.24.1';
const DDRAGON_BASE_URL = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}`;

class ItemService {
  constructor() {
    this.items = [];
    this.loaded = false;
  }

  /**
   * 아이템 등급 분류
   * @param {Object} item - Data Dragon 아이템 데이터
   * @returns {string}
   */
  _classifyTier(item) {
    // depth 기반 분류 (Data Dragon 기준)
    const depth = item.depth || 1;

    // 완성 아이템: depth=3 또는 into가 없고 from이 있는 경우
    if (depth >= 3 || (!item.into && item.from && item.from.length > 0)) {
      return '완성';
    }

    // 중급 아이템: depth=2 또는 from과 into 둘 다 있는 경우
    if (depth === 2 || (item.from && item.into)) {
      return '중급';
    }

    // 기본 아이템: depth=1 또는 from이 없는 경우
    return '기본';
  }

  /**
   * 태그를 기반으로 카테고리 분류
   * @param {Array} tags
   * @returns {string}
   */
  _classifyCategory(tags) {
    if (!tags || tags.length === 0) return '기타';

    // 서포터 아이템
    if (tags.includes('Support') || tags.includes('Aura')) {
      return '서포터';
    }
    // 방어 아이템 (체력, 방어력, 마법저항력)
    if (tags.includes('Armor') || tags.includes('SpellBlock') ||
        (tags.includes('Health') && !tags.includes('Damage') && !tags.includes('SpellDamage'))) {
      return '방어';
    }
    // 마법 아이템
    if (tags.includes('SpellDamage') || tags.includes('Mana') || tags.includes('ManaRegen')) {
      return '마법';
    }
    // 공격 아이템
    if (tags.includes('Damage') || tags.includes('CriticalStrike') ||
        tags.includes('AttackSpeed') || tags.includes('LifeSteal')) {
      return '공격';
    }
    // 신발
    if (tags.includes('Boots')) {
      return '신발';
    }
    // 소모품
    if (tags.includes('Consumable')) {
      return '소모품';
    }
    // 정글
    if (tags.includes('Jungle')) {
      return '정글';
    }

    return '기타';
  }

  /**
   * HTML 태그 제거 및 텍스트 정리
   * @param {string} html
   * @returns {string}
   */
  _cleanDescription(html) {
    if (!html) return '';
    // HTML 태그 제거
    let text = html.replace(/<[^>]*>/g, '');
    // 연속 공백 정리
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  }

  /**
   * 아이템 데이터 로드 (Data Dragon API)
   * @returns {Promise<Array>}
   */
  async load() {
    if (this.loaded) {
      return this.items;
    }

    try {
      const response = await fetch(`${DDRAGON_BASE_URL}/data/ko_KR/item.json`);
      if (!response.ok) {
        throw new Error('아이템 데이터를 불러올 수 없습니다.');
      }
      const data = await response.json();

      // Data Dragon 형식을 내부 형식으로 변환
      const allItems = Object.entries(data.data)
        .filter(([id, item]) => {
          const itemId = parseInt(id);
          // 구매 가능한 아이템만 필터링 (숨김 아이템 제외)
          if (!item.gold || !item.gold.purchasable || item.hideFromAll) {
            return false;
          }
          // 특수 모드 아이템 제외 (ID 200000 이상: TFT, 오른 업그레이드 등)
          if (itemId >= 200000) {
            return false;
          }
          // 소환사의 협곡(맵 ID 11)에서 사용 불가능한 아이템 제외
          if (item.maps && item.maps['11'] === false) {
            return false;
          }
          return true;
        })
        .map(([id, item]) => ({
          id: parseInt(id),
          nameKr: item.name,
          category: this._classifyCategory(item.tags),
          tier: this._classifyTier(item),
          effect: this._cleanDescription(item.plaintext || ''),
          description: this._cleanDescription(item.description),
          tags: item.tags || [],
          gold: item.gold ? item.gold.total : 0,
          stats: item.stats || {}
        }));

      // 같은 이름의 중복 아이템 제거 (낮은 ID 우선)
      const seenNames = new Map();
      this.items = allItems
        .sort((a, b) => a.id - b.id) // ID 오름차순 정렬
        .filter(item => {
          if (seenNames.has(item.nameKr)) {
            return false; // 이미 같은 이름의 아이템이 있으면 제외
          }
          seenNames.set(item.nameKr, true);
          return true;
        })
        .sort((a, b) => a.gold - b.gold); // 가격순 정렬

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
    // 원하는 순서대로 카테고리 정렬
    const categoryOrder = ['전체', '공격', '마법', '방어', '서포터', '신발', '정글', '소모품', '기타'];
    const existingCategories = new Set(this.items.map(item => item.category));
    return categoryOrder.filter(cat => cat === '전체' || existingCategories.has(cat));
  }

  /**
   * 등급별 아이템 가져오기
   * @param {string} tier
   * @returns {Array}
   */
  getByTier(tier) {
    if (!tier || tier === '전체') {
      return this.items;
    }
    return this.items.filter(item => item.tier === tier);
  }

  /**
   * 모든 등급 목록 가져오기
   * @returns {Array}
   */
  getTiers() {
    return ['전체', '완성', '중급', '기본'];
  }

  /**
   * 카테고리와 등급으로 필터링
   * @param {string} category
   * @param {string} tier
   * @returns {Array}
   */
  getFiltered(category, tier) {
    let items = this.items;

    if (category && category !== '전체') {
      items = items.filter(item => item.category === category);
    }

    if (tier && tier !== '전체') {
      items = items.filter(item => item.tier === tier);
    }

    return items;
  }

  /**
   * 아이템 아이콘 URL 가져오기 (Data Dragon - Riot 공식 CDN)
   * @param {number} itemId
   * @returns {string}
   */
  getIconUrl(itemId) {
    return `${DDRAGON_BASE_URL}/img/item/${itemId}.png`;
  }
}

// 싱글톤 인스턴스
export const itemService = new ItemService();
