// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { issueMemberLinkCode } from "@/features/applicants/member-link-api";
import { ApplicantRequestError } from "@/features/applicants/request";
import { MemberLinkCodePanel } from "./member-link-code-panel";

const { replace, setSession } = vi.hoisted(() => ({ replace: vi.fn(), setSession: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/components/auth/auth-session", () => ({ useAuthSession: () => ({ setSession }) }));
vi.mock("@/features/applicants/member-link-api", () => ({ issueMemberLinkCode: vi.fn() }));
vi.mock("@/features/monitoring/report-error", () => ({ reportError: vi.fn() }));
let root: Root;
let container: HTMLDivElement;
const now = Date.parse("2026-10-28T09:00:00Z");
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  vi.mocked(issueMemberLinkCode).mockResolvedValue({ code: "ABCD-EFGH",
    expiresAt: new Date(now + 600_000).toISOString(), reissueAvailableAt: new Date(now + 30_000).toISOString(), expiresInSeconds: 600, reissueAfterSeconds: 30 });
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function openAndIssue() {
  await act(async () => root.render(<MemberLinkCodePanel />));
  await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());
}

it("shows the issued code, prevents immediate reissue, and hides expired codes", async () => {
  await openAndIssue();
  expect(container.querySelector("output")?.textContent).toBe("ABCD-EFGH");
  expect(container.querySelector("button")?.disabled).toBe(true);
  act(() => vi.advanceTimersByTime(30_000));
  expect(container.querySelector("button")?.disabled).toBe(false);
  act(() => vi.advanceTimersByTime(570_000));
  expect(container.querySelector("output")).toBeNull();
  expect(container.textContent).toContain("코드가 만료됐어요");
  expect(container.textContent).not.toContain("코드 복사");
});

it("replaces the visible code after a successful reissue", async () => {
  await openAndIssue();
  act(() => vi.advanceTimersByTime(30_000));
  vi.mocked(issueMemberLinkCode).mockResolvedValueOnce({ code: "BCDE-FGHJ",
    expiresAt: new Date(now + 630_000).toISOString(), reissueAvailableAt: new Date(now + 60_000).toISOString(), expiresInSeconds: 600, reissueAfterSeconds: 30 });
  await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());
  expect(container.querySelector("output")?.textContent).toBe("BCDE-FGHJ");
  expect(container.textContent).not.toContain("ABCD-EFGH");
});

it("returns to login when the session has expired", async () => {
  vi.mocked(issueMemberLinkCode).mockRejectedValueOnce(new ApplicantRequestError("로그인이 필요합니다.", 401,
    "AUTH_UNAUTHENTICATED", {}, "test-request"));
  await openAndIssue();
  expect(setSession).toHaveBeenCalledWith(null);
  expect(replace).toHaveBeenCalledWith("/login?returnTo=%2Fapplicants%2Fmember-link");
  expect(container.querySelector("output")).toBeNull();
});

it.each([-1, 1])("uses server durations when the device clock differs by %s hour", async (direction) => {
  vi.setSystemTime(now + direction * 3_600_000);
  await openAndIssue();
  expect(container.querySelector("output")?.textContent).toBe("ABCD-EFGH");
  expect(container.textContent).toContain("남은 시간 10분 0초");
  vi.setSystemTime(now - direction * 3_600_000);
  act(() => vi.advanceTimersByTime(30_000));
  expect(container.querySelector("button")?.disabled).toBe(false);
  expect(container.querySelector("output")).not.toBeNull();
  act(() => vi.advanceTimersByTime(570_000));
  expect(container.querySelector("output")).toBeNull();
});
