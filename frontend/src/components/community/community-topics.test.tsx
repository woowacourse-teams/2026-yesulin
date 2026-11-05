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

async function selectTopic(value: string) {
  const select = host.querySelector("select")!;
  select.value = value;
  await act(async () => { select.dispatchEvent(new Event("change", { bubbles: true })); });
}
async function submit() {
  await act(async () => { host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true })); });
}

it("로그인 배우는 자유로 시작하며 초안에 선택한 주제를 저장해 작성한다", async () => {
  await act(async () => root.render(<PostEditor />));
  expect(host.querySelector("select")?.value).toBe("FREE");
  await selectTopic("QUESTION");
  const draftKey = "yesulin.community.draft:42:post:new";
  const draft = JSON.parse(sessionStorage.getItem(draftKey)!);
  expect(draft.topic).toBe("QUESTION");
  sessionStorage.setItem(draftKey, JSON.stringify({ ...draft, title: "질문", body: "본문" }));
  await act(async () => root.render(<PostEditor key="restored" />));
  expect(host.querySelector("select")?.value).toBe("QUESTION");
  vi.mocked(createPost).mockResolvedValue({ id: 42 } as CommunityEntry);
  await submit();
  expect(createPost).toHaveBeenCalledWith(expect.objectContaining({ topic: "QUESTION", title: "질문" }), draft.requestId);
});

it("글 수정에서 기존 주제를 보여주고 새 주제를 전송한다", async () => {
  const post = { id: 11, title: "제목", body: "본문", topic: "AUDITION_REVIEW", memberOwned: true } as CommunityEntry;
  await act(async () => root.render(<PostEditor post={post} onSaved={vi.fn()} />));
  expect(host.querySelector("select")?.value).toBe("AUDITION_REVIEW");
  await selectTopic("PRACTICE");
  await submit();
  expect(editPost).toHaveBeenCalledWith(11, { title: "제목", body: "본문", topic: "PRACTICE" });
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
