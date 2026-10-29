// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventRegistrationConfirmation } from "./event-registration-confirmation";

let root: Root;
let container: HTMLDivElement;
const confirm = vi.fn();
const writeText = vi.fn();
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
const account = { bankName: "테스트은행", accountNumber: "001-002 003", accountHolder: "예술인" };
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.clearAllMocks();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  writeText.mockResolvedValue(undefined);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount()); container.remove(); vi.unstubAllGlobals();
  if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard);
  else Reflect.deleteProperty(navigator, "clipboard");
});
async function render(bankAccount = account, open = true) {
  await act(async () => root.render(<EventRegistrationConfirmation open={open} message="보증금을 입금해 주세요." bankAccount={bankAccount} busy={false} onClose={() => {}} onConfirm={confirm} />));
}
function button(name: string) { return [...document.querySelectorAll<HTMLButtonElement>("button")].find(item => item.textContent === name)!; }

describe("신청 안내 계좌 복사", () => {
  it("은행·예금주를 표시하고 계좌번호의 숫자만 복사하며 신청은 보내지 않는다", async () => {
    await render();
    expect(document.body.textContent).toContain("테스트은행");
    expect(document.body.textContent).toContain("예금주: 예술인");
    await act(async () => button("계좌번호 복사").click());
    expect(writeText).toHaveBeenCalledWith("001002003");
    expect(button("계좌번호 복사됨")).toBeDefined();
    expect(confirm).not.toHaveBeenCalled();
    await act(async () => button("확인하고 신청하기").click());
    expect(confirm).toHaveBeenCalledTimes(1);
  });
  it("복사가 거절되면 직접 선택할 수 있게 계좌번호와 오류를 유지한다", async () => {
    writeText.mockRejectedValue(new Error("Clipboard denied"));
    await render();
    await act(async () => button("계좌번호 복사").click());
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("직접 복사");
    expect(document.body.textContent).toContain("001-002 003");
    expect(confirm).not.toHaveBeenCalled();
  });
  it("계좌를 설정하지 않으면 기존 안내와 확인 버튼만 표시한다", async () => {
    await act(async () => root.render(<EventRegistrationConfirmation open message="안내문" busy={false} onClose={() => {}} onConfirm={confirm} />));
    expect(button("계좌번호 복사")).toBeUndefined();
    expect(document.body.textContent).toContain("안내문");
  });
  it("팝업을 다시 열면 이전 복사 성공 표시를 초기화한다", async () => {
    await render(); await act(async () => button("계좌번호 복사").click());
    await render(account, false); await render();
    expect(button("계좌번호 복사")).toBeDefined();
  });
});
