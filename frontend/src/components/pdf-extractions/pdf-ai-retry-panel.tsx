"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { fetchCurrentSession, type SessionResponse } from "@/features/auth/session-api";
import { PdfExtractionApiError, retryPdfAnalysis } from "@/features/pdf-extractions/api";

export function PdfAiRetryPanel() {
  const search = useSearchParams();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const submitting = useRef(false);
  const jobId = search.get("jobId") ?? "";
  const failedAttempts = Number(search.get("failedAttempts"));
  const failedAt = Number(search.get("failedAt"));
  const generation = Number(search.get("generation"));
  const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)
    && search.has("failedAt") && search.has("generation")
    && Number.isInteger(failedAttempts) && failedAttempts >= 1 && failedAttempts <= 5
    && Number.isSafeInteger(failedAt) && failedAt >= 0
    && Number.isSafeInteger(generation) && generation >= 0;
  const authorized = session?.status === "ACTIVE" && (session.role === "PRODUCER" || session.role === "ADMIN");

  useEffect(() => {
    let active = true;
    fetchCurrentSession().then(current => { if (active) setSession(current); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "로그인을 확인하지 못했습니다."); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [refresh]);

  async function submit() {
    if (!valid || !authorized || submitting.current || message) return;
    submitting.current = true;
    setBusy(true); setError("");
    try {
      const result = await retryPdfAnalysis(jobId, { failedAttempts, failedAt, generation });
      setMessage(result.message);
    } catch (cause) {
      if (cause instanceof PdfExtractionApiError && cause.status === 401) setSession(null);
      setError(cause instanceof Error ? cause.message : "재분석을 요청하지 못했습니다.");
    }
    finally { submitting.current = false; setBusy(false); }
  }

  return <main className="mx-auto w-full max-w-xl px-4 py-10">
    <section className="rounded-card border border-border bg-card p-6">
      <h1 className="text-xl font-bold">지원자 재분석</h1>
      <p className="mt-3 text-sm leading-6 text-muted-strong">실패한 지원자 분석을 다시 요청합니다. 저장된 배역·메모·판정은 유지됩니다.</p>
      {!valid ? <p role="alert" className="mt-4 text-sm text-fail">재분석 링크가 올바르지 않습니다. Slack의 최신 알림을 확인해 주세요.</p>
        : !ready ? <p role="status" className="mt-4 text-sm">로그인 상태를 확인하고 있습니다…</p>
          : !authorized ? <div className="mt-4 space-y-3 text-sm">
            <p>새 탭에서 지원서를 올린 공연사 또는 운영자 계정으로 로그인한 뒤, 이 화면에서 로그인을 다시 확인해 주세요.</p>
            <div className="flex flex-wrap gap-4">
              <a className="inline-flex min-h-11 items-center font-semibold text-brand" href="/login" target="_blank" rel="noreferrer">공연사 로그인 (새 탭)</a>
              <a className="inline-flex min-h-11 items-center font-semibold text-brand" href="/admin" target="_blank" rel="noreferrer">운영자 로그인</a>
            </div>
            <p className="text-xs text-muted">공연사 로그인 화면에서 기획사/제작사를 선택해 주세요.</p>
            <SecondaryButton onClick={() => { setReady(false); setError(""); setRefresh(value => value + 1); }}>로그인 다시 확인</SecondaryButton>
          </div>
            : <div className="mt-6">
              <PrimaryButton onClick={() => void submit()} disabled={busy || !!message}>{busy ? "요청 중…" : message ? "요청 접수됨" : "재분석 실행"}</PrimaryButton>
              <p className="mt-3 text-xs text-muted">버튼을 누르면 재분석 대기열에 등록됩니다.</p>
            </div>}
      {message && <p role="status" className="mt-4 text-sm text-pass">{message} 심사 화면에서 진행 상황을 확인해 주세요.</p>}
      {error && <p role="alert" className="mt-4 text-sm text-fail">{error}</p>}
    </section>
  </main>;
}
