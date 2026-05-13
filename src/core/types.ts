/**
 * 도메인 핵심 타입.
 *
 * 설계 원칙 (plan.md §6):
 * - 모든 필드 readonly: 불변성
 * - startsAt은 UTC ISO 8601: 시간대 변환은 ICS 출력 시점에만
 * - id는 fetcher가 결정한 UID: ICS UID로 그대로 사용 (멱등성)
 *   · lolesports: match.id 그대로
 *   · 네이버: "naver:<gameId>" (namespace 분리, UID 충돌 회피)
 */

export interface Match {
  readonly id: string;
  readonly tournament: TournamentInfo;
  readonly teamA: Team;
  readonly teamB: Team;
  readonly startsAt: string; // ISO 8601 UTC
  readonly bestOf: BestOf;
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

export type BestOf = 1 | 3 | 5;

export type MatchStatus = 'scheduled' | 'completed' | 'canceled';

/**
 * Bo 카운트 정규화 — 도메인이 허용하는 1/3/5만 통과시키고 나머지는 null.
 *
 * Phase 3에서 두 번째 fetcher(네이버) 등장으로 lolesports/naver에 같은 함수가
 * 중복 → 행동원칙 #6 "두 번째 사례 등장 시" 트리거로 도메인 레이어 추출.
 *
 * 호출부는 null을 "이 매치는 도메인 밖" 시그널로 사용 (Bo2/Bo7 등 안전 skip).
 */
export function normalizeBestOf(count: unknown): BestOf | null {
  return count === 1 || count === 3 || count === 5 ? count : null;
}
