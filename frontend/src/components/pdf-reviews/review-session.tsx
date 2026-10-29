"use client";

import { useState } from "react";
import { useAuthSession } from "@/components/auth/auth-session";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { login } from "@/features/auth/session-api";

function LocalLoginButton({ label, tone, onLoggedIn }: {
  readonly label: string;
  readonly tone: "primary" | "secondary";
  readonly onLoggedIn?: () => void;
}) {
  const { setSession } = useAuthSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function start() {
    setLoading(true); setError("");
    try {
      const current = await login("pdf-local@example.test", "PdfLocal123!");
      setSession({ credential: `member-${current.memberId}`, role: "PRODUCER", displayName: "로컬 공연사", producerStatus: "ACTIVE" });
      onLoggedIn?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "로그인하지 못했습니다."); }
    finally { setLoading(false); }
  }
  const Button = tone === "primary" ? PrimaryButton : SecondaryButton;
  return <>
    <Button onClick={() => void start()} disabled={loading} className="min-h-12 px-5">{loading ? "로그인 중…" : label}</Button>
    {error ? <p role="alert" className="mt-3 w-full break-words text-sm text-fail">{error}</p> : null}
  </>;
}

export function ReviewLoginGate({ local, ready }: { readonly local: boolean; readonly ready: boolean }) {
  return <section aria-label="로그인" className="mt-6 rounded-card border border-border bg-card p-6">
    <h2 className="font-bold">공연사 로그인이 필요합니다</h2>
    <p className="mt-2 text-sm text-muted-strong">본인이 만든 심사와 올린 지원서만 확인할 수 있습니다.</p>
    <div className="mt-5 flex flex-wrap items-center gap-3">
      {!ready ? <p role="status" className="text-sm text-muted-strong">로그인 상태를 확인하고 있습니다…</p>
        : local ? <LocalLoginButton label="로컬 테스트 계정으로 시작" tone="primary" />
          : <a href="/login" className="inline-flex min-h-12 items-center font-semibold text-brand">로그인으로 이동</a>}
    </div>
  </section>;
}

/** 세션이 끊겨도 화면 상태와 고른 파일은 그대로 두고, 다시 로그인한 뒤 이어서 진행하게 한다. */
export function SessionExpiredNotice({ local, onRecheck }: { readonly local: boolean; readonly onRecheck: () => void }) {
  return <div role="alert" className="mt-5 flex flex-wrap items-center gap-3 rounded-control border border-fail/30 bg-fail-bg p-4 text-sm text-fail">
    <p className="min-w-0 flex-1 basis-64">로그인이 만료되었습니다. 이 화면을 닫거나 새로고침하지 말고 다시 로그인해 주세요. 고른 파일은 그대로 남아 있습니다.</p>
    {local ? <LocalLoginButton label="로컬 계정 다시 로그인" tone="secondary" onLoggedIn={onRecheck} /> : <>
      <a href="/login" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-semibold text-brand">새 창에서 로그인</a>
      <SecondaryButton onClick={onRecheck}>로그인했습니다. 다시 확인</SecondaryButton>
    </>}
  </div>;
}
