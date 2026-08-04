"use client";

import { useEffect, useState } from "react";

const mockingDisabled = process.env.NEXT_PUBLIC_API_MOCKING === "disabled";

export function MswProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(mockingDisabled);

  useEffect(() => {
    if (mockingDisabled) return;

    let active = true;

    import("@/mocks/browser")
      .then(({ worker }) => worker.start({ onUnhandledRequest: "bypass" }))
      .then(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  return ready ? children : <AdminLoadingScreen />;
}

function AdminLoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-6">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl bg-brand" />
        <p className="mt-4 text-sm font-medium text-muted">공연 관리 환경을 준비하고 있어요.</p>
      </div>
    </main>
  );
}
