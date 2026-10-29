// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fetchMyAuditionPosts, type ProducerAuditionPost } from "@/features/audition-posts/producer-api";
import { ProducerAuditionPostList } from "./producer-audition-post-list";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));
vi.mock("@/features/audition-posts/producer-api", async (original) => ({
  ...await original<typeof import("@/features/audition-posts/producer-api")>(),
  fetchMyAuditionPosts: vi.fn(),
}));

const post: ProducerAuditionPost = {
  id: 1, category: "연극", title: "직접 올린 공고", deadlineText: "11월 30일", closed: false,
  status: "PUBLISHED", viewCount: 3, createdAt: "2026-10-29T00:00:00Z", updatedAt: "2026-10-29T00:00:00Z",
};
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

const linkRequest = () => Array.from(container.querySelectorAll("a")).find((link) => link.textContent === "회원 연결 문의");

it("직접 올린 공고가 있어도 OTR 공고 회원 연결 문의를 보여 준다", async () => {
  vi.mocked(fetchMyAuditionPosts).mockResolvedValue([post]);
  await act(async () => root.render(<ProducerAuditionPostList />));
  expect(container.textContent).toContain("직접 올린 공고");
  expect(linkRequest()?.getAttribute("href")).toBe("http://pf.kakao.com/_pbTBX/chat");
});

it("공고가 없으면 빈 목록 안내와 함께 회원 연결 문의를 보여 준다", async () => {
  vi.mocked(fetchMyAuditionPosts).mockResolvedValue([]);
  await act(async () => root.render(<ProducerAuditionPostList />));
  expect(container.textContent).toContain("아직 연결되거나 직접 올린 공고가 없어요");
  expect(linkRequest()).toBeDefined();
});
