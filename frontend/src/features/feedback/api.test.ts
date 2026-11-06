import { afterEach, describe, expect, it, vi } from "vitest";
import { submitFeedback } from "./api";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));
vi.mock("@/features/csrf", async (original) => ({
  ...(await original<object>()),
  withCsrfHeaders: vi.fn(async (headers: Record<string, string>) => ({ ...headers, "X-XSRF-TOKEN": "token" })),
}));

afterEach(() => vi.unstubAllGlobals());

describe("의견 보내기 요청", () => {
  it("본문을 JSON 조각으로, 사진을 images로 담아 multipart로 보내고 JSON 형식 헤더를 붙이지 않는다", async () => {
    const fetcher = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(async () => Response.json({ id: 3 }, { status: 201 }));
    vi.stubGlobal("fetch", fetcher);
    const photo = new Blob(["jpeg"], { type: "image/jpeg" });

    await submitFeedback({ type: "BUG", content: "깨져요", contact: "", pagePath: "/shows/1?x=1#y", images: [photo] });

    const init = fetcher.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
    const body = init.body as FormData;
    expect(JSON.parse(await (body.get("request") as Blob).text())).toEqual({ type: "BUG", content: "깨져요", contact: "", pagePath: "/shows/1" });
    expect(body.getAll("images")).toHaveLength(1);
  });
});
