/**
 * 아이템 데이터 서비스
 * Data Dragon API를 사용하여 전체 아이템 데이터를 가져옴
 */

const DDRAGON_VERSION = '14.24.1';
const DDRAGON_BASE_URL = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}`;

// 시작 아이템 ID 목록
const STARTER_ITEM_IDS = [
  1054, 1055, 1056, // 도란의 검, 방패, 반지
  1082, // 암흑의 인장
  1083, // 부패 물약
  2033, // 부패 물약
  3850, 3851, 3854, 3855, 3858, 3859, 3860, 3862, 3863, 3864, // 서포터 시작 아이템
  1101, 1102, 1103 // 정글 시작 아이템
];

class ItemService {
  constructor() {
    this.items = [];
    this.loaded = false;
  }

  /**
   * 아이템 종류 분류
   * @param {Array} tags
   * @param {number} id
   * @returns {string} 메인 / 신발 / 소모품 / 기타
   */
  _classifyType(tags, id) {
    if (!tags || tags.length === 0) return '기타';

    // 신발
    if (tags.includes('Boots')) {
      return '신발';
    }

    // 소모품
    if (tags.includes('Consumable')) {
      return '소모품';
    }

    // 정글 펫/아이템은 기타로 분류
    if (tags.includes('Jungle') && !tags.includes('Damage')) {
      return '기타';
    }

    // 와드/시야 아이템은 기타
    if (tags.includes('Vision')) {
      return '기타';
    }

    // 나머지는 메인 아이템
    return '메인';
  }

  /**
   * 아이템 등급 분류
   * @param {Object} item - Data Dragon 아이템 데이터
   * @param {number} id - 아이템 ID
   * @returns {string} 전설급 / 서사급 / 기본 / 시작 / 기타
   */
  _classifyTier(item, id) {
    const depth = item.depth || 1;
    const gold = item.gold ? item.gold.total : 0;
    const tags = item.tags || [];

    // 시작 아이템
    if (STARTER_ITEM_IDS.includes(id)) {
      return '시작';
    }

    // 소모품은 기타 등급
    if (tags.includes('Consumable')) {
      return '기타';
    }

    // 전설급: 완성 아이템 (depth=3 이상 또는 into가 없고 from이 있는 경우)
    if (depth >= 3 || (!item.into && item.from && item.from.length > 0)) {
      return '전설급';
    }

    // 서사급: 중급 아이템 (depth=2 또는 from과 into 둘 다 있는 경우)
    if (depth === 2 || (item.from && item.into)) {
      return '서사급';
    }

    // 기본: 기본 재료 아이템 (from이 없고 가격 300 이상)
    if (!item.from && gold >= 300) {
      return '기본';
    }

    // 나머지는 기타
    return '기타';
  }

  /**
   * 아이템 역할 분류
   * @param {Array} tags
   * @returns {string} 전사 / 원딜 / 암살자 / 마법사 / 탱커 / 서포터 / 기타
   */
  _classifyRole(tags) {
    if (!tags || tags.length === 0) return '기타';

    const hasDamage = tags.includes('Damage');
    const hasSpellDamage = tags.includes('SpellDamage');
    const hasCrit = tags.includes('CriticalStrike');
    const hasAttackSpeed = tags.includes('AttackSpeed');
    const hasLifeSteal = tags.includes('LifeSteal');
    const hasArmor = tags.includes('Armor');
    const hasHealth = tags.includes('Health');
    const hasSpellBlock = tags.includes('SpellBlock');
    const hasMana = tags.includes('Mana') || tags.includes('ManaRegen');
    const hasSupport = tags.includes('Support') || tags.includes('Aura');

    // 서포터: Support 또는 Aura 태그
    if (hasSupport) {
      return '서포터';
    }

    // 원딜: 치명타 또는 공격속도 중심
    if (hasCrit || (hasAttackSpeed && hasDamage)) {
      return '원딜';
    }

    // 암살자: 공격력 + 치명타 없이 (암살자는 치명타보다 고정 피해 선호)
    if (hasDamage && hasLifeSteal && !hasCrit && !hasHealth) {
      return '암살자';
    }

    // 마법사: 주문력 중심
    if (hasSpellDamage || hasMana) {
      return '마법사';
    }

    // 전사: 공격력 + 체력/방어력 조합
    if (hasDamage && (hasHealth || hasArmor)) {
      return '전사';
    }

    // 탱커: 방어 스탯 중심 (공격 스탯 없이)
    if ((hasArmor || hasSpellBlock || hasHealth) && !hasDamage && !hasSpellDamage) {
      return '탱커';
    }

    // 공격력만 있는 경우 암살자로 분류
    if (hasDamage && !hasHealth && !hasArmor) {
      return '암살자';
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
    let text = html.replace(/<[^>]*>/g, '');
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
          if (!item.gold || !item.gold.purchasable || item.hideFromAll) {
            return false;
          }
          if (itemId >= 200000) {
            return false;
          }
          if (item.maps && item.maps['11'] === false) {
            return false;
          }
          return true;
        })
        .map(([id, item]) => {
          const itemId = parseInt(id);
          return {
            id: itemId,
            nameKr: item.name,
            type: this._classifyType(item.tags, itemId),
            tier: this._classifyTier(item, itemId),
            role: this._classifyRole(item.tags),
            effect: this._cleanDescription(item.plaintext || ''),
            description: this._cleanDescription(item.description),
            tags: item.tags || [],
            gold: item.gold ? item.gold.total : 0,
            stats: item.stats || {}
          };
        });

      // 같은 이름의 중복 아이템 제거 (낮은 ID 우선)
      const seenNames = new Map();
      this.items = allItems
        .sort((a, b) => a.id - b.id)
        .filter(item => {
          if (seenNames.has(item.nameKr)) {
            return false;
          }
          seenNames.set(item.nameKr, true);
          return true;
        })
        .sort((a, b) => a.gold - b.gold);

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
   * 아이템 종류 목록 가져오기
   * @returns {Array}
   */
  getTypes() {
    return ['전체', '메인', '신발', '소모품', '기타'];
  }

  /**
   * 아이템 등급 목록 가져오기
   * @returns {Array}
   */
  getTiers() {
    return ['전체', '전설급', '서사급', '기본', '시작', '기타'];
  }

  /**
   * 아이템 역할 목록 가져오기
   * @returns {Array}
   */
  getRoles() {
    return ['전체', '전사', '원딜', '암살자', '마법사', '탱커', '서포터', '기타'];
  }

  /**
   * 복합 필터링
   * @param {Object} filters - { type, tier, role }
   * @returns {Array}
   */
  getFiltered(filters = {}) {
    let items = this.items;

    const { type, tier, role } = filters;

    if (type && type !== '전체') {
      items = items.filter(item => item.type === type);
    }

    if (tier && tier !== '전체') {
      items = items.filter(item => item.tier === tier);
    }

    if (role && role !== '전체') {
      items = items.filter(item => item.role === role);
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
