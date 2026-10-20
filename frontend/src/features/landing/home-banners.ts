import { AUDITION_ALERT_CHAT_URL } from "@/features/audition-posts/types";

export const HOME_BANNERS = [
  {
    id: "audition-alert", title: "오디션 알림", tone: "blue",
    href: AUDITION_ALERT_CHAT_URL,
    linkLabel: "예술in 오픈채팅에서 오디션 알림 받기",
    alt: "예술in 오픈채팅 · 새 오디션 소식 카톡으로 받아보세요 · 오디션 알림 받기",
    desktop: { src: "/images/banners/openchat-slim-desktop.webp", width: 2171, height: 724 },
    mobile: { src: "/images/banners/openchat-highlight-mobile.webp", width: 1448, height: 1086 },
  },
  {
    id: "actors-sharing", title: "배우 정보 공유방", tone: "mint",
    href: "https://open.kakao.com/o/pkaXyeSi",
    linkLabel: "뮤지컬·연극 배우 정보 공유 오픈채팅방 참여하기",
    alt: "예술in 배우 정보 공유 오픈채팅방 · 오디션 · 공연 소식 · 활동 팁 · 오픈채팅 참여하기",
    desktop: { src: "/images/banners/actors-sharing-desktop.webp", width: 2172, height: 724 },
    mobile: { src: "/images/banners/actors-sharing-mobile.webp", width: 1448, height: 1086 },
  },
] as const;

export type HomeBanner = typeof HOME_BANNERS[number];

export type BannerSlideState = {
  readonly active: number;
  readonly previous: number | null;
  readonly direction: "next" | "previous";
};

type BannerSlideAction =
  | { readonly type: "move"; readonly delta: number; readonly count: number; readonly reducedMotion: boolean }
  | { readonly type: "finish" };

export const INITIAL_BANNER_SLIDE: BannerSlideState = { active: 0, previous: null, direction: "next" };

/** 끝에서도 같은 방향으로 전환하며, 진행 중인 애니메이션에 중복 이동을 쌓지 않는다. */
export function bannerSlideReducer(state: BannerSlideState, action: BannerSlideAction): BannerSlideState {
  if (action.type === "finish") return state.previous === null ? state : { ...state, previous: null };
  if (state.previous !== null || action.count < 2 || action.delta === 0) return state;
  const active = ((state.active + action.delta) % action.count + action.count) % action.count;
  if (active === state.active) return state;
  return { active, previous: action.reducedMotion ? null : state.active, direction: action.delta > 0 ? "next" : "previous" };
}
