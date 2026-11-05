"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/** 선택된 탭만 Tab 키로 들어가고, 나머지는 화살표로 옮긴다. */
const TAB_INDEX: Readonly<Record<string, number>> = { true: 0, false: -1 };

export type ShowInfoTab = { readonly id: string; readonly label: string; readonly content: ReactNode };

/** 공연 소개·오시는 길·예매 안내를 탭으로 나눠 관람객이 필요한 정보로 바로 이동하게 한다. 좌우 화살표로도 옮긴다. */
export function ShowInfoTabs({ tabs }: { readonly tabs: readonly ShowInfoTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const prefix = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];
  if (!current) return null;
  const move = (event: KeyboardEvent, index: number) => {
    const offset = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!offset) return;
    event.preventDefault();
    const next = (index + offset + tabs.length) % tabs.length;
    setActive(tabs[next]!.id);
    buttons.current[next]?.focus();
  };
  return <section className="show-tabs">
    <div role="tablist" aria-label="공연 정보" className="show-tab-list">
      {tabs.map((tab, index) => <button key={tab.id} ref={(button) => { buttons.current[index] = button; }} type="button" role="tab" id={`${prefix}-${tab.id}`}
        aria-selected={tab.id === current.id} aria-controls={`${prefix}-${tab.id}-panel`} tabIndex={TAB_INDEX[String(tab.id === current.id)]}
        onClick={() => setActive(tab.id)} onKeyDown={(event) => move(event, index)}>{tab.label}</button>)}
    </div>
    <div role="tabpanel" id={`${prefix}-${current.id}-panel`} aria-labelledby={`${prefix}-${current.id}`} className="show-tab-panel">{current.content}</div>
  </section>;
}
