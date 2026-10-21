import { describe, expect, it } from "vitest";
import { bannerSlideReducer, homeBanners, INITIAL_BANNER_SLIDE } from "./home-banners";

const move = (delta: number, reducedMotion = false) => ({ type: "move" as const, delta, count: 3, reducedMotion });

describe("배너 방향 전환과 입력 잠금", () => {
  it("마지막 다음과 첫 번째 이전을 순환하면서 이동 방향을 유지한다", () => {
    expect(bannerSlideReducer({ ...INITIAL_BANNER_SLIDE, active: 2 }, move(1)))
      .toEqual({ active: 0, previous: 2, direction: "next" });
    expect(bannerSlideReducer(INITIAL_BANNER_SLIDE, move(-1)))
      .toEqual({ active: 2, previous: 0, direction: "previous" });
  });

  it("빠른 중복 입력은 무시하고 전환이 끝난 후 다음 입력을 받는다", () => {
    const transitioning = bannerSlideReducer(INITIAL_BANNER_SLIDE, move(1));
    expect(bannerSlideReducer(transitioning, move(1))).toBe(transitioning);
    const ready = bannerSlideReducer(transitioning, { type: "finish" });
    expect(bannerSlideReducer(ready, move(1))).toEqual({ active: 2, previous: 1, direction: "next" });
  });

  it("동작 감소에서는 애니메이션 잠금 없이 즉시 이동한다", () => {
    const state = bannerSlideReducer(INITIAL_BANNER_SLIDE, move(1, true));
    expect(state.previous).toBeNull();
    expect(bannerSlideReducer(state, move(1, true)).active).toBe(2);
  });

  it("단일 배너나 이동 없는 요청에는 전환하지 않는다", () => {
    expect(bannerSlideReducer(INITIAL_BANNER_SLIDE, { ...move(1), count: 1 })).toBe(INITIAL_BANNER_SLIDE);
    expect(bannerSlideReducer(INITIAL_BANNER_SLIDE, move(0))).toBe(INITIAL_BANNER_SLIDE);
  });
});

describe("이벤트 배너 끼워 넣기", () => {
  it("오디션 알림 다음, 배우 정보 공유방 앞에 이벤트 상세로 가는 배너를 서버 순서대로 넣는다", () => {
    const banners = homeBanners([
      { eventId: 7, title: "2기 서포터즈", alt: "2기 서포터즈 모집", desktopImageUrl: "https://cdn.test/d.webp", mobileImageUrl: "https://cdn.test/m.webp" },
      { eventId: 3, title: "여름 이벤트", alt: "여름 이벤트", desktopImageUrl: "https://cdn.test/d2.webp", mobileImageUrl: "https://cdn.test/m2.webp" },
    ]);

    expect(banners.map((banner) => banner.id)).toEqual(["audition-alert", "event-7", "event-3", "actors-sharing"]);
    expect(banners[1]).toMatchObject({ href: "/events/7", external: false, remote: true, alt: "2기 서포터즈 모집" });
  });

  it("노출 중인 이벤트가 없으면 고정 배너만 보인다", () => {
    expect(homeBanners([]).map((banner) => banner.id)).toEqual(["audition-alert", "actors-sharing"]);
  });
});
