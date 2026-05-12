/**
 * Match[] → RFC 5545 ICS 문자열.
 *
 * 완전한 순수 함수. 동일 입력 → 동일 출력 (DTSTAMP 제외).
 *
 * 핵심 규칙 (plan.md §6):
 * - UID = match.id 그대로 → 멱등성 (캘린더 갱신 시 중복 없이 같은 이벤트 갱신)
 * - DTSTART/DTEND는 KST (TZID=Asia/Seoul) → 한국 사용자 직관적
 * - DTEND는 bestOf 기반 추정 (API가 종료 시간 미제공)
 * - VALARM 미포함 → 캘린더 앱에 위임 (§6.1 다정한 서비스 철학)
 * - VTIMEZONE 블록 명시 → Apple Calendar / Outlook 호환
 * - RFC 5545 라인 폴딩: 75바이트 초과 시 줄바꿈 + 1칸 들여쓰기
 */

import type { Match } from './core/types.js';

const TZID = 'Asia/Seoul';
const PRODID = '-//lck-schedule-sync//T1//KO';

/**
 * Bo별 예상 종료 시간 (시간 단위).
 *
 * 실측 기반 평균 (정규시즌 데이터):
 * - Bo1: 30~50분 → 1시간 보수적
 * - Bo3: 2~3시간 → 3시간
 * - Bo5: 3.5~5시간 → 4.5시간
 */
const ESTIMATED_HOURS_BY_BEST_OF: Readonly<Record<1 | 3 | 5, number>> = {
  1: 1,
  3: 3,
  5: 4.5,
};

export interface IcsOptions {
  /** 캘린더 제목 (X-WR-CALNAME). 예: "T1 LCK 일정" */
  readonly calendarName: string;
  /** 현재 시각 (DTSTAMP용). 테스트에서 주입 가능. 미지정 시 new Date() */
  readonly now?: Date;
}

/**
 * Match 배열을 ICS 문자열로 변환.
 *
 * 사용 예:
 *   const ics = generateIcs(t1Matches, { calendarName: 'T1 LCK 일정' });
 *   fs.writeFileSync('public/t1.ics', ics);
 */
export function generateIcs(matches: readonly Match[], options: IcsOptions): string {
  const now = options.now ?? new Date();
  const lines: string[] = [];

  // Calendar header
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push(`PRODID:${PRODID}`);
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  lines.push(`X-WR-CALNAME:${escapeText(options.calendarName)}`);
  lines.push(`X-WR-TIMEZONE:${TZID}`);

  // VTIMEZONE 블록 (Apple Calendar / Outlook 호환)
  lines.push(...buildVTimezoneBlock());

  // 각 매치를 VEVENT로
  for (const match of matches) {
    lines.push(...buildVEventBlock(match, now));
  }

  lines.push('END:VCALENDAR');

  // RFC 5545: CRLF 줄바꿈, 75바이트 라인 폴딩
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/* ============================================================
 * VTIMEZONE — Asia/Seoul (UTC+9, DST 없음)
 * ============================================================ */

function buildVTimezoneBlock(): string[] {
  return [
    'BEGIN:VTIMEZONE',
    `TZID:${TZID}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0900',
    'TZOFFSETTO:+0900',
    'TZNAME:KST',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];
}

/* ============================================================
 * VEVENT — 개별 매치
 * ============================================================ */

function buildVEventBlock(match: Match, now: Date): string[] {
  const startUtc = new Date(match.startsAt);
  const estimatedDurationMs =
    ESTIMATED_HOURS_BY_BEST_OF[match.bestOf] * 60 * 60 * 1000;
  const endUtc = new Date(startUtc.getTime() + estimatedDurationMs);

  const summary = buildSummary(match);
  const description = buildDescription(match);

  return [
    'BEGIN:VEVENT',
    `UID:${match.id}@lck-schedule-sync`,
    `DTSTAMP:${formatUtcCompact(now)}`,
    `DTSTART;TZID=${TZID}:${formatKstCompact(startUtc)}`,
    `DTEND;TZID=${TZID}:${formatKstCompact(endUtc)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `STATUS:${match.status === 'canceled' ? 'CANCELLED' : 'CONFIRMED'}`,
    `URL:https://lolesports.com/`,
    'END:VEVENT',
  ];
}

function buildSummary(match: Match): string {
  // 예: "T1 vs 젠지 — LCK 2주 차 (Bo3)"
  const a = match.teamA.displayName;
  const b = match.teamB.displayName;
  const stage = match.tournament.stage ? ` ${match.tournament.stage}` : '';
  return `${a} vs ${b} — ${match.tournament.displayName}${stage} (Bo${match.bestOf})`;
}

function buildDescription(match: Match): string {
  // 줄바꿈은 \\n으로 escape됨 (escapeText 처리)
  const lines = [
    `${match.teamA.displayName} vs ${match.teamB.displayName}`,
    `${match.tournament.displayName} — ${match.tournament.stage}`,
    `Best of ${match.bestOf}`,
    '',
    '중계: https://lolesports.com/',
  ];
  return lines.join('\n');
}

/* ============================================================
 * 시간·텍스트 포맷팅 헬퍼
 * ============================================================ */

/**
 * UTC Date → YYYYMMDDTHHMMSSZ (Zulu time).
 * 예: 2026-05-12T03:45:00Z → 20260512T034500Z
 */
function formatUtcCompact(date: Date): string {
  const iso = date.toISOString();
  // "2026-05-12T03:45:00.000Z" → "20260512T034500Z"
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Date → KST 기준 YYYYMMDDTHHMMSS (Z 없음, TZID 명시 시 사용).
 *
 * UTC 시각에 +9h 더한 후 포맷팅. Asia/Seoul은 DST 없으므로 +9 고정.
 */
function formatKstCompact(utcDate: Date): string {
  const kst = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
  // Date의 UTC 메서드로 읽으면 KST 값을 얻을 수 있음 (시프트했으므로)
  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  const hh = String(kst.getUTCHours()).padStart(2, '0');
  const mi = String(kst.getUTCMinutes()).padStart(2, '0');
  const ss = String(kst.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}`;
}

/**
 * RFC 5545 text 필드 escape.
 * - 백슬래시: \\ → \\\\
 * - 줄바꿈: \\n → \\n (\\ + n)
 * - 콤마/세미콜론: 앞에 \\
 */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/**
 * RFC 5545 라인 폴딩.
 *
 * 라인이 75바이트(octet) 초과 시 75바이트마다 줄바꿈 + 1칸 들여쓰기.
 * 한국어 글자가 UTF-8에서 3바이트인 점을 고려해 문자 단위로 안전하게 누적.
 */
function foldLine(line: string): string {
  const MAX_BYTES = 75;
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= MAX_BYTES) return line;

  const chunks: string[] = [];
  let current = '';
  let currentBytes = 0;

  for (const char of line) {
    const charBytes = encoder.encode(char).length;
    if (currentBytes + charBytes > MAX_BYTES) {
      chunks.push(current);
      current = char;
      currentBytes = charBytes;
    } else {
      current += char;
      currentBytes += charBytes;
    }
  }
  if (current.length > 0) chunks.push(current);

  return chunks.map((c, i) => (i === 0 ? c : ' ' + c)).join('\r\n');
}
