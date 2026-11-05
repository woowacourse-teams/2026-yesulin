// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryShortcuts } from "./category-shortcuts";

vi.mock("@/features/audition-posts/api", () => ({ getAuditionPosts: vi.fn(() => new Promise(() => undefined)) }));

let root: Root;
let container: HTMLDivElement;
let reveal: (visible: boolean) => void;

function mockDevice({ touch, reduceMotion = false }: { readonly touch: boolean; readonly reduceMotion?: boolean }) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: (query.includes("hover: none") && touch) || (query.includes("reduce") && reduceMotion) }));
}

function playing(): string[] {
  return [...container.querySelectorAll("a[data-playing]")].map((link) => link.textContent ?? "");
}

async function render() { await act(async () => root.render(<CategoryShortcuts posts={[]} />)); }
async function tick(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }

beforeEach(() => {
  vi.useFakeTimers();
  reveal = () => undefined;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: (entries: { isIntersecting: boolean }[]) => void) { reveal = (visible) => callback([{ isIntersecting: visible }]); }
    observe() {}
    disconnect() {}
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("분야 바로가기 무대", () => {
  it("다섯 분야를 각 분야 목록으로 연결한다", async () => {
    mockDevice({ touch: false });
    await render();
    expect([...container.querySelectorAll("a")].map((link) => link.getAttribute("href"))).toEqual([
      "/auditions/theater", "/auditions/musical", "/auditions/performance", "/auditions/troupe", "/auditions/agency",
    ]);
  });

  it("마우스가 없는 기기에서는 무대가 보이는 동안 분야 장면을 차례로 재생한다", async () => {
    mockDevice({ touch: true });
    await render();
    expect(playing()).toEqual([]);
    await act(async () => reveal(true));
    expect(playing()).toEqual(["연극"]);
    await tick(2_400);
    expect(playing()).toEqual(["뮤지컬"]);
    await tick(2_400 * 4);
    expect(playing()).toEqual(["연극"]);
    await act(async () => reveal(false));
    expect(playing()).toEqual([]);
  });

  it("동작 줄이기를 켠 기기에서는 자동으로 재생하지 않는다", async () => {
    mockDevice({ touch: true, reduceMotion: true });
    await render();
    await act(async () => reveal(true));
    expect(playing()).toEqual([]);
  });
});
