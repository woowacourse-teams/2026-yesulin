// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ACTOR_PAGE_CONSENT_NOTICE, type ActorPageSettings } from "@/features/actor-pages/settings";
import type { ApplicantProfileResponse } from "@/features/applicants/types";
import { publishActorPage } from "@/features/actor-pages/owner-api";
import { ActorPagePublishDialog } from "./actor-page-publish-dialog";

vi.mock("@/features/actor-pages/owner-api", () => ({ publishActorPage: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));

let root: Root;
let container: HTMLDivElement;

const settings: ActorPageSettings = {
  publicId: null,
  handle: "actor",
  handleEditable: true,
  status: "PRIVATE",
  autoHiddenReason: null,
  locked: false,
  lockReason: null,
  unlockedAt: null,
  firstPublishedAt: null,
  publishedAt: null,
  fieldVisibilities: { education: "PRIVATE", careers: "PRIVATE", coverLetter: "PRIVATE", specialty: "PRIVATE", hobbies: "PRIVATE", nationality: "PRIVATE", links: "PRIVATE" },
  readiness: { ready: true, missing: [], underAge: false, locked: false },
  publishPromptShown: true,
  consentVersion: "actor-page-publish-v1.0",
  pageRepresentativePhotoId: null,
};

const profile: ApplicantProfileResponse = {
  answers: [],
  photoLibrary: [{ id: "photo", name: "photo", url: "/photo.jpg", representative: true, visibility: "PUBLIC", publicCopyUrl: "/copy.jpg" }],
  videoLibrary: [],
  completeness: { filled: 0, standardTotal: 8 },
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

it("공개 범위·검색엔진·비공개 후 외부 사본 고지를 보여 주고 동의해야 공개할 수 있다", async () => {
  await act(async () => root.render(
    <ActorPagePublishDialog mode="publish" settings={settings} profile={profile} onClose={() => {}} onPublished={() => {}} />,
  ));

  const dialog = document.querySelector("[role='dialog']")!;
  ACTOR_PAGE_CONSENT_NOTICE.forEach((sentence) => expect(dialog.textContent).toContain(sentence));
  const consent = dialog.querySelector<HTMLInputElement>("input[type='checkbox']")!;
  expect(consent.labels?.[0]?.textContent).toBe("위 내용을 확인하고 배우 페이지 공개에 동의합니다. (공개 시 필수)");
  expect(document.getElementById(consent.getAttribute("aria-describedby")!)?.textContent).toContain("검색엔진에 수집·노출될 수 있습니다.");

  const publish = [...dialog.querySelectorAll("button")].find((button) => button.textContent === "공개하기")!;
  expect(publish.disabled).toBe(true);
  await act(async () => consent.click());
  expect(publish.disabled).toBe(false);
});

it("동의 후 연속 클릭은 한 번만 공개하고 성공 응답을 받은 뒤에만 완료를 알린다", async () => {
  const published = vi.fn();
  let complete!: (result: Awaited<ReturnType<typeof publishActorPage>>) => void;
  vi.mocked(publishActorPage).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
  await act(async () => root.render(<ActorPagePublishDialog mode="publish" settings={settings} profile={profile} onClose={vi.fn()} onPublished={published} />));
  const dialog = document.querySelector('[role="dialog"]')!;
  await act(async () => dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  const publish = [...dialog.querySelectorAll("button")].find((button) => button.textContent === "공개하기")!;
  await act(async () => { publish.click(); publish.click(); });
  expect(publishActorPage).toHaveBeenCalledExactlyOnceWith(profile, settings.consentVersion);
  expect(published).not.toHaveBeenCalled();
  const result = { settings: { ...settings, status: "PUBLIC" as const }, profile, failedPhotoIds: [] };
  await act(async () => complete(result));
  expect(published).toHaveBeenCalledExactlyOnceWith(result);
});
it("공개 실패는 완료로 넘기지 않고 동의 상태와 오류·재시도를 유지한다", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(publishActorPage).mockRejectedValueOnce(new Error("연결을 확인해 주세요."));
  const published = vi.fn();
  await act(async () => root.render(<ActorPagePublishDialog mode="publish" settings={settings} profile={profile} onClose={vi.fn()} onPublished={published} />));
  const dialog = document.querySelector('[role="dialog"]')!;
  const checkbox = dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  await act(async () => checkbox.click());
  await act(async () => [...dialog.querySelectorAll("button")].find((button) => button.textContent === "공개하기")!.click());
  expect(published).not.toHaveBeenCalled();
  expect(dialog.textContent).toContain("연결을 확인해 주세요");
  expect(checkbox.checked).toBe(true);
});
