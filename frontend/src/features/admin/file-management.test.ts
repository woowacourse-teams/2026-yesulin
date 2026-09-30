import { describe, expect, it } from "vitest";
import { selectableFileIds, summarizeDeletion } from "./file-management";
import type { AdminUnusedFile } from "./types";

const file = (fileId: number, deletable: boolean): AdminUnusedFile => ({
  fileId,
  ownerId: 1,
  status: "READY",
  storageScope: "PRIVATE",
  createdAt: "2026-09-01T00:00:00Z",
  unusedSince: "2026-09-01T00:00:00Z",
  deletableAt: "2026-09-08T00:00:00Z",
  deletable,
});

describe("관리자 파일 선택과 삭제 결과", () => {
  it("7일 미만 파일을 삭제 선택에서 제외한다", () => {
    expect(selectableFileIds([file(1, true), file(2, false), file(3, true)])).toEqual([1, 3]);
  });

  it("부분 실패를 분리해 관리자에게 재시도할 파일을 알려준다", () => {
    expect(summarizeDeletion({ results: [
      { fileId: 1, status: "DELETED", code: null },
      { fileId: 2, status: "ALREADY_DELETED", code: null },
      { fileId: 3, status: "FAILED", code: "FILE_DELETION_FAILED" },
      { fileId: 4, status: "FAILED", code: "FILE_STILL_IN_USE" },
    ] })).toEqual({ deleted: 2, failed: 2, retryableIds: [3] });
  });
});
