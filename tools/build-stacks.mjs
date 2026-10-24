/**
 * 스택 요소 문서(data/stacks.json, data/stacks.md)를 생성하는 스크립트
 *
 * 입력: 조사 결과 JSON 파일들이 있는 디렉터리 (각 파일은 배열)
 *   챔피언: { category: '챔피언', championId, slot: 'P'|'Q'|'W'|'E'|'R', ... }
 *   아이템: { category: '아이템', itemId, ... }
 *   룬:     { category: '룬', runeId, ... }
 *   오브젝트: { category: '오브젝트', objectId, ... }
 *   공통: name, owner, gain, effect, milestone, watch, sources
 *
 * 아이콘 URL 과 공식 한글 이름은 Data Dragon 최신 데이터로 채운다.
 * (오브젝트 아이콘은 data/objects.json 을 사용)
 *
 * 사용법: node tools/build-stacks.mjs <조사 결과 디렉터리>
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OBJECTS_PATH = join(ROOT, 'data', 'objects.json');
const JSON_PATH = join(ROOT, 'data', 'stacks.json');
const MD_PATH = join(ROOT, 'data', 'stacks.md');
const DDRAGON = 'https://ddragon.leagueoflegends.com';

const CATEGORY_ORDER = ['챔피언', '아이템', '룬', '오브젝트'];
const SLOT_INDEX = { Q: 0, W: 1, E: 2, R: 3 };

const researchDir = process.argv[2];
if (!researchDir) {
  console.error('사용법: node tools/build-stacks.mjs <조사 결과 디렉터리>');
  process.exit(1);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`데이터를 불러올 수 없습니다: ${url} (HTTP ${res.status})`);
  return res.json();
}

const versions = await fetchJson(`${DDRAGON}/api/versions.json`);
const version = versions[0];
const base = `${DDRAGON}/cdn/${version}`;
const [championFull, items, runeTrees] = await Promise.all([
  fetchJson(`${base}/data/ko_KR/championFull.json`),
  fetchJson(`${base}/data/ko_KR/item.json`),
  fetchJson(`${base}/data/ko_KR/runesReforged.json`)
]);

const championsByKey = new Map(Object.values(championFull.data).map(c => [Number(c.key), c]));
const runesById = new Map(runeTrees.flatMap(tree => tree.slots.flatMap(slot => slot.runes)).map(r => [r.id, r]));
const objects = JSON.parse(readFileSync(OBJECTS_PATH, 'utf8').replace(/^﻿/, '')).objects;

const entries = readdirSync(researchDir)
  .filter(f => f.endsWith('.json'))
  .sort()
  .flatMap(file => JSON.parse(readFileSync(join(researchDir, file), 'utf8')));

const problems = [];
const stacks = [];

for (const entry of entries) {
  const common = {
    category: entry.category,
    owner: entry.owner || '',
    gain: entry.gain,
    effect: entry.effect,
    milestone: entry.milestone || '',
    watch: entry.watch || '',
    sources: entry.sources || []
  };

  if (entry.category === '챔피언') {
    const champ = championsByKey.get(Number(entry.championId));
    if (!champ) { problems.push(`챔피언 없음: ${entry.championId}`); continue; }
    const spell = entry.slot === 'P' ? champ.passive : champ.spells[SLOT_INDEX[entry.slot]];
    if (!spell) { problems.push(`스킬 없음: ${champ.name} ${entry.slot}`); continue; }
    const folder = entry.slot === 'P' ? 'passive' : 'spell';
    stacks.push({
      id: `champion-${champ.id}-${entry.slot}`,
      ...common,
      name: spell.name,
      owner: champ.name,
      slot: entry.slot,
      icon: `${base}/img/${folder}/${spell.image.full}`
    });
  } else if (entry.category === '아이템') {
    const item = items.data[entry.itemId];
    if (!item) { problems.push(`아이템 없음: ${entry.itemId}`); continue; }
    stacks.push({ id: `item-${entry.itemId}`, ...common, name: item.name, icon: `${base}/img/item/${entry.itemId}.png` });
  } else if (entry.category === '룬') {
    const rune = runesById.get(Number(entry.runeId));
    if (!rune) { problems.push(`룬 없음: ${entry.runeId}`); continue; }
    stacks.push({ id: `rune-${entry.runeId}`, ...common, name: rune.name, icon: `${DDRAGON}/cdn/img/${rune.icon}` });
  } else if (entry.category === '오브젝트') {
    const obj = objects.find(o => o.id === entry.objectId);
    if (!obj) { problems.push(`오브젝트 없음: ${entry.objectId}`); continue; }
    stacks.push({ id: `object-${entry.objectId}-${stacks.length}`, ...common, name: entry.name || obj.nameKr, icon: obj.icon });
  } else {
    problems.push(`알 수 없는 분류: ${entry.category} (${entry.name})`);
  }
}

// 분류 → 소유자/이름 순 정렬
stacks.sort((a, b) =>
  CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
  (a.owner || a.name).localeCompare(b.owner || b.name, 'ko')
);

const today = new Date().toLocaleDateString('sv-SE'); // 로컬 기준 YYYY-MM-DD
writeFileSync(JSON_PATH, JSON.stringify({ version, updated: today, stacks }, null, 2) + '\n', 'utf8');

// 사람이 검토하기 위한 읽기용 문서
const lines = [
  '# 스택 요소',
  '',
  `> 기준: Data Dragon ${version} / 작성일: ${today}`,
  '> 한 게임 동안 계속 쌓이며 성장하는 스택만 모았습니다 (교전 중에만 쌓였다 사라지는 스택 제외).',
  '> 원본 데이터는 `data/stacks.json` 이며, 이 문서는 `tools/build-stacks.mjs` 로 함께 생성됩니다.',
  ''
];

for (const category of CATEGORY_ORDER) {
  const list = stacks.filter(s => s.category === category);
  if (list.length === 0) continue;
  lines.push(`## ${category}`, '');
  for (const s of list) {
    lines.push(
      `### ${s.owner ? `${s.owner} - ` : ''}${s.name}`,
      '',
      `- **쌓는 방법**: ${s.gain}`,
      `- **스택 효과**: ${s.effect}`,
      s.milestone ? `- **달성 효과**: ${s.milestone}` : null,
      s.watch ? `- **관전 포인트**: ${s.watch}` : null,
      `- 출처: ${s.sources.join(', ') || '-'}`,
      ''
    );
  }
}

writeFileSync(MD_PATH, lines.filter(line => line !== null).join('\n'), 'utf8');

console.log(`Data Dragon 버전: ${version}`);
for (const category of CATEGORY_ORDER) {
  console.log(`${category}: ${stacks.filter(s => s.category === category).length}개`);
}
console.log(`문제: ${problems.join(', ') || '없음'}`);
