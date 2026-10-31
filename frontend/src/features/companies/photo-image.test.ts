import { afterEach, describe, expect, it, vi } from "vitest";
import { fitWithin, isLikelyImage, MAX_SOURCE_BYTES, PhotoProcessingError, shrinkPhoto } from "./photo-image";

describe("공연사 사진 줄이기", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("취소 이후 해독이 끝난 bitmap은 닫고 canvas 변환을 시작하지 않는다", async () => {
    const controller = new AbortController();
    let finish!: (bitmap: ImageBitmap) => void;
    vi.stubGlobal("createImageBitmap", vi.fn(() => new Promise((resolve) => { finish = resolve; })));
    const close = vi.fn();
    const promise = shrinkPhoto(new File(["x"], "photo.jpg", { type: "image/jpeg" }), controller.signal);
    controller.abort();
    finish({ width: 100, height: 100, close } as unknown as ImageBitmap);
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    expect(close).toHaveBeenCalledOnce();
  });
  it("긴 변이 1600px를 넘지 않게 비율을 지켜 줄이고 작은 사진은 그대로 둔다", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(10000, 1)).toEqual({ width: 1600, height: 1 });
  });

  it("형식이 비어 있는 HEIC도 확장자로 사진으로 본다", () => {
    expect(isLikelyImage({ name: "IMG_0001.HEIC", type: "" })).toBe(true);
    expect(isLikelyImage({ name: "logo.png", type: "image/png" })).toBe(true);
    expect(isLikelyImage({ name: "공연사 소개.pdf", type: "application/pdf" })).toBe(false);
  });

  it("사진이 아니거나 너무 큰 파일은 열기 전에 거절한다", async () => {
    await expect(shrinkPhoto(new File(["%PDF"], "a.pdf", { type: "application/pdf" })))
      .rejects.toBeInstanceOf(PhotoProcessingError);
    const huge = new File(["x"], "big.jpg", { type: "image/jpeg" });
    Object.defineProperty(huge, "size", { value: MAX_SOURCE_BYTES + 1 });
    await expect(shrinkPhoto(huge)).rejects.toThrow("너무 커요");
  });
});
