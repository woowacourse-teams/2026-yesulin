import { describe, expect, it } from "vitest";
import type { ApplicantProfilePhoto, ApplicantProfileResponse } from "@/features/applicants/types";
import {
  actorPageAddress,
  autoHiddenMessage,
  canPublish,
  pageRepresentativePhoto,
  profileHasValue,
  publishBlockers,
  shouldPromptPublish,
  showsUnlockedNotice,
  type ActorPageSettings,
} from "./settings";

const settings = (overrides: Partial<ActorPageSettings> = {}): ActorPageSettings => ({
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
  readiness: { ready: false, missing: [], underAge: false, locked: false },
  publishPromptShown: false,
  consentVersion: "actor-page-publish-v1.0",
  pageRepresentativePhotoId: null,
  ...overrides,
});

const photo = (id: string, visibility: "PUBLIC" | "PRIVATE", representative = false): ApplicantProfilePhoto =>
  ({ id, name: id, url: `/${id}.jpg`, representative, visibility, publicCopyUrl: null });

describe("publish blockers", () => {
  it("treats a public photo without a copy as ready because publishing makes the copy", () => {
    const blockers = publishBlockers(settings({ readiness: { ready: false, missing: ["NAME", "PUBLIC_PHOTO"], underAge: false, locked: false } }), [photo("a", "PUBLIC")]);

    expect(blockers.missing).toEqual(["NAME"]);
    expect(canPublish(blockers)).toBe(false);
  });

  it("asks for a public photo when every photo is private", () => {
    const blockers = publishBlockers(settings({ readiness: { ready: false, missing: ["PUBLIC_PHOTO"], underAge: false, locked: false } }), [photo("a", "PRIVATE")]);

    expect(blockers.missing).toEqual(["PUBLIC_PHOTO"]);
  });

  it("blocks locked and under-14 pages even with nothing missing", () => {
    expect(canPublish(publishBlockers(settings({ locked: true }), []))).toBe(false);
    expect(canPublish(publishBlockers(settings({ readiness: { ready: false, missing: [], underAge: true, locked: false } }), []))).toBe(false);
    expect(canPublish(publishBlockers(settings(), []))).toBe(true);
  });
});

describe("auto hidden message", () => {
  it("names what is still missing", () => {
    const hidden = settings({ autoHiddenReason: "MISSING_REQUIRED", readiness: { ready: false, missing: ["PUBLIC_PHOTO"], underAge: false, locked: false } });

    expect(autoHiddenMessage(hidden, publishBlockers(hidden, []))).toBe("공개에 필요한 항목(공개 사진)이 빠져 페이지가 비공개로 바뀌었어요. 채운 뒤 다시 공개해 주세요.");
  });

  it("says the page can be published again once filled", () => {
    const hidden = settings({ autoHiddenReason: "MISSING_REQUIRED" });

    expect(autoHiddenMessage(hidden, publishBlockers(hidden, []))).toContain("지금은 다시 공개할 수 있어요");
  });

  it("explains the age rule and stays quiet for public pages", () => {
    const underAge = settings({ autoHiddenReason: "UNDER_14" });

    expect(autoHiddenMessage(underAge, publishBlockers(underAge, []))).toContain("만 14세 미만");
    expect(autoHiddenMessage(settings({ status: "PUBLIC", autoHiddenReason: "UNDER_14" }), publishBlockers(underAge, []))).toBeNull();
  });
});

describe("unlocked notice", () => {
  it("shows until the actor publishes again after the unlock", () => {
    expect(showsUnlockedNotice(settings({ unlockedAt: "2026-10-25T00:00:00Z", publishedAt: "2026-10-20T00:00:00Z" }))).toBe(true);
    expect(showsUnlockedNotice(settings({ unlockedAt: "2026-10-25T00:00:00Z", publishedAt: "2026-10-26T00:00:00Z" }))).toBe(false);
    expect(showsUnlockedNotice(settings({ unlockedAt: "2026-10-25T00:00:00Z", locked: true }))).toBe(false);
  });
});

describe("publish prompt", () => {
  it("shows once for private, unlocked pages", () => {
    expect(shouldPromptPublish(settings())).toBe(true);
    expect(shouldPromptPublish(settings({ publishPromptShown: true }))).toBe(false);
    expect(shouldPromptPublish(settings({ status: "PUBLIC" }))).toBe(false);
    expect(shouldPromptPublish(settings({ locked: true }))).toBe(false);
  });
});

describe("page representative photo", () => {
  it("is the first public photo, not the application representative", () => {
    const photos = [photo("a", "PRIVATE", true), photo("b", "PUBLIC"), photo("c", "PUBLIC")];

    expect(pageRepresentativePhoto(photos)?.id).toBe("b");
    expect(pageRepresentativePhoto([photo("a", "PRIVATE", true)])).toBeNull();
  });
});

describe("profile value", () => {
  const profile = (answers: ApplicantProfileResponse["answers"]): ApplicantProfileResponse =>
    ({ answers, photoLibrary: [], videoLibrary: [], completeness: { filled: 0, standardTotal: 8 } });

  it("ignores blank text, empty links and empty education", () => {
    expect(profileHasValue(profile([{ key: "SPECIALTY", label: "특기", value: "  " }]), "SPECIALTY")).toBe(false);
    expect(profileHasValue(profile([{ key: "LINK", label: "링크", value: ["", " "] }]), "LINK")).toBe(false);
    expect(profileHasValue(profile([{ key: "SCHOOL", label: "학력", value: { level: null, school: "", major: "" } }]), "SCHOOL")).toBe(false);
    expect(profileHasValue(profile([{ key: "SCHOOL", label: "학력", value: { level: "NONE", school: "", major: "" } }]), "SCHOOL")).toBe(true);
    expect(profileHasValue(profile([]), "HOBBIES")).toBe(false);
  });
});

it("writes the page address without the protocol", () => {
  expect(actorPageAddress("min.zzun_")).toBe("yesulin.art/actors/@min.zzun_");
});
