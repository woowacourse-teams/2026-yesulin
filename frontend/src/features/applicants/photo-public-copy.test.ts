import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicantProfilePhoto } from "./types";
import { createPhotoPublicCopy, ensurePublicCopies } from "./photo-public-copy";

const { request, shrink } = vi.hoisted(() => ({ request: vi.fn(), shrink: vi.fn() }));
vi.mock("./request", () => ({ applicantRequest: request }));
vi.mock("./profile-mode", () => ({ applicantProfileApiEnabled: true }));
vi.mock("@/features/companies/photo-image", () => ({ shrinkPhoto: shrink }));

const UPLOAD_URL = "https://storage.test/upload";
const fetchMock = vi.fn();

function photo(id: string, overrides: Partial<ApplicantProfilePhoto> = {}): ApplicantProfilePhoto {
  return { id, name: `사진 ${id}`, url: `/api/v1/files/${id}/content`, representative: false, visibility: "PUBLIC", ...overrides };
}

beforeEach(() => {
  request.mockReset();
  shrink.mockReset().mockResolvedValue(new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }));
  fetchMock.mockReset().mockImplementation(async (url: string) => {
    if (url === UPLOAD_URL) return new Response(null, { status: 200 });
    if (url.includes("/broken/")) return new Response(null, { status: 404 });
    return new Response(new Blob([new Uint8Array([0x89, 0x50])], { type: "image/png" }));
  });
  vi.stubGlobal("fetch", fetchMock);
  request.mockImplementation(async (path: string) => path.endsWith("/upload-requests")
    ? { url: UPLOAD_URL, method: "PUT", headers: { "Content-Type": "image/jpeg" }, uploadKey: "public/files/actor-pages/20261027/key" }
    : { publicCopyUrl: "https://cdn.test/files/actor-pages/20261027/key" });
});

afterEach(() => vi.unstubAllGlobals());

describe("배우 페이지 공개 사본 만들기", () => {
  it("보관함 원본을 받아 줄인 JPEG를 올리고 확정한 사본 주소를 돌려준다", async () => {
    expect(await createPhotoPublicCopy(photo("7"))).toBe("https://cdn.test/files/actor-pages/20261027/key");

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/files/7/content", { credentials: "include" });
    const original = shrink.mock.calls[0]![0] as File;
    expect(original.type).toBe("image/png");
    expect(request).toHaveBeenNthCalledWith(1, "/v1/applicants/me/photo-library/photos/7/public-copy/upload-requests", {
      method: "POST",
      body: JSON.stringify({ contentType: "image/jpeg", size: 3 }),
    });
    expect(fetchMock.mock.calls[1]![0]).toBe(UPLOAD_URL);
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({ method: "PUT" });
    expect(request).toHaveBeenNthCalledWith(2, "/v1/applicants/me/photo-library/photos/7/public-copy/completion", {
      method: "PATCH",
      body: JSON.stringify({ uploadKey: "public/files/actor-pages/20261027/key" }),
    });
  });

  it("원본을 받지 못하면 올리지 않는다", async () => {
    await expect(createPhotoPublicCopy({ id: "8", url: "/api/v1/files/broken/content" })).rejects.toThrow("보관함 사진을 불러오지 못했어요");
    expect(request).not.toHaveBeenCalled();
  });

  it("사본이 없는 공개 사진만 한 장씩 만들고 실패한 사진은 알려 준다", async () => {
    const photos = [
      photo("1"),
      photo("2", { visibility: "PRIVATE" }),
      photo("3", { publicCopyUrl: "https://cdn.test/existing" }),
      photo("4", { url: "/api/v1/files/broken/content" }),
    ];

    const result = await ensurePublicCopies(photos);

    expect(result.failedPhotoIds).toEqual(["4"]);
    expect(result.photos.map((item) => item.publicCopyUrl ?? null)).toEqual([
      "https://cdn.test/files/actor-pages/20261027/key",
      null,
      "https://cdn.test/existing",
      null,
    ]);
    expect(request.mock.calls.filter(([path]) => String(path).endsWith("/upload-requests"))).toHaveLength(1);
  });
});
