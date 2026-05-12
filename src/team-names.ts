/**
 * LCK 영문 팀명 → 한국어 표시명 매핑.
 *
 * lolesports API가 hl=ko-KR을 무시하고 영문 팀명을 주는 문제 해결.
 * 키는 API의 team.code (안정적), team.name (변동 가능)로 fallback.
 *
 * 매핑 출처: 나무위키 LCK 팀별 공식 한국어 표기 (2026 시즌 기준)
 *
 * 미매핑 시 영문 그대로 사용 (graceful fallback).
 */

const TEAM_NAME_BY_CODE: Readonly<Record<string, string>> = {
  T1: 'T1',
  GEN: '젠지',
  HLE: '한화생명',
  DK: '디플러스 기아',
  KT: 'KT',
  KRX: 'DRX', // 키움증권 후원으로 KRX 코드 사용 (2026)
  BRO: '한진 브리온', // 한진그룹 후원 (2026)
  BFX: 'BNK 피어엑스', // BNK FearX (구 광동 프릭스, 리브랜딩)
  NS: '농심',
  DNS: 'DN 수퍼스', // DN SOOPers (구 DN Freecs, 리브랜딩)
};

/**
 * 영문 팀 코드/이름 → 한국어 표시명.
 *
 * @param code lolesports team.code (예: "T1", "GEN")
 * @param fallbackName lolesports team.name (영문 풀네임, 매핑 실패 시 사용)
 * @returns 한국어 표시명 (예: "T1", "젠지"), 매핑 실패 시 fallbackName 또는 code
 */
export function toKoreanTeamName(code: string, fallbackName?: string): string {
  const mapped = TEAM_NAME_BY_CODE[code];
  if (mapped !== undefined) return mapped;
  return fallbackName ?? code;
}
