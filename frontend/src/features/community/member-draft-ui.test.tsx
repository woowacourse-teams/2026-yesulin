// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuthorChoice } from "@/components/community/member-participation";
import { useMemberDraft } from "./use-member-draft";
import { readCommunityDraft, saveCommunityDraft } from "./member-draft";
import type { CommunityAuthorMode } from "./types";
import { finishCommunityEdit } from "./navigation";

vi.mock("@/features/monitoring/report-error", () => ({ reportError: vi.fn() }));

let root: Root;
let container: HTMLElement;

function Probe({ mode, scope = "comment:3", member = 1 }: { readonly mode: CommunityAuthorMode | null; readonly scope?: string; readonly member?: number }) {
  const { draft } = useMemberDraft(scope, member, mode, { title: "원래 제목", body: "원래 본문" });
  return <output data-mode={draft.authorMode} data-request={draft.requestId}>{draft.title}|{draft.body}</output>;
}

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals(); });

it("다른 탭이 표시 방식을 고정하면 내용은 유지하고 요청번호와 모드만 바꾼다", async () => {
  saveCommunityDraft("comment:3", 1, { title: "", body: "작성 중", authorMode: "ANONYMOUS", requestId: "old" });
  await act(async () => root.render(<Probe key="1:null" mode={null} />));
  expect(container.textContent).toBe("|작성 중");
  await act(async () => root.render(<Probe key="1:PROFILE" mode="PROFILE" />));
  expect(container.textContent).toBe("|작성 중");
  expect(container.querySelector("output")?.dataset.mode).toBe("PROFILE");
  expect(container.querySelector("output")?.dataset.request).not.toBe("old");
});

it("회원 글 수정 초안은 같은 글·같은 계정에서만 복구한다", async () => {
  saveCommunityDraft("post:edit:7", 1, { title: "수정 제목", body: "수정 본문", authorMode: "ANONYMOUS", requestId: "saved" });
  await act(async () => root.render(<Probe key="1" mode={null} scope="post:edit:7" />));
  expect(container.textContent).toBe("수정 제목|수정 본문");
  await act(async () => root.render(<Probe key="2" mode={null} member={2} scope="post:edit:7" />));
  expect(container.textContent).toBe("원래 제목|원래 본문");
  expect(readCommunityDraft("post:new", 1)).toBeNull();
});

it("공개 선택 전에 이름·사진·연결될 배우 페이지를 확인할 수 있다", async () => {
  const participation = { memberId: 1, canWrite: true, fixedMode: null,
    profile: { name: "배우 이름", photoUrl: "https://example.test/photo.jpg", path: "/actors/@actor" } };
  await act(async () => root.render(<AuthorChoice participation={participation} mode="PROFILE" onChange={() => {}} />));
  expect(container.querySelector("a")?.getAttribute("href")).toBe("/actors/@actor");
  expect(container.querySelector("img")?.getAttribute("src")).toBe("https://example.test/photo.jpg");
  expect(container.textContent).toContain("배우 이름");
});

it("댓글 수정 초안은 새 댓글이나 다른 계정의 수정 초안과 섞이지 않는다", async () => {
  saveCommunityDraft("comment:edit:27", 1, { title: "", body: "수정 중 댓글", authorMode: "ANONYMOUS", requestId: "editing" });
  await act(async () => root.render(<Probe key="1" mode={null} scope="comment:edit:27" />));
  expect(container.textContent).toBe("|수정 중 댓글");
  await act(async () => root.render(<Probe key="2" mode={null} member={2} scope="comment:edit:27" />));
  expect(container.textContent).toBe("원래 제목|원래 본문");
  expect(readCommunityDraft("comment:3", 1)).toBeNull();
});

it("수정 완료 후 갱신·새로고침해도 복귀용 수정 양식이 다시 열리지 않는다", () => {
  window.history.replaceState(null, "", "/community/3?editComment=27&reply=1#comments-heading");
  finishCommunityEdit();
  expect(window.location.pathname + window.location.search + window.location.hash).toBe("/community/3?reply=1#comments-heading");
});
