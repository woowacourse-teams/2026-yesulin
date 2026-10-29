// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  capture: vi.fn(), identify: vi.fn(), reset: vi.fn(), opt_in_capturing: vi.fn(), opt_out_capturing: vi.fn(), get_property: vi.fn(),
}));
const init = vi.hoisted(() => vi.fn());
vi.mock("posthog-js", () => ({ default: { init } }));

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  window.history.replaceState(null, "", "/");
  for (const key of ["localStorage", "sessionStorage"]) {
    const values = new Map<string, string>();
    const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k), clear: () => values.clear() };
    Object.defineProperty(window, key, { configurable: true, value: storage });
    vi.stubGlobal(key, storage);
  }
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com");
  init.mockReturnValue(sdk); sdk.get_property.mockReturnValue(undefined);
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ enabled: true, internal: false, actor: "anonymous", testObjects: [], formAttachments: { "10": [0] } }) })));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("PostHog 수집 경계", () => {
  it("초기화 중 주소에서 src가 지워져도 오픈채팅 출처를 보존한다", async () => {
    window.history.replaceState(null, "", "/posts/10?src=kakao_openchat");
    const { trackPostView } = await import("./product-analytics");
    const sending = trackPostView(10, "direct-view");
    window.history.replaceState(null, "", "/posts/10");
    await sending;
    expect(sdk.capture.mock.calls.find(c => c[0] === "audition_post_viewed")?.[1].source).toBe("openchat");
    expect(sdk.capture.mock.calls.filter(c => c[0] === "openchat_landed")).toHaveLength(1);
  });
  it("OTR 경유 출처는 같은 원문의 공고에만 연결한다", async () => {
    const { rememberOpenchatEntry, trackPostView } = await import("./product-analytics");
    rememberOpenchatEntry("otr", "999");
    await trackPostView(11, "unrelated", "https://otr.co.kr/notice?vid=111");
    expect(sdk.capture.mock.calls[0][1].source).toBe("other");
    await trackPostView(10, "redirected", "https://otr.co.kr/notice?vid=999");
    expect(sdk.capture.mock.calls.filter(c => c[0] === "openchat_landed")).toHaveLength(1);
    expect(sdk.capture.mock.calls.find(c => c[0] === "openchat_landed")?.[1].post_id).toBe("10");
    await trackPostView(12, "exploration");
    expect(sdk.capture.mock.calls.filter(c => c[0] === "another_post_viewed")).toHaveLength(1);
  });
  it("거부한 브라우저에서는 세션 조회와 SDK 초기화도 하지 않는다", async () => {
    localStorage.setItem("yesulin:analytics-consent:v1", "denied");
    const { trackProductEvent } = await import("./product-analytics");
    expect(await trackProductEvent("audition_post_viewed", { post_id: "10" })).toBe(false);
    expect(fetch).not.toHaveBeenCalled(); expect(init).not.toHaveBeenCalled();
  });
  it("운영 키 설정으로 localhost에서 수집하지 않는다", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_ENV", "production");
    const { trackProductEvent } = await import("./product-analytics");
    expect(await trackProductEvent("audition_post_viewed")).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("컨텍스트 재조회가 익명 방문자를 새 사람으로 만들지 않는다", async () => {
    const { startProductAnalytics, refreshProductContext } = await import("./product-analytics");
    await startProductAnalytics(); refreshProductContext(); await startProductAnalytics();
    expect(sdk.reset).not.toHaveBeenCalled();
  });
  it("로그아웃 후에는 이전 로그인 식별자를 재사용하지 않는다", async () => {
    sdk.get_property.mockReturnValue("previous-account-hmac");
    const { startProductAnalytics } = await import("./product-analytics");
    await startProductAnalytics();
    expect(sdk.reset).toHaveBeenCalledWith(true);
  });
  it("늦게 응답한 요청은 분석 거부 후 전송되지 않는다", async () => {
    let resolve!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise(r => { resolve = r; })));
    const { trackProductEvent, resetProductAnalytics } = await import("./product-analytics");
    const sending = trackProductEvent("audition_post_viewed");
    localStorage.setItem("yesulin:analytics-consent:v1", "denied"); resetProductAnalytics();
    resolve({ ok: true, json: async () => ({ enabled: true }) });
    expect(await sending).toBe(false); expect(sdk.capture).not.toHaveBeenCalled();
  });
  it("최종 전송에서 URL·페이지 제목·자동 사용자 속성을 제거하고 수집 토큰은 유지한다", async () => {
    const { startProductAnalytics } = await import("./product-analytics"); await startProductAnalytics();
    const clean = init.mock.calls[0][1].before_send({ event: "audition_post_viewed", properties: {
      token: "phc_test", distinct_id: "anonymous", post_id: "10", $current_url: "https://example.com/private", $title: "지원자 이름",
      email: "private@example.com", $referrer: "https://example.com/token",
    }, $set_once: { $initial_current_url: "https://private" }, $set: { name: "홍길동" } });
    expect(clean.properties).toEqual({ token: "phc_test", distinct_id: "anonymous", post_id: "10" });
    expect(clean.$set_once).toBeUndefined(); expect(clean.$set).toBeUndefined();
  });
  it("같은 화면 effect 중복은 막되 첨부 클릭은 매번 기록한다", async () => {
    const { trackProductEvent, trackAttachment } = await import("./product-analytics");
    await trackProductEvent("audition_post_viewed", { post_id: "10" }, "view-1");
    await trackProductEvent("audition_post_viewed", { post_id: "10" }, "view-1");
    await trackAttachment(10, 0); await trackAttachment(10, 0);
    expect(sdk.capture.mock.calls.filter(c => c[0] === "audition_post_viewed")).toHaveLength(1);
    expect(sdk.capture.mock.calls.filter(c => c[0] === "attachment_download_clicked")).toHaveLength(2);
    expect(sdk.capture.mock.calls.at(-1)?.[1].attachment_kind).toBe("application_form");
  });
  it("내부 브라우저·테스트 자료 표시를 모든 이벤트에 붙인다", async () => {
    localStorage.setItem("yesulin:analytics-internal:v1", "true");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ enabled: true, internal: false, actor: "anonymous", testObjects: ["post_id:10"], formAttachments: {} }) })));
    const { trackProductEvent } = await import("./product-analytics");
    await trackProductEvent("audition_post_viewed", { post_id: "10" });
    expect(sdk.capture.mock.calls[0][1]).toMatchObject({ internal: true, test_object: true, environment: "development" });
  });
});
