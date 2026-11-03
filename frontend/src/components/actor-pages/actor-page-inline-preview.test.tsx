// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ApplicantProfileResponse } from "@/features/applicants/types";
import { getActorPagePreview } from "@/features/actor-pages/owner-api";
import { ActorPageInlinePreview } from "./actor-page-inline-preview";
vi.mock("@/features/actor-pages/owner-api", () => ({ getActorPagePreview: vi.fn() }));
vi.mock("./actor-page-detail", () => ({ ActorPageView: ({ actorPage }: { actorPage: { name: string } }) => <p>{actorPage.name}</p> }));
let root: Root;
let container: HTMLDivElement;
const profile = { answers: [], photoLibrary: [], videoLibrary: [] } as unknown as ApplicantProfileResponse;
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
const page = (name: string) => ({ name }) as Awaited<ReturnType<typeof getActorPagePreview>>;
async function render(current = profile) { await act(async () => root.render(<ActorPageInlinePreview profile={current} settings={null} unsaved />)); }
it("조회 실패 후 다시 시도할 수 있고 입력값 보존을 안내한다", async () => {
  vi.mocked(getActorPagePreview).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(page("저장된 페이지"));
  await render();
  expect(container.textContent).toContain("작성한 내용은 입력 화면에 남아 있어요");
  await act(async () => container.querySelector("button")!.click());
  expect(container.textContent).toContain("저장된 페이지");
});
it("늦은 옛 미리보기 응답이 새 저장본을 덮지 않는다", async () => {
  let old!: (value: ReturnType<typeof page>) => void;
  vi.mocked(getActorPagePreview).mockImplementationOnce(() => new Promise((resolve) => { old = resolve; })).mockResolvedValueOnce(page("새 저장본"));
  await render();
  await render({ ...profile });
  await act(async () => old(page("옛 저장본")));
  expect(container.textContent).toContain("새 저장본");
  expect(container.textContent).not.toContain("옛 저장본");
});
