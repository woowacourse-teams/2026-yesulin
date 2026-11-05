// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PdfCanvasViewer } from "./pdf-canvas-viewer";
type Task = { page: number; resolve: () => void; reject: (error: Error) => void; cancel: ReturnType<typeof vi.fn> };
const state = vi.hoisted(() => ({ tasks: [] as Task[], destroy: vi.fn(), cleanup: vi.fn(), brokenMetadata: false }));
vi.mock("pdfjs-dist", () => ({ GlobalWorkerOptions: {}, version: "test", getDocument: () => ({ destroy: state.destroy.mockResolvedValue(undefined),
  promise: Promise.resolve({ numPages: 3, getPage: async (page: number) => { if (page === 3 && state.brokenMetadata) throw new Error("broken metadata"); return ({ cleanup: state.cleanup,
    getViewport: ({ scale }: { scale: number }) => ({ width: 100 * scale, height: 140 * scale }),
    render: () => { const cancel = vi.fn(); const promise = new Promise<void>((resolve, reject) => state.tasks.push({ page, resolve, reject, cancel })); return { promise, cancel }; },
  }); } }),
}) }));
let host: HTMLDivElement, root: Root;
const observers = new Map<Element, (inside: boolean) => void>();
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.clearAllMocks();
  vi.stubGlobal("ResizeObserver", class { constructor(readonly callback: (entries: { contentRect: { width: number } }[]) => void) {} observe() { this.callback([{ contentRect: { width: 800 } }]); } disconnect() {} });
  vi.stubGlobal("IntersectionObserver", class {
    constructor(readonly callback: (entries: { isIntersecting: boolean }[]) => void) {}
    observe(target: Element) { observers.set(target, inside => this.callback([{ isIntersecting: inside }])); }
    disconnect() {}
  });
  observers.clear(); state.brokenMetadata = false; state.tasks.length = 0; host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
async function visible(page: number, inside = true) { await act(async () => observers.get(host.querySelector(`[data-pdf-page="${page}"]`)!)!(inside)); }
async function render() { await act(async () => root.render(<PdfCanvasViewer url="https://example.test/a.pdf" filename="a.pdf" />)); }
const canvas = (page: number) => host.querySelector<HTMLCanvasElement>(`[data-pdf-page="${page}"] canvas`)!;
it("전체 페이지 공간을 연속 배치하고 화면 근처만 한 번에 한 장씩 렌더링한다", async () => {
  await render(); expect(host.querySelectorAll("[data-pdf-page]")).toHaveLength(3); expect(host.querySelector("select,button")).toBeNull(); expect(state.tasks).toHaveLength(0);
  await visible(1); await visible(2); expect(state.tasks.map(t => t.page)).toEqual([1]);
  await act(async () => state.tasks[0].resolve()); expect(state.tasks.map(t => t.page)).toEqual([1, 2]);
  expect(canvas(1).getAttribute("aria-hidden")).toBe("false"); await act(async () => state.tasks[1].resolve());
  expect(canvas(2).getAttribute("aria-hidden")).toBe("false"); expect(canvas(3).width).toBe(300);
});
it("화면 밖 bitmap을 해제하고 빠른 재진입은 이전 완료 표시를 재사용하지 않는다", async () => {
  await render(); await visible(1); await act(async () => state.tasks[0].resolve());
  await visible(1, false); expect(canvas(1).width).toBe(0); expect(state.cleanup).toHaveBeenCalled();
  await visible(1); expect(canvas(1).getAttribute("aria-hidden")).toBe("true");
  await act(async () => state.tasks[1].resolve()); expect(canvas(1).getAttribute("aria-hidden")).toBe("false");
});
it("일반 휠은 스크롤하고 modifier 휠만 확대하며 취소된 렌더가 완료 표시를 덮지 않는다", async () => {
  await render(); await visible(1); const reader = host.querySelector('[role="region"]')!;
  const normal = new WheelEvent("wheel", { deltaY: -80, cancelable: true }); act(() => reader.dispatchEvent(normal)); expect(normal.defaultPrevented).toBe(false);
  const zoom = new WheelEvent("wheel", { deltaY: -80, ctrlKey: true, cancelable: true }); await act(async () => reader.dispatchEvent(zoom));
  expect(zoom.defaultPrevented).toBe(true); expect(Number(reader.getAttribute("data-pdf-zoom"))).toBeGreaterThan(1); expect(state.tasks[0].cancel).toHaveBeenCalled();
  await act(async () => state.tasks[0].resolve()); expect(canvas(1).getAttribute("aria-hidden")).toBe("true");
  await act(async () => state.tasks[1].resolve()); expect(canvas(1).getAttribute("aria-hidden")).toBe("false");
});
it("한 페이지 오류가 다른 페이지를 막지 않고 실패 페이지를 다시 시도할 수 있다", async () => {
  await render(); await visible(1); await visible(2); await act(async () => state.tasks[0].reject(new Error("broken")));
  expect(host.querySelector('[data-pdf-page="1"] [role="alert"]')).not.toBeNull(); expect(state.tasks.at(-1)?.page).toBe(2);
  await act(async () => state.tasks[1].resolve()); expect(canvas(2).getAttribute("aria-hidden")).toBe("false");
  await act(async () => host.querySelector<HTMLButtonElement>('[data-pdf-page="1"] button')!.click());
  await act(async () => state.tasks[2].resolve()); expect(canvas(1).getAttribute("aria-hidden")).toBe("false");
});

it("뒤쪽 페이지 metadata 오류가 정상 앞페이지 표시를 막지 않는다", async () => {
  state.brokenMetadata = true; await render(); await visible(1); await act(async () => state.tasks[0].resolve());
  expect(canvas(1).getAttribute("aria-hidden")).toBe("false"); await visible(3);
  expect(host.querySelector('[data-pdf-page="3"] [role="alert"]')).not.toBeNull();
  expect(host.querySelectorAll("[data-pdf-page]")).toHaveLength(3);
});

it("원본 전환 때 이전 렌더를 취소하고 새 문서의 완료만 표시한다", async () => {
  await render(); await visible(1); const previous = state.tasks[0];
  await act(async()=>root.render(<PdfCanvasViewer url="https://example.test/b.pdf" filename="b.pdf" />));
  expect(previous.cancel).toHaveBeenCalled();expect(state.destroy).toHaveBeenCalled();
  await visible(1); await act(async()=>previous.resolve());
  expect(canvas(1).getAttribute("aria-hidden")).toBe("true");
  await act(async()=>state.tasks[1].resolve());expect(canvas(1).getAttribute("aria-label")).toBe("b.pdf 1페이지");
  expect(canvas(1).getAttribute("aria-hidden")).toBe("false");
});
