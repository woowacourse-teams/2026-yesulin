"use client";

import { useState, type FormEvent } from "react";
import { login, logout } from "@/features/auth/session-api";

export function LocalActorLogin({ returnTo }: { readonly returnTo?: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setBusy(true);
    setError("");
    try {
      await authenticateLocalActor(password);
      window.location.assign(returnTo ?? "/community");
    } catch (cause) {
      let message = "로그인하지 못했어요.";
      if (cause instanceof Error) message = cause.message;
      setError(message);
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="space-y-2 border-t border-border pt-4">
    <label className="block text-sm font-semibold" htmlFor="local-actor-password">테스트 배우 비밀번호</label>
    <input id="local-actor-password" name="password" type="password" required autoComplete="off"
      className="min-h-11 w-full rounded-control border border-border px-3" />
    <button disabled={busy} className="min-h-11 w-full rounded-control bg-brand-soft font-semibold text-brand">테스트 배우로 로그인</button>
    {error && <p role="alert" className="text-sm text-fail">{error}</p>}
  </form>;
}

async function authenticateLocalActor(password: string) {
  const session = await login("community-actor@local.invalid", password);
  if (session.role === "APPLICANT" && session.status === "ACTIVE") return;
  await logout();
  throw new Error("활성 회원 계정을 확인해 주세요.");
}
