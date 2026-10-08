"use client";

import { useCallback, useEffect, useState } from "react";
import { ToastProvider } from "@/components/auditions/toast";
import { ProducerShowDetail } from "@/components/shows/manage/producer-show-detail";
import { ShowManagementApiProvider } from "@/components/shows/manage/show-management-api-context";
import { adminShowManagementApi } from "@/features/admin/show-api";
import { fetchCurrentSession } from "@/features/auth/session-api";
import { AdminSessionEnded } from "./admin-session-ended";
import { AdminShell } from "./admin-shell";

type Phase = "checking" | "unauthorized" | "ready";

/** 운영자가 직접 등록한 외부 링크 공연 한 건을 기획사 관리 화면과 같은 화면으로 관리한다. */
export function AdminShowManagement({ showId }: { readonly showId: string }) {
  const [phase, setPhase] = useState<Phase>("checking");

  const check = useCallback(() => {
    fetchCurrentSession()
      .then((session) => setPhase(session?.role === "ADMIN" ? "ready" : "unauthorized"))
      .catch(() => setPhase("unauthorized"));
  }, []);

  useEffect(check, [check]);

  if (phase === "unauthorized") return <AdminSessionEnded />;
  return (
    <AdminShell current="shows" title="외부 링크 공연 관리">
      {phase === "ready" ? (
        <ToastProvider>
          <ShowManagementApiProvider api={adminShowManagementApi}>
            <ProducerShowDetail showId={showId} />
          </ShowManagementApiProvider>
        </ToastProvider>
      ) : (
        <p className="text-sm text-muted" role="status">로그인 상태를 확인하는 중이에요.</p>
      )}
    </AdminShell>
  );
}
