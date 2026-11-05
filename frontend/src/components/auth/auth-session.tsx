"use client";

import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import {
  logout as requestLogout,
  type SessionResponse,
} from "@/features/auth/session-api";
import { frontendEnvironment } from "@/config/environment";
import { clearCommunityDrafts } from "@/features/community/member-draft";
import { SessionSynchronizer } from "@/features/auth/session-synchronizer";

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
  readonly setSession: (session: FrontendAuthSession | null) => void;
  readonly refreshSession: () => Promise<void>;
  readonly completeProducerVerification: (session: SessionResponse) => void;
  readonly logoutSession: (redirectOnUnauthorized?: boolean) => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);
const serverSessionEnabled =
  !frontendEnvironment.apiMockingEnabled
  || frontendEnvironment.producerLoginEnabled
  || frontendEnvironment.socialLoginEnabled;

/** 운영자 세션은 /admin 화면이 따로 다루므로 공개 서비스에서는 비로그인으로 둔다. */
function toFrontendSession(session: SessionResponse | null): FrontendAuthSession | null {
  if (!session || session.role === "ADMIN") return null;
  const account = { credential: `member-${session.memberId}`, role: session.role, displayName: "배우" };
  if (session.role === "PRODUCER") {
    return { ...account, displayName: "기획사/제작사", producerStatus: session.status };
  }
  return account;
}

function verifiedProducerSession(current: FrontendAuthSession | null, verified: SessionResponse) {
  if (current?.role !== "PRODUCER" || current.credential !== `member-${verified.memberId}`) return current;
  if (verified.role !== "PRODUCER" || verified.status !== "ACTIVE") return current;
  return { ...current, producerStatus: verified.status };
}

export function createFrontendCredential() {
  return globalThis.crypto?.randomUUID?.() ?? `mock-${Date.now()}`;
}

function refreshVisibleSession(refresh: () => Promise<void>) {
  if (document.visibilityState === "hidden") return;
  void refresh().catch((cause) => console.error("[로그인 세션 확인 실패]", cause));
}

function subscribeToSessionRefresh(synchronize: () => void) {
  window.addEventListener("focus", synchronize);
  document.addEventListener("visibilitychange", synchronize);
  return () => {
    window.removeEventListener("focus", synchronize);
    document.removeEventListener("visibilitychange", synchronize);
  };
}

export function AuthSessionProvider({ children }: { readonly children: React.ReactNode }) {
  const [session, updateSession] = useState<FrontendAuthSession | null>(null);
  const [sessionReady, setSessionReady] = useState(!serverSessionEnabled);
  const [synchronizer] = useState(() => new SessionSynchronizer(
    (current) => updateSession(toFrontendSession(current)),
    () => setSessionReady(true),
  ));
  const setSession = useCallback((nextSession: FrontendAuthSession | null) => {
    synchronizer.invalidate();
    updateSession(nextSession);
    setSessionReady(true);
  }, [synchronizer]);
  const refreshSession = useCallback(async () => {
    if (!serverSessionEnabled) return;
    await synchronizer.refresh();
  }, [synchronizer]);
  const completeProducerVerification = useCallback((verified: SessionResponse) => {
    synchronizer.invalidate();
    updateSession((current) => verifiedProducerSession(current, verified));
  }, [synchronizer]);
  const logoutSession = useCallback(async (redirectOnUnauthorized = false) => {
    if (serverSessionEnabled) await requestLogout(redirectOnUnauthorized);
    clearCommunityDrafts();
    setSession(null);
  }, [setSession]);

  useEffect(() => {
    if (!serverSessionEnabled) return;

    const synchronize = () => refreshVisibleSession(refreshSession);
    synchronize();
    const unsubscribe = subscribeToSessionRefresh(synchronize);
    return () => {
      synchronizer.invalidate();
      unsubscribe();
    };
  }, [refreshSession, synchronizer]);

  const value = useMemo<AuthSessionContextValue>(() => ({
    session,
    sessionReady,
    serverSessionEnabled,
    setSession,
    refreshSession,
    completeProducerVerification,
    logoutSession,
  }), [completeProducerVerification, logoutSession, refreshSession, session, sessionReady, setSession]);

  return <AuthSessionContext value={value}>{children}</AuthSessionContext>;
}

export function useAuthSession() {
  const context = use(AuthSessionContext);
  if (!context) throw new Error("useAuthSession must be used inside AuthSessionProvider");
  return context;
}
