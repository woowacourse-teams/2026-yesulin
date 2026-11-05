// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAuditionPosts } from "@/features/audition-posts/api";
import type { AuditionPostPage } from "@/features/audition-posts/types";
import { CommunityDeadlines } from "./community-deadlines";
import { CommunityPhoto } from "./community-ui";

vi.mock("@/features/audition-posts/api", () => ({ getAuditionPosts: vi.fn() }));

let root: Root;
let container: HTMLDivElement;

const page = (count: number) => ({
  posts: Array.from({ length: count }, (_, index) => ({
    id: index + 1, category: "연극", title: `합성 공고 ${index + 1}`, authorName: "극단", pay: "협의", deadlineText: "2026-11-07",
    deadline: "2026-11-07", closed: false, viewCount: 0, postedAt: null, alertChatMembers: 0, thumbnailUrl: null, attachmentCount: 0,
  })),
}) as unknown as AuditionPostPage;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("수다방 마감 임박 공고", () => {
  it("마감순 공개 공고 5개를 상세로 이어 준다", async () => {
    vi.mocked(getAuditionPosts).mockResolvedValue(page(2));
    await act(async () => root.render(<CommunityDeadlines />));
    expect(getAuditionPosts).toHaveBeenCalledWith({ page: 0, includeClosed: false, sort: "deadline" }, 5);
    expect(container.querySelector('a[href="/posts/1"]')?.textContent).toContain("합성 공고 1");
    expect(container.querySelector("aside")).not.toBeNull();
  });

  it("읽지 못하거나 공고가 없으면 옆 영역 자체를 그리지 않는다", async () => {
    vi.mocked(getAuditionPosts).mockRejectedValue(new Error("실패"));
    await act(async () => root.render(<CommunityDeadlines />));
    expect(container.innerHTML).toBe("");
    vi.mocked(getAuditionPosts).mockResolvedValue(page(0));
    act(() => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(<CommunityDeadlines />));
    expect(container.innerHTML).toBe("");
  });
});

describe("작성자 사진", () => {
  it("사진도 이름도 없으면 그리지 않고, 이름만 있으면 색을 입힌 별을 보인다", async () => {
    await act(async () => root.render(<CommunityPhoto />));
    expect(container.innerHTML).toBe("");
    await act(async () => root.render(<CommunityPhoto label="익명2" seed="7:익명2" />));
    expect(container.querySelector(".community-avatar-star")?.getAttribute("style")).toMatch(/hue-rotate\(\d+deg\)/);
  });
});
