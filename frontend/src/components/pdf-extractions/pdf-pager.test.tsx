// @vitest-environment jsdom
import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PdfPageRow } from "./pdf-page-rows";
import { pagerState, usePdfPager, type PdfPagerState } from "./pdf-pager";

const rows: PdfPageRow[] = [[{ index: 0, width: 400 }, { index: 1, width: 400 }], [{ index: 2, width: 800 }]];
let host: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

function Harness({ onChange }: { readonly onChange?: (state: PdfPagerState) => void }) {
  const reader = useRef<HTMLDivElement>(null);
  usePdfPager(reader, rows, onChange);
  return <div ref={reader} data-reader>{rows.map(row => <div key={row[0].index} data-pdf-row />)}<input aria-label="메모" /></div>;
}
const press = (key: string, target: EventTarget = window) => act(async () => { target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })); });

it("지금 화면의 쪽 범위와 전체 쪽 수를 계산한다", () => {
  expect(pagerState(rows, 0, 0)).toEqual({ row: 0, rows: 2, firstPage: 1, lastPage: 2, pages: 3, endAttempts: 0 });
  expect(pagerState(rows, 1, 2)).toMatchObject({ firstPage: 3, lastPage: 3, endAttempts: 2 });
});

it("→는 다음 화면으로 넘기고 마지막 화면에서는 멈춘 횟수만 알린다", async () => {
  const onChange = vi.fn();
  await act(async () => root.render(<Harness onChange={onChange} />));
  const reader = host.querySelector<HTMLDivElement>("[data-reader]")!;
  const scrollTo = vi.fn(); reader.scrollTo = scrollTo as typeof reader.scrollTo;
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ row: 0, endAttempts: 0 }));
  await press("ArrowRight");
  expect(scrollTo).toHaveBeenCalledOnce();
  await act(async () => { Object.defineProperty(reader, "scrollTop", { value: 0, configurable: true }); });
  await press("ArrowLeft");
  expect(scrollTo).toHaveBeenCalledOnce();
});

it("입력 칸 안의 화살표와 맞춤 막대가 없는 기본 보기는 쪽을 넘기지 않는다", async () => {
  const onChange = vi.fn();
  await act(async () => root.render(<Harness onChange={onChange} />));
  const reader = host.querySelector<HTMLDivElement>("[data-reader]")!;
  const scrollTo = vi.fn(); reader.scrollTo = scrollTo as typeof reader.scrollTo;
  await press("ArrowRight", host.querySelector("input")!);
  expect(scrollTo).not.toHaveBeenCalled();
  await act(async () => root.render(<Harness />));
  await press("ArrowRight");
  expect(scrollTo).not.toHaveBeenCalled();
});

it("마지막 화면에서 →를 누르면 멈춘 횟수가 늘어난다", async () => {
  const onChange = vi.fn();
  await act(async () => root.render(<Harness onChange={onChange} />));
  const reader = host.querySelector<HTMLDivElement>("[data-reader]")!;
  reader.scrollTo = vi.fn() as typeof reader.scrollTo;
  const rowsInDom = host.querySelectorAll<HTMLElement>("[data-pdf-row]");
  Object.defineProperty(rowsInDom[1], "offsetTop", { value: 500, configurable: true });
  Object.defineProperty(reader, "scrollTop", { value: 492, configurable: true });
  await act(async () => { reader.dispatchEvent(new Event("scroll")); });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ row: 1, endAttempts: 0 }));
  await press("ArrowRight");
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ row: 1, endAttempts: 1 }));
});
