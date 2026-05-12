import { describe, expect, it } from 'vitest';
import type { Match } from '../../src/core/types.js';
import { excludeCanceled, filterByTeam } from '../../src/filter.js';

const baseMatch: Omit<Match, 'id' | 'teamA' | 'teamB' | 'status'> = {
  tournament: { displayName: 'LCK', stage: '1주 차' },
  startsAt: '2026-05-15T10:00:00Z',
  bestOf: 3,
};

const matches: Match[] = [
  {
    ...baseMatch,
    id: 'm1',
    teamA: { code: 'T1', displayName: 'T1' },
    teamB: { code: 'GEN', displayName: '젠지' },
    status: 'scheduled',
  },
  {
    ...baseMatch,
    id: 'm2',
    teamA: { code: 'HLE', displayName: '한화생명' },
    teamB: { code: 'DRX', displayName: 'DRX' },
    status: 'scheduled',
  },
  {
    ...baseMatch,
    id: 'm3',
    teamA: { code: 'GEN', displayName: '젠지' },
    teamB: { code: 'T1', displayName: 'T1' },
    status: 'canceled',
  },
];

describe('filterByTeam', () => {
  it('teamA 또는 teamB가 일치하는 매치만 반환한다', () => {
    const t1Matches = filterByTeam(matches, 'T1');
    expect(t1Matches.map((m) => m.id)).toEqual(['m1', 'm3']);
  });

  it('순서를 보존한다', () => {
    const result = filterByTeam(matches, 'GEN');
    expect(result.map((m) => m.id)).toEqual(['m1', 'm3']);
  });

  it('일치하지 않으면 빈 배열', () => {
    expect(filterByTeam(matches, 'NONEXISTENT')).toEqual([]);
  });

  it('입력 배열을 변경하지 않는다 (순수성)', () => {
    const originalLength = matches.length;
    filterByTeam(matches, 'T1');
    expect(matches).toHaveLength(originalLength);
  });
});

describe('excludeCanceled', () => {
  it('canceled 상태 매치를 제외한다', () => {
    const result = excludeCanceled(matches);
    expect(result.map((m) => m.id)).toEqual(['m1', 'm2']);
  });
});
