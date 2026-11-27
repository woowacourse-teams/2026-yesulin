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
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("PostHog 수집 경계", () => {
  it("인스타그램 프로필 주소로 도착하면 초기화 중 페이지를 이동해도 한 번만 기록한다", async () => {
    window.history.replaceState(null, "", "/?src=instagram&fbclid=private");
    localStorage.setItem("yesulin:analytics-internal:v1", "true");
    const { startProductAnalytics, refreshProductContext } = await import("./product-analytics");
    const first = startProductAnalytics();
    window.history.replaceState(null, "", "/auditions");
    await Promise.all([first, startProductAnalytics()]);
    refreshProductContext();
    await startProductAnalytics();

    expect(sdk.capture.mock.calls).toEqual([["instagram_profile_landed", {
      acquisition_channel: "instagram", attribution_version: 1, environment: "development",
      internal: true, actor: "anonymous", test_object: false, schema_version: 1,
    }]]);
    const properties = sdk.capture.mock.calls[0][1];
    const clean = init.mock.calls[0][1].before_send({ event: "instagram_profile_landed", properties: {
      ...properties, $current_url: "https://yesulin.art/?src=instagram&fbclid=private", $referrer: "https://l.instagram.com/",
    } });
    expect(clean.properties).toEqual(properties);
  });

  it.each(["/", "/?utm_source=instagram", "/posts/10?src=instagram"])(
    "일반 인스타그램 유입인 %s는 프로필 도착으로 기록하지 않는다",
    async path => {
      window.history.replaceState(null, "", path);
      const referrer = vi.spyOn(document, "referrer", "get").mockReturnValue("https://l.instagram.com/");
      const { startProductAnalytics } = await import("./product-analytics");
      expect(await startProductAnalytics()).toBe(true);
      referrer.mockRestore();
      expect(sdk.capture).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["서버 오류", () => Promise.resolve(new Response(null, { status: 503 }))],
    ["네트워크 오류", () => Promise.reject(new TypeError("network"))],
  ])("프로필 방문의 첫 컨텍스트 %s 뒤에 화면 이동 없이 자동 재시도한다", async (_, fail) => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/?src=instagram");
    vi.mocked(fetch).mockImplementationOnce(fail);
    const { startProductAnalytics } = await import("./product-analytics");
    const ready = Promise.all([startProductAnalytics(), startProductAnalytics()]);
    await vi.advanceTimersByTimeAsync(999);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sdk.capture).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(await ready).toEqual([true, true]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sdk.capture.mock.calls.map(([event]) => event)).toEqual(["instagram_profile_landed"]);
  });

  it("프로필 방문에서 자동 재시도도 실패하면 추가 자동 요청을 보내지 않는다", async () => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/?src=instagram");
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }));
    const { startProductAnalytics } = await import("./product-analytics");
    const ready = startProductAnalytics();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await ready).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sdk.capture).not.toHaveBeenCalled();
  });

  it.each([["/", 503], ["/?src=instagram", 403]])(
    "%s의 HTTP %s 응답을 자동으로 재시도하지 않는다",
    async (path, status) => {
      vi.useFakeTimers();
      window.history.replaceState(null, "", path);
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status }));
      const { startProductAnalytics } = await import("./product-analytics");
      const ready = startProductAnalytics();
      await vi.advanceTimersByTimeAsync(10_000);
      expect(await ready).toBe(false);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(sdk.capture).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["분석 거부로 변경", () => localStorage.setItem("yesulin:analytics-consent:v1", "denied")],
    ["컨텍스트 무효화", (analytics: typeof import("./product-analytics")) => analytics.refreshProductContext()],
    ["분석 초기화", (analytics: typeof import("./product-analytics")) => analytics.resetProductAnalytics()],
  ])("%s 후에는 대기 중인 프로필 방문 재시도를 중단한다", async (_, invalidate) => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/?src=instagram");
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 503 }));
    const analytics = await import("./product-analytics");
    const ready = analytics.startProductAnalytics();
    await vi.advanceTimersByTimeAsync(500);
    expect(fetch).toHaveBeenCalledTimes(1);
    invalidate(analytics);

    await vi.advanceTimersByTimeAsync(500);
    expect(await ready).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sdk.capture).not.toHaveBeenCalled();
  });

  it("홈 배너 클릭은 반복을 포함해 기록하고 허용된 배너 이름만 보낸다", async () => {
    const { trackProductEvent, setInternalBrowser } = await import("./product-analytics");
    const alert = { banner_id: "audition-alert" as const };
    await trackProductEvent("home_banner_clicked", alert);
    await trackProductEvent("home_banner_clicked", alert);
    setInternalBrowser(true);
    await trackProductEvent("home_banner_clicked", { banner_id: "producer-partnership" });

    expect(sdk.capture).toHaveBeenCalledTimes(3);
    expect(sdk.capture).toHaveBeenNthCalledWith(1, "home_banner_clicked", expect.objectContaining({
      banner_id: "audition-alert", environment: "development", internal: false, test_object: false,
    }));
    expect(sdk.capture).toHaveBeenNthCalledWith(3, "home_banner_clicked", expect.objectContaining({
      banner_id: "producer-partnership", internal: true, test_object: false,
    }));
    const sanitize = init.mock.calls[0][1].before_send;
    expect(sanitize({ event: "home_banner_clicked", properties: {
      banner_id: "producer-partnership", email: "private@example.com", $current_url: "https://open.kakao.com/o/test",
    } }).properties).toEqual({ banner_id: "producer-partnership" });
    expect(sanitize({ event: "home_banner_clicked", properties: { banner_id: "unknown" } }).properties).toEqual({});

    localStorage.setItem("yesulin:analytics-consent:v1", "denied");
    expect(await trackProductEvent("home_banner_clicked", alert)).toBe(false);
    expect(sdk.capture).toHaveBeenCalledTimes(3);
  });

  it("비PDF 첫 열람 상태와 브라우저 원본 요청을 별도 집계하고 파일명과 URL을 전송하지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({
      enabled: true, internal: true, actor: "producer", testObjects: ["review_id:review"], formAttachments: {},
    }) })));
    const { observeReviewDocumentPreview, trackReviewDocumentDownload } = await import("./review-document");
    const pending = {
      jobId: "job", extension: "hwpx", previewStatus: "PENDING" as const, originalFilename: "private-name.hwpx",
      uploadedAt: "2026-11-26T01:02:03Z", status: "QUEUED" as const,
      originalUrl: "https://private.test/signed", sourceSha256: "private-checksum",
    };
    const ready = { ...pending, previewStatus: "READY" as const };
    for (const job of [
      { ...pending, uploadedAt: null, status: "UPLOADING" as const },
      { ...pending, uploadedAt: null, status: "UPLOAD_EXPIRED" as const },
    ]) {
      await observeReviewDocumentPreview("review", job);
      await trackReviewDocumentDownload("review", job);
    }
    expect(sdk.capture).not.toHaveBeenCalled();
    await observeReviewDocumentPreview("review", { ...pending, extension: "pdf" });
    await observeReviewDocumentPreview("review", { ...pending, previewStatus: undefined });
    await observeReviewDocumentPreview("review", pending);
    await observeReviewDocumentPreview("review", ready);
    await trackReviewDocumentDownload("review", ready);
    await trackReviewDocumentDownload("review", ready);
    expect(sdk.capture.mock.calls.map(([event, data]) => [event, data.preview_status])).toEqual([
      ["review_document_preview_observed", "PENDING"], ["review_document_original_download_requested", "READY"],
      ["review_document_original_download_requested", "READY"],
    ]);
    const props = sdk.capture.mock.calls[0][1];
    expect(props).toMatchObject({ workflow: "producer_pdf", operation_id: "job", review_id: "review",
      document_format: "hwpx", environment: "development", internal: true, test_object: true });
    expect(JSON.stringify(props)).not.toContain("private-");
    expect(props).not.toHaveProperty("uploadedAt");
    const sanitize = init.mock.calls[0][1].before_send;
    expect(sanitize({ event: "review_document_preview_observed", properties: {
      document_format: "private-name.hwpx", preview_status: "free-form", filename: "subject", sourceUrl: pending.originalUrl,
    } }).properties).toEqual({});
    localStorage.setItem("yesulin:analytics-consent:v1", "denied");
    await trackReviewDocumentDownload("review", ready);
    expect(sdk.capture).toHaveBeenCalledTimes(3);
  });

  it("원본 PDF 클릭은 매번 기록하며 내부·테스트·개발 표시와 거부를 유지한다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ enabled: true, internal: true, actor: "producer", testObjects: ["review_id:review"], formAttachments: {} }) })));
    const { trackProductEvent, resetProductAnalytics } = await import("./product-analytics");
    const properties = { metric_version: 1, workflow: "producer_pdf" as const, review_id: "review", item_id: "a", review_view: "card" as const };
    await trackProductEvent("review_original_pdf_clicked", properties);
    await trackProductEvent("review_original_pdf_clicked", properties);
    expect(sdk.capture).toHaveBeenCalledTimes(2);
    expect(sdk.capture.mock.calls[0][1]).toMatchObject({ ...properties, environment: "development", internal: true, test_object: true });
    const clean = init.mock.calls[0][1].before_send({ event: "review_original_pdf_clicked", properties: {
      ...properties, filename: "private.pdf", sourceUrl: "https://private", name: "private", $current_url: "https://private", memo: "private",
    } });
    expect(clean.properties).toEqual(properties);
    localStorage.setItem("yesulin:analytics-consent:v1", "denied"); resetProductAnalytics();
    expect(await trackProductEvent("review_original_pdf_clicked", properties)).toBe(false);
    expect(sdk.capture).toHaveBeenCalledTimes(2);
  });
  it("초기화 중 주소에서 src가 지워져도 오픈채팅 출처를 보존한다", async () => {
    window.history.replaceState(null, "", "/posts/10?src=kakao_openchat");
    const { trackPostView } = await import("./product-analytics");
    const sending = trackPostView(10, "direct-view");
    window.history.replaceState(null, "", "/posts/10");
    await sending;
    expect(sdk.capture.mock.calls.find(c => c[0] === "audition_post_viewed")?.[1].source).toBe("openchat");
    expect(sdk.capture.mock.calls.filter(c => c[0] === "openchat_landed")).toHaveLength(1);
    expect(sdk.capture.mock.calls.find(c => c[0] === "openchat_landed")?.[1]).toMatchObject({ acquisition_channel: "openchat", attribution_version: 1 });
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
  it("주소 정리 뒤에도 리마인드 속성을 해당 공고의 유입 이벤트 한 건에만 보낸다", async () => {
    window.history.replaceState(null, "", "/posts/10");
    const { trackPostView } = await import("./product-analytics");
    await trackPostView(10, "reminder-view", null, "deadline_reminder_20261127_d1");
    await trackPostView(10, "reminder-view", null, "deadline_reminder_20261127_d1");
    await trackPostView(11, "exploration");
    window.history.replaceState(null, "", "/posts/10?src=kakao_openchat");
    await trackPostView(10, "regular-view");
    const landings = sdk.capture.mock.calls.filter(c => c[0] === "openchat_landed");
    expect(landings).toHaveLength(2);
    expect(landings[0][1]).toMatchObject({ post_id: "10", reminder_campaign: "deadline_reminder_20261127_d1", acquisition_channel: "openchat" });
    expect(landings[1][1]).not.toHaveProperty("reminder_campaign");
    const otherEvents = sdk.capture.mock.calls.filter(c => c[0] !== "openchat_landed");
    expect(otherEvents.every(c => !("reminder_campaign" in c[1]))).toBe(true);
  });

  it("리마인드 방문도 분석 거부 상태에서는 저장하거나 보내지 않는다", async () => {
    localStorage.setItem("yesulin:analytics-consent:v1", "denied");
    const { trackPostView } = await import("./product-analytics");
    expect(await trackPostView(10, "reminder-view", null, "deadline_reminder_20261127_d1")).toBe(false);
    expect(sdk.capture).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("yesulin:acquisition:v1")).toBeNull();
  });
  it("거부한 브라우저에서는 세션 조회와 SDK 초기화도 하지 않는다", async () => {
    localStorage.setItem("yesulin:analytics-consent:v1", "denied");
    window.history.replaceState(null, "", "/?src=instagram");
    const { startProductAnalytics, trackProductEvent } = await import("./product-analytics");
    expect(await startProductAnalytics()).toBe(false);
    expect(await trackProductEvent("audition_post_viewed", { post_id: "10" })).toBe(false);
    expect(fetch).not.toHaveBeenCalled(); expect(init).not.toHaveBeenCalled();
    expect(sdk.capture).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("yesulin:acquisition:v1")).toBeNull();
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
    expect(sessionStorage.getItem("yesulin:acquisition:v1")).toBeNull();
  });
  it("최종 전송에서 URL·페이지 제목·자동 사용자 속성을 제거하고 수집 토큰은 유지한다", async () => {
    const { startProductAnalytics } = await import("./product-analytics"); await startProductAnalytics();
    const clean = init.mock.calls[0][1].before_send({ event: "audition_post_viewed", properties: {
      token: "phc_test", distinct_id: "anonymous", post_id: "10", acquisition_channel: "private-name", attribution_version: 42, $current_url: "https://example.com/private", $title: "지원자 이름",
      email: "private@example.com", $referrer: "https://example.com/token", reminder_campaign: "deadline_reminder_20261199_d1",
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
    expect(sdk.capture.mock.calls[0][1]).toMatchObject({ internal: true, test_object: true, environment: "development", acquisition_channel: "direct_unknown", attribution_version: 1 });
  });
});
