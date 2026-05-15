/**
 * 진입점 — fetch → filter → ICS → public/t1.ics.
 * 실패 시 process.exit(1) → 워크플로 실패 → GitHub Pages는 마지막 성공본 유지.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { generateIcs } from './ics.js';
import { fetchAllMatches } from './naver.js';
import { asLckTeam } from './team.js';

const OUTPUT_PATH = resolve('public', 't1.ics');
const FOCUS_TEAM_CODE = asLckTeam('T1');
const CALENDAR_NAME = 'T1 LCK 일정';
const LOG_PREFIX = '[lol-schedule-sync]';

const log = {
  info: (msg: string) => console.log(`${LOG_PREFIX} ${msg}`),
  error: (msg: string, err: unknown) => console.error(`${LOG_PREFIX} FATAL: ${msg}`, err),
};

async function main(): Promise<void> {
  log.info('Fetch Match Schedules from NaverEsports...');
  const matches = await fetchAllMatches();
  log.info(`Got ${matches.length} matches.`);

  const teamMatches = matches.filter((m) => m.involves(FOCUS_TEAM_CODE) && m.isActive);
  const ics = generateIcs(teamMatches, { calendarName: CALENDAR_NAME });

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, ics, 'utf-8');
  log.info(`${teamMatches.length}개 ${FOCUS_TEAM_CODE} 매치 → ${OUTPUT_PATH} 기록 완료.`);
}

main().catch((err) => {
  log.error('Failed to publish T1 ICS', err);
  process.exit(1);
});
