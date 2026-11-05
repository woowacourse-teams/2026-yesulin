import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { clearCommunityDrafts, readCommunityDraft, saveCommunityDraft } from "./member-draft";
import { commentThreads, linkedCommentPage, loadThroughComment, mergeComments } from "./comments";
import type { CommunityEntry } from "./types";

beforeEach(() => {
  const storage: Record<string, unknown> = {};
  Object.defineProperties(storage, {
    getItem: { value: (key: string) => storage[key] ?? null },
    setItem: { value: (key: string, value: string) => { storage[key] = value; } },
    removeItem: { value: (key: string) => { delete storage[key]; } },
  });
  vi.stubGlobal("sessionStorage", storage);
});
afterEach(() => vi.unstubAllGlobals());
it("같은 계정·같은 글의 초안만 복구하고 만료되면 제거한다", () => {
  saveCommunityDraft("post:new", 1, { title: "제목", body: "내용", authorMode: "ANONYMOUS", requestId: "request" }, 1000);
  expect(readCommunityDraft("post:new", 2, 1001)).toBeNull();
  expect(readCommunityDraft("post:new", 1, 1001)?.body).toBe("내용");
  expect(readCommunityDraft("post:new", 1, 1_801_001)).toBeNull();
});
it("로그아웃 시 커뮤니티 초안만 지운다", () => {
  sessionStorage.setItem("other", "keep");
  saveCommunityDraft("comment:3", 1, { title: "", body: "댓글", authorMode: "PROFILE", requestId: "request" });
  clearCommunityDrafts();
  expect(readCommunityDraft("comment:3", 1)).toBeNull();
  expect(sessionStorage.getItem("other")).toBe("keep");
});
it("손상된 초안은 복원하지 않는다", () => {
  sessionStorage.setItem("yesulin.community.draft:1:post:new", '{"savedAt":1}');
  expect(readCommunityDraft("post:new", 1, 2)).toBeNull();
});
const entry = (id: number) => ({ id, body: String(id) }) as CommunityEntry;
it("기존 댓글을 유지하고 중복을 제거해 정렬한다", () => {
  expect(mergeComments([entry(1), entry(3)], [entry(2), entry(3)]).map(item => item.id)).toEqual([1, 2, 3]);
});
it("새 댓글까지 여러 페이지를 읽고 중간 댓글을 건너뛰지 않는다", async () => {
  const cursors: number[] = [];
  const result = await loadThroughComment(async after => {
    cursors.push(after ?? 0);
    if (after === 1) return { items: [entry(2)], nextCursor: 2 };
    return { items: [entry(3)], nextCursor: null };
  }, 1, 3);
  expect(cursors).toEqual([1, 2]);
  expect(result.items.map(item => item.id)).toEqual([2, 3]);
});

it("원댓글이 앞 페이지에 있거나 삭제돼도 답글을 같은 원댓글 아래에 모은다", () => {
  const items = [entry(4), { ...entry(7), replyToId: 2 }, { ...entry(8), replyToId: 2 }];
  const missing = commentThreads(items);
  expect(missing.map(thread => thread.id)).toEqual([2, 4]);
  expect(missing[0].root).toBeUndefined();
  expect(missing[0].replies.map(reply => reply.id)).toEqual([7, 8]);
  expect(commentThreads(mergeComments(items, [entry(2)]))[0].root?.id).toBe(2);
});

it("멀리 떨어진 대댓글 알림은 원댓글 하나를 함께 불러오고 이어보기 위치를 유지한다", async () => {
  const target = { ...entry(95), replyToId: 4 };
  const fetchPage = vi.fn(async (after: number) => {
    if (after === 94) return { items: [target, entry(96)], nextCursor: 96 };
    return { items: [entry(4), entry(5)], nextCursor: 5 };
  });
  const page = await linkedCommentPage(fetchPage, 94);
  expect(fetchPage.mock.calls).toEqual([[94], [3]]);
  expect(page.items.map(item => item.id)).toEqual([4, 95, 96]);
  expect(page.nextCursor).toBe(96);
});
