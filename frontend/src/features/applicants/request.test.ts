import { afterEach, describe, expect, it, vi } from "vitest";
import { applicantRequest } from "./request";

describe("applicantRequest headers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["Headers", new Headers([["X-Custom-Header", "headers-value"]])],
    ["tuple array", [["X-Custom-Header", "tuple-value"]] as [string, string][]],
  ])("%s 입력의 사용자 지정 헤더를 보존한다", async (_, headers) => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetcher);

    await applicantRequest("/v1/test", { headers });

    const sentHeaders = new Headers(fetcher.mock.calls[0]?.[1]?.headers);
    expect(sentHeaders.get("X-Custom-Header")).toBe(headers instanceof Headers ? "headers-value" : "tuple-value");
    expect(sentHeaders.get("Content-Type")).toBe("application/json");
  });
});
