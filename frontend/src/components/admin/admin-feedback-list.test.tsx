// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fetchFeedback } from "@/features/admin/api";
import type { AdminFeedbackItem } from "@/features/admin/types";
import { AdminFeedbackList } from "./admin-feedback-list";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/feedback", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/features/admin/api", () => ({ AdminApiError: class extends Error { status = 500; }, fetchFeedback: vi.fn() }));

let root: Root;
let container: HTMLDivElement;

function item(id: number, overrides: Partial<AdminFeedbackItem> = {}): AdminFeedbackItem {
  return { id, type: "BUG", content: `의견 ${id}`, contact: "", pagePath: "/shows", memberId: null, userAgent: "UA",
    createdAt: "2026-11-06T02:00:00Z", imageUrls: [], ...overrides };
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

it("의견의 연락처·보낸 사람·첨부 사진을 보여 주고 더 보기로 다음 20건을 이어 붙인다", async () => {
  vi.mocked(fetchFeedback)
    .mockResolvedValueOnce({ items: [item(2, { contact: "a@b.c", memberId: 7, imageUrls: ["https://s3.test/1", "https://s3.test/2"] })], hasNext: true })
    .mockResolvedValueOnce({ items: [item(1)], hasNext: false });
  await act(async () => root.render(<AdminFeedbackList />));

  expect(container.textContent).toContain("a@b.c");
  expect(container.textContent).toContain("회원 #7");
  const links = [...container.querySelectorAll<HTMLAnchorElement>('[aria-label="의견 #2 첨부 사진"] a')];
  expect(links.map(link => link.href)).toEqual(["https://s3.test/1", "https://s3.test/2"]);
  expect(links[0].target).toBe("_blank");

  const more = [...container.querySelectorAll("button")].find(button => button.textContent === "더 보기")!;
  await act(async () => more.click());
  expect(fetchFeedback).toHaveBeenLastCalledWith(2);
  expect(container.querySelectorAll("article")).toHaveLength(2);
  expect(container.textContent).toContain("비회원");
  expect([...container.querySelectorAll("button")].some(button => button.textContent === "더 보기")).toBe(false);
});

it("받은 의견이 없으면 빈 안내를 보인다", async () => {
  vi.mocked(fetchFeedback).mockResolvedValue({ items: [], hasNext: false });
  await act(async () => root.render(<AdminFeedbackList />));
  expect(container.textContent).toContain("아직 받은 의견이 없어요");
});

it("더 보기에 실패해도 같은 기준으로 다시 받아 의견을 건너뛰지 않는다", async () => {
  vi.mocked(fetchFeedback)
    .mockResolvedValueOnce({ items: [item(30)], hasNext: true })
    .mockRejectedValueOnce(new Error("잠시 오류"))
    .mockResolvedValueOnce({ items: [item(29)], hasNext: false });
  await act(async () => root.render(<AdminFeedbackList />));
  const more = () => [...container.querySelectorAll("button")].find(button => button.textContent === "더 보기")!;
  await act(async () => more().click());
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("잠시 오류");
  await act(async () => more().click());
  expect(vi.mocked(fetchFeedback).mock.calls.map(call => call[0])).toEqual([undefined, 30, 30]);
  expect(container.querySelectorAll("article")).toHaveLength(2);
});
