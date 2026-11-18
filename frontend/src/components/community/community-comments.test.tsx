// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createComment, editComment, getComments, getParticipation } from "@/features/community/api";
import type { CommunityEntry } from "@/features/community/types";
import { CommunityComments } from "./community-comments";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));
vi.mock("@/components/auth/auth-session", () => ({ useAuthSession: () => ({ session: { credential: "member-7", role: "APPLICANT" } }) }));
vi.mock("@/features/community/api", () => ({
  getComments: vi.fn(), getParticipation: vi.fn(), createComment: vi.fn(), deleteComment: vi.fn(), editComment: vi.fn(),
}));

let root: Root;
let container: HTMLDivElement;
const comment = (id: number, patch: Partial<CommunityEntry> = {}): CommunityEntry => ({
  id, title: null, body: `댓글 ${id}`, author: `익명${id}`, createdAt: "2026-11-05T00:00:00Z", updatedAt: "2026-11-05T00:00:00Z",
  commentCount: 0, editable: false, likeCount: 0, liked: false, replyToId: null, ...patch,
});

async function render() {
  await act(async () => root.render(<CommunityComments postId={1} count={3} notify={vi.fn()} onChanged={async () => {}} />));
}
const replyButtons = () => [...container.querySelectorAll("button")].filter((button) => button.textContent === "대댓글");
const threads = () => [...container.querySelectorAll(".community-comment-thread")];

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, String(value)); },
  };
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("localStorage", memoryStorage());
  vi.stubGlobal("sessionStorage", memoryStorage());
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 0; });
  Element.prototype.scrollIntoView = vi.fn();
  window.history.replaceState(null, "", "/community/1");
  vi.mocked(getComments).mockResolvedValue({ items: [comment(2), comment(3), comment(4, { replyToId: 2 })], nextCursor: null });
  vi.mocked(getParticipation).mockResolvedValue({ memberId: 7, canWrite: true, fixedMode: null, profile: null });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe("대댓글 입력칸 위치", () => {
  it("대댓글을 누르면 맨 아래가 아니라 그 댓글 묶음 바로 아래에 입력칸이 열린다", async () => {
    await render();
    expect(container.querySelector(".community-reply-inline")).toBeNull();
    expect(container.querySelectorAll("textarea")).toHaveLength(1);
    await act(async () => replyButtons()[1].click());
    const inline = threads()[1].querySelector(".community-reply-inline");
    expect(inline?.textContent).toContain("익명3 댓글에 대댓글");
    expect(inline?.querySelector("textarea")).not.toBeNull();
    expect(container.querySelectorAll("textarea")).toHaveLength(1);
  });

  it("취소하면 맨 아래 댓글 입력칸으로 돌아온다", async () => {
    await render();
    await act(async () => replyButtons()[0].click());
    await act(async () => [...container.querySelectorAll(".community-reply-target button")][0].dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(container.querySelector(".community-reply-inline")).toBeNull();
    expect(container.querySelectorAll("textarea")).toHaveLength(1);
  });

  it("인증 후 대댓글 복귀 주소가 늦게 도착해도 다음 페이지의 원댓글을 찾아 입력칸을 연다", async () => {
    vi.mocked(getComments).mockImplementation(async (_postId, cursor) => {
      if (cursor === 8) return { items: [comment(9)], nextCursor: null };
      return { items: [comment(2), comment(3)], nextCursor: 3 };
    });
    await render();
    window.history.replaceState(null, "", "/community/1?replyTo=9");
    await render();
    expect(vi.mocked(getComments).mock.calls.filter(([, cursor]) => cursor === 8)).toHaveLength(1);
    expect(container.querySelector(".community-reply-inline")?.textContent).toContain("익명9 댓글에 대댓글");
    expect(container.querySelector(".community-reply-inline textarea")).not.toBeNull();
    expect(container.querySelectorAll("textarea")).toHaveLength(1);
  });
});

const multilineBody = "첫 줄\n\n다음 문단";

function inputBody(input: HTMLTextAreaElement, value: string) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  setValue.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function expectEnterDoesNotSubmit(input: HTMLTextAreaElement) {
  await act(async () => {
    const enter = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    expect(input.getAttribute("enterkeyhint")).toBe("enter");
    expect(input.dispatchEvent(enter)).toBe(true);
    input.form!.requestSubmit();
  });
  expect(createComment).not.toHaveBeenCalled();
  expect(editComment).not.toHaveBeenCalled();
}

it.each([
  { label: "댓글", replyToId: undefined },
  { label: "대댓글", replyToId: 2 },
])("$label 작성 중 Enter는 줄바꿈에 쓰고 등록 버튼으로 여러 줄을 보낸다", async ({ replyToId }) => {
  await render();
  if (replyToId) await act(async () => replyButtons()[0].click());
  const input = container.querySelector<HTMLTextAreaElement>(".community-comment-composer textarea")!;
  const button = input.form!.querySelector<HTMLButtonElement>(".community-send")!;
  expect(button.disabled).toBe(true);
  await act(async () => inputBody(input, multilineBody));
  await expectEnterDoesNotSubmit(input);
  vi.mocked(createComment).mockResolvedValue(comment(4));
  await act(async () => button.click());
  expect(createComment).toHaveBeenCalledExactlyOnceWith(1, multilineBody, expect.any(String), "ANONYMOUS", 7, replyToId);
});

it.each([
  { label: "댓글", id: 2, replyToId: null },
  { label: "대댓글", id: 4, replyToId: 2 },
])("$label 수정 중 Enter는 줄바꿈에 쓰고 저장 버튼으로 여러 줄을 보낸다", async ({ id, replyToId }) => {
  window.history.replaceState(null, "", `/community/1?editComment=${id}`);
  const entry = comment(id, { replyToId, editable: true });
  vi.mocked(getComments).mockResolvedValue({ items: [entry], nextCursor: null });
  vi.mocked(editComment).mockResolvedValue({ ...entry, body: multilineBody });
  await render();
  const input = container.querySelector<HTMLTextAreaElement>(".community-comment-edit textarea")!;
  const button = input.form!.querySelector<HTMLButtonElement>(".community-primary-button")!;
  await act(async () => inputBody(input, ""));
  await act(async () => button.click());
  expect(editComment).not.toHaveBeenCalled();
  await act(async () => inputBody(input, multilineBody));
  await expectEnterDoesNotSubmit(input);
  await act(async () => button.click());
  expect(editComment).toHaveBeenCalledExactlyOnceWith(1, id, multilineBody);
});
