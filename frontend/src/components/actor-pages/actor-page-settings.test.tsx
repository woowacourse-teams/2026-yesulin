// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ApplicantProfileResponse } from "@/features/applicants/types";
import type { ActorPageSettings } from "@/features/actor-pages/settings";
import { changeActorHandle, getActorHandleAvailability } from "@/features/actor-pages/owner-api";
import { ActorPageSettingsPanel } from "./actor-page-settings";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));
vi.mock("@/components/auditions/toast", () => ({ useToast: () => vi.fn() }));
vi.mock("@/features/actor-pages/owner-api", () => ({
  changeActorHandle: vi.fn(), changeActorPageFieldVisibilities: vi.fn(), getActorHandleAvailability: vi.fn(), getActorPageSettings: vi.fn(), unpublishActorPage: vi.fn(), publishActorPage: vi.fn(),
}));
vi.mock("@/features/applicants/profile-photo-api", () => ({ moveApplicantProfilePhoto: vi.fn(), changeApplicantProfilePhotoVisibility: vi.fn(), prepareApplicantPhotoPublicCopies: vi.fn(), reloadApplicantProfilePhotos: vi.fn() }));
vi.mock("@/features/applicants/profile-api", () => ({ changeApplicantProfileVideoVisibility: vi.fn() }));

const profile: ApplicantProfileResponse = {
  answers: [], videoLibrary: [], completeness: { filled: 0, standardTotal: 8 },
  photoLibrary: [1, 2, 3].map((id) => ({ id: String(id), name: `사진${id}`, url: `/photo${id}.jpg`, representative: id === 1, visibility: id === 1 ? "PRIVATE" : "PUBLIC", publicCopyUrl: id === 1 ? null : `/copy${id}.jpg` })),
};
const settings: ActorPageSettings = {
  publicId: null, handle: "actor", handleEditable: true, status: "PRIVATE", autoHiddenReason: null,
  locked: false, lockReason: null, unlockedAt: null, firstPublishedAt: null, publishedAt: null,
  fieldVisibilities: { education: "PRIVATE", careers: "PRIVATE", coverLetter: "PRIVATE", specialty: "PRIVATE", hobbies: "PRIVATE", nationality: "PRIVATE", links: "PRIVATE" },
  readiness: { ready: true, missing: [], underAge: false, locked: false }, publishPromptShown: true,
  consentVersion: "actor-page-publish-v1.0", pageRepresentativePhotoId: null,
};

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  vi.mocked(getActorHandleAvailability).mockImplementation(async (handle) => ({ handle, available: true, reason: null }));
  vi.mocked(changeActorHandle).mockImplementation(async (handle) => ({ ...settings, handle }));
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

async function render(options: { unsaved?: boolean; settings?: ActorPageSettings; profile?: ApplicantProfileResponse } = {}) {
  function Workspace() {
    const [current, setCurrent] = useState(options.profile ?? profile);
    const [page, setPage] = useState(options.settings ?? settings);
    return <ActorPageSettingsPanel profile={current} onProfileChange={setCurrent} actorPage={{ settings: page, error: "", update: setPage, refresh: async () => page }} hasUnsavedChanges={options.unsaved} />;
  }
  await act(async () => root.render(<Workspace />));
}
function button(text: string) { return [...container.querySelectorAll("button")].find((element) => element.textContent?.trim() === text)!; }

it("미저장 프로필이 있으면 미리보기와 공개를 차단한다", async () => {
  await render({ unsaved: true });
  expect(button("공개하기").disabled).toBe(true);
  expect(button("미리보기").disabled).toBe(true);
  expect(container.querySelector('a[href="/applicants/profile/actor-page-preview"]')).toBeNull();
});

it("새로 입력한 아이디도 저장하기 전에는 공개하지 않고 저장 후 공개 버튼을 복구한다", async () => {
  vi.useFakeTimers();
  await render();
  const input = container.querySelector<HTMLInputElement>('input[placeholder="actor.name"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "new.actor");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(button("공개하기").disabled).toBe(true);
  expect(button("미리보기").disabled).toBe(true);
  await act(async () => { await vi.advanceTimersByTimeAsync(301); });
  await act(async () => button("아이디 저장").click());
  expect(changeActorHandle).toHaveBeenCalledWith("new.actor");
  expect(button("공개하기").disabled).toBe(false);
});
