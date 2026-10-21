/** 진행 기간으로 본 이벤트 단계. 백엔드가 한국 날짜로 계산한다. 기간을 비운 이벤트는 늘 진행 중이다. */
export type EventPhase = "UPCOMING" | "ONGOING" | "ENDED";

/** 이벤트 목록 카드. 백엔드 `PublicEventSummaryResult`와 같다. */
export type PublicEventSummary = {
  readonly id: number;
  readonly title: string;
  readonly summary: string | null;
  /** `YYYY-MM-DD` */
  readonly startsOn: string | null;
  /** `YYYY-MM-DD` */
  readonly endsOn: string | null;
  readonly phase: EventPhase;
  readonly coverImageUrl: string | null;
};

/** 이벤트 상세. 백엔드 `PublicEventResult`와 같다. */
export type PublicEvent = PublicEventSummary & {
  /** 줄바꿈을 그대로 보여 준다. */
  readonly body: string;
  /** 신청 버튼이 여는 주소. 없으면 버튼이 없다. */
  readonly applyUrl: string | null;
  readonly applyLabel: string | null;
};

/** 메인 상단에 지금 보일 이벤트 배너. 누르면 이벤트 상세로 간다. 백엔드 `EventBannerResult`와 같다. */
export type EventBanner = {
  readonly eventId: number;
  readonly title: string;
  readonly alt: string;
  readonly desktopImageUrl: string;
  readonly mobileImageUrl: string;
};

export const EVENT_PHASE_LABELS: Readonly<Record<EventPhase, string>> = {
  UPCOMING: "예정",
  ONGOING: "진행 중",
  ENDED: "마감",
};

export const DEFAULT_APPLY_LABEL = "신청하기";

export const eventApiPaths = {
  list: "/v1/public/events",
  detail: (eventId: number | string) => `/v1/public/events/${encodeURIComponent(String(eventId))}`,
  banners: "/v1/public/events/banners",
} as const;

export const eventRoutes = {
  list: "/events",
  detail: (eventId: number | string) => `/events/${encodeURIComponent(String(eventId))}`,
} as const;

/** `2026.10.01 ~ 10.16`처럼 기간을 짧게 쓴다. 해가 다르면 끝에도 해를 쓰고, 기간이 없으면 null이다. */
export function formatEventPeriod(startsOn: string | null, endsOn: string | null): string | null {
  const dot = (date: string) => date.replaceAll("-", ".");
  if (startsOn && endsOn) {
    const sameYear = startsOn.slice(0, 4) === endsOn.slice(0, 4);
    return `${dot(startsOn)} ~ ${sameYear ? dot(endsOn.slice(5)) : dot(endsOn)}`;
  }
  if (startsOn) return `${dot(startsOn)}부터`;
  if (endsOn) return `${dot(endsOn)}까지`;
  return null;
}
