// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ReviewRoleSelect } from "./review-role-select";
let host: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const roles = [{ id: "a", name: "주연" }, { id: "b", name: "조연" }];
it("키보드로 선택하고 저장 응답 전에는 기존 배역을 유지한다. Escape/이탈로 닫힌다", async () => {
  const change = vi.fn();
  await act(async () => root.render(<ReviewRoleSelect roles={roles} value="a" onChange={change} />));
  const button = host.querySelector<HTMLButtonElement>('[role="combobox"]')!;
  await act(async () => button.click());
  expect(host.querySelector('[role="listbox"]')).not.toBeNull();
  await act(async () => button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })));
  await act(async () => button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
  expect(change).toHaveBeenCalledExactlyOnceWith('b'); expect(button.textContent).toContain('주연');
  expect(host.querySelector('[role="listbox"]')).toBeNull();
  await act(async () => button.click());
  await act(async () => button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(host.querySelector('[role="listbox"]')).toBeNull();
});
it("일괄 배역 해제는 표시가 미배정이어도 실제 저장을 요청한다", async () => {
  const change = vi.fn();
  await act(async () => root.render(<ReviewRoleSelect roles={roles} value={null} allowReselect onChange={change} />));
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click());
  await act(async () => host.querySelector<HTMLElement>('[role="option"]')!.click());
  expect(change).toHaveBeenCalledExactlyOnceWith(null);
});

it("긴 배역 목록의 키보드 활성 항목이 스크롤로 따라온다", async () => {
  const scroll=vi.fn();
  Object.defineProperty(HTMLElement.prototype,'scrollIntoView',{ configurable:true,value:scroll });
  try {
    await act(async () => root.render(<ReviewRoleSelect roles={Array.from({length:50},(_,i)=>({id:String(i),name:`배역 ${i}`}))} value={null} onChange={()=>{}} />));
    const button=host.querySelector<HTMLButtonElement>('button')!;
    await act(async () => button.click()); scroll.mockClear();
    await act(async () => button.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true})));
    const active=document.getElementById(button.getAttribute('aria-activedescendant')!);
    expect(active?.textContent).toContain('배역 49');
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ block:'nearest' });
    expect(scroll.mock.contexts[0]).toBe(active);
  } finally { delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView; }
});
