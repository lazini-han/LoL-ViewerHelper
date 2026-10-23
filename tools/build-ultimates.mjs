/**
 * 궁극기 요약 문서(data/ultimates.json, data/ultimates.md)를 생성하는 스크립트
 *
 * 입력:
 *   - 조사 결과 JSON 파일들이 있는 디렉터리 (각 파일은 배열)
 *     [{ id, cooldown, cooldownNote, effect, when, how, sources }]
 *   - Data Dragon 최신 버전의 궁극기 이름/아이콘 (자동 조회)
 *
 * 조사 결과의 cooldown 이 비어 있으면 Data Dragon 공식 값을 사용한다.
 *
 * 사용법: node tools/build-ultimates.mjs <조사 결과 디렉터리>
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHAMPIONS_PATH = join(ROOT, 'data', 'champions.json');
const JSON_PATH = join(ROOT, 'data', 'ultimates.json');
const MD_PATH = join(ROOT, 'data', 'ultimates.md');
const DDRAGON = 'https://ddragon.leagueoflegends.com';

const researchDir = process.argv[2];
if (!researchDir) {
  console.error('사용법: node tools/build-ultimates.mjs <조사 결과 디렉터리>');
  process.exit(1);
}

async function fetchOfficialUltimates() {
  const versions = await (await fetch(`${DDRAGON}/api/versions.json`)).json();
  const version = versions[0];
  const res = await fetch(`${DDRAGON}/cdn/${version}/data/ko_KR/championFull.json`);
  if (!res.ok) {
    throw new Error(`Data Dragon 챔피언 데이터를 불러올 수 없습니다: HTTP ${res.status}`);
  }
  const { data } = await res.json();

  const ults = new Map();
  for (const champ of Object.values(data)) {
    const r = champ.spells[3];
    ults.set(Number(champ.key), { name: r.name, cooldown: r.cooldownBurn, image: r.image.full });
  }
  return { version, ults };
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
const { version, ults } = await fetchOfficialUltimates();
const today = new Date().toLocaleDateString('sv-SE'); // 로컬 기준 YYYY-MM-DD

const missing = [];
const ultimates = {};

for (const champ of champions) {
  const official = ults.get(champ.id);
  const entry = research.get(champ.id);
  if (!official || !entry) {
    missing.push(champ.nameKr);
    continue;
  }

  ultimates[champ.id] = {
    nameKr: champ.nameKr,
    ultName: official.name,
    image: official.image,
    cooldown: entry.cooldown || official.cooldown,
    cooldownNote: entry.cooldownNote || '',
    effect: entry.effect,
    when: entry.when,
    how: entry.how,
    sources: entry.sources || []
  };
}

writeFileSync(JSON_PATH, JSON.stringify({ version, updated: today, ultimates }, null, 2) + '\n', 'utf8');

// 사람이 검토하기 위한 읽기용 문서
const lines = [
  '# 챔피언 궁극기 요약',
  '',
  `> 기준: Data Dragon ${version} / 작성일: ${today}`,
  '> 경기 화면에서 챔피언 초상화에 마우스를 올리면 표시되는 내용입니다.',
  '> 원본 데이터는 `data/ultimates.json` 이며, 이 문서는 `tools/build-ultimates.mjs` 로 함께 생성됩니다.',
  ''
];

for (const champ of champions) {
  const u = ultimates[champ.id];
  if (!u) continue;
  const seconds = /^[\d./]+$/.test(u.cooldown) ? `${u.cooldown}초` : u.cooldown;
  const cooldown = `${seconds}${u.cooldownNote ? ` (${u.cooldownNote})` : ''}`;
  lines.push(
    `## ${champ.nameKr} - ${u.ultName}`,
    '',
    `- **쿨타임**: ${cooldown}`,
    `- **효과**: ${u.effect}`,
    `- **사용 상황**: ${u.when}`,
    `- **활용 팁**: ${u.how}`,
    `- 출처: ${u.sources.join(', ') || '-'}`,
    ''
  );
}

writeFileSync(MD_PATH, lines.join('\n'), 'utf8');

console.log(`Data Dragon 버전: ${version}`);
console.log(`작성한 궁극기: ${Object.keys(ultimates).length}종`);
console.log(`누락: ${missing.join(', ') || '없음'}`);
