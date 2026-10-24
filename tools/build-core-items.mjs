/**
 * 챔피언별 코어 아이템 문서(data/core-items.json, data/core-items.md)를 생성하는 스크립트
 *
 * 입력: 조사 결과 JSON 파일들이 있는 디렉터리 (각 파일은 배열)
 *   [{ id, builds: [{ position, items: [아이템 ID x3], boots, note }], sources }]
 *
 * 아이템 ID 는 Data Dragon 최신 버전에 존재하는지 검증하고,
 * 화면 표시용 한글 아이템 이름을 함께 기록한다.
 *
 * 사용법: node tools/build-core-items.mjs <조사 결과 디렉터리>
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHAMPIONS_PATH = join(ROOT, 'data', 'champions.json');
const JSON_PATH = join(ROOT, 'data', 'core-items.json');
const MD_PATH = join(ROOT, 'data', 'core-items.md');
const DDRAGON = 'https://ddragon.leagueoflegends.com';

const POSITION_NAMES = { TOP: '탑', JG: '정글', MID: '미드', ADC: '원딜', SUP: '서포터' };

const researchDir = process.argv[2];
if (!researchDir) {
  console.error('사용법: node tools/build-core-items.mjs <조사 결과 디렉터리>');
  process.exit(1);
}

async function fetchItemNames() {
  const versions = await (await fetch(`${DDRAGON}/api/versions.json`)).json();
  const version = versions[0];
  const res = await fetch(`${DDRAGON}/cdn/${version}/data/ko_KR/item.json`);
  if (!res.ok) {
    throw new Error(`Data Dragon 아이템 데이터를 불러올 수 없습니다: HTTP ${res.status}`);
  }
  const { data } = await res.json();
  return { version, names: new Map(Object.entries(data).map(([id, item]) => [Number(id), item.name])) };
}

function readResearch(dir) {
  const byId = new Map();
  for (const file of readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
    for (const entry of JSON.parse(readFileSync(join(dir, file), 'utf8'))) {
      byId.set(Number(entry.id), entry);
    }
  }
  return byId;
}

const champions = JSON.parse(readFileSync(CHAMPIONS_PATH, 'utf8').replace(/^﻿/, '')).champions;
const research = readResearch(researchDir);
const { version, names } = await fetchItemNames();
const today = new Date().toLocaleDateString('sv-SE'); // 로컬 기준 YYYY-MM-DD

const missing = [];
const invalid = [];
const usedItems = {};
const result = {};

for (const champ of champions) {
  const entry = research.get(champ.id);
  if (!entry || !entry.builds?.length) {
    missing.push(champ.nameKr);
    continue;
  }

  const checkItem = id => {
    if (!names.has(id)) {
      invalid.push(`${champ.nameKr}:${id}`);
      return false;
    }
    usedItems[id] = names.get(id);
    return true;
  };

  const builds = entry.builds
    .filter(build => POSITION_NAMES[build.position])
    .map(build => ({
      position: build.position,
      items: build.items.filter(checkItem),
      boots: build.boots && checkItem(build.boots) ? build.boots : null,
      note: build.note || ''
    }))
    .filter(build => build.items.length > 0);

  result[champ.id] = { builds, sources: entry.sources || [] };
}

writeFileSync(
  JSON_PATH,
  JSON.stringify({ version, updated: today, items: usedItems, champions: result }, null, 2) + '\n',
  'utf8'
);

// 사람이 검토하기 위한 읽기용 문서
const lines = [
  '# 챔피언 코어 아이템',
  '',
  `> 기준: Data Dragon ${version} / 작성일: ${today}`,
  '> 경기 화면에서 챔피언을 클릭하면 스킬 아래에 표시되는 내용입니다.',
  '> 원본 데이터는 `data/core-items.json` 이며, 이 문서는 `tools/build-core-items.mjs` 로 함께 생성됩니다.',
  ''
];

for (const champ of champions) {
  const entry = result[champ.id];
  if (!entry) continue;
  lines.push(`## ${champ.nameKr}`, '');
  for (const build of entry.builds) {
    const items = build.items.map(id => usedItems[id]).join(' → ');
    const boots = build.boots ? ` + ${usedItems[build.boots]}` : '';
    lines.push(`- **${POSITION_NAMES[build.position]}**: ${items}${boots}${build.note ? ` (${build.note})` : ''}`);
  }
  lines.push(`- 출처: ${entry.sources.join(', ') || '-'}`, '');
}

writeFileSync(MD_PATH, lines.join('\n'), 'utf8');

console.log(`Data Dragon 버전: ${version}`);
console.log(`작성한 챔피언: ${Object.keys(result).length}종`);
console.log(`누락: ${missing.join(', ') || '없음'}`);
console.log(`존재하지 않는 아이템 ID (제외됨): ${invalid.join(', ') || '없음'}`);
