// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const capture = vi.hoisted(() => vi.fn());
vi.mock("./product-analytics", () => ({ trackProductEvent: capture }));
let focused = true;
let visible = true;
let stop: (() => void) | undefined;
const total = () => capture.mock.calls.filter(c => c[0] === "review_active_time").reduce((sum, c) => sum + c[1].active_ms, 0);
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(0); capture.mockReset(); focused = true; visible = true;
  vi.spyOn(document, "hasFocus").mockImplementation(() => focused);
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visible ? "visible" : "hidden");
});
afterEach(() => { stop?.(); stop = undefined; vi.useRealTimers(); vi.restoreAllMocks(); });
describe("심사 시간 이벤트 경계", () => {
  it("다른 탭의 시간을 제외하고 돌아오면 다시 센다", async () => {
    const { startReviewTimer } = await import("./review-timer");
    stop = startReviewTimer({ workflow: "producer_pdf", review_id: "r", item_id: "a" });
    vi.advanceTimersByTime(5_000); focused = false; window.dispatchEvent(new Event("blur"));
    visible = false; document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(60_000); expect(total()).toBe(5_000);
    visible = true; focused = true; window.dispatchEvent(new Event("focus"));
    vi.advanceTimersByTime(7_000); stop(); stop(); expect(total()).toBe(12_000);
  });
  it("무조작 2분 뒤는 제외하고 상호작용 뒤부터 다시 센다", async () => {
    const { startReviewTimer } = await import("./review-timer"); stop = startReviewTimer({ item_id: "a" });
    vi.advanceTimersByTime(180_000); expect(total()).toBe(120_000);
    window.dispatchEvent(new Event("pointerdown")); vi.advanceTimersByTime(10_000); stop();
    expect(total()).toBe(130_000);
  });
  it("지원자 전환은 시간만 마무리하고 판정 저장을 만들지 않는다", async () => {
    const { startReviewTimer } = await import("./review-timer");
    const first = startReviewTimer({ item_id: "a" }); vi.advanceTimersByTime(4_000);
    stop = startReviewTimer({ item_id: "b" }); first(); vi.advanceTimersByTime(6_000); stop();
    expect(total()).toBe(10_000);
    expect(capture.mock.calls.filter(c => c[0] === "review_item_viewed")).toHaveLength(2);
    expect(capture.mock.calls.some(c => c[0] === "review_saved")).toBe(false);
  });
});
