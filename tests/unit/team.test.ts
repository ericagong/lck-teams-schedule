import { describe, expect, it } from 'vitest';
import { asLckTeam, isLckTeam } from '../../src/team.js';

describe('isLckTeam — runtime 멤버십 predicate', () => {
  it('LCK 팀 코드면 true', () => {
    expect(isLckTeam('T1')).toBe(true);
    expect(isLckTeam('GEN')).toBe(true);
    expect(isLckTeam('KRX')).toBe(true);
    expect(isLckTeam('DNS')).toBe(true);
  });

  it('LCK 외 코드면 false', () => {
    expect(isLckTeam('G2')).toBe(false);
    expect(isLckTeam('FNC')).toBe(false);
    expect(isLckTeam('')).toBe(false);
  });

  it('정확 일치만 true (normalize는 호출자 책임 — asLckTeam 사용 권장)', () => {
    expect(isLckTeam('t1')).toBe(false);
    expect(isLckTeam(' T1 ')).toBe(false);
  });
});

describe('asLckTeam — normalize + LCK 멤버십 강제', () => {
  it('LCK 팀 코드 그대로 통과 → LckTeamCode 좁힘', () => {
    expect(asLckTeam('T1')).toBe('T1');
    expect(asLckTeam('GEN')).toBe('GEN');
  });

  it('소문자/공백 → 정규화 후 통과', () => {
    expect(asLckTeam(' t1 ')).toBe('T1');
    expect(asLckTeam('gen')).toBe('GEN');
  });

  it('LCK 팀이 아니면 throw (명시 계약)', () => {
    expect(() => asLckTeam('FOO')).toThrow(/Not an LCK team/);
    expect(() => asLckTeam('G2')).toThrow(/Not an LCK team/);
  });

  it('빈 문자열·공백만 → throw', () => {
    expect(() => asLckTeam('')).toThrow(/Not an LCK team/);
    expect(() => asLckTeam('   ')).toThrow(/Not an LCK team/);
  });
});
