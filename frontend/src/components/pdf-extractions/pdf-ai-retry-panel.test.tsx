// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PdfAiRetryPanel } from "./pdf-ai-retry-panel";
import { fetchCurrentSession } from "@/features/auth/session-api";
import { retryPdfAnalysis } from "@/features/pdf-extractions/api";

const state = vi.hoisted(() => ({ query: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(state.query) }));
vi.mock("@/features/auth/session-api", () => ({ fetchCurrentSession: vi.fn() }));
vi.mock("@/features/pdf-extractions/api", () => ({ retryPdfAnalysis: vi.fn(), PdfExtractionApiError: class extends Error {} }));

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  state.query = "jobId=00000000-0000-4000-8000-000000000001&failedAttempts=1&failedAt=1793340000000&generation=0";
  vi.mocked(fetchCurrentSession).mockResolvedValue({ memberId: 1, role: "ADMIN", status: "ACTIVE" });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

async function mount() {
  await act(async () => { root.render(<PdfAiRetryPanel />); });
}

it("링크를 열거나 로그인 상태를 조회하는 것만으로 재분석하지 않는다", async () => {
  await mount();
  expect(container.textContent).toContain("재분석 실행");
  expect(retryPdfAnalysis).not.toHaveBeenCalled();
});

it("권한 있는 사용자의 명시적인 클릭만 요청하고 중복 클릭을 막는다", async () => {
  let resolve!: (value: { status: "QUEUED"; message: string }) => void;
  vi.mocked(retryPdfAnalysis).mockReturnValue(new Promise(done => { resolve = done; }));
  await mount();
  const button = container.querySelector("button")!;
  act(() => { button.click(); button.click(); });
  expect(retryPdfAnalysis).toHaveBeenCalledTimes(1);
  expect(retryPdfAnalysis).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001",
    { failedAttempts: 1, failedAt: 1793340000000, generation: 0 });
  await act(async () => { resolve({ status: "QUEUED", message: "재분석 요청을 접수했습니다." }); });
  expect(container.textContent).toContain("요청 접수됨");
  expect(button.disabled).toBe(true);
});

it("배우 계정과 손상된 링크는 재분석 실행 버튼을 제공하지 않는다", async () => {
  vi.mocked(fetchCurrentSession).mockResolvedValue({ memberId: 1, role: "APPLICANT", status: "ACTIVE" });
  await mount();
  expect(container.textContent).toContain("공연사 또는 운영자");
  expect(container.textContent).not.toContain("재분석 실행");
  state.query = "jobId=invalid";
  await act(async () => { root.render(<PdfAiRetryPanel />); });
  expect(container.textContent).toContain("링크가 올바르지 않습니다");
  expect(retryPdfAnalysis).not.toHaveBeenCalled();
});

it("로그인은 새 탭에서 진행하고 기존 재분석 링크에서 세션을 다시 확인한다", async () => {
  vi.mocked(fetchCurrentSession).mockResolvedValueOnce(null);
  await mount();
  const login = container.querySelector<HTMLAnchorElement>('a[href="/login"]')!;
  expect(login.target).toBe("_blank");
  expect(container.textContent).toContain("기획사/제작사를 선택");
  await act(async () => { container.querySelector("button")!.click(); });
  expect(container.textContent).toContain("재분석 실행");
  expect(fetchCurrentSession).toHaveBeenCalledTimes(2);
  expect(retryPdfAnalysis).not.toHaveBeenCalled();
});
