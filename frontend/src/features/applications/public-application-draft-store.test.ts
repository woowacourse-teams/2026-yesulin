import { afterEach, describe, expect, it, vi } from "vitest";
import { restoreDraftPhotos } from "./public-application-draft-store";

class ReadCountingBlob extends Blob {
  reads = 0;

  override async arrayBuffer() {
    this.reads += 1;
    return super.arrayBuffer();
  }
}

describe("restoreDraftPhotos", () => {
  afterEach(() => vi.restoreAllMocks());

  it("로그인 복귀 후 IndexedDB Blob을 현재 페이지의 새 메모리 Blob으로 준비한다", async () => {
    const stored = new ReadCountingBlob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:restored-photo");

    const restored = await restoreDraftPhotos([{ id: "photo-1", name: "photo.jpg", blob: stored }]);

    expect(stored.reads).toBe(1);
    expect(restored[0]?.blob).not.toBe(stored);
    expect(restored[0]?.blob?.size).toBe(stored.size);
    expect(restored[0]?.blob?.type).toBe(stored.type);
    expect(restored[0]?.status).toBe("READY");
  });
});
