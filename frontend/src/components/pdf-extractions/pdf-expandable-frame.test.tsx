// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PdfExpandableFrame } from "./pdf-expandable-frame";

const fits: string[] = [];
let host: HTMLDivElement, root: Root, memo: HTMLTextAreaElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); fits.length = 0;
  memo = document.createElement("textarea"); document.body.append(memo);
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); memo.remove(); vi.unstubAllGlobals(); });
function Harness({ document: name = "a" }: { readonly document?: string }) {
  const [expanded, setExpanded] = useState(false);
  return <PdfExpandableFrame key={name} expanded={expanded} onExpandedChange={setExpanded} caption={<span>지원자 {name}</span>}>
    {fit => { fits.push(fit); return <div data-testid="page">원본 {name}<a href="#link">링크</a></div>; }}
  </PdfExpandableFrame>;
}
const click = (target: Element) => act(() => { target.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
const press = (key: string) => act(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })); });
const button = (name: string) => [...host.querySelectorAll("button")].find(item => item.textContent?.includes(name));
const dialog = () => host.querySelector<HTMLElement>("[role='dialog']");

it("원본을 누르면 화면 맞춤 전체화면으로 펼치고 배경을 막으며 Esc로 닫아 버튼에 초점을 돌린다", () => {
  act(() => root.render(<Harness />));
  expect(fits.at(-1)).toBe("width");
  click(host.querySelector("[data-testid='page']")!);
  expect(dialog()?.getAttribute("aria-label")).toBe("지원서 원본 전체화면");
  expect(dialog()?.hasAttribute("data-fullscreen-viewer")).toBe(true);
  expect(fits.at(-1)).toBe("page");
  expect(document.activeElement).toBe(dialog());
  expect(host.textContent).toContain("지원자 a");
  expect(document.body.style.overflow).toBe("hidden");
  expect(memo.inert).toBe(true);
  press("Escape");
  expect(dialog()).toBeNull();
  expect(memo.inert).toBe(false);
  expect(document.body.style.overflow).toBe("");
  expect(document.activeElement).toBe(button("전체화면"));
});

it("원본 안 링크는 펼치지 않고 버튼으로 열고 닫는다", () => {
  act(() => root.render(<Harness />));
  const link = host.querySelector("a")!;
  click(link);
  expect(dialog()).toBeNull();
  click(button("전체화면")!);
  expect(dialog()).not.toBeNull();
  expect(host.textContent).not.toContain("전체화면");
  click(button("닫기")!);
  expect(dialog()).toBeNull();
});
