// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ActorPageLikes } from "@/features/actor-pages/like-api";
import { ActorPageLikeButton } from "./actor-page-like";

const api = vi.hoisted(() => ({ get: vi.fn(), like: vi.fn(), unlike: vi.fn(), toast: vi.fn() }));
vi.mock("@/features/actor-pages/like-api", () => ({
  getActorPageLikes: api.get,
  likeActorPage: api.like,
  unlikeActorPage: api.unlike,
}));
vi.mock("@/components/auditions/toast", () => ({ useToast: () => api.toast }));

const likes = (count: number, viewer: Partial<ActorPageLikes["viewer"]> = {}): ActorPageLikes => ({
  count,
  viewer: { loggedIn: false, owner: false, canLike: false, liked: false, ...viewer },
});

let root: Root;
let container: HTMLDivElement;

async function render() {
  await act(async () => root.render(<ActorPageLikeButton publicId="page-1" handle="dajeong_y" name="김다정" />));
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  Object.values(api).forEach((mock) => mock.mockReset());
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("로그인하지 않으면 현재 주소로 돌아오는 로그인 링크로 수를 보인다", async () => {
  api.get.mockResolvedValue(likes(1234));

  await render();

  const link = container.querySelector("a")!;
  expect(link.getAttribute("href")).toBe("/login?returnTo=%2Factors%2F%40dajeong_y");
  expect(link.textContent).toContain("1,234");
  expect(link.getAttribute("aria-label")).toBe("김다정 배우 좋아요 1,234, 로그인이 필요해요");
  expect(container.querySelector("button")).toBeNull();
});

it("누를 수 있으면 누르고 취소하며 서버가 준 수로 바꾼다", async () => {
  api.get.mockResolvedValue(likes(3, { loggedIn: true, canLike: true }));
  api.like.mockResolvedValue(likes(4, { loggedIn: true, canLike: true, liked: true }));
  api.unlike.mockResolvedValue(likes(3, { loggedIn: true, canLike: true }));
  await render();
  const button = container.querySelector("button")!;
  expect(button.getAttribute("aria-pressed")).toBe("false");
  expect(button.getAttribute("aria-label")).toBe("김다정 배우 좋아요 3");

  await act(async () => button.click());
  expect(api.like).toHaveBeenCalledWith("page-1");
  expect(button.getAttribute("aria-label")).toBe("김다정 배우 좋아요 4");
  expect(button.getAttribute("aria-pressed")).toBe("true");
  expect(button.textContent).toContain("4");

  await act(async () => button.click());
  expect(api.unlike).toHaveBeenCalledWith("page-1");
  expect(button.getAttribute("aria-pressed")).toBe("false");
  expect(button.textContent).toContain("3");
});

it("내 페이지와 배우가 아닌 계정은 누를 수 없고 수만 본다", async () => {
  api.get.mockResolvedValueOnce(likes(8, { loggedIn: true, owner: true }));
  await render();
  expect(container.querySelector("button")).toBeNull();
  expect(container.querySelector("a")).toBeNull();
  expect(container.textContent).toContain("받은 좋아요 8");

  api.get.mockResolvedValueOnce(likes(9, { loggedIn: true }));
  await act(async () => root.render(<ActorPageLikeButton publicId="page-2" handle="dajeong_y" name="김다정" />));
  expect(container.querySelector("button")).toBeNull();
  expect(container.textContent).toContain("좋아요 9");
});

it("누르지 못하면 알리고 상태는 그대로 둔다", async () => {
  api.get.mockResolvedValue(likes(3, { loggedIn: true, canLike: true }));
  api.like.mockRejectedValue(new Error("실패"));
  await render();

  await act(async () => container.querySelector("button")!.click());

  expect(api.toast).toHaveBeenCalledWith(expect.any(String), { type: "error" });
  expect(container.querySelector("button")!.getAttribute("aria-pressed")).toBe("false");
});

it("읽지 못하면 버튼을 그리지 않는다", async () => {
  api.get.mockRejectedValue(new Error("실패"));

  await render();

  expect(container.innerHTML).toBe("");
});
