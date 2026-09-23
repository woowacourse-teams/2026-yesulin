"use client";

import { useEffect, useMemo, useState } from "react";
import { PublicApplicationForm } from "@/components/applications/public-application-form";
import { useAuthSession } from "@/components/auth/auth-session";
import { postingId } from "@/features/auditions/types";
import type { ApplicationWriteRouteKey } from "@/features/applications/application-form";
import { otrApplicationFields } from "@/features/otr-auditions/application-form";
import { getPublicOtrAudition } from "@/features/otr-auditions/submission-api";
import { otrAuditionLink, type PublicOtrAudition } from "@/features/otr-auditions/types";

export function OtrApplicationPage({ auditionId, initialRoute }: {
  readonly auditionId: string;
  readonly initialRoute: ApplicationWriteRouteKey;
}) {
  const { session, sessionReady, serverSessionEnabled } = useAuthSession();
  const [audition, setAudition] = useState<PublicOtrAudition | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const fields = useMemo(() => audition ? otrApplicationFields(audition.roles) : [], [audition]);

  useEffect(() => {
    let active = true;
    void getPublicOtrAudition(auditionId).then((value) => {
      if (active) setAudition(value);
    }).catch((cause) => {
      if (active) setLoadError(cause instanceof Error ? cause.message : "OTR 공고를 불러오지 못했습니다.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [auditionId]);

  if (loading) return <OtrApplicationState message="공고를 불러오는 중…" />;
  if (loadError) return <OtrApplicationState message={loadError} error />;
  if (!audition) return <OtrApplicationState message="OTR 공고를 찾을 수 없습니다." error />;
  if (!audition.open) {
    return <OtrApplicationState
      title="지원이 마감되었습니다"
      message={`OTR 마감일 ${audition.deadline.replaceAll("-", ".")}이 지나 더 이상 지원할 수 없습니다.`}
    />;
  }

  return <PublicApplicationForm
    applicationType="OTR"
    postingId={postingId(audition.id)}
    postingSnapshotVersion={audition.postingSnapshotVersion}
    fields={fields}
    performanceTitle={`OTR #${audition.otrId}`}
    postingTitle={audition.title}
    companyName={audition.producerName}
    roleIds={[]}
    roleName=""
    authenticated={session?.role === "APPLICANT"}
    authChecking={serverSessionEnabled && !sessionReady}
    initialRoute={initialRoute}
    onBack={() => window.location.assign(otrAuditionLink(audition.otrId))}
  />;
}

function OtrApplicationState({ title, message, error = false }: {
  readonly title?: string;
  readonly message: string;
  readonly error?: boolean;
}) {
  return <main className="grid min-h-screen place-items-center bg-surface px-5 text-foreground">
    <section role={error ? "alert" : "status"} className={`w-full max-w-lg rounded-modal border bg-card px-6 py-12 text-center ${error ? "border-fail/25" : "border-border"}`}>
      <p className={`text-sm font-semibold ${error ? "text-fail" : "text-brand"}`}>OTR 협업 지원</p>
      {title ? <h1 className="mt-3 text-2xl font-bold">{title}</h1> : null}
      <p className="mt-3 text-sm leading-6 text-muted-strong">{message}</p>
    </section>
  </main>;
}
