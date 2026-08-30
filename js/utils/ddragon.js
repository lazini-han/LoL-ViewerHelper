/**
 * Data Dragon 버전 관리 유틸
 * 버전을 고정하면 신규 챔피언/아이템 데이터를 받을 수 없으므로
 * 최신 버전을 조회해서 사용한다.
 */

const DDRAGON_VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';

// versions.json 조회에 실패했을 때 사용할 기본 버전
export const DDRAGON_FALLBACK_VERSION = '15.24.1';

let cachedVersion = null;
let versionPromise = null;

/**
 * Data Dragon CDN 기본 URL 생성
 * @param {string} version
 * @returns {string}
 */
export function ddragonBase(version) {
  return `https://ddragon.leagueoflegends.com/cdn/${version || DDRAGON_FALLBACK_VERSION}`;
}

/**
 * 마지막으로 조회된 버전 (조회 전이면 기본 버전)
 * @returns {string}
 */
export function getCachedDDragonVersion() {
  return cachedVersion || DDRAGON_FALLBACK_VERSION;
}

/**
 * Data Dragon 최신 버전 가져오기 (앱 전체에서 1회만 조회)
 * @returns {Promise<string>}
 */
export function getDDragonVersion() {
  if (cachedVersion) {
    return Promise.resolve(cachedVersion);
  }
  if (!versionPromise) {
    versionPromise = (async () => {
      try {
        const response = await fetch(DDRAGON_VERSIONS_URL);
        if (!response.ok) {
          throw new Error('Data Dragon 버전 목록을 불러올 수 없습니다.');
        }
        const versions = await response.json();
        cachedVersion = versions[0] || DDRAGON_FALLBACK_VERSION;
      } catch (e) {
        console.error('Data Dragon 버전 로드 실패, 기본 버전 사용:', e);
        cachedVersion = DDRAGON_FALLBACK_VERSION;
      }
      return cachedVersion;
    })();
  }
  return versionPromise;
}
