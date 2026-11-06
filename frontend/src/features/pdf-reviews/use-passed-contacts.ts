import { useEffect, useEffectEvent, useState } from "react";
import { fetchPdfExtraction } from "../pdf-extractions/api";
import { isPendingPdf } from "../pdf-extractions/types";
import { fetchPdfReview, isUnauthorized } from "./api";
import { contactPhone, type ContactPhone } from "./contact-phone";
import { contactEmail, type ContactEmail } from "./contact-email";
import type { ReviewEntry, ReviewKey } from "./types";

type LoadStatus = "LOADING" | "PROCESSING" | "EXTRACTION_FAILED" | "ERROR";
export type PassedContact = {
  readonly entry: ReviewEntry;
  readonly roleName: string;
  readonly contact: ContactPhone | { readonly status: LoadStatus; readonly phone: null };
  readonly email: ContactEmail | { readonly status: LoadStatus; readonly email: null };
};

function emptyContacts(status: LoadStatus) {
  return { contact: { status, phone: null }, email: { status, email: null } };
}

type Result = {
  readonly key: string;
  readonly rows: readonly PassedContact[];
  readonly loading: boolean;
  readonly error: string;
};

/** 합격 여부를 먼저 새로 읽고, 합격한 PDF만 최대 4개씩 조회한다. 본문·이미지는 상태에 보관하지 않는다. */
export function usePassedContacts(reviewId: ReviewKey, onUnauthorized: () => void) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = JSON.stringify([reviewId, attempt]);
  const unauthorized = useEffectEvent(onUnauthorized);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let sessionExpired = false;
    async function load() {
      try {
        const review = await fetchPdfReview(reviewId, signal);
        if (signal.aborted) return;
        const rows: PassedContact[] = review.entries.filter(entry => entry.decision === "PASS").map(entry => ({
          entry,
          roleName: review.roles.find(role => String(role.id) === String(entry.roleId))?.name
            ?? (review.roles.length ? "미기재" : "자유 배역"),
          ...emptyContacts("LOADING"),
        }));
        setResult({ key, rows, loading: rows.length > 0, error: "" });
        let cursor = 0;
        async function worker() {
          while (!signal.aborted && !sessionExpired && cursor < rows.length) {
            const row = rows[cursor++];
            let fields: Pick<PassedContact, "contact" | "email">;
            try {
              const job = await fetchPdfExtraction(row.entry.jobId, true, signal);
              if (signal.aborted || sessionExpired) return;
              if (isPendingPdf(job.status) || job.status === "UPLOADING") fields = emptyContacts("PROCESSING");
              else if (job.status === "FAILED" || job.status === "UPLOAD_EXPIRED") fields = emptyContacts("EXTRACTION_FAILED");
              else {
                const text = job.result?.pages.map(page => page.text).join("\n\n") ?? "";
                fields = { contact: contactPhone(text), email: contactEmail(text) };
              }
            } catch (cause) {
              if (signal.aborted || sessionExpired) return;
              if (isUnauthorized(cause)) {
                sessionExpired = true;
                unauthorized();
                setResult({ key, rows: [], loading: false, error: "로그인이 만료되었습니다. 다시 로그인한 뒤 새로고침해 주세요." });
                controller.abort();
                return;
              }
              fields = emptyContacts("ERROR");
            }
            setResult(current => current?.key === key ? {
              ...current, rows: current.rows.map(item => item.entry.id === row.entry.id ? { ...item, ...fields } : item),
            } : current);
          }
        }
        await Promise.all(Array.from({ length: Math.min(4, rows.length) }, worker));
        if (!signal.aborted) setResult(current => current?.key === key ? { ...current, loading: false } : current);
      } catch (cause) {
        if (signal.aborted) return;
        if (isUnauthorized(cause)) unauthorized();
        setResult({ key, rows: [], loading: false, error: isUnauthorized(cause)
          ? "로그인이 만료되었습니다. 다시 로그인한 뒤 새로고침해 주세요."
          : "합격자 명단을 불러오지 못했습니다. 다시 시도해 주세요." });
      }
    }
    void load();
    return () => controller.abort();
  }, [reviewId, key]);

  return {
    rows: result?.key === key ? result.rows : [],
    loading: result?.key !== key || result.loading,
    error: result?.key === key ? result.error : "",
    refresh: () => setAttempt(value => value + 1),
  };
}
