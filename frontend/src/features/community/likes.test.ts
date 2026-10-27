import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { request } from "@/features/auditions/api-client";
import { setPostLike } from "./api";
import { communityListMemory } from "./list-memory";

vi.mock("@/features/auditions/api-client", () => ({ request: vi.fn() }));
const key = "a".repeat(64);
beforeEach(() => {
  vi.mocked(request).mockReset();
  vi.stubGlobal("localStorage", { getItem: () => key });
  communityListMemory.page = { items: [], nextCursor: null };
});
afterEach(() => { vi.unstubAllGlobals(); communityListMemory.page = null; });

it("응답 유실 후에도 같은 브라우저와 등록 요청으로 재시도한다", async () => {
  vi.mocked(request).mockRejectedValueOnce(new Error("연결 실패"));
  vi.mocked(request).mockResolvedValueOnce({ likeCount: 1, liked: true });
  await expect(setPostLike(4, true)).rejects.toThrow("연결 실패");
  expect(communityListMemory.page).not.toBeNull();
  await expect(setPostLike(4, true)).resolves.toEqual({ likeCount: 1, liked: true });
  expect(communityListMemory.page).toBeNull();
  expect(request).toHaveBeenNthCalledWith(1, "/v1/public/community/posts/4/likes", expect.objectContaining({ method: "PUT", headers: { "X-Community-Key": key } }));
  expect(request).toHaveBeenNthCalledWith(2, "/v1/public/community/posts/4/likes", expect.objectContaining({ method: "PUT", headers: { "X-Community-Key": key } }));
});

it("취소는 토글 대신 DELETE로 요청한다", async () => {
  vi.mocked(request).mockResolvedValue({ likeCount: 0, liked: false });
  await expect(setPostLike(4, false)).resolves.toEqual({ likeCount: 0, liked: false });
  expect(request).toHaveBeenCalledWith("/v1/public/community/posts/4/likes", expect.objectContaining({ method: "DELETE" }));
});

it("브라우저 정보를 저장할 수 없으면 좋아요 요청을 보내지 않는다", async () => {
  vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); } });
  await expect(setPostLike(4, true)).rejects.toThrow("브라우저 저장 공간");
  expect(request).not.toHaveBeenCalled();
});
