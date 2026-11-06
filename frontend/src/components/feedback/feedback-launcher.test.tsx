// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pathOnly, submitFeedback } from "@/features/feedback/api";
import { FeedbackLauncher } from "./feedback-launcher";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));
vi.mock("@/features/companies/photo-image", () => ({ shrinkPhoto: vi.fn(async (file: File) => new Blob([file.name], { type: "image/jpeg" })) }));
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
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
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
    expect(submitFeedback).toHaveBeenCalledWith({ type: "BUG", content: "사진 업로드가 실패해요", contact: "", pagePath: "/posts/12", images: [] });
    expect(document.body.textContent).toContain("고마워요!");
  });

  it("실패하면 작성한 내용을 그대로 두고 다시 시도하게 한다", async () => {
    vi.mocked(submitFeedback).mockRejectedValue(new Error("실패"));
    await openAndWrite("버튼이 안 눌려요");
    await act(async () => textarea()?.closest("form")?.requestSubmit());
    expect(textarea()?.value).toBe("버튼이 안 눌려요");
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("다시 시도");
  });

  it("사진을 최대 3장까지 줄여 붙이고 뺀 사진은 보내지 않는다", async () => {
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:preview"), revokeObjectURL: vi.fn() });
    vi.mocked(submitFeedback).mockResolvedValue({ id: 2 });
    await openAndWrite("화면이 깨져요");
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const files = ["a", "b", "c", "d"].map(name => new File([name], `${name}.png`, { type: "image/png" }));
    Object.defineProperty(input, "files", { value: files, configurable: true });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(document.querySelectorAll(".feedback-image-thumb")).toHaveLength(3);
    expect(button("사진 추가")).toBeUndefined();
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="첨부한 사진 2 빼기"]')?.click());
    await act(async () => textarea()?.closest("form")?.requestSubmit());
    const sent = vi.mocked(submitFeedback).mock.calls[0][0];
    expect(await Promise.all(sent.images.map(image => image.text()))).toEqual(["a.png", "c.png"]);
  });

  it("주소의 쿼리와 해시는 경로에서 뗀다", () => {
    expect(pathOnly("/posts/12?src=kakao#c")).toBe("/posts/12");
  });
});
