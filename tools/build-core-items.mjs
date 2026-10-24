/**
 * 챔피언별 코어 아이템 문서(data/core-items.json, data/core-items.md)를 생성하는 스크립트
 *
 * 입력: 조사 결과 JSON 파일들이 있는 디렉터리 (각 파일은 배열)
 *   [{ id, builds: [{ position, items: [아이템 ID x3], boots, note }], sources }]
 *
 * 아이템 ID 는 Data Dragon 최신 버전에 존재하는지 검증하고,
 * 화면 표시용 한글 아이템 이름과 호버창용 설명 요약(가격, 스탯, 고유 효과)을 함께 기록한다.
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

const stripTags = html => html
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<li>/gi, ' · ')
  .replace(/<[^>]*>/g, '')
  .replace(/\s+/g, ' ')
  .trim();

// Data Dragon 은 레벨/스탯 비례 수치를 0(또는 비정상 값)으로 내보내므로 문장에서 빼낸다
const dropPlaceholders = text => text
  .replace(/(?<![\d.])(0|\d{4,})초 동안/g, '일정 시간 동안')
  .replace(/\((?:0|0\+)\)/g, '')
  .replace(/(?<![\d.])0\+/g, '')
  .replace(/(?<![\d.])0(?![\d.%])(의)?\s?/g, '')
  .replace(/\(적중 시 \)/g, '(적중 시)')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * Data Dragon 아이템 설명(HTML)을 호버창용 요약으로 변환
 * @returns {{name, gold, summary, stats: string[], effects: {type, name, text}[]}}
 */
function summarizeItem(item) {
  const html = item.description.replace(/<\/?mainText>/g, '');
  const stats = (html.match(/<stats>([\s\S]*?)<\/stats>/)?.[1] || '')
    .split(/<br\s*\/?>/i)
    .map(stripTags)
    .filter(Boolean);

  // 효과 제목은 "<passive>이름</passive> (쿨타임)<br>" 형태. 문장 속 효과 이름 언급과 구분한다
  const body = html.replace(/<stats>[\s\S]*?<\/stats>/, '');
  const headers = [...body.matchAll(/<(passive|active)>([^<]*)<\/\1>\s*(?:\([^)]*\))?\s*<br\s*\/?>/g)];
  const effects = headers
    .map((header, i) => ({
      type: header[1],
      name: stripTags(header[2]),
      text: dropPlaceholders(stripTags(body.slice(header.index + header[0].length, headers[i + 1]?.index ?? body.length)))
    }))
    .filter(effect => effect.text);

  return { name: item.name, gold: item.gold.total, summary: stripTags(item.plaintext || ''), stats, effects };
}

async function fetchItems() {
  const versions = await (await fetch(`${DDRAGON}/api/versions.json`)).json();
  const version = versions[0];
  const res = await fetch(`${DDRAGON}/cdn/${version}/data/ko_KR/item.json`);
  if (!res.ok) {
    throw new Error(`Data Dragon 아이템 데이터를 불러올 수 없습니다: HTTP ${res.status}`);
  }
  const { data } = await res.json();
  return { version, itemData: new Map(Object.entries(data).map(([id, item]) => [Number(id), item])) };
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
const { version, itemData } = await fetchItems();
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
    if (!itemData.has(id)) {
      invalid.push(`${champ.nameKr}:${id}`);
      return false;
    }
    usedItems[id] = summarizeItem(itemData.get(id));
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
    const items = build.items.map(id => usedItems[id].name).join(' → ');
    const boots = build.boots ? ` + ${usedItems[build.boots].name}` : '';
    lines.push(`- **${POSITION_NAMES[build.position]}**: ${items}${boots}${build.note ? ` (${build.note})` : ''}`);
  }
  lines.push(`- 출처: ${entry.sources.join(', ') || '-'}`, '');
}

writeFileSync(MD_PATH, lines.join('\n'), 'utf8');

console.log(`Data Dragon 버전: ${version}`);
console.log(`작성한 챔피언: ${Object.keys(result).length}종`);
console.log(`누락: ${missing.join(', ') || '없음'}`);
console.log(`존재하지 않는 아이템 ID (제외됨): ${invalid.join(', ') || '없음'}`);
