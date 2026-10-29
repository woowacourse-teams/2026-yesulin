import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, HEAD } from "./route";
import { GET as legacyGET } from "@/app/n/[publicId]/route";

const publicId = "550e8400-e29b-41d4-a716-446655440000";
const request = new NextRequest(`https://yesulin.art/events/cards/${publicId}`);
const context = () => ({ params: Promise.resolve({ publicId }) });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("printed business card URL", () => {
  it("keeps previously issued /n links working with the same destination", async () => {
    vi.stubEnv("API_ORIGIN", "https://backend.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ profileUrl: "https://example.test/profile" })));
    const response = await legacyGET(new NextRequest(`https://yesulin.art/n/${publicId}`), context());
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://example.test/profile");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("reads the latest destination each time and sends an uncached 302", async () => {
    vi.stubEnv("API_ORIGIN", "https://backend.example.test");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ profileUrl: "https://example.test/first" }))
      .mockResolvedValueOnce(Response.json({ profileUrl: "https://example.test/second" }));
    vi.stubGlobal("fetch", fetchMock);
    const first = await GET(request, context());
    const second = await GET(request, context());
    expect(first.status).toBe(302);
    expect(first.headers.get("location")).toBe("https://example.test/first");
    expect(second.headers.get("location")).toBe("https://example.test/second");
    expect(second.headers.get("cache-control")).toBe("no-store");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
    expect(fetchMock.mock.calls[0][0].pathname).toBe(`/api/v1/public/business-cards/${publicId}/visit`);
  });

  it("resolves HEAD requests without recording a visit", async () => {
    vi.stubEnv("API_ORIGIN", "https://backend.example.test");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ profileUrl: "https://example.test/profile" }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await HEAD(new NextRequest(request.url, { method: "HEAD" }), context());
    expect(response.status).toBe(302);
    expect(fetchMock.mock.calls[0][0].pathname).toBe(`/api/v1/public/business-cards/${publicId}`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("still redirects through a read-only lookup when recording fails", async () => {
    vi.stubEnv("API_ORIGIN", "https://backend.example.test");
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ profileUrl: "https://example.test/profile" }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(request, context());
    expect(response.headers.get("location")).toBe("https://example.test/profile");
    expect(fetchMock.mock.calls.map(([url]) => url.pathname)).toEqual([
      `/api/v1/public/business-cards/${publicId}/visit`, `/api/v1/public/business-cards/${publicId}`,
    ]);
  });

  it("shows a waiting screen before a profile is connected", async () => {
    vi.stubEnv("API_ORIGIN", "https://backend.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ profileUrl: null })));
    const response = await GET(request, context());
    expect(response.headers.get("location")).toBe(`https://yesulin.art/networking/${publicId}`);
  });

  it("distinguishes a deleted card from a temporary API failure", async () => {
    vi.stubEnv("API_ORIGIN", "https://backend.example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockRejectedValueOnce(new Error("offline")));
    expect((await GET(request, context())).headers.get("location")).toContain("state=missing");
    expect((await GET(request, context())).headers.get("location")).toContain("state=unavailable");
  });

  it("rejects malformed keys before querying the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(request, { params: Promise.resolve({ publicId: "1" }) });
    expect(response.headers.get("location")).toContain("state=missing");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
