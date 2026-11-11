import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const request = (path: string, cookie = "SESSION=test-session") => new NextRequest(`https://yesulin.art${path}`, {
  headers: cookie ? { cookie } : {},
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});
const runProxy = async (input: NextRequest) => (await import("./proxy")).proxy(input);

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("API_ORIGIN", "https://api.example.com");
  vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "");
  vi.stubEnv("NEXT_PUBLIC_PRODUCER_LOGIN", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("과거 홈 공고 목록 주소", () => {
  it.each([
    ["/?page=2", "/auditions?page=2"],
    ["/?closed=1", "/auditions?closed=1"],
    ["/?page=2&closed=1&sort=deadline&unknown=1", "/auditions?closed=1&page=2&sort=deadline"],
    ["/?page=2&page=3&closed=0&closed=1", "/auditions?page=2"],
  ])("%s를 기존 조건으로 정규화해 307로 보낸다", async (path, target) => {
    const response = await runProxy(request(path));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`https://yesulin.art${target}`);
  });

  it.each(["/?page=10001", "/?page=0&page=2", "/?closed=0&closed=1", "/?page=abc&sort=deadline"])(
    "지원 범위 밖 또는 기본 조건 %s는 홈으로 통과시킨다", async (path) => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const response = await runProxy(request(path));
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([["/", false], ["/?sort=deadline", false], ["/?page=2", true], ["/?closed=1", true], ["/auditions?page=2", false]])(
    "Next matcher가 %s에서 필요한 경우에만 Proxy를 실행한다", async (url, matched) => {
      const { config } = await import("./proxy");
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(matched);
    },
  );
});

describe("운영자 경로 접근 검사", () => {
  it.each(["/admin", "/admin/", "/admin/posts", "/admin/files", "/admin/logs", "/admin/messages", "/admin/shows/show-1"])(
    "비로그인 요청 %s는 로그인 폼 없이 404로 숨긴다", async (path) => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const response = await runProxy(request(path, ""));
      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Not Found");
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each(["APPLICANT", "PRODUCER", undefined, "admin"])("역할 %s는 운영 화면을 통과하지 못한다", async (role) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ role })));
    expect((await runProxy(request("/admin/posts"))).status).toBe(404);
  });

  it("ADMIN만 원래 세션 쿠키를 서버에 전달해 확인하고 통과시킨다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ role: "ADMIN" }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await runProxy(request("/admin?tab=shows"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(fetchMock).toHaveBeenCalledWith(new URL("https://api.example.com/api/v1/sessions/current"),
      expect.objectContaining({
        headers: { accept: "application/json", cookie: "SESSION=test-session" },
        cache: "no-store", signal: expect.any(AbortSignal),
      }));
  });

  it.each([401, 403, 500])("세션 API의 %i 응답에도 관리자 경로는 404로 닫는다", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, status)));
    expect((await runProxy(request("/admin"))).status).toBe(404);
  });

  it.each([new TypeError("fetch failed"), new DOMException("timeout", "TimeoutError")])(
    "세션 통신 오류도 운영 화면을 통과시키지 않는다", async (error) => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
      expect((await runProxy(request("/admin"))).status).toBe(404);
    },
  );

  it("잘못된 세션 JSON도 404로 닫는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("invalid json")));
    expect((await runProxy(request("/admin"))).status).toBe(404);
  });

  it("목 모드에서도 관리자 검사는 생략하지 않는다", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "enabled");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ role: "PRODUCER" })));
    expect((await runProxy(request("/admin"))).status).toBe(404);
  });

  it("관리자 경로도 Next matcher에 포함한다", async () => {
    expect((await import("./proxy")).config.matcher).toContain("/admin/:path*");
  });
});

describe("기획사 경로 기존 접근 검사", () => {
  it("실제 PRODUCER 세션은 통과시킨다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ role: "PRODUCER" })));
    expect((await runProxy(request("/producers/shows"))).headers.get("x-middleware-next")).toBe("1");
  });

  it("역할이 다르면 쿼리 없이 홈으로 보낸다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ role: "ADMIN" })));
    expect((await runProxy(request("/producers/shows?test=1"))).headers.get("location")).toBe("https://yesulin.art/");
  });

  it("기획사 목 환경의 서버 조회 생략은 유지한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "enabled");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await runProxy(request("/producers/shows"))).headers.get("x-middleware-next")).toBe("1");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
