// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { ProducerShell } from "./producer-shell";

const account = vi.hoisted(() => ({ credential: "producer-a", producerStatus: "ACTIVE" }));
vi.mock("next/navigation", () => ({ usePathname: () => "/producers/pdf-reviews" }));
vi.mock("@/components/auth/auth-session", () => ({ useAuthSession: () => ({ session: account }) }));
vi.mock("./sidebar-resizer", () => ({ SidebarResizer: () => null }));
vi.mock("./mobile-producer-navigation", () => ({ MobileProducerNavigation: () => null }));
vi.mock("./producer-account-panel", () => ({ ProducerAccountPanel: () => null }));
vi.mock("./producer-sidebar-header", () => ({ ProducerSidebarHeader: () => null }));
vi.mock("./producer-sidebar-menu", () => ({ ProducerSidebarMenu: () => null }));

function ReviewState() {
  const [memo, setMemo] = useState("");
  return <button onClick={() => setMemo("공연사 A의 심사 메모")}>{memo || "새 심사 화면"}</button>;
}

afterEach(() => vi.unstubAllGlobals());

it("공연사가 다른 탭에서 바뀌면 이전 계정의 심사 화면 상태를 초기화한다", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  account.credential = "producer-a";
  const host = document.createElement("div");
  const root = createRoot(host);
  const render = () => root.render(<ProducerShell><ReviewState /></ProducerShell>);
  try {
    await act(async () => render());
    await act(async () => host.querySelector("main button")!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(host.querySelector("main")?.textContent).toBe("공연사 A의 심사 메모");
    await act(async () => render());
    expect(host.querySelector("main")?.textContent).toBe("공연사 A의 심사 메모");
    account.credential = "producer-b";
    await act(async () => render());
    expect(host.querySelector("main")?.textContent).toBe("새 심사 화면");
    expect(host.textContent).not.toContain("공연사 A의 심사 메모");
  } finally { act(() => root.unmount()); }
});
