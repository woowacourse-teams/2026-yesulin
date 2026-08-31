import { afterEach, describe, expect, it, vi } from "vitest";
import { AuditionRequestError, request } from "./api-client";

describe("audition API request correlation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("모든 요청에 request ID를 보내고 응답 ID를 오류에 보관한다", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: "요청을 처리하지 못했습니다." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", "X-Request-Id": "backend-request-2" },
      },
    ));
    vi.stubGlobal("fetch", fetcher);

    const caught = await request("/v1/test").catch((cause: unknown) => cause);

    const headers = fetcher.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers["X-Request-Id"]).toMatch(/^[A-Za-z0-9._-]{1,64}$/);
    expect(caught).toBeInstanceOf(AuditionRequestError);
    expect(caught).toMatchObject({ status: 400, requestId: "backend-request-2" });
  });
});
