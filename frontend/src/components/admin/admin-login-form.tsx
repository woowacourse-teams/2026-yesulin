"use client";

import { useState } from "react";
import { login, logout } from "@/features/auth/session-api";

type Props = {
  readonly onSuccess: () => void;
};

export function AdminLoginForm({ onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const session = await login(email, password);
      if (session.role !== "ADMIN") {
        // 운영자가 아닌 계정이 이 화면에서 로그인 상태로 남지 않게 곧바로 세션을 지운다.
        await logout().catch(() => null);
        setError("운영자 계정이 아닙니다.");
        return;
      }
      onSuccess();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "로그인하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">운영 대시보드</h1>
        <p className="mt-1 text-sm text-neutral-500">운영자 계정으로만 접근할 수 있습니다.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          이메일
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          비밀번호
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none"
          />
        </label>
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "확인하는 중" : "로그인"}
        </button>
      </form>
    </main>
  );
}
