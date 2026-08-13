"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentSession } from "@/features/auth/api";

export function SessionGuard({
  role,
  children,
}: {
  readonly role: "applicant" | "producer";
  readonly children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("로그인 상태를 확인하고 있어요.");

  useEffect(() => {
    let active = true;
    getCurrentSession()
      .then((session) => {
        if (!active) return;
        if (!session.authenticated) {
          router.replace(`/login?role=${role}`);
          return;
        }
        if (role === "producer" && session.activeCompanyId === null) {
          setMessage("활성 공연사를 선택해야 합니다.");
          return;
        }
        setReady(true);
      })
      .catch(() => {
        if (active) router.replace(`/login?role=${role}`);
      });
    return () => {
      active = false;
    };
  }, [role, router]);

  if (ready) return children;
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-6">
      <p className="text-sm font-medium text-muted">{message}</p>
    </main>
  );
}
