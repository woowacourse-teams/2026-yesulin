// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommunityNotice } from "@/features/community/types";
import { CommunityNotifications } from "./community-notifications";
import { NotificationBell } from "./notification-bell";
import { InboxContext } from "./received-comments-context";

const { session } = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("@/components/auth/auth-session", () => ({ useAuthSession: () => ({ session: session() }) }));

let root: Root;
let container: HTMLDivElement;
const now = new Date().toISOString();
const notice = (id: number, patch: Partial<CommunityNotice> = {}): CommunityNotice => ({
  commentId: id, postId: 1, title: "오디션 후기", replyToId: null, seen: false, author: `익명${id}`, preview: `댓글 ${id}`, createdAt: now, ...patch,
});
const inbox = {
  items: [notice(3), notice(2), notice(1, { replyToId: 9, postId: 4, title: "발성 루틴", seen: true })],
  error: "", refresh: vi.fn(), markRead: vi.fn(), markGroupRead: vi.fn(async () => true), markAllRead: vi.fn(async () => true),
};

async function render(node: React.ReactNode) {
  await act(async () => root.render(<InboxContext value={inbox}>{node}</InboxContext>));
}
const button = (text: string) => [...container.querySelectorAll("button")].find((element) => element.textContent?.includes(text));

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  session.mockReturnValue({ role: "APPLICANT" });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

describe("알림 종", () => {
  it("배우가 아니면 종을 그리지 않는다", async () => {
    session.mockReturnValue({ role: "PRODUCER" });
    await render(<NotificationBell />);
    expect(container.innerHTML).toBe("");
  });

  it("읽지 않은 수를 알리고, 펼치면 같은 글 알림을 묶어 보여 준다", async () => {
    await render(<NotificationBell />);
    const bell = container.querySelector<HTMLButtonElement>(".notice-bell-button");
    expect(bell?.getAttribute("aria-label")).toBe("알림 2개 읽지 않음");
    await act(async () => bell?.click());
    expect(container.textContent).toContain("익명3 외 1명이 내 글에 댓글을 남겼어요");
    expect(container.textContent).toContain("익명1님이 내 댓글에 답글을 남겼어요");
    await act(async () => button("모두 읽음")?.click());
    expect(inbox.markAllRead).toHaveBeenCalled();
    expect(container.querySelector('a[href="/community/notifications"]')).not.toBeNull();
  });

  it("Escape로 닫으면 포커스를 종으로 돌려준다", async () => {
    await render(<NotificationBell />);
    const bell = container.querySelector<HTMLButtonElement>(".notice-bell-button");
    await act(async () => bell?.click());
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(container.querySelector("#notice-bell-panel")).toBeNull();
    expect(document.activeElement).toBe(bell);
  });

  it("모두 읽음에 실패하면 안내한다", async () => {
    inbox.markAllRead.mockResolvedValueOnce(false);
    await render(<NotificationBell />);
    await act(async () => container.querySelector<HTMLButtonElement>(".notice-bell-button")?.click());
    await act(async () => button("모두 읽음")?.click());
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("모두 읽음으로 바꾸지 못했어요");
  });

  it("묶인 알림을 누르면 모두 읽음으로 바꾼 뒤 가장 최근 댓글로 간다", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    await render(<NotificationBell />);
    await act(async () => container.querySelector<HTMLButtonElement>(".notice-bell-button")?.click());
    await act(async () => button("익명3 외 1명")?.click());
    expect(inbox.markGroupRead).toHaveBeenCalledWith([3, 2]);
    expect(assign).toHaveBeenCalledWith("/community/1#comment-3");
  });
});

describe("커뮤니티 알림 화면", () => {
  it("종류로 거르고 댓글 내용을 미리 보여 준다", async () => {
    await render(<CommunityNotifications />);
    expect(container.textContent).toContain("오늘");
    expect(container.textContent).toContain("댓글 3");
    await act(async () => button("내 댓글 답글")?.click());
    expect(container.textContent).not.toContain("익명3 외 1명");
    expect(container.textContent).toContain("익명1님이 내 댓글에 답글을 남겼어요");
  });

  it("배우 계정이 아니면 로그인을 안내한다", async () => {
    session.mockReturnValue(null);
    await render(<CommunityNotifications />);
    expect(container.querySelector('a[href^="/login"]')?.textContent).toContain("로그인하고 알림 보기");
  });
});
