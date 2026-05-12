/**
 * Historical fixture → ICS 빌드 (검증용).
 *
 * 목적: 실제 production 코드(`parseScheduleResponse` + `buildIcsForTeam`)를
 * 로컬 fixture에 통과시켜 시각 검증 가능한 ICS 산출물 생성.
 *
 * 사용:
 *   pnpm exec tsx scripts/build-from-fixture.ts
 *
 * 출력: public/t1-2025-historical.ics
 */

import { readFileSync, writeFileSync } from 'node:fs';
import type { Match } from '../src/core/types.js';
import { parseScheduleResponse } from '../src/lolesports.js';
import { buildIcsForTeam } from '../src/pipeline.js';

const FIXTURE_FILES = [
  'fixtures/phase-1/lck-page-older1.json',
  'fixtures/phase-1/lck-page-older2.json',
  'fixtures/phase-1/lck-page-older3.json',
];

const OUTPUT_PATH = 'public/t1-2025-historical.ics';
const TEAM_CODE = 'T1';
const YEAR_PREFIX = '2025-';

const allMatches: Match[] = [];
for (const path of FIXTURE_FILES) {
  const json = JSON.parse(readFileSync(path, 'utf-8')) as Parameters<
    typeof parseScheduleResponse
  >[0];
  const { matches } = parseScheduleResponse(json);
  allMatches.push(...matches);
}

const matches2025 = allMatches.filter((m) => m.startsAt.startsWith(YEAR_PREFIX));

const { ics, count } = buildIcsForTeam({
  matches: matches2025,
  teamCode: TEAM_CODE,
  icsOptions: { calendarName: 'T1 2025 LCK (Historical Test)' },
});

writeFileSync(OUTPUT_PATH, ics);

console.log(`✓ Wrote ${count} T1 matches (2025) → ${OUTPUT_PATH}`);
console.log(`  전체 2025 매치: ${matches2025.length}, T1 출전: ${count}`);
console.log();
console.log('--- T1 매치 stage 분포 ---');
const t1Matches = matches2025.filter(
  (m) => m.teamA.code === TEAM_CODE || m.teamB.code === TEAM_CODE,
);
const stageCount = new Map<string, number>();
for (const m of t1Matches) {
  stageCount.set(m.tournament.stage, (stageCount.get(m.tournament.stage) ?? 0) + 1);
}
for (const [stage, n] of [...stageCount.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${n.toString().padStart(3)} ${stage}`);
}
