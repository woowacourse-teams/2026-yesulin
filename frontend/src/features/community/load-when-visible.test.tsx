// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useLoadWhenVisible, useNextPageLoader } from "./hooks";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));

type Trigger = (visible: boolean) => void;
const observers: { trigger: Trigger; disconnected: boolean }[] = [];

class FakeObserver {
  private readonly state = { trigger: (() => {}) as Trigger, disconnected: false };
  constructor(callback: IntersectionObserverCallback) {
    this.state.trigger = visible => callback([{ isIntersecting: visible } as IntersectionObserverEntry], this as never);
    observers.push(this.state);
  }
  observe() {}
  disconnect() { this.state.disconnected = true; }
}

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  observers.length = 0;
  host = document.createElement("div");
  root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); vi.unstubAllGlobals(); });

function Sentinel({ enabled, onVisible }: { readonly enabled: boolean; readonly onVisible: () => void }) {
  const target = useLoadWhenVisible(enabled, onVisible);
  return <button ref={target} type="button">더 보기</button>;
}

it("버튼이 화면 가까이 오면 다음 이야기를 불러온다", async () => {
  const onVisible = vi.fn();
  await act(async () => root.render(<Sentinel enabled onVisible={onVisible} />));
  observers.at(-1)!.trigger(false);
  expect(onVisible).not.toHaveBeenCalled();
  observers.at(-1)!.trigger(true);
  expect(onVisible).toHaveBeenCalledTimes(1);
});

it("불러오기에 실패해 꺼지면 감시를 멈춰 자동 재시도를 반복하지 않는다", async () => {
  const onVisible = vi.fn();
  await act(async () => root.render(<Sentinel enabled onVisible={onVisible} />));
  const first = observers.at(-1)!;
  await act(async () => root.render(<Sentinel enabled={false} onVisible={onVisible} />));
  expect(first.disconnected).toBe(true);
  expect(observers).toHaveLength(1);
});

function NextPage({ cursor, load }: { readonly cursor: number | null; readonly load: (cursor: number) => void }) {
  const loadNext = useNextPageLoader(cursor, load);
  return <button type="button" onClick={loadNext}>더 보기</button>;
}

it("자동 감지와 버튼이 겹쳐도 같은 커서는 한 번만 요청하고 다음 커서는 이어서 요청한다", async () => {
  const load = vi.fn();
  await act(async () => root.render(<NextPage cursor={10} load={load} />));
  const button = host.querySelector("button")!;
  act(() => { button.click(); button.click(); button.click(); });
  expect(load).toHaveBeenCalledTimes(1);
  await act(async () => root.render(<NextPage cursor={5} load={load} />));
  act(() => button.click());
  expect(load).toHaveBeenLastCalledWith(5);
  await act(async () => root.render(<NextPage cursor={null} load={load} />));
  act(() => button.click());
  expect(load).toHaveBeenCalledTimes(2);
});
