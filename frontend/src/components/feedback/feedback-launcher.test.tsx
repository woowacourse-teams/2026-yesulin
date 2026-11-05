// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pathOnly, submitFeedback } from "@/features/feedback/api";
import { FeedbackLauncher } from "./feedback-launcher";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));
vi.mock("@/features/feedback/api", async (original) => ({
  ...(await original<typeof import("@/features/feedback/api")>()),
  submitFeedback: vi.fn(),
}));

let root: Root;
let container: HTMLDivElement;

const button = (text: string) => [...document.querySelectorAll("button")].find((element) => element.textContent?.includes(text));
const textarea = () => document.querySelector<HTMLTextAreaElement>("textarea");

function type(element: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

async function openAndWrite(content: string) {
  await act(async () => button("의견 보내기")?.click());
  await act(async () => type(textarea()!, content));
  await act(async () => document.querySelector<HTMLInputElement>('input[value="BUG"]')?.click());
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.mocked(submitFeedback).mockReset();
  window.history.replaceState(null, "", "/posts/12?src=kakao#comment-3");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<FeedbackLauncher />));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("의견 보내기", () => {
  it("빈 내용은 보내지 않고 안내한다", async () => {
    await act(async () => button("의견 보내기")?.click());
    await act(async () => textarea()?.closest("form")?.requestSubmit());
    expect(submitFeedback).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("내용을 입력해 주세요");
  });

  it("종류·내용과 쿼리 없는 화면 경로를 보내고 감사 문구를 보인다", async () => {
    vi.mocked(submitFeedback).mockResolvedValue({ id: 1 });
    await openAndWrite("사진 업로드가 실패해요");
    await act(async () => textarea()?.closest("form")?.requestSubmit());
    expect(submitFeedback).toHaveBeenCalledWith({ type: "BUG", content: "사진 업로드가 실패해요", contact: "", pagePath: "/posts/12" });
    expect(document.body.textContent).toContain("고마워요!");
  });

  it("실패하면 작성한 내용을 그대로 두고 다시 시도하게 한다", async () => {
    vi.mocked(submitFeedback).mockRejectedValue(new Error("실패"));
    await openAndWrite("버튼이 안 눌려요");
    await act(async () => textarea()?.closest("form")?.requestSubmit());
    expect(textarea()?.value).toBe("버튼이 안 눌려요");
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("다시 시도");
  });

  it("주소의 쿼리와 해시는 경로에서 뗀다", () => {
    expect(pathOnly("/posts/12?src=kakao#c")).toBe("/posts/12");
  });
});
