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

export type MatchScore = {
  readonly home: number;
  readonly away: number;
  readonly winner: 'HOME' | 'AWAY';
};

/** Bo별 매치 평균 길이 (실측: Bo1 30~50분, Bo3 2~3h, Bo5 3.5~5h). */
const ESTIMATED_HOURS_BY_BEST_OF: Readonly<Record<BestOf, number>> = {
  1: 1,
  3: 3,
  5: 4.5,
};

/** Bo별 한국어 표현 — DESCRIPTION 본문에 표시. SUMMARY는 짧은 "Bo3" 유지. */
const BEST_OF_LABEL: Readonly<Record<BestOf, string>> = {
  1: '단판제',
  3: '3판 2선승제',
  5: '5판 3선승제',
};

/** 글로벌 중계 — 모든 LCK 매치 공통. 한국 사용자는 치지직(chzzkLiveUrl) 우선. */
const STREAM_URL = 'https://lolesports.com/';

type MatchProps = {
  readonly id: string;
  readonly league: League;
  readonly stage: string;
  readonly teamA: Team;
  readonly teamB: Team;
  readonly startsAt: string;
  readonly bestOf: BestOf;
  readonly status: MatchStatus;
  /** 완료 매치에만. 셋 다 있어야 의미 있음. */
  readonly score?: MatchScore;
  /** 경기장 (예: "치지직 롤파크"). 네이버 미제공 시 undefined. */
  readonly stadium?: string;
  /** 치지직 라이브 채널 ID. 라이브 URL 구성용. */
  readonly chzzkChannelId?: string;
  /** 치지직 다시보기 video ID. 완료 매치에만. */
  readonly replayVideoId?: number;
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
    readonly score: MatchScore | undefined,
    readonly stadium: string | undefined,
    readonly chzzkChannelId: string | undefined,
    readonly replayVideoId: number | undefined,
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
      props.score,
      props.stadium,
      props.chzzkChannelId,
      props.replayVideoId,
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

  /** 시작 시각 + Bo별 평균 길이. */
  get endDate(): Date {
    return new Date(
      this.startDate.getTime() + ESTIMATED_HOURS_BY_BEST_OF[this.bestOf] * 3600 * 1000,
    );
  }

  // e.g., "T1 vs 젠지 — LCK 1주 차 (Bo3)"
  get summary(): string {
    return `${this.matchup} — ${this.tournamentLabel} (Bo${this.bestOf})`;
  }

  /** Bo별 한국어 표현 — DESCRIPTION에 사용 (예: "3판 2선승제"). */
  get bestOfLabel(): string {
    return BEST_OF_LABEL[this.bestOf];
  }

  /** LOCATION 필드용 — 네이버 stadium 그대로. */
  get location(): string | undefined {
    return this.stadium;
  }

  /** 치지직 라이브 URL — 예정 매치 중계용. */
  get chzzkLiveUrl(): string | undefined {
    return this.chzzkChannelId ? `https://chzzk.naver.com/live/${this.chzzkChannelId}` : undefined;
  }

  /** 치지직 다시보기 URL — 완료 매치 VOD용. */
  get vodUrl(): string | undefined {
    return this.replayVideoId ? `https://chzzk.naver.com/video/${this.replayVideoId}` : undefined;
  }

  /** 글로벌 중계 URL — 모든 매치 공통 (lolesports.com). 한국 사용자는 치지직 라이브 우선. */
  get streamUrl(): string {
    return STREAM_URL;
  }

  /** 완료 매치의 점수·승자 한 줄 표현 — DESCRIPTION에 사용. */
  get scoreLabel(): string | undefined {
    if (!this.score) return undefined;
    const winnerName =
      this.score.winner === 'HOME' ? this.teamA.displayName : this.teamB.displayName;
    return `경기 결과: ${this.score.home} vs ${this.score.away} (${winnerName} 승)`;
  }

  /**
   * 여러 줄 본문 — 매치업·대회·BoN(한국어)·결과(완료만)·위치·상태별 중계 링크.
   * - 예정 (scheduled): 라이브 링크 (치지직 + lolesports)
   * - 완료 (completed): 점수 + 다시보기 링크 (치지직 VOD)
   * - 취소 (canceled): 위치만
   */
  get description(): string {
    const lines: string[] = [
      this.matchup,
      `${LEAGUE_DISPLAY_NAME[this.league]} — ${this.stage}`,
      this.bestOfLabel,
    ];
    if (this.scoreLabel) lines.push(this.scoreLabel);
    lines.push('');
    if (this.location) lines.push(`📍 ${this.location}`);

    if (this.status === 'scheduled') {
      if (this.chzzkLiveUrl) lines.push(`📺 치지직 라이브: ${this.chzzkLiveUrl}`);
      lines.push(`📺 lolesports: ${this.streamUrl}`);
    } else if (this.status === 'completed' && this.vodUrl) {
      lines.push(`🎬 치지직 다시보기: ${this.vodUrl}`);
    }

    return lines.join('\n');
  }
}
