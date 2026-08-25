import { notFound } from "next/navigation";
import { MswProvider } from "@/components/mocks/msw-provider";
import { PublicApplicationWriteRoute } from "@/components/applications/public-application-write-route";
import { isBackendAuditionId } from "@/features/auditions/audition-v1-api";
import { isApplicationWriteRouteKey } from "@/features/applications/routes";
import { publicPostingForServer } from "@/features/applications/public-posting-server";

export default async function PublicApplicationWritePage({ params, searchParams }: {
  params: Promise<{ postingId: string; step: string }>;
  searchParams: Promise<{ prefill?: string; roleId?: string | string[] }>;
}) {
  const { postingId, step } = await params;
  if (!isApplicationWriteRouteKey(step)) notFound();
  const { prefill, roleId } = await searchParams;
  const posting = await publicPostingForServer(postingId);
  const initialRoleIds = Array.isArray(roleId) ? roleId : roleId ? [roleId] : [];
  const useProfilePrefill = prefill === "1" && !isBackendAuditionId(postingId);
  return <MswProvider><PublicApplicationWriteRoute postingId={postingId} initialPosting={posting} initialRoute={step} useProfilePrefill={useProfilePrefill} initialRoleIds={initialRoleIds} /></MswProvider>;
}
