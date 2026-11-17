// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getPosts } from "@/features/community/api";
import type { CommunityEntry } from "@/features/community/types";
import { CommunityList } from "./community-list";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));
vi.mock("@/components/auth/auth-session", () => ({
  useAuthSession: () => ({ sessionReady: true, session: null }),
}));
vi.mock("@/components/auth/login-form", () => ({
  LoginForm: ({ returnTo }: { returnTo: string }) => <a href={returnTo}>목 로그인</a>,
}));
vi.mock("@/features/community/api", () => ({ getPosts: vi.fn() }));
vi.mock("@/features/community/analytics", () => ({ trackListViewed: vi.fn(), useTrackOnce: vi.fn() }));
vi.mock("./community-deadlines", () => ({ CommunityDeadlines: () => null }));
vi.mock("./popular-posts-card", () => ({ PopularPostsCard: () => null }));
vi.mock("./received-comments-context", () => ({ useUnreadCommentCount: () => 0 }));

let host: HTMLDivElement;
let root: Root;

function post(id: number): CommunityEntry {
  return {
    id, title: `예시 글 ${id}`, body: "본문", author: "익명", createdAt: "2026-11-17T00:00:00Z",
    updatedAt: "2026-11-17T00:00:00Z", commentCount: 0, likeCount: 0, liked: false, editable: false, replyToId: null,
  };
}

function renderList() {
  return act(async () => root.render(<CommunityList />));
}

function action(name: string) {
  const button = [...host.querySelectorAll("button")].find(element => element.textContent?.includes(name));
  return act(async () => button!.click());
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true; } },
    close: { configurable: true, value(this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event("close"));
    } },
  });
  vi.mocked(getPosts).mockImplementation(async before => {
    if (before) return { items: [post(4)], nextCursor: null };
    return { items: [post(5)], nextCursor: 5 };
  });
  window.history.replaceState(null, "", "/community");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it("비로그인 글쓰기에서 목록을 유지하고 로그인 후 글쓰기 주소를 전달한다", async () => {
  await renderList();
  await action("글쓰기");
  const dialog = host.querySelector("dialog[open]")!;
  expect(dialog.querySelector("h2")?.textContent).toBe("로그인하고 글쓰기");
  expect(dialog.querySelector("a")?.getAttribute("href")).toBe("/community/new");
  expect(window.location.pathname).toBe("/community");
  expect(host.textContent).toContain("예시 글 5");
  await act(async () => dialog.querySelector<HTMLButtonElement>('[aria-label="닫기"]')!.click());
  expect(host.querySelector(".community-login-dialog")).toBeNull();
});

it("비로그인 상태에서 더 보기를 누르면 같은 목록에 다음 글을 한 번만 추가한다", async () => {
  await renderList();
  await action("이야기 더 보기");
  expect(vi.mocked(getPosts).mock.calls).toEqual([[], [5]]);
  expect(window.location.pathname + window.location.search).toBe("/community");
  expect(host.querySelector(".community-login-dialog")).toBeNull();
  expect([...host.querySelectorAll(".community-post-link h2")].map(heading => heading.textContent)).toEqual(["예시 글 5", "예시 글 4"]);
  expect(host.querySelector(".community-more")).toBeNull();
});
