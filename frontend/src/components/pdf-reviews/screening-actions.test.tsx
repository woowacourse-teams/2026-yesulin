// @vitest-environment jsdom
import { act, StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { ScreeningBoard } from "./screening-board";
import type { LastDecision } from "./screening-ui/fullscreen-dock";
import type { ReviewDetail, ReviewEntry } from "@/features/pdf-reviews/types";

const capture = vi.hoisted(() => vi.fn());
vi.mock("@/features/monitoring/report-error", () => ({ reportError: vi.fn() }));
vi.mock("@/features/analytics/product-analytics", () => ({ trackProductEvent: capture }));
vi.mock("./review-original-document", () => ({ ReviewOriginalDocument: () => <div data-original-test>원본 PDF</div> }));
vi.mock("@/features/pdf-extractions/api", () => ({ fetchPdfExtraction: vi.fn().mockResolvedValue({ id: "job", status: "FAILED" }) }));
vi.mock("@/features/pdf-reviews/api", () => ({
  isUnauthorized: () => false, assignPdfReviewRoles: vi.fn(),
  updatePdfReviewEntry: vi.fn(async (_review, id, change) => ({ ...entry(id), ...change })),
}));
function entry(id: string): ReviewEntry {
  return { id, jobId: `job-${id}`, originalFilename: `synthetic-${id}.pdf`, applicantName: `Synthetic ${id}`,
    roleId: null, matchStatus: "NEEDS_CHECK", matchEvidence: null, memo: "", decision: "PENDING" };
}
afterEach(() => { vi.unstubAllGlobals(); capture.mockClear(); });

it("목록에서 직접 열기·이동·저장은 각각 1회, 자동 이동·재렌더·원본 영역은 0회", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  function Harness() {
    const [entries, setEntries] = useState([entry("a"), entry("b"), entry("c")]);
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [lastDecision, setLastDecision] = useState<LastDecision | null>(null);
    const review: ReviewDetail = { id: "review", title: "Synthetic", createdAt: "2026-10-31", roles: [], entries };
    return <ScreeningBoard review={review} entries={entries.filter(e => e.decision === "PENDING")} decision="PENDING" focusedId={focusedId} onFocusChange={setFocusedId} lastDecision={lastDecision} onLastDecisionChange={setLastDecision}
      refreshKey={0} onSaved={updated => setEntries(items => items.map(e => e.id === updated.id ? updated : e))}
      onUnauthorized={() => {}} onDirtyChange={() => {}} navigate={action => action()} />;
  }
  const actions = () => capture.mock.calls.filter(c => c[0] === "review_basic_action").map(c => c[1]);
  const button = (name: string) => [...host.querySelectorAll("button")].find(b => b.getAttribute("aria-label")?.startsWith(name))!;
  try {
    await act(async () => root.render(<StrictMode><Harness /></StrictMode>));
    expect(actions()).toEqual([]);
    const open = button("지원서 열기");
    expect(open).toBeTruthy(); await act(async () => open.click());
    expect(actions()).toHaveLength(1);
    expect(actions()[0]).toEqual({ metric_version: 2, workflow: "producer_pdf", review_id: "review", item_id: "a", review_view: "list", review_action: "open", input_method: "button" });
    await act(async () => button("다음 지원서").click());
    await act(async () => button("이전 지원서").click());
    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "n", code: "KeyN" })));
    expect(actions().map(a => [a.review_action, a.item_id, a.input_method])).toEqual([
      ["open", "a", "button"], ["next", "b", "button"], ["previous", "a", "button"], ["next", "b", "shortcut"],
    ]);
    await act(async () => button("보류").click());
    expect(actions()).toHaveLength(5);
    expect(actions()[4]).toMatchObject({ review_action: "decision_save", item_id: "b" });
    expect(host.querySelector("section")?.getAttribute("aria-label")).toContain("synthetic-c.pdf");
    await act(async () => root.render(<StrictMode><Harness /></StrictMode>));
    await act(async () => host.querySelector<HTMLElement>("[data-original-test]")!.click());
    expect(actions()).toHaveLength(5);
  } finally { await act(async () => root.unmount()); host.remove(); }
});

it("원본 표시는 클릭으로 기록하지 않고 상세 열람으로 측정한다", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  const entries = [entry("a")];
  const review: ReviewDetail = { id: "review", title: "Synthetic", createdAt: "2026-11-05", roles: [], entries };
  function Harness() {
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [lastDecision, setLastDecision] = useState<LastDecision | null>(null);
    return <ScreeningBoard review={review} entries={entries} decision="PENDING" focusedId={focusedId} onFocusChange={setFocusedId} lastDecision={lastDecision} onLastDecisionChange={setLastDecision} refreshKey={0} onSaved={() => {}} onUnauthorized={() => {}} onDirtyChange={() => {}} navigate={action => action()} />;
  }
  try {
    await act(async () => root.render(<Harness />));
    expect(capture.mock.calls.filter(c => c[0] === "review_item_viewed")).toHaveLength(0);
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="지원서 열기: synthetic-a.pdf"]')!.click());
    expect(host.querySelector('[data-original-test]')).not.toBeNull();
    expect(capture.mock.calls.filter(c=>c[0]==="review_original_pdf_clicked")).toHaveLength(0);
    expect(capture.mock.calls.filter(c=>c[0]==="review_item_viewed").at(-1)?.[1]).toMatchObject({ metric_version: 2,review_id: "review",item_id: "a" });
    await act(async () => root.render(<Harness />));
    expect(capture.mock.calls.filter(c=>c[0]==="review_original_pdf_clicked")).toHaveLength(0);
  } finally { await act(async () => root.unmount()); host.remove(); }
});

it("판정 되돌리기는 Z를 누를 때마다 기록하고 판정 값은 보내지 않는다", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  function Harness() {
    const [entries, setEntries] = useState([entry("a"), entry("b")]);
    const [focusedId, setFocusedId] = useState("a");
    const [lastDecision, setLastDecision] = useState<LastDecision | null>(null);
    const review: ReviewDetail = { id: "review", title: "Synthetic", createdAt: "2026-10-31", roles: [], entries };
    return <ScreeningBoard review={review} entries={entries.filter(e => e.decision === "PENDING")} decision="PENDING" focusedId={focusedId} onFocusChange={setFocusedId} lastDecision={lastDecision} onLastDecisionChange={setLastDecision}
      refreshKey={0} onSaved={updated => setEntries(items => items.map(e => e.id === updated.id ? updated : e))}
      onUnauthorized={() => {}} onDirtyChange={() => {}} navigate={action => action()} />;
  }
  const undoActions = () => capture.mock.calls.filter(c => c[0] === "review_basic_action" && c[1].review_action === "decision_undo").map(c => c[1]);
  const button = (name: string) => [...host.querySelectorAll("button")].find(b => b.getAttribute("aria-label")?.startsWith(name))!;
  try {
    await act(async () => root.render(<Harness />));
    await act(async () => button("합격").click());
    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", code: "KeyZ" })));
    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "s", code: "KeyS" })));
    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", code: "KeyZ" })));
    expect(undoActions().map(a => [a.item_id, a.input_method])).toEqual([["a", "shortcut"], ["a", "shortcut"]]);
    expect(undoActions().every(a => !("decision" in a) && !("review_status" in a))).toBe(true);
  } finally { await act(async () => root.unmount()); host.remove(); }
});
