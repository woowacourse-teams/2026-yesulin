// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PosterSpark } from "./poster-spark";

let root: Root;
let container: HTMLDivElement;
let observed: ((entries: { isIntersecting: boolean; intersectionRatio: number }[]) => void) | null;
const disconnect = vi.fn();
const observe = vi.fn();

class FakeObserver {
  constructor(callback: (entries: { isIntersecting: boolean; intersectionRatio: number }[]) => void) { observed = callback; }
  observe(target: Element) { observe(target); }
  disconnect() { disconnect(); }
}

const spark = () => container.querySelector<HTMLElement>(".notebook-poster-spark")!;

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  observed = null;
  disconnect.mockClear();
  observe.mockClear();
  container = document.createElement("div");
  container.innerHTML = '<a class="notebook-poster-card" href="/posts/1"><div id="slot"></div></a>';
  document.body.append(container);
  root = createRoot(container.querySelector("#slot")!);
  await act(async () => root.render(<PosterSpark />));
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

describe("글씨 카드 반짝이", () => {
  it("화면에 들어오기 전에는 돌지 않고, 처음 들어올 때 한 번 돈다", () => {
    expect(observe).toHaveBeenCalledWith(container.querySelector(".notebook-poster-card"));
    expect(spark().hasAttribute("data-spinning")).toBe(false);
    act(() => observed?.([{ isIntersecting: false, intersectionRatio: 0 }]));
    act(() => observed?.([{ isIntersecting: true, intersectionRatio: 0.59 }]));
    expect(spark().hasAttribute("data-spinning")).toBe(false);
    act(() => observed?.([{ isIntersecting: true, intersectionRatio: 0.6 }]));
    expect(spark().hasAttribute("data-spinning")).toBe(true);
    expect(disconnect).toHaveBeenCalled();
  });

  it("다 돌면 표시를 지우고, 카드에 마우스를 올리면 다시 돈다", () => {
    act(() => observed?.([{ isIntersecting: true, intersectionRatio: 0.6 }]));
    act(() => { spark().dispatchEvent(new Event("animationend")); });
    expect(spark().hasAttribute("data-spinning")).toBe(false);
    act(() => { container.querySelector(".notebook-poster-card")!.dispatchEvent(new MouseEvent("mouseenter")); });
    expect(spark().hasAttribute("data-spinning")).toBe(true);
  });

  it("마우스를 뗄 때는 다시 돌지 않는다", () => {
    act(() => { container.querySelector(".notebook-poster-card")!.dispatchEvent(new MouseEvent("mouseenter")); });
    act(() => { spark().dispatchEvent(new Event("animationend")); });
    act(() => { container.querySelector(".notebook-poster-card")!.dispatchEvent(new MouseEvent("mouseleave")); });
    expect(spark().hasAttribute("data-spinning")).toBe(false);
  });
});
