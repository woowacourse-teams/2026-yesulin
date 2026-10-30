import { trackPdfStep, registerPdfReviewJob } from "@/features/analytics/pdf-analytics";
import { useEffect, useRef, useState } from "react";
import { completePdfUpload, PdfExtractionApiError, putPdf } from "../pdf-extractions/api";
import type { PreparedPdfUpload } from "../pdf-extractions/types";
import { isUnauthorized, preparePdfReviewUpload } from "./api";
import { sameKey, type ReviewKey } from "./types";
import { MAX_SELECTION } from "./upload-selection";

export const MAX_FILES = 800;
export const MAX_BYTES = 25 * 1024 * 1024;
const CONCURRENCY = 2;

export type UploadRow = {
  readonly id: string;
  readonly reviewId: ReviewKey;
  readonly name: string;
  readonly size: number;
  readonly phase: "SELECTED" | "UPLOADING" | "ERROR";
  readonly error: string;
  /** 브라우저 File 핸들만 보관한다. 내용은 업로드하는 순간에만 읽는다. */
  readonly file?: File;
  readonly pendingJobId?: string;
};

type Options = { readonly onUploaded: () => void; readonly onUnauthorized: () => void };
export type UploadNotice = Pick<UploadRow, "id" | "reviewId" | "name" | "size" | "error"> & {
  readonly phase: UploadRow["phase"] | "UPLOADED";
};

const SESSION_EXPIRED = "로그인이 만료되었습니다. 다시 로그인한 뒤 이어서 올려 주세요.";
const failure = (cause: unknown) => isUnauthorized(cause) ? SESSION_EXPIRED
  : cause instanceof Error ? cause.message : "처리하지 못했습니다. 다시 확인해 주세요.";

export const isUploadable = (row: UploadRow) =>
  row.phase === "SELECTED" || (row.phase === "ERROR" && (!!row.pendingJobId || !!row.file));

/**
 * 선택한 파일은 이 훅의 메모리에만 두고 한 번에 2개씩 읽어 올린다. 파일마다 성공·실패가 독립적이며,
 * 심사를 바꿔도 다른 심사에 고른 파일은 사라지지 않는다.
 */
export function useReviewUploads({ onUploaded, onUnauthorized }: Options) {
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [notices, setNotices] = useState<UploadNotice[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [validationError, setValidationError] = useState("");
  const [messageReviewId, setMessageReviewId] = useState<ReviewKey | null>(null);
  const running = useRef(false);
  const targets = useRef(new Map<string, PreparedPdfUpload["upload"]>());
  const mounted = useRef(true);
  const callbacks = useRef({ onUploaded, onUnauthorized });
  useEffect(() => { callbacks.current = { onUploaded, onUnauthorized }; });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const patch = (id: string, change: Partial<UploadRow>) => {
    if (mounted.current) {
      setRows(current => current.map(row => row.id === id ? { ...row, ...change } : row));
      // 알림에는 File 핸들이나 업로드 URL을 보관하지 않는다.
      setNotices(current => current.map(row => row.id === id ? { ...row,
        ...(change.phase ? { phase: change.phase } : {}), ...(change.error !== undefined ? { error: change.error } : {}),
      } : row));
    }
  };

  function choose(reviewId: ReviewKey, selected: FileList | readonly File[] | null, entryCount: number) {
    if (!selected?.length || running.current) return;
    setMessageReviewId(reviewId);
    setValidationError("");
    if (selected.length > MAX_SELECTION) { setMessage("한 번에 PDF 300개까지 선택해 주세요."); setValidationError("한 번에 PDF 300개까지 선택해 주세요."); return; }
    const queued = rows.filter(row => sameKey(row.reviewId, reviewId)).length;
    if (entryCount + queued + selected.length > MAX_FILES) {
      setMessage("한 심사에는 최대 800개까지 올릴 수 있습니다."); setValidationError("한 심사에는 최대 800개까지 올릴 수 있습니다."); return;
    }
    const next = Array.from(selected).map((file): UploadRow => {
      const valid = /\.pdf$/i.test(file.name) && file.size > 0 && file.size <= MAX_BYTES;
      return {
        id: crypto.randomUUID(), reviewId, name: file.name, size: file.size, phase: valid ? "SELECTED" : "ERROR",
        error: valid ? "" : "25MiB 이하의 PDF 파일만 올릴 수 있습니다.", file: valid ? file : undefined,
      };
    });
    setRows(current => [...current, ...next]);
    setNotices(current => [...current, ...next.map(({ id, reviewId, name, size, phase, error }) => ({ id, reviewId, name, size, phase, error }))]);
    const uploadable = next.filter(isUploadable);
    if (!uploadable.length) {
      setMessage(`선택 ${next.length}개 · 업로드 완료 0개 · 제외 ${next.length}개. 파일별 형식과 크기를 확인해 주세요.`);
      return;
    }
    void run(uploadable, next.length, next.length - uploadable.length);
  }

  async function uploadOne(row: UploadRow) {
    patch(row.id, { phase: "UPLOADING", error: "" });
    let pendingJobId = row.pendingJobId;
    const file = row.file;
    async function prepare(source: File) {
      const prepared = await preparePdfReviewUpload(row.reviewId, source);
      pendingJobId = prepared.jobId;
      registerPdfReviewJob(prepared.jobId, String(row.reviewId));
      targets.current.set(row.id, prepared.upload);
      if (mounted.current) patch(row.id, { pendingJobId: prepared.jobId });
      return prepared;
    }
    try {
      let uploaded = false;
      let upload: PreparedPdfUpload["upload"] | undefined;
      if (!pendingJobId) {
        if (!file) throw new Error("파일을 다시 선택해 주세요.");
        upload = (await prepare(file)).upload;
      } else {
        // 재시도는 PUT 응답만 유실됐을 수 있으므로 기존 작업의 완료부터 확인한다.
        try { await completePdfUpload(pendingJobId); uploaded = true; }
        catch (cause) {
          if (!(cause instanceof PdfExtractionApiError && cause.status === 409)) throw cause;
          if (!file) throw new Error("업로드된 원본을 찾지 못했습니다. 파일을 다시 선택해 주세요.");
          upload = targets.current.get(row.id);
          if (!upload || Date.parse(upload.expiresAt) <= Date.now()) upload = (await prepare(file)).upload;
        }
      }
      if (!uploaded) {
        const jobId = pendingJobId!;
        try { await putPdf(file!, upload!); }
        catch (cause) {
          // PUT 응답만 유실됐을 수 있으므로 같은 작업의 완료를 확인한다. 원본을 덮어쓰지 않는다.
          try { await completePdfUpload(jobId); uploaded = true; } catch { throw cause; }
        }
        if (!uploaded) await completePdfUpload(jobId);
      }
      void trackPdfStep({ workflow: "producer_pdf", review_id: String(row.reviewId), operation_id: pendingJobId, step: "upload", outcome: "success" }, true);
      targets.current.delete(row.id);
      if (mounted.current) setRows(current => current.filter(item => item.id !== row.id));
      if (mounted.current) setNotices(current => current.map(item => item.id === row.id ? { ...item, phase: "UPLOADED", error: "" } : item));
      if (mounted.current) callbacks.current.onUploaded();
      return true;
    } catch (cause) {
      void trackPdfStep({ workflow: "producer_pdf", review_id: String(row.reviewId), operation_id: pendingJobId, step: "upload", outcome: "failure", error_code: "upload" });
      if (mounted.current && isUnauthorized(cause)) callbacks.current.onUnauthorized();
      if (mounted.current) patch(row.id, { phase: "ERROR", pendingJobId, error: failure(cause) });
      return false;
    }
  }

  async function run(queue: UploadRow[], selectedCount = queue.length, excludedCount = 0) {
    if (running.current || !queue.length) return;
    running.current = true;
    setMessageReviewId(queue[0].reviewId);
    setBusy(true);
    let cursor = 0;
    let uploaded = 0;
    let finished = 0;
    const showProgress = () => {
      if (mounted.current) setMessage(`선택 ${selectedCount}개 · 업로드 완료 ${uploaded}개 · 실패 ${finished - uploaded}개 · 진행/대기 ${queue.length - finished}개 · 제외 ${excludedCount}개`);
    };
    showProgress();
    async function worker() {
      // A component remount must stop UI updates, not silently cancel accepted files.
      // File reads remain bounded to the two active workers.
      while (cursor < queue.length) {
        if (await uploadOne(queue[cursor++])) uploaded += 1;
        finished += 1;
        showProgress();
      }
    }
    const warnBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warnBeforeUnload);
    try { await Promise.all(Array.from({ length: CONCURRENCY }, worker)); }
    finally {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return {
    rows, notices, busy, message, messageReviewId, validationError,
    uploadAll: (reviewId: ReviewKey) => run(rows.filter(row => sameKey(row.reviewId, reviewId) && isUploadable(row))),
    retry: (row: UploadRow) => run([row]),
    choose,
    remove: (id: string) => {
      if (running.current) return;
      targets.current.delete(id);
      setRows(current => current.filter(row => row.id !== id));
      setNotices(current => current.filter(row => row.id !== id));
      const removed = notices.find(row => row.id === id);
      if (removed && sameKey(messageReviewId, removed.reviewId)
        && !notices.some(row => row.id !== id && sameKey(row.reviewId, removed.reviewId))) setMessage("");
    },
    clearUploaded: (reviewId: ReviewKey) => {
      setNotices(current => current.filter(row => !sameKey(row.reviewId, reviewId) || row.phase !== "UPLOADED"));
      if (sameKey(messageReviewId, reviewId)
        && !notices.some(row => sameKey(row.reviewId, reviewId) && row.phase !== "UPLOADED")) setMessage("");
    },
  };
}
