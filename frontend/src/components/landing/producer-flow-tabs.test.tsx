// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ProducerFlowTabs } from "./producer-flow-tabs";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderTabs() {
  const container = document.createElement("div");
  document.body.append(container);
  act(() => createRoot(container).render(<ProducerFlowTabs />));
  return container;
}

function selectedTab(container: HTMLElement) {
  return container.querySelector('[role="tab"][aria-selected="true"]')?.textContent;
}

describe("공연사 랜딩 진행 단계 탭", () => {
  afterEach(() => { document.body.innerHTML = ""; });

  it("단계를 누르면 해당 화면으로 바뀐다", () => {
    const container = renderTabs();
    expect(container.querySelector('[role="tabpanel"]')?.textContent).toContain("새 오디션 공고");
    const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    act(() => tabs[2].click());
    expect(selectedTab(container)).toContain("심사하기");
    expect(container.querySelector('[role="tabpanel"]')?.getAttribute("aria-labelledby")).toBe("producer-step-2");
  });

  it("방향키로 단계를 순환하고 선택된 탭만 tab 순서에 남긴다", () => {
    const container = renderTabs();
    const tablist = container.querySelector('[role="tablist"]')!;
    act(() => { tablist.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true })); });
    expect(selectedTab(container)).toContain("심사하기");
    expect(document.activeElement?.id).toBe("producer-step-2");
    const focusable = container.querySelectorAll('[role="tab"][tabindex="0"]');
    expect(focusable).toHaveLength(1);
  });

  it("세로 탭 목록이고 탭 패널에 키보드로 들어갈 수 있다", () => {
    const container = renderTabs();
    expect(container.querySelector('[role="tablist"]')?.getAttribute("aria-orientation")).toBe("vertical");
    expect(container.querySelector('[role="tabpanel"]')?.getAttribute("tabindex")).toBe("0");
  });
});
