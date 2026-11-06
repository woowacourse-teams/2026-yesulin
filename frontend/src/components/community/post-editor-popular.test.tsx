// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createPost, editPost, getParticipation, getPopularPosts } from "@/features/community/api";
import type { CommunityEntry } from "@/features/community/types";
import { PostEditor } from "./post-editor";
import { PopularPostsCard } from "./popular-posts-card";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/components/auth/auth-session", () => ({ useAuthSession: () => ({ session: { credential: "test" } }) }));
vi.mock("@/features/community/api", () => ({
  createPost: vi.fn(), editPost: vi.fn(), getParticipation: vi.fn(), getPopularPosts: vi.fn(),
}));
vi.mock("@/features/community/analytics", () => ({
  trackComposeStarted: vi.fn(), trackPostCreated: vi.fn(), useTrackOnce: vi.fn(), useAbandonTracking: vi.fn(),
}));

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("sessionStorage", storage);
  vi.mocked(getParticipation).mockResolvedValue({ canWrite: true, memberId: 42, fixedMode: null, profile: null });
  host = document.createElement("div");
  root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); vi.clearAllMocks(); vi.unstubAllGlobals(); });

async function submit() {
  await act(async () => { host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true })); });
}

it("글쓰기에는 주제 칸이 없고 주제 없이 작성한다", async () => {
  await act(async () => root.render(<PostEditor />));
  expect(host.querySelector("select")).toBeNull();
  const draftKey = "yesulin.community.draft:42:post:new";
  const draft = { topic: "QUESTION", title: "질문", body: "본문", authorMode: "ANONYMOUS", requestId: crypto.randomUUID(), savedAt: Date.now() };
  sessionStorage.setItem(draftKey, JSON.stringify(draft));
  await act(async () => root.render(<PostEditor key="restored" />));
  vi.mocked(createPost).mockResolvedValue({ id: 42 } as CommunityEntry);
  await submit();
  expect(createPost).toHaveBeenCalledWith({ title: "질문", body: "본문", authorMode: "ANONYMOUS", expectedMemberId: 42 }, draft.requestId);
});

it("글 수정은 주제를 보내지 않아 서버가 기존 주제를 유지한다", async () => {
  const post = { id: 11, title: "제목", body: "본문", topic: "AUDITION_REVIEW", memberOwned: true } as CommunityEntry;
  await act(async () => root.render(<PostEditor post={post} onSaved={vi.fn()} />));
  await submit();
  expect(editPost).toHaveBeenCalledWith(11, { title: "제목", body: "본문" });
});

it("인기 글은 제목 링크만 보이고 빈 응답과 실패는 카드만 숨긴다", async () => {
  const posts = vi.mocked(getPopularPosts);
  posts.mockResolvedValueOnce([{ id: 9, title: "발성 루틴" }]).mockResolvedValueOnce([]).mockRejectedValueOnce(Error());
  await act(async () => root.render(<PopularPostsCard version={0} />));
  expect(host.querySelector('a[href="/community/9"]')?.textContent).toBe("발성 루틴");
  await act(async () => root.render(<PopularPostsCard version={1} />));
  expect(host.innerHTML).toBe("");
  await act(async () => root.render(<PopularPostsCard version={2} />));
  expect(host.innerHTML).toBe("");
});

it("좋아요 갱신 뒤 늦은 이전 순위가 새 순위를 덮어쓰지 않는다", async () => {
  const pending = Promise.withResolvers<readonly { id: number; title: string }[]>();
  vi.mocked(getPopularPosts).mockReturnValueOnce(pending.promise).mockResolvedValueOnce([{ id: 11, title: "새 순위" }]);
  await act(async () => root.render(<PopularPostsCard version={0} />));
  await act(async () => root.render(<PopularPostsCard version={1} />));
  await act(async () => pending.resolve([]));
  expect(host.querySelector("a")?.textContent).toBe("새 순위");
});
