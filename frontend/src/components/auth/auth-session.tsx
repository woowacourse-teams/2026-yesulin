"use client";

import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchCurrentSession,
  logout as requestLogout,
  type SessionResponse,
} from "@/features/auth/session-api";
import { frontendEnvironment } from "@/config/environment";

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
  readonly sessionReady: boolean;
  readonly serverSessionEnabled: boolean;
  readonly setSession: (session: FrontendAuthSession) => void;
  readonly logoutSession: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);
const serverSessionEnabled =
  !frontendEnvironment.apiMockingEnabled
  || frontendEnvironment.producerLoginEnabled
  || frontendEnvironment.socialLoginEnabled;

function toFrontendSession(session: SessionResponse): FrontendAuthSession {
  return {
    credential: `member-${session.memberId}`,
    role: session.role,
    displayName: session.role === "APPLICANT" ? "배우" : "기획사/제작사",
    producerStatus: session.role === "PRODUCER" ? session.status : undefined,
  };
}

export function createFrontendCredential() {
  return globalThis.crypto?.randomUUID?.() ?? `mock-${Date.now()}`;
}

export function AuthSessionProvider({ children }: { readonly children: React.ReactNode }) {
  const [session, setSession] = useState<FrontendAuthSession | null>(null);
  const [sessionReady, setSessionReady] = useState(!serverSessionEnabled);
  const logoutSession = useCallback(async () => {
    if (serverSessionEnabled) await requestLogout();
    setSession(null);
  }, []);

  useEffect(() => {
    if (!serverSessionEnabled) return;

    let active = true;
    void fetchCurrentSession()
      .then((currentSession) => {
        if (active && currentSession) setSession(toFrontendSession(currentSession));
      })
      .catch(() => {
        // 서버 세션을 확인할 수 없으면 비로그인 상태를 유지한다.
      })
      .finally(() => {
        if (active) setSessionReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthSessionContextValue>(() => ({
    session,
    sessionReady,
    serverSessionEnabled,
    setSession,
    logoutSession,
  }), [logoutSession, session, sessionReady]);

  return <AuthSessionContext value={value}>{children}</AuthSessionContext>;
}

export function useAuthSession() {
  const context = use(AuthSessionContext);
  if (!context) throw new Error("useAuthSession must be used inside AuthSessionProvider");
  return context;
}
