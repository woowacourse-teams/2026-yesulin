import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { request } from "@/features/auditions/api-client";
import { prepareIdentity } from "./identity";

vi.mock("@/features/auditions/api-client", () => ({ request: vi.fn() }));
const path = "/v1/public/community/identity";
const key = "a".repeat(64);
let values: Map<string, string>;
let removeItem: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.mocked(request).mockReset();
  values = new Map();
  removeItem = vi.fn((name: string) => values.delete(name));
  vi.stubGlobal("localStorage", { getItem: (name: string) => values.get(name) ?? null, removeItem });
  vi.stubGlobal("navigator", {});
});
afterEach(() => vi.unstubAllGlobals());

it("읽기만 하는 새 브라우저에는 쿠키를 발급하지 않는다", async () => {
  vi.mocked(request).mockResolvedValue({ ready: false });
  await prepareIdentity(false);
  expect(request).toHaveBeenCalledExactlyOnceWith(path, { cache: "no-store" });
});

it("새 쓰기는 서버 발급 후 쿠키 저장을 확인하며 JS 저장소에 키를 만들지 않는다", async () => {
  vi.mocked(request).mockResolvedValueOnce({ ready: false }).mockResolvedValueOnce(undefined).mockResolvedValueOnce({ ready: true });
  await prepareIdentity(true);
  expect(request).toHaveBeenNthCalledWith(2, path, { method: "POST" });
  expect(values.size).toBe(0);
  expect(request).toHaveBeenCalledTimes(3);
});

it("기존 키는 이전된 쿠키를 확인한 다음에만 지운다", async () => {
  values.set("yesulin.community.owner", key);
  vi.mocked(request).mockResolvedValueOnce(undefined).mockImplementationOnce(async () => {
    expect(removeItem).not.toHaveBeenCalled();
    return { ready: true };
  });
  await prepareIdentity(false);
  expect(request).toHaveBeenNthCalledWith(1, path, { method: "POST", headers: { "X-Community-Legacy-Key": key } });
  expect(request).toHaveBeenNthCalledWith(2, path, { cache: "no-store", headers: { "X-Community-Legacy-Key": key } });
  expect(values.size).toBe(0);
});

it("이전 응답이 유실되면 기존 키를 보존하고 같은 키로 재시도한다", async () => {
  values.set("yesulin.community.owner", key);
  vi.mocked(request).mockRejectedValueOnce(new Error("연결 실패"));
  await expect(prepareIdentity(true)).rejects.toThrow("연결 실패");
  expect(values.get("yesulin.community.owner")).toBe(key);
  vi.mocked(request).mockResolvedValueOnce(undefined).mockResolvedValueOnce({ ready: true });
  await prepareIdentity(true);
  expect(request).toHaveBeenNthCalledWith(2, path, { method: "POST", headers: { "X-Community-Legacy-Key": key } });
  expect(values.size).toBe(0);
});

it("쿠키 차단 또는 다른 쿠키가 확인되면 기존 키를 지우지 않는다", async () => {
  values.set("yesulin.community.owner", key);
  vi.mocked(request).mockResolvedValueOnce(undefined).mockResolvedValueOnce({ ready: false });
  await expect(prepareIdentity(true)).rejects.toThrow("쿠키");
  expect(removeItem).not.toHaveBeenCalled();
});

it("다른 기존 키가 생겼다면 이전 완료 후에도 그 키를 지우지 않는다", async () => {
  values.set("yesulin.community.owner", key);
  vi.mocked(request).mockResolvedValueOnce(undefined).mockImplementationOnce(async () => {
    values.set("yesulin.community.owner", "b".repeat(64));
    return { ready: true };
  });
  await prepareIdentity(true);
  expect(removeItem).not.toHaveBeenCalled();
});

it("저장소 접근 실패와 쿠키 부재가 겹치면 기존 권한을 덮을 새 키를 만들지 않는다", async () => {
  vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); } });
  vi.mocked(request).mockResolvedValue({ ready: false });
  await expect(prepareIdentity(true)).rejects.toThrow("저장 공간");
  expect(request).toHaveBeenCalledTimes(1);
});

it("동시 쓰기 준비는 직렬화하고 이미 발급된 쿠키를 재사용한다", async () => {
  vi.mocked(request).mockResolvedValueOnce({ ready: false }).mockResolvedValueOnce(undefined)
    .mockResolvedValue({ ready: true });
  await Promise.all([prepareIdentity(true), prepareIdentity(true)]);
  expect(vi.mocked(request).mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
});

it("브라우저가 지원하면 여러 탭의 준비도 같은 Web Lock으로 직렬화한다", async () => {
  const lock = vi.fn(async (_name: string, operation: () => Promise<void>) => operation());
  vi.stubGlobal("navigator", { locks: { request: lock } });
  vi.mocked(request).mockResolvedValue({ ready: true });
  await prepareIdentity(true);
  expect(lock).toHaveBeenCalledWith("yesulin.community.owner", expect.any(Function));
});
