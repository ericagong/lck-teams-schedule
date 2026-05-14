import { describe, expect, it } from 'vitest';
import type { Match } from '../../src/types.js';
import { selectActiveTeamMatches } from '../../src/filter.js';

const baseMatch: Omit<Match, 'id' | 'teamA' | 'teamB' | 'status' | 'startsAt'> = {
  tournament: { displayName: 'LCK', stage: '1주 차' },
  bestOf: 3,
};

const matches: Match[] = [
  {
    ...baseMatch,
    id: 'm1',
    teamA: { code: 'T1', displayName: 'T1' },
    teamB: { code: 'GEN', displayName: '젠지' },
    startsAt: '2026-05-15T10:00:00Z',
    status: 'scheduled',
  },
  {
    ...baseMatch,
    id: 'm2',
    teamA: { code: 'HLE', displayName: '한화생명' },
    teamB: { code: 'DRX', displayName: 'DRX' },
    startsAt: '2026-05-16T10:00:00Z',
    status: 'scheduled',
  },
  {
    ...baseMatch,
    id: 'm3',
    teamA: { code: 'GEN', displayName: '젠지' },
    teamB: { code: 'T1', displayName: 'T1' },
    startsAt: '2026-05-10T10:00:00Z',
    status: 'canceled',
  },
  {
    ...baseMatch,
    id: 'm4',
    teamA: { code: 'T1', displayName: 'T1' },
    teamB: { code: 'KT', displayName: 'KT' },
    startsAt: '2026-05-12T10:00:00Z',
    status: 'completed',
  },
];

describe('selectActiveTeamMatches', () => {
  it('지정 팀이 teamA 또는 teamB에 포함된 매치만 반환한다 (입력 순서 보존)', () => {
    const result = selectActiveTeamMatches(matches, 'T1');
    expect(result.map((m) => m.id)).toEqual(['m1', 'm4']);
  });

  it('canceled 상태 매치는 제외한다', () => {
    const result = selectActiveTeamMatches(matches, 'T1');
    expect(result.find((m) => m.id === 'm3')).toBeUndefined();
  });

  it('completed 매치는 포함한다 (과거 매치 보존)', () => {
    const result = selectActiveTeamMatches(matches, 'T1');
    expect(result.find((m) => m.id === 'm4')).toBeDefined();
  });

  it('일치하는 팀이 없으면 빈 배열', () => {
    expect(selectActiveTeamMatches(matches, 'NONEXISTENT')).toEqual([]);
  });

  it('입력 배열을 변경하지 않는다 (순수성)', () => {
    const originalIds = matches.map((m) => m.id);
    selectActiveTeamMatches(matches, 'T1');
    expect(matches.map((m) => m.id)).toEqual(originalIds);
  });
});
