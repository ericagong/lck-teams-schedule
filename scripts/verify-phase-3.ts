/**
 * Phase 3 시각 검증 — fixtures/phase-3/* → 무필터 ICS (6 대회 전체).
 *
 * 사용:
 *   pnpm exec tsx scripts/verify-phase-3.ts
 *   open public/phase-3-verify.ics
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Match } from '../src/match.js';
import { toMatches } from '../src/naver.js';
import { LEAGUE_DISPLAY_NAME, type League } from '../src/league.js';
import { generateIcs } from '../src/ics.js';

const FIXTURE_DIR = resolve('fixtures/phase-3');
const OUTPUT = 'public/phase-3-verify.ics';

type NaverEnvelope = { content: { matches: unknown[] } | null };

const files = readdirSync(FIXTURE_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort();

const all: Match[] = [];
const perFile: Array<{ file: string; topLeagueId: string; count: number }> = [];

for (const file of files) {
  const m = file.match(/^(.+)-\d{4}-\d{2}\.json$/);
  if (!m) continue;
  const topLeagueId = m[1] ?? 'unknown';

  const json = JSON.parse(readFileSync(resolve(FIXTURE_DIR, file), 'utf-8')) as NaverEnvelope;
  const items = json.content?.matches ?? [];
  const matches = toMatches(items);
  all.push(...matches);
  perFile.push({ file, topLeagueId, count: matches.length });
}

const active = all.filter((m) => m.isActive);

const ics = generateIcs(active, {
  calendarName: 'Phase 3 검증 — Naver 6 대회 전체 (무필터)',
});
writeFileSync(OUTPUT, ics);

console.log(`✓ ${active.length} matches → ${OUTPUT}\n`);

console.log('--- 파일별 캡처 분포 ---');
for (const r of perFile) {
  console.log(`  ${r.count.toString().padStart(3)} ${r.file}  (topLeagueId=${r.topLeagueId})`);
}

const counts = new Map<League, number>();
const stages = new Map<League, Set<string>>();
for (const m of active) {
  counts.set(m.league, (counts.get(m.league) ?? 0) + 1);
  if (!stages.has(m.league)) stages.set(m.league, new Set());
  stages.get(m.league)?.add(m.stage);
}

console.log('\n--- 대회별 분포 ---');
for (const [league, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
  const display = LEAGUE_DISPLAY_NAME[league];
  console.log(`  ${n.toString().padStart(3)} ${display}`);
  console.log(`        stages: ${[...(stages.get(league) ?? [])].join(' / ')}`);
}
