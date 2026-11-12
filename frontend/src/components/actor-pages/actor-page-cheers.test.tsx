// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ActorPageCheer, ActorPageCheers } from "@/features/actor-pages/cheer-api";
import { ActorPageCheersSection } from "./actor-page-cheers";

const api = vi.hoisted(() => ({ get: vi.fn(), write: vi.fn(), edit: vi.fn(), remove: vi.fn(), toast: vi.fn() }));
vi.mock("@/features/actor-pages/cheer-api", () => ({
  ACTOR_CHEER_MAX_LENGTH: 500,
  getActorPageCheers: api.get,
  writeActorPageCheer: api.write,
  editActorPageCheer: api.edit,
  deleteActorPageCheer: api.remove,
}));
vi.mock("@/components/auditions/toast", () => ({ useToast: () => api.toast }));

const cheer = (id: number, overrides: Partial<ActorPageCheer> = {}): ActorPageCheer => ({
  id, fanNumber: 1, body: `응원 ${id}`, mine: false, createdAt: "2026-11-12T00:00:00Z", edited: false, ...overrides,
});
const cheers = (items: ActorPageCheer[], me: Partial<ActorPageCheers["me"]> = {}, nextBefore: number | null = null): ActorPageCheers => ({
  totalCount: items.length,
  cheers: items,
  nextBefore,
  me: { loggedIn: false, owner: false, canWrite: false, ...me },
});

let root: Root;
let container: HTMLDivElement;

async function render() {
  await act(async () => root.render(<ActorPageCheersSection publicId="page-1" handle="dajeong_y" name="김다정" />));
}

function typeInto(element: HTMLTextAreaElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

const button = (label: string) => [...container.querySelectorAll("button")].find((item) => item.textContent === label)!;

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

it("비로그인은 팬 번호로만 보이는 글을 읽고 로그인 링크를 받는다", async () => {
  api.get.mockResolvedValue(cheers([cheer(2, { fanNumber: 2 }), cheer(1)]));

  await render();

  expect(container.textContent).toContain("팬 응원 2");
  expect(container.textContent).toContain("2호 팬");
  expect(container.textContent).toContain("1호 팬");
  expect(container.querySelector("a")!.getAttribute("href")).toBe("/login?returnTo=%2Factors%2F%40dajeong_y");
  expect(container.querySelector("textarea")).toBeNull();
  expect(container.querySelector("button")).toBeNull();
});

it("쓸 수 있는 회원은 글을 남기면 맨 위에 보이고 입력창이 비워진다", async () => {
  api.get.mockResolvedValue(cheers([cheer(1)], { loggedIn: true, canWrite: true }));
  api.write.mockResolvedValue(cheer(2, { fanNumber: 2, body: "새 응원", mine: true }));
  await render();
  const field = container.querySelector("textarea")!;
  expect(button("응원 남기기").disabled).toBe(true);

  await act(async () => typeInto(field, "새 응원"));
  await act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });

  expect(api.write).toHaveBeenCalledWith("page-1", "새 응원");
  const items = container.querySelectorAll("li");
  expect(items[0].textContent).toContain("2호 팬");
  expect(items[0].textContent).toContain("내 글");
  expect(container.textContent).toContain("팬 응원 2");
  expect(container.querySelector("textarea")!.value).toBe("");
});

it("내 글만 수정하고 삭제할 수 있다", async () => {
  api.get.mockResolvedValue(cheers([cheer(2, { mine: true, body: "내 응원" }), cheer(1)], { loggedIn: true, canWrite: true }));
  api.edit.mockResolvedValue(cheer(2, { mine: true, body: "고친 응원", edited: true }));
  api.remove.mockResolvedValue(undefined);
  await render();
  const items = container.querySelectorAll("li");
  expect(items[1].textContent).not.toContain("수정");

  await act(async () => button("수정").click());
  const field = container.querySelector<HTMLTextAreaElement>("li textarea")!;
  await act(async () => typeInto(field, "고친 응원"));
  await act(async () => { container.querySelector("li form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
  expect(api.edit).toHaveBeenCalledWith("page-1", 2, "고친 응원");
  expect(container.querySelector("li")!.textContent).toContain("고친 응원");
  expect(container.querySelector("li")!.textContent).toContain("수정됨");

  await act(async () => button("삭제").click());
  expect(container.textContent).toContain("이 응원 글을 삭제할까요?");
  await act(async () => button("삭제").click());
  expect(api.remove).toHaveBeenCalledWith("page-1", 2);
  expect(container.querySelectorAll("li")).toHaveLength(1);
  expect(container.textContent).toContain("팬 응원 1");
});

it("수정과 삭제 확인에 들어가면 포커스가 옮겨지고 취소하면 눌렀던 버튼으로 돌아온다", async () => {
  api.get.mockResolvedValue(cheers([cheer(1, { mine: true })], { loggedIn: true, canWrite: true }));
  await render();

  await act(async () => button("수정").click());
  expect(document.activeElement).toBe(container.querySelector("li textarea"));
  await act(async () => button("취소").click());
  expect(document.activeElement).toBe(button("수정"));

  await act(async () => button("삭제").click());
  expect(document.activeElement).toBe(button("삭제"));
  expect(container.textContent).toContain("이 응원 글을 삭제할까요?");
  await act(async () => button("취소").click());
  expect(document.activeElement).toBe(container.querySelector('[data-action="delete"]'));
});

it("내 페이지와 공연사·운영자 계정은 안내만 보고 쓰지 못한다", async () => {
  api.get.mockResolvedValueOnce(cheers([cheer(1)], { loggedIn: true, owner: true }));
  await render();
  expect(container.textContent).toContain("내 페이지에는 팬들이 응원을 남겨요.");
  expect(container.querySelector("textarea")).toBeNull();

  api.get.mockResolvedValueOnce(cheers([cheer(1)], { loggedIn: true }));
  await act(async () => root.render(<ActorPageCheersSection publicId="page-2" handle="dajeong_y" name="김다정" />));
  expect(container.textContent).toContain("공연사·운영자 계정으로는 응원을 남길 수 없어요");
  expect(container.querySelector("textarea")).toBeNull();
});

it("더 오래된 글은 더 보기로 이어 붙인다", async () => {
  api.get.mockResolvedValueOnce(cheers([cheer(3), cheer(2)], {}, 2));
  api.get.mockResolvedValueOnce(cheers([cheer(1)]));
  await render();

  await act(async () => button("응원 글 더 보기").click());

  expect(api.get).toHaveBeenLastCalledWith("page-1", 2);
  expect(container.querySelectorAll("li")).toHaveLength(3);
  expect(container.textContent).not.toContain("응원 글 더 보기");
});

it("글이 없으면 빈 상태를 보이고 읽지 못하면 다시 시도할 수 있다", async () => {
  api.get.mockResolvedValueOnce(cheers([]));
  await render();
  expect(container.textContent).toContain("아직 응원 글이 없어요");

  api.get.mockRejectedValueOnce(new Error("실패"));
  await act(async () => root.render(<ActorPageCheersSection publicId="page-2" handle="dajeong_y" name="김다정" />));
  expect(container.textContent).toContain("응원 글을 불러오지 못했어요.");
  api.get.mockResolvedValueOnce(cheers([cheer(1)]));
  await act(async () => button("다시 시도").click());
  expect(container.querySelectorAll("li")).toHaveLength(1);
});

it("글을 남기지 못하면 알리고 입력한 내용을 그대로 둔다", async () => {
  api.get.mockResolvedValue(cheers([], { loggedIn: true, canWrite: true }));
  api.write.mockRejectedValue(new Error("실패"));
  await render();
  await act(async () => typeInto(container.querySelector("textarea")!, "응원"));

  await act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });

  expect(api.toast).toHaveBeenCalledWith(expect.any(String), { type: "error" });
  expect(container.querySelector("textarea")!.value).toBe("응원");
});
