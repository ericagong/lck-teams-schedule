import { describe, expect, it } from 'vitest';
import type { Match } from '../../src/core/types.js';
import { generateIcs } from '../../src/ics-generator.js';

const FIXED_NOW = new Date('2026-05-12T03:00:00Z');

const sampleMatch: Match = {
  id: '115548128962840643',
  tournament: { displayName: 'LCK', stage: '2주 차' },
  teamA: { code: 'T1', displayName: 'T1' },
  teamB: { code: 'GEN', displayName: '젠지' },
  startsAt: '2026-04-08T10:00:00Z', // UTC 10:00 → KST 19:00
  bestOf: 3,
  status: 'completed',
};

describe('generateIcs', () => {
  it('VCALENDAR로 감싼다', () => {
    const ics = generateIcs([sampleMatch], { calendarName: 'T1 일정', now: FIXED_NOW });
    expect(ics).toMatch(/^BEGIN:VCALENDAR/);
    expect(ics).toMatch(/END:VCALENDAR\r\n$/);
  });

  it('VTIMEZONE Asia/Seoul 블록을 포함한다', () => {
    const ics = generateIcs([sampleMatch], { calendarName: 'T1', now: FIXED_NOW });
    expect(ics).toContain('BEGIN:VTIMEZONE');
    expect(ics).toContain('TZID:Asia/Seoul');
    expect(ics).toContain('TZOFFSETTO:+0900');
    expect(ics).toContain('END:VTIMEZONE');
  });

  it('UID는 match.id 기반 (멱등성)', () => {
    const ics = generateIcs([sampleMatch], { calendarName: 'T1', now: FIXED_NOW });
    expect(ics).toContain('UID:115548128962840643@lck-schedule-sync');
  });

  it('DTSTART를 KST로 변환한다 (UTC 10:00 → KST 19:00)', () => {
    const ics = generateIcs([sampleMatch], { calendarName: 'T1', now: FIXED_NOW });
    expect(ics).toContain('DTSTART;TZID=Asia/Seoul:20260408T190000');
  });

  it('DTEND는 Bo3 기준 +3h (KST 19:00 → 22:00)', () => {
    const ics = generateIcs([sampleMatch], { calendarName: 'T1', now: FIXED_NOW });
    expect(ics).toContain('DTEND;TZID=Asia/Seoul:20260408T220000');
  });

  it('Bo5는 +4.5h', () => {
    const bo5: Match = { ...sampleMatch, bestOf: 5, startsAt: '2026-04-08T10:00:00Z' };
    const ics = generateIcs([bo5], { calendarName: 'T1', now: FIXED_NOW });
    expect(ics).toContain('DTEND;TZID=Asia/Seoul:20260408T233000');
  });

  it('SUMMARY에 한국어 팀명을 포함한다', () => {
    const ics = generateIcs([sampleMatch], { calendarName: 'T1', now: FIXED_NOW });
    expect(ics).toContain('SUMMARY:T1 vs 젠지 — LCK 2주 차 (Bo3)');
  });

  it('canceled 매치는 STATUS:CANCELLED', () => {
    const canceled: Match = { ...sampleMatch, status: 'canceled' };
    const ics = generateIcs([canceled], { calendarName: 'T1', now: FIXED_NOW });
    expect(ics).toContain('STATUS:CANCELLED');
  });

  it('scheduled/completed 매치는 STATUS:CONFIRMED', () => {
    const ics = generateIcs([sampleMatch], { calendarName: 'T1', now: FIXED_NOW });
    expect(ics).toContain('STATUS:CONFIRMED');
  });

  it('VALARM은 포함하지 않는다 (캘린더 앱에 위임 - plan.md §6.1)', () => {
    const ics = generateIcs([sampleMatch], { calendarName: 'T1', now: FIXED_NOW });
    expect(ics).not.toContain('BEGIN:VALARM');
  });

  it('DTSTAMP는 옵션의 now 기준 (테스트 가능)', () => {
    const ics = generateIcs([sampleMatch], { calendarName: 'T1', now: FIXED_NOW });
    expect(ics).toContain('DTSTAMP:20260512T030000Z');
  });

  it('CRLF 줄바꿈 사용 (RFC 5545)', () => {
    const ics = generateIcs([sampleMatch], { calendarName: 'T1', now: FIXED_NOW });
    expect(ics).toContain('\r\n');
  });

  it('빈 배열이어도 유효한 ICS를 만든다', () => {
    const ics = generateIcs([], { calendarName: 'T1', now: FIXED_NOW });
    expect(ics).toMatch(/^BEGIN:VCALENDAR/);
    expect(ics).toMatch(/END:VCALENDAR\r\n$/);
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('같은 입력이면 같은 출력 (순수성)', () => {
    const a = generateIcs([sampleMatch], { calendarName: 'T1', now: FIXED_NOW });
    const b = generateIcs([sampleMatch], { calendarName: 'T1', now: FIXED_NOW });
    expect(a).toBe(b);
  });
});
