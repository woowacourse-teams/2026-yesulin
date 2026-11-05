// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/auth/auth-session";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { getNotifications } from "@/features/community/api";
import { useUnreadCommentCount } from "./received-comments-context";

function UnreadProbe() {
  if (!useUnreadCommentCount()) return null;
  return <span>읽지 않은 댓글</span>;
}
import { ReceivedCommentsProvider } from "./received-comments-provider";

vi.mock("@/components/auth/auth-session", () => ({ useAuthSession: vi.fn() }));
vi.mock("@/features/community/api", () => ({ getNotifications: vi.fn(), readNotification: vi.fn() }));
vi.mock("@/features/monitoring/report-error", () => ({ reportError: vi.fn() }));

const notice = { commentId: 1, postId: 2, replyToId: null, title: "글", seen: false, author: "익명2", preview: "좋아요", createdAt: "2026-11-05T00:00:00Z" };
let root: Root;
let host: HTMLDivElement;
function renderAccount(credential: string) {
  vi.mocked(useAuthSession).mockReturnValue({
    session: { role: "APPLICANT", displayName: "배우", credential },
  } as ReturnType<typeof useAuthSession>);
  return act(async () => root.render(<ReceivedCommentsProvider><UnreadProbe /></ReceivedCommentsProvider>));
}
function refresh() {
  return act(async () => { window.dispatchEvent(new Event("focus")); });
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  host = document.createElement("div");
  root = createRoot(host);
  vi.mocked(getNotifications).mockReset().mockResolvedValue([notice]);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("일시적 오류에는 미확인 표시를 유지하고 권한을 잃으면 제거한다", async () => {
  await renderAccount("a");
  expect(host.textContent).toContain("읽지 않은 댓글");
  vi.mocked(getNotifications).mockRejectedValueOnce(new Error("offline"));
  await refresh();
  expect(host.textContent).toContain("읽지 않은 댓글");
  vi.mocked(getNotifications).mockRejectedValueOnce(new AuditionRequestError("권한 없음", 403, "id"));
  await refresh();
  expect(host.textContent).toBe("");
});

it("계정을 바꾸면 이전 계정의 늦은 응답을 표시하지 않는다", async () => {
  const pending = Promise.withResolvers<readonly typeof notice[]>();
  vi.mocked(getNotifications).mockReturnValueOnce(pending.promise).mockResolvedValueOnce([]);
  await renderAccount("a");
  await renderAccount("b");
  await act(async () => pending.resolve([notice]));
  expect(host.textContent).toBe("");
});
