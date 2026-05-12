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

export interface BuildIcsForTeamResult {
  /** RFC 5545 ICS 문자열 (파일로 그대로 쓰면 됨) */
  readonly ics: string;
  /** ICS에 실제로 포함된 매치(VEVENT) 개수 */
  readonly count: number;
}

/**
 * 전체 매치 → 특정 팀의 ICS 문자열 + 매치 개수.
 *
 * 1) 팀 매치만 필터
 * 2) 취소된 매치 제외
 * 3) 시작 시간순 정렬 (캘린더 안정성)
 * 4) ICS 생성
 *
 * 매치 개수를 함께 반환해 호출부가 ICS 내부를 파싱하지 않아도 되게 함.
 */
export function buildIcsForTeam(input: BuildIcsForTeamInput): BuildIcsForTeamResult {
  const teamMatches = filterByTeam(input.matches, input.teamCode);
  const active = excludeCanceled(teamMatches);
  const sorted = sortByStartTime(active);
  const ics = generateIcs(sorted, input.icsOptions);
  return { ics, count: sorted.length };
}

/**
 * 시작 시각(ISO 8601 UTC) 오름차순 정렬. 입력 배열은 변경하지 않음 (순수).
 */
function sortByStartTime(matches: readonly Match[]): Match[] {
  return [...matches].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
