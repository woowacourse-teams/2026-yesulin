import { afterEach, describe, expect, it, vi } from "vitest";
import { reportError } from "@/features/monitoring/report-error";
import { uploadEventRegistrationPhoto } from "./api";

vi.mock("@/features/monitoring/report-error", () => ({ reportError: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

const photo = () => new Blob(["jpeg"], { type: "image/jpeg" });
const prepared = () => Response.json({ uploadKey: "key", url: "https://storage.test/photo", method: "PUT", headers: { "Content-Type": "image/jpeg" } });

describe("명함 사진 실제 업로드 연결", () => {
  it("오류 ID를 API에 보내고 signal을 업로드 요청과 저장소 PUT에 전달한다", async () => {
    vi.stubGlobal("document", { cookie: "XSRF-TOKEN=csrf" });
    const fetcher = vi.fn().mockResolvedValueOnce(prepared()).mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    const controller = new AbortController();
    expect(await uploadEventRegistrationPhoto(2, photo(), { signal: controller.signal, incidentId: "photo-test-id" })).toBe("key");
    expect(fetcher).toHaveBeenNthCalledWith(1, expect.stringContaining("photo-uploads"), expect.objectContaining({
      signal: controller.signal, headers: expect.objectContaining({ "X-Request-Id": "photo-test-id", "X-CSRF-Token": "csrf" }),
    }));
    expect(fetcher).toHaveBeenNthCalledWith(2, "https://storage.test/photo", expect.objectContaining({ signal: controller.signal, method: "PUT" }));
  });

  it("CSRF 준비 중 취소하면 해당 요청도 중단하고 사진 업로드 요청을 보내지 않는다", async () => {
    vi.stubGlobal("document", { cookie: "" });
    const controller = new AbortController();
    const fetcher = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_, reject) => {
      init.signal!.addEventListener("abort", () => reject(init.signal!.reason), { once: true });
      controller.abort();
    }));
    vi.stubGlobal("fetch", fetcher);
    await expect(uploadEventRegistrationPhoto(2, photo(), { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith("/api/v1/sessions/current", expect.objectContaining({ signal: controller.signal }));
    expect(reportError).not.toHaveBeenCalled();
  });

  it("PUT 중 취소하면 재전송이나 오류 보고를 하지 않는다", async () => {
    vi.stubGlobal("document", { cookie: "XSRF-TOKEN=csrf" });
    const controller = new AbortController();
    const fetcher = vi.fn().mockResolvedValueOnce(prepared()).mockImplementationOnce((_url: string, init: RequestInit) => {
      expect(init.signal).toBe(controller.signal);
      controller.abort();
      return Promise.reject(new DOMException("aborted", "AbortError"));
    });
    vi.stubGlobal("fetch", fetcher);
    await expect(uploadEventRegistrationPhoto(2, photo(), { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(reportError).not.toHaveBeenCalled();
  });
});
