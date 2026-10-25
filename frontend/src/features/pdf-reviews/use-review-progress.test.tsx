// @vitest-environment jsdom
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPdfReviewProgress } from "./api";
import type { ReviewProgress } from "./types";
import { useReviewProgress } from "./use-review-progress";

vi.mock("./api", () => ({ fetchPdfReviewProgress: vi.fn(), isUnauthorized: (cause: unknown) => cause instanceof Error && "status" in cause && cause.status === 401 }));
const pending: ReviewProgress = { total: 7, uploading: 0, waiting: 4, completed: 2, partial: 0, failed: 1, complete: false };
const finished: ReviewProgress = { ...pending, waiting: 0, completed: 6, complete: true };
let root: Root;
let result: ReturnType<typeof useReviewProgress>;
let options: Parameters<typeof useReviewProgress>[0];
let hidden: boolean;
const onChanged = vi.fn();
const onUnauthorized = vi.fn();

function Harness() { const value = useReviewProgress(options); useEffect(() => { result = value; }); return null; }
async function render() { await act(async () => root.render(<Harness />)); }
async function tick(ms = 3_000) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  hidden = false;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  root = createRoot(document.createElement("div"));
  options = { reviewId: "review-a", uploading: false, refreshKey: "0", onChanged, onUnauthorized };
  onChanged.mockResolvedValue(true);
  vi.mocked(fetchPdfReviewProgress).mockResolvedValue(pending);
});
afterEach(() => { act(() => root.unmount()); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("심사 처리 진행률 폴링", () => {
  it("처리 중 3초마다 조회하고 실패를 포함한 처리 종료 뒤에는 멈춘다", async () => {
    vi.mocked(fetchPdfReviewProgress).mockResolvedValueOnce(pending).mockResolvedValue(finished);
    await render();
    expect(result.progress).toEqual(pending);
    await tick();
    expect(result.progress?.complete).toBe(true);
    expect(onChanged).toHaveBeenCalledTimes(2);
    await tick(30_000);
    expect(fetchPdfReviewProgress).toHaveBeenCalledTimes(2);
  });

  it("집계가 같으면 전체 지원자 목록을 반복 조회하지 않는다", async () => {
    await render(); await tick(9_000);
    expect(fetchPdfReviewProgress).toHaveBeenCalledTimes(4);
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("아직 브라우저가 파일을 올리는 동안에는 서버 complete여도 계속 확인한다", async () => {
    vi.mocked(fetchPdfReviewProgress).mockResolvedValue(finished);
    options = { ...options, uploading: true };
    await render(); await tick();
    expect(fetchPdfReviewProgress).toHaveBeenCalledTimes(2);
    options = { ...options, uploading: false };
    await render(); await tick(30_000);
    expect(fetchPdfReviewProgress).toHaveBeenCalledTimes(3);
  });

  it("요청이 느려도 겹쳐 보내지 않고 화면을 벗어나면 중단한다", async () => {
    vi.mocked(fetchPdfReviewProgress).mockImplementation(() => new Promise(() => {}));
    await render(); await tick(30_000);
    expect(fetchPdfReviewProgress).toHaveBeenCalledTimes(1);
    const signal = vi.mocked(fetchPdfReviewProgress).mock.calls[0][1];
    options = { ...options, reviewId: null }; await render();
    expect(signal?.aborted).toBe(true);
    await tick(30_000);
    expect(fetchPdfReviewProgress).toHaveBeenCalledTimes(1);
  });

  it("심사함을 바꾼 뒤 도착한 이전 응답은 현재 진행률을 덮어쓰지 않는다", async () => {
    let resolve!: (value: ReviewProgress) => void;
    vi.mocked(fetchPdfReviewProgress).mockImplementationOnce(() => new Promise(done => { resolve = done; }))
      .mockResolvedValue(finished);
    await render();
    options = { ...options, reviewId: "review-b" }; await render();
    await act(async () => resolve(pending));
    expect(result.progress).toEqual(finished);
  });

  it("조회 오류는 완료로 처리하지 않고 자동 재시도로 복구한다", async () => {
    vi.mocked(fetchPdfReviewProgress).mockRejectedValueOnce(new Error("temporary")).mockResolvedValue(finished);
    await render();
    expect(result.error).toBe("temporary");
    expect(result.progress).toBeNull();
    await tick();
    expect(result.error).toBe("");
    expect(result.progress?.complete).toBe(true);
  });

  it("완료 집계를 받아도 지원자 목록 갱신에 실패하면 다시 확인한다", async () => {
    vi.mocked(fetchPdfReviewProgress).mockResolvedValue(finished);
    onChanged.mockResolvedValueOnce(false).mockResolvedValue(true);
    await render();
    expect(result.error).toContain("목록을 갱신하지 못했습니다");
    await tick(); await tick(30_000);
    expect(onChanged).toHaveBeenCalledTimes(2);
    expect(fetchPdfReviewProgress).toHaveBeenCalledTimes(2);
  });

  it("세션 만료 시 요청을 멈추고 재로그인을 안내한다", async () => {
    vi.mocked(fetchPdfReviewProgress).mockRejectedValue(Object.assign(new Error("로그인 필요"), { status: 401 }));
    await render(); await tick(30_000);
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); result.recheck(); });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(fetchPdfReviewProgress).toHaveBeenCalledTimes(1);
  });

  it("숨긴 화면에서는 멈추고 돌아오면 완료 상태여도 한 번 다시 확인한다", async () => {
    vi.mocked(fetchPdfReviewProgress).mockResolvedValue(finished);
    await render();
    hidden = true;
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    await tick(30_000);
    expect(fetchPdfReviewProgress).toHaveBeenCalledTimes(1);
    hidden = false;
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    expect(fetchPdfReviewProgress).toHaveBeenCalledTimes(2);
  });

  it("완료로 멈춘 뒤에도 다음 지원자를 열면 진행률을 다시 확인한다", async () => {
    vi.mocked(fetchPdfReviewProgress).mockResolvedValueOnce(finished).mockResolvedValue(pending);
    await render(); await tick(30_000);
    expect(fetchPdfReviewProgress).toHaveBeenCalledTimes(1);
    await act(async () => result.recheck());
    expect(result.progress).toEqual(pending);
    await tick();
    expect(fetchPdfReviewProgress).toHaveBeenCalledTimes(3);
  });
});
