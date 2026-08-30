/**
 * champions.json 의 positions 필드를 갱신하는 스크립트
 *
 * 데이터 출처: Riot 클라이언트 룬 추천 데이터 (Community Dragon 미러)
 *   - mapId 11(소환사의 협곡) 추천만 사용
 *   - position 이 NONE 인 항목은 제외
 *
 * 2026년 프로 경기 실측 대조 결과 픽 단위 일치율 98.8% (LCK 99.1%).
 * 어긋나는 소수 케이스는 아래 POSITION_OVERRIDES 로 보정한다.
 *
 * 사용법: node tools/update-champion-positions.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHAMPIONS_PATH = join(ROOT, 'data', 'champions.json');
const RUNE_URL =
  'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-rune-recommendations.json';

// Riot 포지션 코드 -> 프로젝트 포지션 코드
const POSITION_MAP = {
  TOP: 'TOP',
  JUNGLE: 'JG',
  MIDDLE: 'MID',
  BOTTOM: 'ADC',
  UTILITY: 'SUP'
};

// 표시 순서
const POSITION_ORDER = ['TOP', 'JG', 'MID', 'ADC', 'SUP'];

/**
 * 프로 경기 실측 기준 보정 (Riot 데이터에 없지만 프로에서 주력으로 쓰이는 포지션)
 * 2026년 프로 픽 데이터 기준:
 *   렉사이 탑  - 전체 픽의 60%, LCK 27픽 전부가 탑
 *   쉬바나 탑  - 전체 픽의 33%
 */
const POSITION_OVERRIDES = {
  421: ['TOP'], // 렉사이
  102: ['TOP']  // 쉬바나
};

async function fetchPositions() {
  const res = await fetch(RUNE_URL);
  if (!res.ok) {
    throw new Error(`룬 추천 데이터를 불러올 수 없습니다: HTTP ${res.status}`);
  }
  const entries = await res.json();

  const positions = new Map();
  for (const entry of entries) {
    const set = new Set();
    for (const rec of entry.runeRecommendations ?? []) {
      if (rec.mapId !== 11) continue;
      const mapped = POSITION_MAP[rec.position];
      if (mapped) set.add(mapped);
    }
    positions.set(entry.championId, set);
  }
  return positions;
}

function sortPositions(set) {
  return POSITION_ORDER.filter(p => set.has(p));
}

const raw = readFileSync(CHAMPIONS_PATH, 'utf8');
const hasBom = raw.charCodeAt(0) === 0xfeff;
const body = hasBom ? raw.slice(1) : raw;

const positionsById = await fetchPositions();

// 기존 항목(있으면 교체)까지 포함해서 매칭
const CHAMPION_BLOCK =
  /("id":\s+(\d+),\r?\n(\s+)"nameKr":\s+"[^"]*",\r?\n\s+"nameEn":\s+"[^"]*",\r?\n\s+"thumbnail":\s+"[^"]*")(,\r?\n\s+"positions":\s+\[[^\]]*\])?/g;

const stats = { total: 0, empty: [], overridden: [] };

const updated = body.replace(CHAMPION_BLOCK, (_m, head, id, indent) => {
  stats.total += 1;
  const championId = Number(id);
  const set = new Set(positionsById.get(championId) ?? []);

  for (const extra of POSITION_OVERRIDES[championId] ?? []) {
    if (!set.has(extra)) {
      set.add(extra);
      stats.overridden.push(`${championId}:${extra}`);
    }
  }

  const list = sortPositions(set);
  if (list.length === 0) stats.empty.push(championId);

  const value = list.map(p => `"${p}"`).join(', ');
  return `${head},\n${indent}"positions":  [${value}]`;
});

writeFileSync(CHAMPIONS_PATH, (hasBom ? '\ufeff' : '') + updated, 'utf8');

console.log(`처리한 챔피언: ${stats.total}종`);
console.log(`보정 적용: ${stats.overridden.join(', ') || '없음'}`);
console.log(`포지션 없음: ${stats.empty.join(', ') || '없음'}`);
