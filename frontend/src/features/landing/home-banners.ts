import { AUDITION_ALERT_CHAT_URL } from "@/features/audition-posts/types";
import { eventRoutes, type EventBanner } from "@/features/events/types";

type BannerImage = { readonly src: string; readonly width: number; readonly height: number };

export type HomeBanner = {
  readonly id: string;
  readonly title: string;
  readonly tone: "blue" | "mint";
  readonly href: string;
  /** 외부 주소는 새 창으로 연다. 이벤트 배너는 같은 창에서 이벤트 상세로 간다. */
  readonly external: boolean;
  /** 저장소에서 내려온 이미지는 Next 이미지 최적화를 거치지 않는다. */
  readonly remote: boolean;
  readonly linkLabel: string;
  readonly alt: string;
  readonly desktop: BannerImage;
  readonly mobile: BannerImage;
};

/** 코드에 고정한 배너. 기간이 정해진 모집 배너는 이벤트 글에서 배너 노출을 켜서 올린다. */
export const HOME_BANNERS: readonly HomeBanner[] = [
  {
    id: "audition-alert", title: "오디션 알림", tone: "blue",
    href: AUDITION_ALERT_CHAT_URL, external: true, remote: false,
    linkLabel: "예술in 오픈채팅에서 오디션 알림 받기",
    alt: "예술in 오픈채팅 · 새 오디션 소식 카톡으로 받아보세요 · 오디션 알림 받기",
    desktop: { src: "/images/banners/openchat-slim-desktop.webp", width: 2171, height: 724 },
    mobile: { src: "/images/banners/openchat-highlight-mobile.webp", width: 1448, height: 1086 },
  },
  {
    id: "actors-sharing", title: "배우 정보 공유방", tone: "mint",
    href: "https://open.kakao.com/o/pkaXyeSi", external: true, remote: false,
    linkLabel: "뮤지컬·연극 배우 정보 공유 오픈채팅방 참여하기",
    alt: "예술in 배우 정보 공유 오픈채팅방 · 오디션 · 공연 소식 · 활동 팁 · 오픈채팅 참여하기",
    desktop: { src: "/images/banners/actors-sharing-desktop.webp", width: 2172, height: 724 },
    mobile: { src: "/images/banners/actors-sharing-mobile.webp", width: 1448, height: 1086 },
  },
];

/** 이벤트 배너는 크기를 모르므로 칸 비율(PC 3.2:1, 모바일 4:3)의 기준 크기로 자리를 잡는다. */
const EVENT_DESKTOP_SIZE = { width: 2160, height: 675 } as const;
const EVENT_MOBILE_SIZE = { width: 1440, height: 1080 } as const;

/** 노출 중인 이벤트 배너를 서버가 준 순서대로 고정 배너 앞에 넣는다. */
export function homeBanners(events: readonly EventBanner[]): readonly HomeBanner[] {
  return [...events.map(eventHomeBanner), ...HOME_BANNERS];
}

function eventHomeBanner(event: EventBanner): HomeBanner {
  return {
    id: `event-${event.eventId}`,
    title: event.title,
    tone: "blue",
    href: eventRoutes.detail(event.eventId),
    external: false,
    remote: true,
    linkLabel: `${event.title} 이벤트 보기`,
    alt: event.alt,
    desktop: { src: event.desktopImageUrl, ...EVENT_DESKTOP_SIZE },
    mobile: { src: event.mobileImageUrl, ...EVENT_MOBILE_SIZE },
  };
}

export type BannerSlideState = {
  readonly active: number;
  readonly previous: number | null;
  readonly direction: "next" | "previous";
};

type BannerSlideAction =
  | { readonly type: "move"; readonly delta: number; readonly count: number; readonly reducedMotion: boolean }
  | { readonly type: "finish" };

export const INITIAL_BANNER_SLIDE: BannerSlideState = { active: 0, previous: null, direction: "next" };

/** 세로 스크롤·짧은 흔들림을 제외하고, 가로로 충분히 민 방향만 이동으로 판단한다. */
export function bannerSwipeDirection(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) <= 48 || Math.abs(dx) <= Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}

/** 끝에서도 같은 방향으로 전환하며, 진행 중인 애니메이션에 중복 이동을 쌓지 않는다. */
export function bannerSlideReducer(state: BannerSlideState, action: BannerSlideAction): BannerSlideState {
  if (action.type === "finish") return state.previous === null ? state : { ...state, previous: null };
  if (state.previous !== null || action.count < 2 || action.delta === 0) return state;
  const active = ((state.active + action.delta) % action.count + action.count) % action.count;
  if (active === state.active) return state;
  return { active, previous: action.reducedMotion ? null : state.active, direction: action.delta > 0 ? "next" : "previous" };
}
