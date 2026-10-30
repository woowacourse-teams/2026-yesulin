// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { pdfSourceSha256, preparePdfReviewUpload } from "./api";

vi.mock("../csrf", () => ({ withCsrfHeaders: async (headers: unknown) => headers }));
const ABC_SHA = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
afterEach(() => vi.unstubAllGlobals());

describe("PDF 원본 내용 체크섬", () => {
  it("이름을 바꿔도 같은 바이트는 같은 SHA이고 같은 이름의 다른 바이트는 다르다", async () => {
    expect(await pdfSourceSha256(new File(["abc"], "one.pdf"))).toBe(ABC_SHA);
    expect(await pdfSourceSha256(new File(["abc"], "renamed.pdf"))).toBe(ABC_SHA);
    expect(await pdfSourceSha256(new File(["abd"], "one.pdf"))).not.toBe(ABC_SHA);
  });

  it("업로드 준비 요청에 원본 SHA를 보내고 기존 작업 응답을 유지한다", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      jobId: "existing", fileKey: "key", duplicate: true, upload: null,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    const prepared = await preparePdfReviewUpload("review", new File(["abc"], "renamed.pdf"));

    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      originalFilename: "renamed.pdf", size: 3, sha256: ABC_SHA,
    });
    expect(prepared).toEqual({ jobId: "existing", fileKey: "key", duplicate: true, upload: null });
  });
});
