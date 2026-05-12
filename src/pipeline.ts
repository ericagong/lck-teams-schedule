/**
 * 파이프라인 합성.
 *
 * 순수 함수들의 조합. fetcher 호출 결과를 받아 ICS 문자열로 변환.
 * 이 파일 자체도 순수: side effect는 main.ts 또는 호출부에서.
 */

import type { Match } from './core/types.js';
import { excludeCanceled, filterByTeam } from './filter.js';
import { generateIcs, type IcsOptions } from './ics-generator.js';

export interface BuildIcsForTeamInput {
  readonly matches: readonly Match[];
  readonly teamCode: string;
  readonly icsOptions: IcsOptions;
}

/**
 * 전체 매치 → 특정 팀의 ICS 문자열.
 *
 * 1) 팀 매치만 필터
 * 2) 취소된 매치 제외
 * 3) 시작 시간순 정렬 (캘린더 안정성)
 * 4) ICS 생성
 */
export function buildIcsForTeam(input: BuildIcsForTeamInput): string {
  const teamMatches = filterByTeam(input.matches, input.teamCode);
  const active = excludeCanceled(teamMatches);
  const sorted = [...active].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  );
  return generateIcs(sorted, input.icsOptions);
}
