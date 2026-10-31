// @vitest-environment jsdom
import { act, StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { ScreeningBoard } from "./screening-board";
import type { ReviewDetail, ReviewEntry } from "@/features/pdf-reviews/types";

const capture = vi.hoisted(() => vi.fn());
vi.mock("@/features/analytics/product-analytics", () => ({ trackProductEvent: capture }));
vi.mock("@/features/pdf-extractions/api", () => ({ fetchPdfExtraction: vi.fn().mockResolvedValue({ id: "job", status: "FAILED" }) }));
vi.mock("@/features/pdf-reviews/api", () => ({
  isUnauthorized: () => false, assignPdfReviewRoles: vi.fn(),
  updatePdfReviewEntry: vi.fn(async (_review, id, change) => ({ ...entry(id), ...change })),
}));
function entry(id: string): ReviewEntry {
  return { id, jobId: `job-${id}`, originalFilename: "synthetic.pdf", applicantName: `Synthetic ${id}`,
    roleId: null, matchStatus: "NEEDS_CHECK", matchEvidence: null, memo: "", decision: "PENDING" };
}
afterEach(() => { vi.unstubAllGlobals(); capture.mockClear(); });

it.each(["card", "table"] as const)("%s: 직접 열기·이동·저장은 각각 1회, 자동 이동·재렌더·사진 영역은 0회", async view => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  function Harness() {
    const [entries, setEntries] = useState([entry("a"), entry("b"), entry("c")]);
    const review: ReviewDetail = { id: "review", title: "Synthetic", createdAt: "2026-10-31", roles: [], entries };
    return <ScreeningBoard review={review} entries={entries.filter(e => e.decision === "PENDING")} decision="PENDING" view={view}
      refreshKey={0} onSaved={updated => setEntries(items => items.map(e => e.id === updated.id ? updated : e))}
      onUnauthorized={() => {}} onDirtyChange={() => {}} navigate={action => action()} />;
  }
  const actions = () => capture.mock.calls.filter(c => c[0] === "review_basic_action").map(c => c[1]);
  const button = (name: string) => [...host.querySelectorAll("button")].find(b => b.getAttribute("aria-label")?.startsWith(name))!;
  try {
    await act(async () => root.render(<StrictMode><Harness /></StrictMode>));
    expect(actions()).toEqual([]);
    const open = view === "card" ? [...host.querySelectorAll("button")].find(b => b.textContent?.includes("Synthetic a"))! : host.querySelector<HTMLElement>('tr[aria-label="Synthetic a 배우 상세 보기"]')!;
    expect(open).toBeTruthy(); await act(async () => open.click());
    expect(actions()).toHaveLength(1);
    expect(actions()[0]).toMatchObject({ review_action: "open", item_id: "a", review_view: view, input_method: "button" });
    await act(async () => button("다음 지원자").click());
    await act(async () => button("이전 지원자").click());
    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "n" })));
    expect(actions().map(a => [a.review_action, a.item_id, a.input_method])).toEqual([
      ["open", "a", "button"], ["next", "b", "button"], ["previous", "a", "button"], ["next", "b", "shortcut"],
    ]);
    await act(async () => button("보류").click());
    expect(actions()).toHaveLength(5);
    expect(actions()[4]).toMatchObject({ review_action: "decision_save", item_id: "b" });
    expect(host.querySelector("section")?.getAttribute("aria-label")).toContain("Synthetic c");
    await act(async () => root.render(<StrictMode><Harness /></StrictMode>));
    await act(async () => host.querySelector<HTMLElement>("[data-review-photo]")!.click());
    expect(actions()).toHaveLength(5);
  } finally { await act(async () => root.unmount()); host.remove(); }
});

it.each(["single", "card", "table"] as const)("%s: 원본 열기 2곳·반복만 집계하고 닫기·재렌더·기본 조작과 분리한다", async view => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  const entries = [entry("a")];
  const review: ReviewDetail = { id: "review", title: "Synthetic", createdAt: "2026-11-01", roles: [], entries };
  const render = () => <StrictMode><ScreeningBoard review={review} entries={entries} decision="PENDING" view={view}
    refreshKey={0} onSaved={() => {}} onUnauthorized={() => {}} onDirtyChange={() => {}} navigate={action => action()} /></StrictMode>;
  const original = () => capture.mock.calls.filter(c => c[0] === "review_original_pdf_clicked");
  const basicCount = () => capture.mock.calls.filter(c => c[0] === "review_basic_action").length;
  const button = (text: string) => [...host.querySelectorAll("button")].find(b => b.textContent === text)!;
  try {
    await act(async () => root.render(render()));
    if (view !== "single") {
      const open = view === "card" ? [...host.querySelectorAll("button")].find(b => b.textContent?.includes("Synthetic a"))! : host.querySelector<HTMLElement>('tr[aria-label="Synthetic a 배우 상세 보기"]')!;
      await act(async () => open.click());
    }
    expect(original()).toHaveLength(0);
    expect(capture.mock.calls.filter(c => c[0] === "review_item_viewed").at(-1)?.[1]).toMatchObject({ metric_version: 1, review_id: "review", item_id: "a" });
    const before = basicCount();
    await act(async () => button("원본 PDF").click());
    expect(original()).toHaveLength(1);
    expect(original()[0][1]).toEqual({ metric_version: 1, workflow: "producer_pdf", review_id: "review", item_id: "a", review_view: view, pdf_open_source: "review_detail" });
    await act(async () => root.render(render()));
    await act(async () => button("PDF 닫기").click());
    expect(original()).toHaveLength(1);
    await act(async () => button("원본 PDF 보기").click());
    expect(original()).toHaveLength(2);
    await act(async () => button("원본 PDF 보기").click());
    expect(original()).toHaveLength(3);
    expect(basicCount()).toBe(before);
  } finally { await act(async () => root.unmount()); host.remove(); }
});
