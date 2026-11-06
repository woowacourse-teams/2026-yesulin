import { beforeEach, expect, it, vi } from "vitest";
import { request } from "@/features/auditions/api-client";
import { getPost, setPostLike } from "./api";
import { prepareIdentity } from "./identity";
import { communityListMemory } from "./list-memory";

vi.mock("@/features/auditions/api-client", () => ({ request: vi.fn() }));
vi.mock("./identity", () => ({ prepareIdentity: vi.fn() }));
beforeEach(() => {
  vi.mocked(request).mockReset();
  vi.mocked(prepareIdentity).mockReset().mockResolvedValue(undefined);
  communityListMemory.scroll = 120;
});

it("응답 유실 후에도 쿠키를 재확인하고 같은 등록 요청으로 재시도한다", async () => {
  vi.mocked(request).mockRejectedValueOnce(new Error("연결 실패"));
  vi.mocked(request).mockResolvedValueOnce({ likeCount: 1, liked: true });
  await expect(setPostLike(4, true)).rejects.toThrow("연결 실패");
  expect(communityListMemory.scroll).toBe(120);
  await expect(setPostLike(4, true)).resolves.toEqual({ likeCount: 1, liked: true });
  expect(communityListMemory.scroll).toBe(0);
  expect(prepareIdentity).toHaveBeenCalledWith(true);
  expect(request).toHaveBeenNthCalledWith(1, "/v1/public/community/posts/4/likes", { method: "PUT", body: undefined });
  expect(request).toHaveBeenNthCalledWith(2, "/v1/public/community/posts/4/likes", { method: "PUT", body: undefined });
});

it("취소는 토글 대신 DELETE로 요청한다", async () => {
  vi.mocked(request).mockResolvedValue({ likeCount: 0, liked: false });
  await expect(setPostLike(4, false)).resolves.toEqual({ likeCount: 0, liked: false });
  expect(request).toHaveBeenCalledWith("/v1/public/community/posts/4/likes", { method: "DELETE", body: undefined });
});

it("쿠키를 확인할 수 없으면 좋아요 요청을 보내지 않는다", async () => {
  vi.mocked(prepareIdentity).mockRejectedValue(new Error("쿠키 차단"));
  await expect(setPostLike(4, true)).rejects.toThrow("쿠키 차단");
  expect(request).not.toHaveBeenCalled();
});

it("이전 실패로 공개 읽기를 막지 않고 관리 키 헤더 없이 조회한다", async () => {
  vi.mocked(prepareIdentity).mockRejectedValue(new Error("이전 실패"));
  vi.mocked(request).mockResolvedValue({ id: 4, editable: false });
  await expect(getPost(4)).resolves.toMatchObject({ id: 4 });
  expect(prepareIdentity).toHaveBeenCalledWith(false);
  expect(request).toHaveBeenCalledWith("/v1/public/community/posts/4", { cache: "no-store" });
});
