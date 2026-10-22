import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_CONSENT_STORAGE_KEY } from "@/features/analytics/consent";
import { request } from "@/features/auditions/api-client";
import { cleanOpenChatSource, OPENCHAT_COUNTED_PREFIX, openChatPostKey, recordOpenChatVisit } from "./openchat-visit";

vi.mock("@/features/auditions/api-client", () => ({ request: vi.fn() }));

let values: Map<string, string>;
let storage: Storage;
let replaceState: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(request).mockResolvedValue(undefined);
  values = new Map();
  storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  } as unknown as Storage;
  replaceState = vi.fn();
  vi.stubGlobal("window", {
    localStorage: storage,
    location: { href: "https://yesulin.art/posts/123?src=kakao_openchat&other=1#role" },
    history: { state: { next: "router-state" }, replaceState },
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("오픈채팅방 링크 방문 기록", () => {
  it("같은 공고를 다시 열면 브라우저 표시로 중복 전송을 막고 다른 공고는 센다", async () => {
    await recordOpenChatVisit({ kind: "post", id: "123" });
    await recordOpenChatVisit({ kind: "post", id: "123" });
    await recordOpenChatVisit({ kind: "post", id: "456" });
    expect(request).toHaveBeenCalledTimes(2);
    expect(values.get(`${OPENCHAT_COUNTED_PREFIX}post:123`)).toBe("1");
    expect(request).toHaveBeenNthCalledWith(1, "/v1/public/audition-posts/123/openchat-visits", {
      method: "POST", signal: expect.any(AbortSignal),
    });
  });

  it("같은 화면에서 요청이 겹쳐도 먼저 표시해 중복을 줄인다", async () => {
    await Promise.all([recordOpenChatVisit({ kind: "post", id: "123" }), recordOpenChatVisit({ kind: "post", id: "123" })]);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("요청 중 effect가 다시 실행되면 같은 요청이 끝날 때까지 기다린다", async () => {
    let complete!: () => void;
    vi.mocked(request).mockReturnValueOnce(new Promise<void>((resolve) => { complete = resolve; }));
    const first = recordOpenChatVisit({ kind: "post", id: "123" });
    const secondFinished = vi.fn();
    const second = recordOpenChatVisit({ kind: "post", id: "123" }).then(secondFinished);
    await Promise.resolve();
    expect(secondFinished).not.toHaveBeenCalled();
    complete();
    await Promise.all([first, second]);
    expect(secondFinished).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledOnce();
  });

  it("OTR 경유 링크와 가져온 공고에 같은 중복 표시를 쓴다", async () => {
    const key = openChatPostKey("7", "https://otr.co.kr/audition/?vid=22310");
    await recordOpenChatVisit({ kind: "otr", id: "22310" });
    await recordOpenChatVisit({ kind: "post", id: "7", dedupKey: key });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("기록 실패 때는 표시를 지워 다음 방문에서 재시도한다", async () => {
    vi.mocked(request).mockRejectedValueOnce(new Error("network"));
    await expect(recordOpenChatVisit({ kind: "post", id: "123" })).rejects.toThrow("network");
    expect(values.has(`${OPENCHAT_COUNTED_PREFIX}post:123`)).toBe(false);
    await recordOpenChatVisit({ kind: "post", id: "123" });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("분석을 끄면 표시를 저장하거나 방문을 보내지 않는다", async () => {
    values.set(ANALYTICS_CONSENT_STORAGE_KEY, "denied");
    await recordOpenChatVisit({ kind: "post", id: "123" });
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it("저장소가 막혀 있으면 반복 방문을 계속 세지 않도록 생략한다", async () => {
    vi.mocked(storage.setItem).mockImplementation(() => { throw new Error("blocked"); });
    await recordOpenChatVisit({ kind: "post", id: "123" });
    expect(request).not.toHaveBeenCalled();
  });

  it("브라우저 표시를 지우면 다시 집계될 수 있다", async () => {
    await recordOpenChatVisit({ kind: "post", id: "123" });
    values.clear();
    await recordOpenChatVisit({ kind: "post", id: "123" });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("원문 없는 공고나 다른 사이트 주소는 공고 번호로 중복을 구분한다", () => {
    expect(openChatPostKey("7", null)).toBe("post:7");
    expect(openChatPostKey("7", "https://example.com/?vid=123")).toBe("post:7");
    expect(openChatPostKey("7", "bad-url")).toBe("post:7");
  });
});

describe("공유용 출처 표시 정리", () => {
  it("다른 쿼리와 fragment, 라우터 상태를 보존한다", () => {
    cleanOpenChatSource("123");
    expect(replaceState).toHaveBeenCalledWith({ next: "router-state" }, "", "/posts/123?other=1#role");
  });

  it("기록 중 다른 공고로 이동했으면 새 주소를 바꾸지 않는다", () => {
    cleanOpenChatSource("456");
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("다른 유입 출처는 지우지 않는다", () => {
    window.location.href = "https://yesulin.art/posts/123?src=other";
    cleanOpenChatSource("123");
    expect(replaceState).not.toHaveBeenCalled();
  });
});
