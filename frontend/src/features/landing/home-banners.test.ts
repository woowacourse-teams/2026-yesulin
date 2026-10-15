import { describe, expect, it } from "vitest";
import { bannerSlideReducer, INITIAL_BANNER_SLIDE } from "./home-banners";

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
