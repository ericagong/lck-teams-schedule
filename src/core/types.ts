/**
 * 도메인 핵심 타입.
 *
 * 설계 원칙 (plan.md §6):
 * - 모든 필드 readonly: 불변성
 * - startsAt은 UTC ISO 8601: 시간대 변환은 ICS 출력 시점에만
 * - id는 lolesports match ID: ICS UID로 그대로 사용 (멱등성)
 */

export interface Match {
  readonly id: string;
  readonly tournament: TournamentInfo;
  readonly teamA: Team;
  readonly teamB: Team;
  readonly startsAt: string; // ISO 8601 UTC
  readonly bestOf: 1 | 3 | 5;
  readonly status: MatchStatus;
}

export interface TournamentInfo {
  readonly displayName: string; // 예: "LCK Split 2 2026"
  readonly stage: string; // 예: "2주 차"
}

export interface Team {
  readonly code: string; // 예: "T1", "GEN"
  readonly displayName: string; // 한국어 표시명, 예: "T1", "젠지"
}

export type MatchStatus = 'scheduled' | 'completed' | 'canceled';
