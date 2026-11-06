// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PosterRow } from "./poster-row";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
let resize: () => void;
let viewport = 1440;
let width = 1200;
let cardWidth = 224;
let gap = 20;
let reduced = false;
let scrollTo: ReturnType<typeof vi.fn>;

function row() { return container.querySelector("ul")!; }
function button(direction: string) { return container.querySelector<HTMLButtonElement>(`[data-poster-direction="${direction}"]`)!; }
function measure() { act(() => resize()); }
function click(direction: string) { act(() => button(direction).click()); }
function render(count = 12, prefix = "poster") {
  act(() => root.render(<PosterRow title="공고" label="공고">
    {Array.from({ length: count }, (_, index) => <li key={`${prefix}-${index}`}><a href={`/posts/${index + 1}`}>{index + 1}</a></li>)}
  </PosterRow>));
  measure();
}

beforeEach(() => {
  viewport = 1440; width = 1200; cardWidth = 224; gap = 20; reduced = false;
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  vi.stubGlobal("ResizeObserver", class { constructor(callback: () => void) { resize = callback; } observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduced-motion") && reduced || query.includes("min-width") && viewport >= 761 }));
  vi.spyOn(window, "getComputedStyle").mockImplementation(() => ({ columnGap: `${gap}px`, paddingLeft: "0", paddingRight: "0" }) as CSSStyleDeclaration);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({ width: cardWidth }) as DOMRect);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => width);
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (this: HTMLElement) {
    return Math.max(width, this.children.length * (cardWidth + gap) - gap + parseFloat(this.style.getPropertyValue("--home-row-tail") || "0"));
  });
  scrollTo = vi.fn(function (this: HTMLElement, options: ScrollToOptions) {
    this.scrollLeft = Math.max(0, Math.min(this.scrollWidth - this.clientWidth, options.left ?? 0));
    this.dispatchEvent(new Event("scroll"));
  });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: scrollTo });
});

afterEach(() => {
  act(() => root.unmount()); container.remove();
  delete (HTMLElement.prototype as Partial<HTMLElement>).scrollTo;
  vi.unstubAllGlobals(); vi.restoreAllMocks();
});

describe("홈 포스터 묶음 이동", () => {
  it("다섯 장씩 이동하고 마지막 두 장을 겹치지 않게 보여 준 뒤 돌아온다", () => {
    render();
    expect(button("previous").hidden).toBe(true);
    click("next");
    expect(row().scrollLeft).toBe(1220);
    expect(button("previous").hidden).toBe(false);
    click("next");
    expect(row().scrollLeft).toBe(2440);
    expect(button("next").hidden).toBe(true);
    click("previous");
    expect(row().scrollLeft).toBe(1220);
    click("previous");
    expect(row().scrollLeft).toBe(0);
  });

  it("태블릿은 네 장씩 이동하고 크기가 바뀌면 이동 폭과 끝 여백을 다시 계산한다", () => {
    render(); viewport = 1000; width = 900; cardWidth = 213; gap = 16; measure();
    click("next");
    expect(row().scrollLeft).toBe(916);
    expect(row().style.getPropertyValue("--home-row-tail")).toBe("0px");
  });

  it.each([0, 4, 5])("%i장은 넘길 필요가 없어 양쪽 버튼을 숨긴다", (count) => {
    render(count);
    expect(button("previous").hidden).toBe(true);
    expect(button("next").hidden).toBe(true);
  });

  it("동일한 개수의 다른 분야로 바뀌어도 처음으로 돌아온다", () => {
    render(10); click("next"); render(10, "musical");
    expect(row().scrollLeft).toBe(0);
    expect(button("previous").hidden).toBe(true);
    expect(button("next").hidden).toBe(false);
  });

  it("동작 감소에서는 즉시 이동하고 경계에서 숨겨질 버튼의 초점을 목록으로 옮긴다", () => {
    reduced = true; render(10); button("next").focus(); click("next");
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 1220, behavior: "instant" });
    expect(document.activeElement).toBe(row());
  });

  it("일반 모드에서는 부드럽게 이동하며 연속 클릭도 마지막 묶음을 넘지 않는다", () => {
    render(); click("next"); click("next"); click("next");
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 2440, behavior: "smooth" });
    expect(row().scrollLeft).toBe(2440);
  });

  it("모바일은 마지막 묶음용 빈 여백 없이 직접 스크롤 상태를 반영한다", () => {
    viewport = 390; width = 350; cardWidth = 143; gap = 10; render();
    expect(row().style.getPropertyValue("--home-row-tail")).toBe("0px");
    act(() => { row().scrollLeft = 153; row().dispatchEvent(new Event("scroll")); });
    expect(row().scrollLeft).toBe(153);
    expect(button("previous").hidden).toBe(false);
  });
});
