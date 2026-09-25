import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApplicantReview } from "@/components/auditions/applicant-review";
import { listRouteStateFromRoute, type AuditionListRouteQuery } from "@/features/auditions/filters";
import { isSubmissionId, roleId, submissionId } from "@/features/auditions/types";

export const metadata: Metadata = { title: "OTR 지원자 심사" };

export default async function Page({ params, searchParams }: {
  readonly params: Promise<{ otrAuditionId: string; roleOrder: string; submissionId: string }>;
  readonly searchParams: Promise<AuditionListRouteQuery>;
}) {
  const [{ otrAuditionId, roleOrder, submissionId: targetId }, query] = await Promise.all([params, searchParams]);
  const order = Number(roleOrder);
  if (!Number.isSafeInteger(order) || order < 1 || !isSubmissionId(targetId)) notFound();
  return <ApplicantReview key={`${otrAuditionId}:${roleOrder}:${targetId}`} roleId={roleId(roleOrder)}
    submissionId={submissionId(targetId)} round={1} listState={listRouteStateFromRoute(query)}
    source={{ kind: "OTR", auditionId: otrAuditionId, roleOrder: order }} />;
}
