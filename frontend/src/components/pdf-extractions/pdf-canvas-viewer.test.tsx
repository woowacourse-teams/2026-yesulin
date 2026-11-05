// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PdfCanvasViewer } from "./pdf-canvas-viewer";

type Task = { page: number; resolve: () => void; reject: (error: Error) => void };
const state = vi.hoisted(() => ({ tasks: [] as Task[] }));
vi.mock("pdfjs-dist", () => ({ GlobalWorkerOptions: {}, version: "test", getDocument: () => ({
  destroy: vi.fn().mockResolvedValue(undefined),
  promise: Promise.resolve({ numPages: 3, getPage: async (page: number) => ({
    getViewport: ({ scale }: { scale: number }) => ({ width: 100 * scale, height: 140 * scale }),
    render: () => ({ promise: new Promise<void>((resolve, reject) => state.tasks.push({page,resolve,reject})), cancel: vi.fn() }),
  }) }),
}) }));
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  vi.stubGlobal('ResizeObserver',class {
    constructor(readonly callback: (entries: {contentRect:{width:number}}[])=>void) {}
    observe() { this.callback([{contentRect:{width:800}}]); }
    disconnect() {}
  });
  state.tasks.length=0;host=document.createElement('div');document.body.append(host);root=createRoot(host);
});
afterEach(()=>{act(()=>root.unmount());host.remove();vi.unstubAllGlobals();});
async function page(number: number) {
  const select=host.querySelector<HTMLSelectElement>('[aria-label="PDF 페이지 선택"]')!;
  await act(async()=>{select.value=String(number);select.dispatchEvent(new Event('change',{bubbles:true}));});
}
it('1→2→1 빠른 복귀는 이전 성공 키로 지워진 canvas를 노출하지 않는다',async()=>{
  await act(async()=>root.render(<PdfCanvasViewer url="https://s3.example.test/a.pdf" filename="a.pdf" />));
  await act(async()=>state.tasks[0].resolve());expect(host.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('false');
  await page(2);expect(state.tasks.at(-1)?.page).toBe(2);
  const second=state.tasks.at(-1)!;
  await page(1);expect(host.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('true');
  expect(host.querySelector('[role="status"]')?.textContent).toContain('불러오고');
  await act(async()=>second.resolve());expect(state.tasks.at(-1)?.page).toBe(1);
  expect(host.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('true');
  await act(async()=>state.tasks.at(-1)!.resolve());expect(host.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('false');
});
it('한 페이지 실패가 다음 페이지의 로딩과 완료 표시를 가리지 않는다',async()=>{
  await act(async()=>root.render(<PdfCanvasViewer url="https://s3.example.test/a.pdf" filename="a.pdf" />));
  await act(async()=>state.tasks[0].resolve());await page(2);
  await act(async()=>state.tasks.at(-1)!.reject(new Error('broken page')));
  expect(host.querySelector('[role="alert"]')).not.toBeNull();
  await page(3);expect(host.querySelector('[role="alert"]')).toBeNull();
  expect(host.querySelector('[role="status"]')?.textContent).toContain('불러오고');
  await act(async()=>state.tasks.at(-1)!.resolve());expect(host.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('false');
});
