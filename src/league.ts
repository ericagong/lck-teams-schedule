/**
 * League — 도메인 식별자 + 표시명 메타.
 *
 * 닫힌 집합(우리가 발행하는 6 대회). Naver topLeagueId·표시명이
 * 외부에 새지 않고 League로 번역되어 들어옴.
 */

export const ALL_LEAGUES = ['LCK', 'MSI', 'WORLDS', 'FIRST_STAND', 'EWC', 'KESPA_CUP'] as const;

export type League = (typeof ALL_LEAGUES)[number];

export const LEAGUE_DISPLAY_NAME: Readonly<Record<League, string>> = {
  LCK: 'LCK',
  MSI: 'MSI',
  WORLDS: '월드 챔피언십',
  FIRST_STAND: 'First Stand',
  EWC: 'EWC',
  KESPA_CUP: 'KeSPA Cup',
};
