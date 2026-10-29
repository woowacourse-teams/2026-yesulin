// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ACTOR_PAGE_CONSENT_NOTICE, type ActorPageSettings } from "@/features/actor-pages/settings";
import type { ApplicantProfileResponse } from "@/features/applicants/types";
import { ActorPagePublishDialog } from "./actor-page-publish-dialog";

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
