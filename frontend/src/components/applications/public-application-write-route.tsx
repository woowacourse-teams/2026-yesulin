"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/auth-session";
import { getPublicPosting } from "@/features/applicants/api";
import type { PublicPosting } from "@/features/applications/public-posting";
import type { ApplicationWriteRouteKey } from "@/features/applications/application-form";
import { PublicApplicationForm } from "./public-application-form";
import { PublicApplicationPrefillGate } from "./public-application-prefill";
import { PublicPostingUnavailable } from "./public-posting-status";

export function PublicApplicationWriteRoute({ postingId, initialPosting, initialRoute, useProfilePrefill, initialRoleIds }: {
  readonly postingId: string;
  readonly initialPosting: PublicPosting | null;
  readonly initialRoute: ApplicationWriteRouteKey;
  readonly useProfilePrefill: boolean;
  readonly initialRoleIds: readonly string[];
}) {
  const router = useRouter();
  const { session } = useAuthSession();
  const [posting, setPosting] = useState(initialPosting);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (initialPosting) return;
    let active = true;
    getPublicPosting(postingId).then((next) => { if (active) setPosting(next); }).catch((cause) => { if (active) { console.error("[지원서 작성용 공고 조회 실패]", cause); setMissing(true); } });
    return () => { active = false; };
  }, [initialPosting, postingId]);

  if (missing) return <PublicPostingUnavailable />;
  if (!posting) return <WriteLoading />;

  const validRoleIds = initialRoleIds.filter((id) => posting.roles.some((role) => role.id === id));
  const roleIds = validRoleIds.length ? validRoleIds : (posting.isOpenCall || posting.roles.length === 1) && posting.roles[0] ? [posting.roles[0].id] : [];
  if (roleIds.length === 0) return <RoleSelectionRedirect postingId={postingId} />;
  const props = {
    postingId: posting.id,
    fields: posting.applicationFields,
    performanceTitle: posting.performanceTitle,
    postingTitle: posting.title,
    roleIds,
    roleName: posting.roles.filter((role) => roleIds.includes(role.id)).map((role) => role.name).join(" · ") || "전체 배우",
    authenticated: session?.role === "APPLICANT",
    initialRoute,
    onBack: () => router.push(`/apply/${encodeURIComponent(posting.id)}`),
  };
  return useProfilePrefill ? <PublicApplicationPrefillGate {...props} /> : <PublicApplicationForm {...props} />;
}

function RoleSelectionRedirect({ postingId }: { readonly postingId: string }) {
  const router = useRouter();
  useEffect(() => { router.replace(`/apply/${encodeURIComponent(postingId)}`); }, [postingId, router]);
  return <WriteLoading />;
}

function WriteLoading() {
  return <main className="grid min-h-screen place-items-center bg-surface px-5"><p role="status" className="text-sm font-semibold text-muted-strong">지원서를 불러오고 있어요.</p></main>;
}
