"use client";

import { createContext, use, useMemo, useState } from "react";

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
  readonly setSession: (session: FrontendAuthSession) => void;
  readonly clearSession: () => void;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function createFrontendCredential() {
  return globalThis.crypto?.randomUUID?.() ?? `mock-${Date.now()}`;
}

export function AuthSessionProvider({ children }: { readonly children: React.ReactNode }) {
  const [session, setSession] = useState<FrontendAuthSession | null>(null);
  const value = useMemo<AuthSessionContextValue>(() => ({
    session,
    setSession,
    clearSession: () => setSession(null),
  }), [session]);

  return <AuthSessionContext value={value}>{children}</AuthSessionContext>;
}

export function useAuthSession() {
  const context = use(AuthSessionContext);
  if (!context) throw new Error("useAuthSession must be used inside AuthSessionProvider");
  return context;
}
