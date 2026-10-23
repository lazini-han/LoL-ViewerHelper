/**
 * 챔피언 데이터 서비스
 */

import { getDDragonVersion, ddragonBase } from '../utils/ddragon.js';

const CDRAGON_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default';
const CDRAGON_VIDEO_BASE = 'https://d28xe8vt774jo5.cloudfront.net'; // CDN for videos

// 챔피언 특징 태그 (초보자용 설명 포함)
const CHAMPION_TAGS = {
  'Crowd Control': { label: '군중 제어', desc: '적을 기절/속박시켜 못 움직이게 합니다' },
  'Mobile': { label: '기동성', desc: '빠르게 이동하거나 순간이동할 수 있습니다' },
  'Burst': { label: '폭발 딜', desc: '짧은 순간에 큰 피해를 몰아넣습니다' },
  'Duelist': { label: '1대1 강함', desc: '일대일 싸움에서 강합니다' },
  'AoE': { label: '광역 공격', desc: '여러 명을 한 번에 공격합니다' },
  'Auto-attack': { label: '평타 중심', desc: '스킬보다 기본 공격으로 피해를 냅니다' },
  'Ally Protection': { label: '아군 보호', desc: '아군에게 보호막이나 회복을 줍니다' },
  'Dive': { label: '파고들기', desc: '적진 안쪽까지 파고들어 싸웁니다' },
  'Initiator': { label: '이니시에이팅', desc: '한타를 먼저 여는 역할입니다' },
  'Durable': { label: '단단함', desc: '체력과 방어력이 높아 잘 죽지 않습니다' },
  'Hypercarry': { label: '후반 캐리', desc: '아이템이 갖춰지는 후반에 강해집니다' },
  'Long Range': { label: '긴 사거리', desc: '멀리서 안전하게 공격합니다' },
  'Self Healing': { label: '자체 회복', desc: '스스로 체력을 회복합니다' },
  'Sustained Damage': { label: '지속 딜', desc: '오래 싸우면서 꾸준히 피해를 냅니다' },
  'Stealth': { label: '은신', desc: '모습을 감췄다가 기습합니다' },
  'Battlecaster': { label: '근접 마법사', desc: '가까이 붙어서 스킬로 싸우는 마법사입니다' },
  'Summon': { label: '소환수', desc: '따라다니는 소환수를 부립니다' },
  'Damage-over-Time': { label: '지속 피해', desc: '시간에 걸쳐 서서히 피해를 줍니다' },
  'Shapeshift': { label: '변신', desc: '형태를 바꿔 다르게 싸웁니다' }
};

const DIFFICULTY_LABELS = { 1: '쉬움', 2: '보통', 3: '어려움' };
const DAMAGE_TYPE_LABELS = {
  kPhysical: '물리 피해',
  kMagic: '마법 피해',
  kMixed: '혼합 피해',
  kTrue: '고정 피해'
};
const ATTACK_TYPE_LABELS = { melee: '근접', ranged: '원거리' };

// 능력치 표시 순서와 한글명
const PLAYSTYLE_STATS = [
  { key: 'damage', label: '공격력' },
  { key: 'durability', label: '단단함' },
  { key: 'crowdControl', label: '군중 제어' },
  { key: 'mobility', label: '기동성' },
  { key: 'utility', label: '지원' }
];

class ChampionService {
  constructor() {
    this.champions = [];
    this.loaded = false;
    this.detailCache = new Map(); // 챔피언 상세 정보 캐시
    this.cdragonCache = new Map(); // Community Dragon 캐시
    this.ultimatesPromise = null; // 궁극기 요약 로드 (1회)
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
   * 궁극기 요약 가져오기 (data/ultimates.json, 최초 1회만 로드)
   * @param {number} championId
   * @returns {Promise<Object|null>}
   */
  async getUltimateSummary(championId) {
    if (!this.ultimatesPromise) {
      this.ultimatesPromise = fetch('./data/ultimates.json')
        .then(response => {
          if (!response.ok) throw new Error('궁극기 요약을 불러올 수 없습니다.');
          return response.json();
        })
        .catch(e => {
          console.error('궁극기 요약 로드 실패:', e);
          this.ultimatesPromise = null; // 다음 호출에서 재시도
          return null;
        });
    }

    const data = await this.ultimatesPromise;
    const ult = data?.ultimates?.[championId];
    if (!ult) return null;

    return {
      ...ult,
      image: `${ddragonBase(data.version)}/img/spell/${ult.image}`
    };
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
      const version = await getDDragonVersion();
      const response = await fetch(`${ddragonBase(version)}/data/ko_KR/champion/${championNameEn}.json`);
      if (!response.ok) {
        throw new Error('챔피언 상세 정보를 불러올 수 없습니다.');
      }
      const data = await response.json();
      const champData = data.data[championNameEn];
      
      if (champData) {
        const detail = this.parseChampionDetail(champData, version);
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
   * @param {string} version - Data Dragon 버전
   * @returns {Object}
   */
  parseChampionDetail(champData, version) {
    const base = ddragonBase(version);
    const spells = champData.spells.map((spell, index) => {
      const keys = ['Q', 'W', 'E', 'R'];
      return {
        key: keys[index],
        name: spell.name,
        description: this.stripHtml(spell.description),
        cooldown: spell.cooldownBurn,
        cost: spell.costBurn,
        image: `${base}/img/spell/${spell.image.full}`
      };
    });

    const passive = {
      name: champData.passive.name,
      description: this.stripHtml(champData.passive.description),
      image: `${base}/img/passive/${champData.passive.image.full}`
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

  /**
   * Community Dragon에서 챔피언 스킬 비디오 정보 가져오기
   * @param {number} championId - 챔피언 ID
   * @returns {Promise<Object|null>}
   */
  async getChampionSkillVideos(championId) {
    const data = await this.getCDragonChampion(championId);
    return data ? this.parseSkillVideos(data) : null;
  }

  /**
   * Community Dragon 챔피언 원본 데이터 가져오기 (스킬 비디오/요약 공용, 1회만 요청)
   * @param {number} championId
   * @returns {Promise<Object|null>}
   */
  async getCDragonChampion(championId) {
    if (!championId) return null;

    // 캐시 확인
    if (this.cdragonCache.has(championId)) {
      return this.cdragonCache.get(championId);
    }

    try {
      const response = await fetch(`${CDRAGON_BASE}/v1/champions/${championId}.json`);
      if (!response.ok) {
        throw new Error('Community Dragon 데이터를 불러올 수 없습니다.');
      }
      const data = await response.json();
      this.cdragonCache.set(championId, data);
      return data;
    } catch (e) {
      console.error('Community Dragon 데이터 로드 실패:', e);
      return null;
    }
  }

  /**
   * 초보자용 챔피언 요약 가져오기
   * 스킬 비디오와 같은 응답을 재사용하므로 추가 요청이 발생하지 않는다.
   * @param {number} championId
   * @returns {Promise<Object|null>}
   */
  async getChampionSummary(championId) {
    const data = await this.getCDragonChampion(championId);
    return data ? this.parseChampionSummary(data) : null;
  }

  /**
   * 초보자용 요약 파싱
   * @param {Object} data - Community Dragon 챔피언 데이터
   * @returns {Object}
   */
  parseChampionSummary(data) {
    const tactical = data.tacticalInfo || {};
    const tagInfo = data.championTagInfo || {};
    const playstyle = data.playstyleInfo || {};

    const tags = [tagInfo.championTagPrimary, tagInfo.championTagSecondary]
      .filter(Boolean)
      .map(tag => CHAMPION_TAGS[tag] || { label: tag, desc: '' });

    const stats = PLAYSTYLE_STATS
      .filter(stat => typeof playstyle[stat.key] === 'number')
      .map(stat => ({ label: stat.label, value: playstyle[stat.key], max: 3 }));

    return {
      difficulty: DIFFICULTY_LABELS[tactical.difficulty] || null,
      damageType: DAMAGE_TYPE_LABELS[tactical.damageType] || null,
      attackType: ATTACK_TYPE_LABELS[tactical.attackType] || null,
      tags,
      stats
    };
  }

  /**
   * 스킬 비디오 정보 파싱
   * @param {Object} data - Community Dragon 챔피언 데이터
   * @returns {Object}
   */
  parseSkillVideos(data) {
    const passive = data.passive ? {
      videoPath: data.passive.abilityVideoPath 
        ? `${CDRAGON_VIDEO_BASE}/${data.passive.abilityVideoPath}`
        : null,
      videoImagePath: data.passive.abilityVideoImagePath
        ? `${CDRAGON_VIDEO_BASE}/${data.passive.abilityVideoImagePath}`
        : null
    } : null;

    const spells = (data.spells || []).map((spell, index) => {
      const keys = ['Q', 'W', 'E', 'R'];
      return {
        key: keys[index],
        videoPath: spell.abilityVideoPath 
          ? `${CDRAGON_VIDEO_BASE}/${spell.abilityVideoPath}`
          : null,
        videoImagePath: spell.abilityVideoImagePath
          ? `${CDRAGON_VIDEO_BASE}/${spell.abilityVideoImagePath}`
          : null
      };
    });

    return { passive, spells };
  }
}

// 싱글톤 인스턴스
export const championService = new ChampionService();
