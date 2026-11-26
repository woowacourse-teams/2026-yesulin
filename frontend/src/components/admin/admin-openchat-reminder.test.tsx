// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdminApiError, fetchAlertChatMembers } from "@/features/admin/api";
import { getAuditionPosts } from "@/features/audition-posts/api";
import type { AuditionPostSummary } from "@/features/audition-posts/types";
import { AdminAlertChatMembers } from "./admin-alert-chat-members";

vi.mock("@/features/monitoring/report-error", () => ({ reportError: vi.fn() }));
vi.mock("@/features/admin/api", async original => ({
  ...await original<typeof import("@/features/admin/api")>(), fetchAlertChatMembers: vi.fn(),
}));
vi.mock("@/features/audition-posts/api", () => ({ getAuditionPosts: vi.fn() }));
vi.mock("./admin-openchat-visits", () => ({ AdminOpenChatVisits: () => null }));

const today = "2026-11-26";
const tomorrow = "2026-11-27";
const writeText = vi.fn();
let container: HTMLDivElement;
let root: Root;

function post(id: number, deadline: string | null): AuditionPostSummary {
  return { id, deadline, title: `오디션 ${id}`, deadlineText: deadline ?? "상시", category: "뮤지컬",
    closed: false, authorName: "공연사", pay: "", postedAt: null, viewCount: 0, alertChatMembers: 0,
    thumbnailUrl: null, attachmentCount: 0 };
}

function page(posts: AuditionPostSummary[], page = 0, totalPages = 1) {
  return { posts, page, totalPages, size: 12, totalElements: posts.length, openCount: posts.length, allCount: posts.length };
}

const button = (text: string) => Array.from(container.querySelectorAll("button")).find(item => item.textContent === text)!;
const checkbox = (text: string) => Array.from(container.querySelectorAll("label")).find(item => item.textContent === text)!.querySelector("input")!;
const preview = () => container.querySelector<HTMLTextAreaElement>("#openchat-reminder-preview")!;

async function render() {
  await act(async () => root.render(<AdminAlertChatMembers />));
}

async function editMessage(value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(preview(), value);
    preview().dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-26T14:59:59Z"));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  writeText.mockResolvedValue(undefined);
  vi.mocked(fetchAlertChatMembers).mockResolvedValue({ currentMemberCount: 100, initialMemberCount: 100, history: [] });
  vi.mocked(getAuditionPosts).mockResolvedValue(page([post(1, today), post(2, tomorrow), post(3, null)]));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  Reflect.deleteProperty(navigator, "clipboard");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("내일 마감 공고를 여러 페이지에서 찾고 선택한 링크가 들어간 편집 문구를 복사한다", async () => {
  vi.mocked(getAuditionPosts).mockResolvedValueOnce(page([post(1, today), post(2, tomorrow)], 0, 3));
  vi.mocked(getAuditionPosts).mockResolvedValueOnce(page([post(2, tomorrow), post(3, tomorrow), post(4, "2026-11-28")], 1, 3));
  await render();
  expect(button("내일 마감").getAttribute("aria-pressed")).toBe("true");
  expect(getAuditionPosts).toHaveBeenCalledTimes(2);
  expect(getAuditionPosts).toHaveBeenNthCalledWith(2, { sort: "deadline", page: 1, includeClosed: false });
  expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
  await act(async () => checkbox("오디션 3").click());
  await act(async () => button("문구 만들기").click());
  expect(preview().value).toContain("내일(11월 27일 금요일)");
  expect(preview().value).toContain("https://yesulin.art/posts/3?src=kakao_openchat&utm_campaign=deadline_reminder_20261127_d1");
  expect(preview().value).not.toContain("/posts/2");
  await editMessage(`${preview().value}\n문의는 공고를 확인해 주세요.`);
  await act(async () => button("문구 복사").click());
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining("문의는 공고를 확인해 주세요."));
});

it("자정을 넘겨 복사하면 재조회하며 편집한 문구를 보존하고 같은 날짜를 당일 안내로 바꿀 수 있다", async () => {
  await render();
  await act(async () => checkbox("오디션 2").click());
  await act(async () => button("문구 만들기").click());
  await editMessage("직접 수정한 문구");
  vi.setSystemTime(new Date("2026-11-26T15:00:00Z"));
  await act(async () => button("문구 복사").click());
  expect(writeText).not.toHaveBeenCalled();
  expect(preview().value).toBe("직접 수정한 문구");
  expect(container.textContent).toContain("해당 날짜에 마감되는 공개 공고가 없어요.");
  await act(async () => button("오늘 마감").click());
  await act(async () => checkbox("오디션 2").click());
  const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
  await act(async () => button("문구 만들기").click());
  expect(preview().value).toBe("직접 수정한 문구");
  await act(async () => button("문구 만들기").click());
  expect(confirm).toHaveBeenCalledTimes(2);
  expect(preview().value).toContain("오늘(11월 27일 금요일)");
  expect(preview().value).toContain("deadline_reminder_20261127_d0");
});

it("다음 페이지 로딩 실패 시 부분 선택을 막고 재시도할 수 있다", async () => {
  vi.mocked(getAuditionPosts).mockResolvedValueOnce(page([post(2, tomorrow)], 0, 2)).mockRejectedValueOnce(new Error("연결 오류"));
  await render();
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("마감 공고를 불러오지 못했어요.");
  expect(button("문구 만들기").disabled).toBe(true);
  await act(async () => button("다시 시도").click());
  expect(checkbox("오디션 2")).toBeTruthy();
});

it("화면 새로고침은 공고를 다시 읽고 내려간 공고가 들어간 문구 복사를 막는다", async () => {
  await render();
  await act(async () => checkbox("오디션 2").click());
  await act(async () => button("문구 만들기").click());
  await editMessage("편집한 안내");
  vi.mocked(getAuditionPosts).mockResolvedValueOnce(page([post(4, tomorrow)]));
  await act(async () => button("새로고침").click());
  expect(checkbox("오디션 4")).toBeTruthy();
  expect(button("문구 복사").disabled).toBe(true);
  expect(preview().value).toBe("편집한 안내");
});

it("관리자 조회가 거부되면 문구 생성 화면을 열거나 공개 목록을 조회하지 않는다", async () => {
  vi.mocked(fetchAlertChatMembers).mockRejectedValueOnce(new AdminApiError(403, "접근 권한이 없습니다."));
  await render();
  expect(container.textContent).not.toContain("마감 안내 만들기");
  expect(getAuditionPosts).not.toHaveBeenCalled();
});
