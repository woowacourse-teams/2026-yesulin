// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getProfileImportOverview, type ProfileImport as ImportResult } from "@/features/applicants/profile-import";
import { ProfileImport } from "./profile-import";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));

vi.mock("@/features/applicants/profile-import", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/features/applicants/profile-import")>(),
  getProfileImportOverview: vi.fn(),
}));

let root: Root;
let container: HTMLDivElement;
const apply = vi.fn();
const result: ImportResult = {
  jobId: "profile-job", status: "COMPLETED", originalFilename: "profile.pdf",
  createdAt: "2026-10-29T00:00:00Z", deletesAt: "2026-10-30T00:00:00Z",
  analysisStatus: "COMPLETED", analysisReason: null,
  proposals: {
    name: { value: "김하린", evidence: "이름 김하린" }, birthDate: null, age: null, height: null,
    education: null, careers: [], photos: [],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render(values = {}) {
  await act(async () => root.render(<ProfileImport values={values} photoCount={0} onApply={apply} onPhotoAdded={async () => {}} />));
}

function button(label: string) {
  return [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === label)!;
}

it("이름 있는 파일 입력을 키보드 이동에서 빼고 모달의 첫 포커스와 순환은 PDF 선택 버튼을 쓴다", async () => {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.mocked(getProfileImportOverview).mockResolvedValue({ usedToday: false, current: null });
  await render();
  await act(async () => button("PDF로 채우기").click());
  await act(async () => frames.forEach((frame) => frame(0)));

  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  expect(input.getAttribute("aria-label")).toBe("PDF 파일 선택");
  expect(input.tabIndex).toBe(-1);
  expect(document.activeElement).toBe(button("PDF 선택"));

  document.querySelectorAll<HTMLElement>('[role="dialog"] button, [role="dialog"] input').forEach((element) => {
    element.getClientRects = () => ({ length: 1 } as DOMRectList);
  });
  button("창 닫기").focus();
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
  expect(document.activeElement).toBe(button("PDF 선택"));
});

it("결과를 여는 것만으로 입력란을 바꾸지 않고, 배우가 적용을 눌러야 고른 값만 전달한다", async () => {
  vi.mocked(getProfileImportOverview).mockResolvedValue({ usedToday: true, current: result });
  await render();
  await act(async () => button("PDF로 채우기").click());
  expect(document.body.textContent).toContain("이름 김하린");
  expect(apply).not.toHaveBeenCalled();

  await act(async () => button("고른 값 입력란에 넣기").click());

  expect(apply).toHaveBeenCalledExactlyOnceWith({ NAME: "김하린" }, false);
});

it("기존 값이 있으면 바꿀 항목을 자동으로 선택하지 않는다", async () => {
  vi.mocked(getProfileImportOverview).mockResolvedValue({ usedToday: true, current: result });
  await render({ NAME: "기존 배우" });
  await act(async () => button("PDF로 채우기").click());
  const checkbox = document.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  expect(checkbox.checked).toBe(false);
  expect(button("고른 값 입력란에 넣기").disabled).toBe(true);

  await act(async () => checkbox.click());
  await act(async () => button("고른 값 입력란에 넣기").click());
  expect(apply).toHaveBeenCalledExactlyOnceWith({ NAME: "김하린" }, false);
});

it("오늘 횟수를 썼으면 새 업로드를 막고, 기능이 꺼져 있으면 진입 버튼을 숨긴다", async () => {
  vi.mocked(getProfileImportOverview).mockResolvedValue({ usedToday: true, current: null });
  await render();
  await act(async () => button("PDF로 채우기").click());
  expect(document.body.textContent).toContain("내일 다시 쓸 수 있어요");
  expect(document.querySelector('input[type="file"]')).toBeNull();

  await act(async () => root.render(null));
  vi.mocked(getProfileImportOverview).mockResolvedValue(null);
  await render();
  expect(container.textContent).toBe("");
});
