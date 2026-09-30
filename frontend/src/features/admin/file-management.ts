import type { AdminFileDeletionResult, AdminUnusedFile } from "./types";

export function selectableFileIds(files: readonly AdminUnusedFile[]): number[] {
  return files.filter((file) => file.deletable).map((file) => file.fileId);
}

export function summarizeDeletion(result: AdminFileDeletionResult) {
  return {
    deleted: result.results.filter((item) => item.status !== "FAILED").length,
    failed: result.results.filter((item) => item.status === "FAILED").length,
    retryableIds: result.results
      .filter((item) => item.code === "FILE_DELETION_FAILED")
      .map((item) => item.fileId),
  };
}
