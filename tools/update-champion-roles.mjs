/**
 * champions.json 의 roles 필드를 갱신하는 스크립트
 *
 * 데이터 출처: Data Dragon champion.json 의 tags (Fighter, Tank, Mage, Assassin, Marksman, Support)
 *   - 최신 버전을 versions.json 에서 조회
 *   - 순서는 Data Dragon 원본 그대로 (첫 번째가 주 역할)
 *
 * positions 필드 다음 줄에 roles 를 기록하므로
 * tools/update-champion-positions.mjs 를 먼저 실행해 두어야 한다.
 *
 * 사용법: node tools/update-champion-roles.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHAMPIONS_PATH = join(ROOT, 'data', 'champions.json');
const DDRAGON = 'https://ddragon.leagueoflegends.com';

async function fetchRoles() {
  const versions = await (await fetch(`${DDRAGON}/api/versions.json`)).json();
  const version = versions[0];
  const res = await fetch(`${DDRAGON}/cdn/${version}/data/en_US/champion.json`);
  if (!res.ok) {
    throw new Error(`Data Dragon 챔피언 목록을 불러올 수 없습니다: HTTP ${res.status}`);
  }
  const { data } = await res.json();

  const roles = new Map();
  for (const champ of Object.values(data)) {
    roles.set(Number(champ.key), champ.tags ?? []);
  }
  return { version, roles };
}

const raw = readFileSync(CHAMPIONS_PATH, 'utf8');
const hasBom = raw.charCodeAt(0) === 0xfeff;
const body = hasBom ? raw.slice(1) : raw;

const { version, roles: rolesById } = await fetchRoles();

// positions 줄 + 기존 roles 줄(있으면 교체)
const CHAMPION_BLOCK =
  /("id":\s+(\d+),\r?\n(?:\s+"(?:nameKr|nameEn|thumbnail)":\s+"[^"]*",\r?\n)+(\s+)"positions":\s+\[[^\]]*\])(,\r?\n\s+"roles":\s+\[[^\]]*\])?/g;

const stats = { total: 0, empty: [] };

const updated = body.replace(CHAMPION_BLOCK, (_m, head, id, indent) => {
  stats.total += 1;
  const list = rolesById.get(Number(id)) ?? [];
  if (list.length === 0) stats.empty.push(id);

  const value = list.map(r => `"${r}"`).join(', ');
  return `${head},\n${indent}"roles":  [${value}]`;
});

writeFileSync(CHAMPIONS_PATH, (hasBom ? '﻿' : '') + updated, 'utf8');

console.log(`Data Dragon 버전: ${version}`);
console.log(`처리한 챔피언: ${stats.total}종`);
console.log(`역할 없음: ${stats.empty.join(', ') || '없음'}`);
