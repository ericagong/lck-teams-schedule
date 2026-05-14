/**
 * 매치 선별 — 도메인 술어를 합성한 단일 진입점.
 *
 * 순수 함수. 입력 배열을 변경하지 않음.
 */

import type { Match } from './types.js';

/**
 * 특정 팀의 "활성 매치"(취소 제외)를 반환.
 *
 * 합성: 팀 필터 → 취소 제외.
 * 순서는 호출처에 위임 — ICS 출력 순서 안정화는 `generateIcs` 책임.
 *
 * @param matches 전체 매치 목록
 * @param teamCode 팀 코드 (예: "T1", "GEN"). 네이버 `nameEngAcronym` 값.
 */
export function selectActiveTeamMatches(matches: readonly Match[], teamCode: string): Match[] {
  return matches
    .filter((m) => m.teamA.code === teamCode || m.teamB.code === teamCode)
    .filter((m) => m.status !== 'canceled');
}
