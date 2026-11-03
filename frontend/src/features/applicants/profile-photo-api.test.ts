import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicantProfileResponse } from "./types";
import { makeApplicantProfilePhotoRepresentative, moveApplicantProfilePhoto } from "./profile-photo-api";

const api = vi.hoisted(() => ({ enabled: false, request: vi.fn() }));
vi.mock("./profile-mode", () => ({ get applicantProfileApiEnabled() { return api.enabled; } }));
vi.mock("./request", () => ({ applicantRequest: api.request }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));

const profile: ApplicantProfileResponse = {
  answers: [], videoLibrary: [], completeness: { filled: 0, standardTotal: 8 },
  photoLibrary: [1, 2, 3].map((id) => ({ id: String(id), name: `사진${id}`, url: `/photo${id}.jpg`, representative: id === 1, visibility: id === 1 ? "PRIVATE" : "PUBLIC" })),
};
beforeEach(() => {
  api.enabled = false;
  api.request.mockReset().mockImplementation(async (_path, init) => ({ ...profile, photoLibrary: JSON.parse(init.body).photoLibrary }));
});

describe("사진 순서의 목·서버 계약", () => {
  it("맨 뒤를 맨 앞으로 옮길 때 나머지 상대 순서를 유지하고 첫 사진을 지원서 대표로 갱신한다", async () => {
    const saved = await moveApplicantProfilePhoto(profile, 2, 0);
    expect(saved.photoLibrary.map((photo) => photo.id)).toEqual(["3", "1", "2"]);
    expect(saved.photoLibrary.map((photo) => photo.representative)).toEqual([true, false, false]);
    expect(saved.photoLibrary.find((photo) => photo.id === "1")!.visibility).toBe("PRIVATE");
  });

  it("지원서 대표 지정도 사진을 맨 앞으로 이동시켜 실제 서버와 같은 순서를 쓴다", async () => {
    const saved = await makeApplicantProfilePhotoRepresentative(profile, "3");
    expect(saved.photoLibrary.map((photo) => photo.id)).toEqual(["3", "1", "2"]);
    expect(saved.photoLibrary[0].representative).toBe(true);
  });

  it("실제 API는 선택한 사진의 목표 displayOrder만 보내고 서버 응답으로 보관함을 갱신한다", async () => {
    api.enabled = true;
    api.request.mockResolvedValue({ photos: [3, 1, 2].map((id, displayOrder) => ({ id, fileId: id, imageUrl: `/photo${id}.jpg`, displayOrder, representative: displayOrder === 0, createdAt: "2026-11-03T00:00:00Z", visibility: id === 1 ? "PRIVATE" : "PUBLIC", publicCopyUrl: null })) });
    const saved = await moveApplicantProfilePhoto(profile, 2, 0);
    expect(api.request).toHaveBeenCalledExactlyOnceWith("/v1/applicants/me/photo-library/photos/3", { method: "PATCH", body: JSON.stringify({ displayOrder: 0 }) });
    expect(saved.photoLibrary.map((photo) => photo.id)).toEqual(["3", "1", "2"]);
    expect(saved.photoLibrary[1].visibility).toBe("PRIVATE");
  });

  it("같은 위치나 범위 밖 이동은 요청하지 않는다", async () => {
    expect(await moveApplicantProfilePhoto(profile, 0, 0)).toBe(profile);
    expect(await moveApplicantProfilePhoto(profile, 0, -1)).toBe(profile);
    expect(api.request).not.toHaveBeenCalled();
  });
});
