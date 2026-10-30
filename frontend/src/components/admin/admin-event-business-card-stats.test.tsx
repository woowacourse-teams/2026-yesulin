// @vitest-environment jsdom
import { act, type ButtonHTMLAttributes } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fetchEventBusinessCardVisitStats } from "@/features/admin/api";
import type { AdminEventBusinessCardVisitStats } from "@/features/admin/types";
import { AdminEventBusinessCardStats } from "./admin-event-business-card-stats";

vi.mock("@/features/admin/api", () => ({ AdminApiError: class extends Error {}, fetchEventBusinessCardVisitStats: vi.fn() }));
vi.mock("./admin-shell", () => ({ AdminActionButton: ({ tone, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: string }) => <button data-tone={tone} {...props} /> }));
const stats: AdminEventBusinessCardVisitStats = { fromDate: "2026-10-15", toDate: "2026-10-28",
  daily: [{ date: "2026-10-28", visits: 3 }] };
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
async function open() {
  await act(async () => root.render(<AdminEventBusinessCardStats eventId={2} onUnauthorized={vi.fn()} />));
}

it("shows event daily totals and queries the chosen range", async () => {
  vi.mocked(fetchEventBusinessCardVisitStats).mockResolvedValue(stats);
  await open();
  expect(fetchEventBusinessCardVisitStats).toHaveBeenCalledWith(2, 14);
  expect(container.textContent).toContain("3회");
  expect(container.textContent).toContain("이 이벤트에서 발급한 모든 명함");
  expect(container.querySelectorAll("thead th")).toHaveLength(2);
  vi.mocked(fetchEventBusinessCardVisitStats).mockResolvedValue({ ...stats, fromDate: "2026-10-22" });
  await act(async () => {
    const select = container.querySelector("select")!;
    select.value = "7";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(fetchEventBusinessCardVisitStats).toHaveBeenLastCalledWith(2, 7);
  expect(container.querySelector("caption")?.textContent).toContain("2026-10-22");
  expect(container.textContent).toContain("3회");
});

it("does not turn request failures into zero visits and supports retry", async () => {
  vi.mocked(fetchEventBusinessCardVisitStats).mockRejectedValue(new Error("통계 조회 실패"));
  await open();
  expect(container.querySelector('[role="alert"]')?.textContent).toBe("통계 조회 실패");
  expect(container.textContent).not.toContain("0회");
  vi.mocked(fetchEventBusinessCardVisitStats).mockResolvedValue({ ...stats, daily: [{ date: "2026-10-28", visits: 0 }] });
  await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(container.textContent).toContain("0회");
});

it("접속이 없는 기간은 빈 상태로 안내하고 날짜별 표는 접어 둔다", async () => {
  vi.mocked(fetchEventBusinessCardVisitStats).mockResolvedValue({ ...stats, daily: [{ date: "2026-10-28", visits: 0 }] });
  await open();
  expect(container.querySelector("dd")?.textContent).toBe("0회");
  expect(container.textContent).toContain("이 기간에는 명함 접속 기록이 없어요.");
  expect(container.querySelector("svg")).toBeNull();
  expect(container.querySelector("details")?.open).toBe(false);
  await act(async () => container.querySelector("summary")!.click());
  expect(container.querySelector("details")?.open).toBe(true);
  expect(container.querySelector("tbody")?.textContent).toContain("0회");
});

it("날짜별 접속을 합산하고 0회인 날짜도 추이와 상세 기록에 유지한다", async () => {
  vi.mocked(fetchEventBusinessCardVisitStats).mockResolvedValue({ ...stats, daily: [
    { date: "2026-10-26", visits: 2 }, { date: "2026-10-27", visits: 0 }, { date: "2026-10-28", visits: 8 },
  ] });
  await open();
  expect(container.querySelector("dd")?.textContent).toBe("10회");
  expect(container.querySelector('svg[role="img"]')?.getAttribute("aria-label")).toContain("최대 8회");
  expect(container.querySelectorAll("svg rect")).toHaveLength(3);
  expect(container.querySelectorAll("tbody tr")).toHaveLength(3);
  expect(container.querySelector("tbody tr")?.textContent).toContain("8회");
});
