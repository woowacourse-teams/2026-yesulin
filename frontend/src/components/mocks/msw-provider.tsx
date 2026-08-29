"use client";

import { useEffect, useState } from "react";
import { frontendEnvironment } from "@/config/environment";

const mockingEnabled = frontendEnvironment.apiMockingEnabled;

export function MswProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(mockingEnabled ? "loading" : "ready");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!mockingEnabled) {
      void unregisterStaleMockWorkers().catch((error: unknown) => {
        console.error("예술in 목 서비스 워커를 해제하지 못했습니다.", error);
      });
      return;
    }

    let active = true;

    import("@/mocks/browser")
      .then(({ startMockWorker }) => startMockWorker())
      .then(() => {
        if (active) setStatus("ready");
      })
      .catch((error: unknown) => {
        console.error("예술in 목 환경을 시작하지 못했습니다.", error);
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  if (status === "ready") return children;
  if (status === "error") {
    return <AdminMockErrorScreen onRetry={() => { setStatus("loading"); setAttempt((current) => current + 1); }} />;
  }
  return <AdminLoadingScreen />;
}

async function unregisterStaleMockWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations
    .filter((registration) => [registration.active, registration.waiting, registration.installing]
      .some((worker) => worker && new URL(worker.scriptURL).pathname.endsWith("/mockServiceWorker.js")))
    .map((registration) => registration.unregister()));
}

function AdminLoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-6">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl bg-brand" />
        <p className="mt-4 text-sm font-medium text-muted">예술in 데모 환경을 준비하고 있어요.</p>
      </div>
    </main>
  );
}

function AdminMockErrorScreen({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-card bg-fail-bg text-xl font-bold text-fail">!</div>
        <h1 className="mt-5 text-xl font-bold">예술in 데모 환경을 열지 못했어요</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-strong">잠시 후 다시 시도하거나 개발 서버 상태를 확인해 주세요.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 min-h-11 rounded-control bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong active:bg-brand-pressed"
        >
          다시 시도
        </button>
      </div>
    </main>
  );
}
