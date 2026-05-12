import { describe, expect, it } from 'vitest';
import { toKoreanTeamName } from '../../src/team-names.js';

describe('toKoreanTeamName', () => {
  it('LCK 10팀 코드를 한국어로 매핑한다 (2026 시즌 리브랜딩 반영)', () => {
    expect(toKoreanTeamName('T1')).toBe('T1');
    expect(toKoreanTeamName('GEN')).toBe('젠지');
    expect(toKoreanTeamName('HLE')).toBe('한화생명');
    expect(toKoreanTeamName('DK')).toBe('디플러스 기아');
    expect(toKoreanTeamName('KT')).toBe('KT');
    expect(toKoreanTeamName('KRX')).toBe('DRX');
    expect(toKoreanTeamName('BRO')).toBe('한진 브리온');
    expect(toKoreanTeamName('BFX')).toBe('BNK 피어엑스');
    expect(toKoreanTeamName('NS')).toBe('농심');
    expect(toKoreanTeamName('DNS')).toBe('DN 수퍼스');
  });

  it('매핑이 없으면 fallbackName을 그대로 반환한다', () => {
    expect(toKoreanTeamName('UNKNOWN', 'Some Team')).toBe('Some Team');
  });

  it('매핑도 fallbackName도 없으면 code를 반환한다', () => {
    expect(toKoreanTeamName('UNKNOWN')).toBe('UNKNOWN');
  });
});
