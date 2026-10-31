import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shrinkPhoto } from "@/features/companies/photo-image";
import { uploadEventRegistrationPhoto } from "./api";
import { reportEventPhotoDiagnostic } from "./photo-upload-diagnostics";
import { EVENT_PHOTO_SLOW_MS, EVENT_PHOTO_TIMEOUT_MS, startEventPhotoUpload } from "./photo-upload-task";

vi.mock("@sentry/nextjs", () => ({}));
vi.mock("./api", () => ({ uploadEventRegistrationPhoto: vi.fn() }));
vi.mock("./photo-upload-diagnostics", () => ({ reportEventPhotoDiagnostic: vi.fn() }));
vi.mock("@/features/companies/photo-image", async (original) => ({
  ...await original<typeof import("@/features/companies/photo-image")>(), shrinkPhoto: vi.fn(),
}));

const photo = new Blob(["jpeg"], { type: "image/jpeg" });
const file = () => new File(["source"], "private-name.heic", { type: "image/heic" });
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.mocked(shrinkPhoto).mockResolvedValue(photo);
  vi.mocked(uploadEventRegistrationPhoto).mockResolvedValue("key");
});
afterEach(() => vi.useRealTimers());

describe("명함 사진 작업", () => {
  it("정상 처리 시 단계·signal·오류 ID를 전달하고 지연 진단을 남기지 않는다", async () => {
    const progress = vi.fn();
    const task = startEventPhotoUpload(2, file(), progress);
    expect(await task.result).toEqual({ photo, uploadKey: "key" });
    expect(progress.mock.calls.map(([value]) => value)).toEqual([
      { stage: "PREPARING", slow: false }, { stage: "UPLOADING", slow: false },
    ]);
    expect(uploadEventRegistrationPhoto).toHaveBeenCalledWith(2, photo, {
      signal: expect.any(AbortSignal), incidentId: task.incidentId,
    });
    await vi.advanceTimersByTimeAsync(200_000);
    expect(reportEventPhotoDiagnostic).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["PREPARING", "UPLOADING"] as const)("%s 미응답은 지연 1회·시간 초과 1회로 기록하고 중단한다", async (stage) => {
    if (stage === "PREPARING") vi.mocked(shrinkPhoto).mockReturnValue(new Promise(() => {}));
    else vi.mocked(uploadEventRegistrationPhoto).mockReturnValue(new Promise(() => {}));
    const task = startEventPhotoUpload(2, file(), vi.fn());
    const caught = task.result.catch((error: Error) => error);
    await vi.advanceTimersByTimeAsync(EVENT_PHOTO_SLOW_MS);
    expect(reportEventPhotoDiagnostic).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(EVENT_PHOTO_TIMEOUT_MS[stage]);
    expect((await caught as Error).message).toContain(task.incidentId);
    expect(reportEventPhotoDiagnostic).toHaveBeenCalledTimes(2);
    expect(reportEventPhotoDiagnostic).toHaveBeenLastCalledWith(expect.objectContaining({ stage, result: "TIMED_OUT" }));
    expect(vi.mocked(shrinkPhoto).mock.calls[0][1]!.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("준비 중 취소 후 늦게 변환이 끝나도 업로드를 시작하거나 실패 진단을 남기지 않는다", async () => {
    let finish!: (value: Blob) => void;
    vi.mocked(shrinkPhoto).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const task = startEventPhotoUpload(2, file(), vi.fn());
    const caught = task.result.catch((error: Error) => error);
    await vi.advanceTimersByTimeAsync(1);
    task.cancel();
    expect(await caught).toMatchObject({ name: "AbortError" });
    finish(photo);
    await vi.advanceTimersByTimeAsync(200_000);
    expect(uploadEventRegistrationPhoto).not.toHaveBeenCalled();
    expect(reportEventPhotoDiagnostic).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("시간 초과 후 늦은 실패도 추가 보고하거나 업로드하지 않는다", async () => {
    let fail!: (error: Error) => void;
    vi.mocked(shrinkPhoto).mockReturnValue(new Promise((_, reject) => { fail = reject; }));
    const task = startEventPhotoUpload(2, file(), vi.fn());
    const caught = task.result.catch((error: Error) => error);
    await vi.advanceTimersByTimeAsync(60_000);
    await caught;
    fail(new Error("late failure"));
    await vi.advanceTimersByTimeAsync(200_000);
    expect(reportEventPhotoDiagnostic).toHaveBeenCalledTimes(2);
    expect(uploadEventRegistrationPhoto).not.toHaveBeenCalled();
  });

  it("사진 변환 실패도 단계·오류 ID로 기록하되 임의 원문 오류는 안내에 노출하지 않는다", async () => {
    vi.mocked(shrinkPhoto).mockRejectedValue(new Error("private-name.heic internal"));
    const task = startEventPhotoUpload(2, file(), vi.fn());
    await expect(task.result).rejects.toThrow(`오류 ID ${task.incidentId}`);
    expect(reportEventPhotoDiagnostic).toHaveBeenCalledOnce();
    expect(reportEventPhotoDiagnostic).toHaveBeenCalledWith(expect.objectContaining({ stage: "PREPARING", result: "FAILED" }));
    expect(vi.getTimerCount()).toBe(0);
  });
});
