/**
 * 도메인 핵심 타입.
 *
 * 설계 원칙:
 * - 모든 필드 readonly: 불변성
 * - 시간은 UTC ISO 8601로 통일: 시간대 변환은 ICS 출력 시점(generateIcs)에만 적용
 * - id는 fetcher가 결정한 UID: ICS UID로 그대로 사용 → 멱등성 (같은 매치 항상 같은 UID)
 *   · 네이버: `"naver:<gameId>"` — 다른 소스로 전환할 일이 생기면 namespace 분리에 유리
 * - 도메인 타입은 source-agnostic: 네이버 응답 구조 변경되어도 이 타입이 변경 차단막
 */

/**
 * 한 e스포츠 매치 (1 vs 1 대결).
 *
 * 데이터 흐름: 네이버 응답 → `parseNaverResponse` → Match → `selectActiveTeamMatches`
 *  → `generateIcs` → ICS VEVENT.
 */
export interface Match {
  /** ICS UID. 네이버: `naver:<gameId>`. 같은 매치는 항상 같은 id → 캘린더 멱등 갱신. */
  readonly id: string;
  /** 대회 + 라운드 정보. ICS SUMMARY에 함께 표시. */
  readonly tournament: TournamentInfo;
  /** 첫 번째 팀 (홈). */
  readonly teamA: Team;
  /** 두 번째 팀 (원정). */
  readonly teamB: Team;
  /** 매치 시작 시각 (UTC ISO 8601). 출력 시점에 KST로 변환. */
  readonly startsAt: string;
  /** Best of 카운트. Bo1 / Bo3 / Bo5만 허용 (도메인 외는 parser에서 skip). */
  readonly bestOf: BestOf;
  /** 매치 상태. ICS STATUS 필드로 매핑. */
  readonly status: MatchStatus;
}

/**
 * 대회 + 라운드를 함께 묶음.
 *
 * 왜 둘로 나눠 두는가:
 *   - `displayName`: 대회 자체 이름. 예: "LCK", "MSI", "월드 챔피언십"
 *     (네이버 응답에 없어서 `NAVER_LEAGUE_DISPLAY_NAMES`로 주입)
 *   - `stage`: 대회 내 라운드. 예: "정규시즌 1R", "플레이오프 4강", "결승"
 *     (네이버 `title` 필드 그대로)
 *
 * ICS SUMMARY 예: `T1 vs 젠지 — LCK 정규시즌 1R (Bo3)` (displayName + stage 결합).
 * 두 정보 출처·갱신 주기·의미가 달라 분리 보관.
 */
export interface TournamentInfo {
  readonly displayName: string;
  readonly stage: string;
}

/**
 * 매치에 출전한 팀.
 *
 * 출처: 네이버 응답의 `homeTeam`/`awayTeam`.
 */
export interface Team {
  /** 영문 약어. 필터링 키 (예: "T1", "GEN", "HLE"). 네이버 `nameEngAcronym`. */
  readonly code: string;
  /** 한국어 표시명. ICS SUMMARY에 노출 (예: "T1", "젠지", "한화생명"). 네이버 `name`. */
  readonly displayName: string;
}

/**
 * Best of 카운트. 도메인이 허용하는 값만 union으로 강제.
 *
 * Bo2/Bo7 등 도메인 외 값은 parser(`parseNaverResponse`)에서 silent skip.
 * 10개 fixture 실측에서는 1·3·5만 등장 — 안전 가드는 미래·이상 응답 방어용.
 */
export type BestOf = 1 | 3 | 5;

/**
 * 매치 상태 — ICS STATUS 필드에 매핑.
 *
 * - `scheduled`: 아직 시작 안 함. 네이버 `BEFORE`. → ICS `CONFIRMED`
 * - `completed`: 끝남. 네이버 `RESULT`. → ICS `CONFIRMED` (결과 노출 X — 스포일러 회피)
 * - `canceled`: 취소됨. 네이버 `CANCEL`. → ICS `CANCELLED`
 *
 * 10개 fixture 실측에서 `canceled` 직접 관측은 0건. 다만 코로나·정전·항의 등
 * 매치 취소 사례가 LCK 역사상 실재 → 안전망으로 유지.
 */
export type MatchStatus = 'scheduled' | 'completed' | 'canceled';
