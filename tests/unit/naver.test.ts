import { describe, expect, it } from 'vitest';
import { getScheduleMonths, isFutureScheduleLost, toMatch, toMatches } from '../../src/naver.js';
import { ALL_LEAGUES, LEAGUE_DISPLAY_NAME } from '../../src/league.js';
import type { Match } from '../../src/match.js';

/** parsed 결과에서 Match 추출 — 아니면 null (테스트 가독성용). */
function parsedMatch(raw: unknown): Match | null {
  const result = toMatch(raw);
  return result.kind === 'parsed' ? result.match : null;
}

/** 네이버 raw 매치 fixture — 필수 필드만. */
function rawMatch(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    gameId: '2026052017nPNMH9y8539lol',
    topLeagueId: 'lck',
    title: '정규시즌 2R',
    startDate: 1779264000000,
    maxMatchCount: 3,
    matchStatus: 'BEFORE',
    winner: 'NONE',
    homeScore: 0,
    awayScore: 0,
    stadium: '치지직 롤파크',
    chzzkChannelId: '9381e7d6816e6d915a44a13c0195b202',
    replayVideoId: null,
    homeTeam: { name: 'T1', nameEngAcronym: 'T1' },
    awayTeam: { name: 'KRX', nameEngAcronym: 'KRX' },
    ...overrides,
  };
}

describe('getScheduleMonths — rolling 5 month window (과거 3 + 현재 + 미래 1)', () => {
  it('항상 5개월 반환', () => {
    expect(getScheduleMonths(new Date(Date.UTC(2026, 4, 13)))).toHaveLength(5);
  });

  it('기준 월 포함 — 과거 3 → 현재 → 미래 1 순서', () => {
    expect(getScheduleMonths(new Date(Date.UTC(2026, 4, 13)))).toEqual([
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
    ]);
  });

  it('연 경계 — 과거 방향 (Feb 기준 → 작년 Nov까지)', () => {
    expect(getScheduleMonths(new Date(Date.UTC(2026, 1, 13)))).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
    ]);
  });

  it('연 경계 — 미래 방향 (Dec 기준 → 내년 Jan까지)', () => {
    expect(getScheduleMonths(new Date(Date.UTC(2026, 11, 15)))).toEqual([
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
    ]);
  });

  it('UTC 기준 — TZ 무관 결정론 (같은 절대 시점이면 환경 무관 동일)', () => {
    const a = getScheduleMonths(new Date(Date.UTC(2026, 4, 13, 0, 0, 0)));
    const b = getScheduleMonths(new Date(Date.UTC(2026, 4, 13, 23, 59, 59)));
    expect(a).toEqual(b);
  });
});

describe('toMatch — winner 값 회귀 (네이버는 예정 매치에 NONE 응답)', () => {
  it('예정 매치 winner="NONE"도 parse 통과 (silent 누락 회귀 방지)', () => {
    const match = parsedMatch(rawMatch({ matchStatus: 'BEFORE', winner: 'NONE' }));
    expect(match).not.toBeNull();
    expect(match?.status).toBe('scheduled');
    expect(match?.score).toBeUndefined(); // NONE → score 없음
  });

  it('완료 매치 winner="HOME"은 score 포함', () => {
    const match = parsedMatch(
      rawMatch({ matchStatus: 'RESULT', winner: 'HOME', homeScore: 2, awayScore: 0 }),
    );
    expect(match?.score).toEqual({ home: 2, away: 0, winner: 'HOME' });
  });

  it('완료 매치 winner="AWAY"도 score 포함', () => {
    const match = parsedMatch(
      rawMatch({ matchStatus: 'RESULT', winner: 'AWAY', homeScore: 1, awayScore: 2 }),
    );
    expect(match?.score).toEqual({ home: 1, away: 2, winner: 'AWAY' });
  });
});

describe('toMatch — 행 단위 격리 (issue #38: bestOf=0 매치 1개가 전체 발행 중단 회귀 방지)', () => {
  it('bestOf 계약 위반(0) → throw 대신 anomaly 반환 (gameId·이유 포함)', () => {
    const result = toMatch(rawMatch({ gameId: '202607271500bHNlYhlol', maxMatchCount: 0 }));
    expect(result.kind).toBe('anomaly');
    if (result.kind === 'anomaly') {
      expect(result.anomaly.gameId).toBe('202607271500bHNlYhlol');
      expect(result.anomaly.reason).toContain('bestOf 계약 위반: 0');
    }
  });

  it('bestOf 계약 위반(2·7 등 비표준 값)도 anomaly', () => {
    expect(toMatch(rawMatch({ maxMatchCount: 2 })).kind).toBe('anomaly');
    expect(toMatch(rawMatch({ maxMatchCount: 7 })).kind).toBe('anomaly');
  });

  it('schema 불일치(zod parse 실패)도 anomaly — gameId 최대한 보존', () => {
    const result = toMatch({ gameId: 'broken-row', startDate: 'not-a-number' });
    expect(result.kind).toBe('anomaly');
    if (result.kind === 'anomaly') {
      expect(result.anomaly.gameId).toBe('broken-row');
    }
  });

  it('비대상 리그는 anomaly가 아닌 skipped (의도된 제외)', () => {
    expect(toMatch(rawMatch({ topLeagueId: 'lpl' })).kind).toBe('skipped');
  });

  it('TBD 팀(homeTeam null)도 skipped (의도된 제외)', () => {
    expect(toMatch(rawMatch({ homeTeam: null })).kind).toBe('skipped');
  });

  it('toMatches — 이상 행 1개가 나머지 정상 매치 발행을 막지 않음', () => {
    const { matches, anomalies } = toMatches([
      rawMatch({ gameId: 'ok-1' }),
      rawMatch({ gameId: 'bad-1', maxMatchCount: 0 }),
      rawMatch({ gameId: 'ok-2' }),
    ]);
    expect(matches).toHaveLength(2);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]?.gameId).toBe('bad-1');
  });
});

describe('isFutureScheduleLost — 휴식기와 schema drift 구분 (2026-09-13 LCK 결승 직후 오탐 회귀 방지)', () => {
  const NOW = new Date(Date.UTC(2026, 8, 14, 19, 0, 0)); // 2026-09-15 04:00 KST cron
  const PAST = Date.UTC(2026, 8, 13, 5, 0, 0); // 결승
  const FUTURE = Date.UTC(2026, 9, 15, 16, 0, 0); // Worlds Play-In

  it('휴식기 — 과거 매치만 있고 격리도 없음 → 정상 (발행 계속)', () => {
    const outcome = toMatches([rawMatch({ gameId: 'final', startDate: PAST })]);
    expect(isFutureScheduleLost(outcome, NOW)).toBe(false);
  });

  it('휴식기 — 다음 대회가 전부 TBD(skipped) → 정상', () => {
    const outcome = toMatches([
      rawMatch({ startDate: PAST }),
      rawMatch({ topLeagueId: 'world_championship', startDate: FUTURE, homeTeam: null }),
    ]);
    expect(isFutureScheduleLost(outcome, NOW)).toBe(false);
  });

  it('휴식기 + 과거 격리 행(issue #38 bestOf=0 잔존) → 정상 (과거 격리는 판정 무관)', () => {
    const outcome = toMatches([
      rawMatch({ startDate: PAST }),
      rawMatch({ gameId: '202607271500bHNlYhlol', maxMatchCount: 0, startDate: PAST }),
    ]);
    expect(isFutureScheduleLost(outcome, NOW)).toBe(false);
  });

  it('schema drift — 미래 행이 전부 격리됨 → 소실 (워크플로 실패)', () => {
    const outcome = toMatches([
      rawMatch({ startDate: PAST, matchStatus: 'RESULT', winner: 'HOME' }),
      rawMatch({ gameId: 'drift-1', startDate: FUTURE, winner: 'SOMETHING_NEW' }),
      rawMatch({ gameId: 'drift-2', startDate: FUTURE, winner: 'SOMETHING_NEW' }),
    ]);
    expect(outcome.anomalies[0]?.startsAt?.getTime()).toBe(FUTURE); // zod 실패 행에서도 시각 추출
    expect(isFutureScheduleLost(outcome, NOW)).toBe(true);
  });

  it('미래 정상 매치가 1건이라도 있으면 → 정상 (부분 격리는 WARN으로 충분)', () => {
    const outcome = toMatches([
      rawMatch({ gameId: 'ok', startDate: FUTURE }),
      rawMatch({ gameId: 'bad', startDate: FUTURE, maxMatchCount: 0 }),
    ]);
    expect(isFutureScheduleLost(outcome, NOW)).toBe(false);
  });

  it('startDate 추출 불가 격리 행은 판정 제외 (그 drift는 0 matches 가드 담당)', () => {
    const outcome = toMatches([
      rawMatch({ startDate: PAST }),
      { gameId: 'broken', startDate: 'x' },
    ]);
    expect(outcome.anomalies[0]?.startsAt).toBeNull();
    expect(isFutureScheduleLost(outcome, NOW)).toBe(false);
  });
});

describe('ALL_LEAGUES — 6 대회 도메인 식별자', () => {
  it('정확히 6개 — LCK, MSI, WORLDS, FIRST_STAND, EWC, KESPA_CUP', () => {
    expect([...ALL_LEAGUES].sort()).toEqual(
      ['EWC', 'FIRST_STAND', 'KESPA_CUP', 'LCK', 'MSI', 'WORLDS'].sort(),
    );
  });

  it('모든 League에 표시명이 정의됨 (비어있지 않음)', () => {
    for (const league of ALL_LEAGUES) {
      expect(LEAGUE_DISPLAY_NAME[league].length).toBeGreaterThan(0);
    }
  });
});
