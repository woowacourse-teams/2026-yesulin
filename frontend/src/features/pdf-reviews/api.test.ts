// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { putPdf } from "../pdf-extractions/api";
import { fetchPdfReview, pdfSourceSha256, preparePdfReviewUpload } from "./api";
import { registerPdfReviewJob } from "@/features/analytics/pdf-analytics";

vi.mock("../csrf", () => ({ withCsrfHeaders: async (headers: unknown) => headers }));
vi.mock("@/features/analytics/pdf-analytics", () => ({ registerPdfReviewJob: vi.fn() }));
const ABC_SHA = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
afterEach(() => vi.unstubAllGlobals());

it("심사를 다시 열면 모든 지원서를 반환하고 PDF 원본만 기존 추출 지표에 등록한다", async () => {
  const entries = [
    { originalFilename: "profile.hwp", jobId: "hwp-job" },
    { originalFilename: "profile.PDF", jobId: "pdf-job" },
  ];
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ entries })));

  expect((await fetchPdfReview("review")).entries).toEqual(entries);
  expect(registerPdfReviewJob).toHaveBeenCalledTimes(1);
  expect(registerPdfReviewJob).toHaveBeenCalledWith("pdf-job", "review");
});

describe("PDF 원본 내용 체크섬", () => {
  it("이름을 바꿔도 같은 바이트는 같은 SHA이고 같은 이름의 다른 바이트는 다르다", async () => {
    expect(await pdfSourceSha256(new File(["abc"], "one.pdf"))).toBe(ABC_SHA);
    expect(await pdfSourceSha256(new File(["abc"], "renamed.pdf"))).toBe(ABC_SHA);
    expect(await pdfSourceSha256(new File(["abd"], "one.pdf"))).not.toBe(ABC_SHA);
  });

  it("브라우저의 MIME이 비어 있어도 서명된 한글 파일 MIME과 원본 바이트로 PUT한다", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await putPdf(new File(["fixture"], "지원서.hwp"), {
      headers: { "content-type": "application/x-hwp" }, expiresAt: "", method: "PUT", url: "https://private.test/once"
    });
    const request = fetch.mock.calls[0][1];
    expect(request.body.type).toBe("application/x-hwp");
    expect(await request.body.text()).toBe("fixture");
    expect(request.headers).toEqual({ "content-type": "application/x-hwp" });
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
