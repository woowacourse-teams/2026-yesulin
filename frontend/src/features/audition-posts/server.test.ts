import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { recordAuditionPostRedirect } from "./server";
import { auditionPostApiPaths } from "./types";

beforeEach(() => {
  vi.stubEnv("API_ORIGIN", "https://api.example.com");
  vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("공고 원문 이동 수 기록", () => {
  it("이동 수 경로로 제한 시간 신호와 함께 POST를 보낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await recordAuditionPostRedirect("123");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL(`/api${auditionPostApiPaths.redirect("123")}`, "https://api.example.com"),
      expect.objectContaining({ method: "POST", signal: expect.any(AbortSignal) }),
    );
  });

  it("기록 요청이 제한 시간을 넘겨도 예외를 전파하지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")));

    await expect(recordAuditionPostRedirect("123")).resolves.toBeUndefined();
  });
});
