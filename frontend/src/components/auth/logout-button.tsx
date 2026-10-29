"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "./auth-session";
import { SessionApiError } from "@/features/auth/session-api";

export function LogoutButton({ className = "" }: { readonly className?: string }) {
  const router = useRouter();
  const { logoutSession } = useAuthSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function logout() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    try {
      await logoutSession();
      router.replace("/");
    } catch (cause) {
      setError(cause instanceof SessionApiError
        ? cause.message
        : "로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="relative inline-flex">
      <button type="button" disabled={pending} onClick={() => void logout()} className={`disabled:cursor-wait disabled:opacity-60 ${className}`}>
        {pending ? "로그아웃 중..." : "로그아웃"}
      </button>
      {error ? <span role="alert" className="absolute right-0 top-full z-50 mt-2 w-64 whitespace-normal rounded-control border border-fail/30 bg-card p-3 text-left text-sm font-medium text-fail shadow-[var(--shadow-2)]">{error}</span> : null}
    </span>
  );
}
