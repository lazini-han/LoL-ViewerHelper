/**
 * 챔피언 데이터 서비스
 */

const DDRAGON_VERSION = '14.24.1';
const DDRAGON_BASE = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}`;

class ChampionService {
  constructor() {
    this.champions = [];
    this.loaded = false;
    this.detailCache = new Map(); // 챔피언 상세 정보 캐시
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

  /**
   * 챔피언 상세 정보 가져오기 (Data Dragon API)
   * @param {string} championNameEn - 영어 이름
   * @returns {Promise<Object|null>}
   */
  async getChampionDetail(championNameEn) {
    if (!championNameEn) return null;

    // 캐시 확인
    if (this.detailCache.has(championNameEn)) {
      return this.detailCache.get(championNameEn);
    }

    try {
      const response = await fetch(`${DDRAGON_BASE}/data/ko_KR/champion/${championNameEn}.json`);
      if (!response.ok) {
        throw new Error('챔피언 상세 정보를 불러올 수 없습니다.');
      }
      const data = await response.json();
      const champData = data.data[championNameEn];
      
      if (champData) {
        const detail = this.parseChampionDetail(champData);
        this.detailCache.set(championNameEn, detail);
        return detail;
      }
      return null;
    } catch (e) {
      console.error('챔피언 상세 정보 로드 실패:', e);
      return null;
    }
  }

  /**
   * 챔피언 상세 정보 파싱
   * @param {Object} champData - Data Dragon 챔피언 데이터
   * @returns {Object}
   */
  parseChampionDetail(champData) {
    const spells = champData.spells.map((spell, index) => {
      const keys = ['Q', 'W', 'E', 'R'];
      return {
        key: keys[index],
        name: spell.name,
        description: this.stripHtml(spell.description),
        cooldown: spell.cooldownBurn,
        cost: spell.costBurn,
        image: `${DDRAGON_BASE}/img/spell/${spell.image.full}`
      };
    });

    const passive = {
      name: champData.passive.name,
      description: this.stripHtml(champData.passive.description),
      image: `${DDRAGON_BASE}/img/passive/${champData.passive.image.full}`
    };

    return {
      id: champData.key,
      name: champData.name,
      title: champData.title,
      lore: champData.lore,
      tags: champData.tags, // Fighter, Mage, Tank, etc.
      info: champData.info, // attack, defense, magic, difficulty
      passive,
      spells
    };
  }

  /**
   * HTML 태그 제거
   * @param {string} html
   * @returns {string}
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

// 싱글톤 인스턴스
export const championService = new ChampionService();
