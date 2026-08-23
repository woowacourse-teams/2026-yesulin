"use client";

import { createContext, use, useEffect, useMemo, useState } from "react";
import { fetchCurrentSession } from "@/features/auth/session-api";

export type SocialProvider = "kakao" | "naver" | "google";
export type ProducerAccountStatus = "PENDING" | "ACTIVE";

export type FrontendAuthSession = {
  readonly credential: string;
  readonly role: "APPLICANT" | "PRODUCER";
  readonly displayName: string;
  readonly socialProvider?: SocialProvider;
  readonly producerStatus?: ProducerAccountStatus;
};

type AuthSessionContextValue = {
  readonly session: FrontendAuthSession | null;
  readonly restoring: boolean;
  readonly setSession: (session: FrontendAuthSession) => void;
  readonly clearSession: () => void;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function createFrontendCredential() {
  return globalThis.crypto?.randomUUID?.() ?? `mock-${Date.now()}`;
}

export function AuthSessionProvider({ children }: { readonly children: React.ReactNode }) {
  const [session, setSession] = useState<FrontendAuthSession | null>(null);
  const [restoring, setRestoring] = useState(true);

  // 새로고침해도 서버 세션이 살아 있으면 화면 상태를 복원한다.
  useEffect(() => {
    let cancelled = false;
    fetchCurrentSession()
      .then((current) => {
        if (cancelled || !current) return;
        setSession({
          credential: createFrontendCredential(),
          role: current.role,
          displayName: current.role === "PRODUCER" ? "기획사/제작사" : "배우",
          producerStatus: current.role === "PRODUCER" ? current.status : undefined,
        });
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthSessionContextValue>(() => ({
    session,
    restoring,
    setSession,
    clearSession: () => setSession(null),
  }), [session, restoring]);

  return <AuthSessionContext value={value}>{children}</AuthSessionContext>;
}

export function useAuthSession() {
  const context = use(AuthSessionContext);
  if (!context) throw new Error("useAuthSession must be used inside AuthSessionProvider");
  return context;
}
