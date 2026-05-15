/**
 * Match — League × (Team × Team) × 시간·형식·상태.
 *
 * league.ts·team.ts를 조합하는 자리. 외부 데이터 소스·출력 모두
 * 이 모듈을 알지만, 이 모듈은 그들을 모름.
 */

import { LEAGUE_DISPLAY_NAME, type League } from './league.js';
import type { Team } from './team.js';

export type BestOf = 1 | 3 | 5;
export type MatchStatus = 'scheduled' | 'completed' | 'canceled';

export type MatchProps = {
  readonly id: string;
  readonly league: League;
  readonly stage: string;
  readonly teamA: Team;
  readonly teamB: Team;
  readonly startsAt: string;
  readonly bestOf: BestOf;
  readonly status: MatchStatus;
};

/** Bo1/3/5 외 값은 BestOf 계약 위반 → throw. context는 발생 위치 추적용. */
export function assertBestOf(value: number, context: string): asserts value is BestOf {
  if (value !== 1 && value !== 3 && value !== 5) {
    throw new Error(`bestOf 계약 위반: ${value} (${context})`);
  }
}

export class Match {
  private constructor(
    readonly id: string,
    readonly league: League,
    readonly stage: string,
    readonly teamA: Team,
    readonly teamB: Team,
    readonly startsAt: string,
    readonly bestOf: BestOf,
    readonly status: MatchStatus,
  ) {}

  static create(props: MatchProps): Match {
    return new Match(
      props.id,
      props.league,
      props.stage,
      props.teamA,
      props.teamB,
      props.startsAt,
      props.bestOf,
      props.status,
    );
  }

  get isActive(): boolean {
    return this.status !== 'canceled';
  }

  involves(teamCode: string): boolean {
    return this.teamA.code === teamCode || this.teamB.code === teamCode;
  }

  get startDate(): Date {
    return new Date(this.startsAt);
  }

  // e.g., "T1 vs 젠지"
  get matchup(): string {
    return `${this.teamA.displayName} vs ${this.teamB.displayName}`;
  }

  // e.g., "LCK 1주 차" / "월드 챔피언십 결승" / stage 없으면 표시명만
  get tournamentLabel(): string {
    const name = LEAGUE_DISPLAY_NAME[this.league];
    return this.stage ? `${name} ${this.stage}` : name;
  }
}
