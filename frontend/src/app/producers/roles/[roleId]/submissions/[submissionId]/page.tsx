import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApplicantReview } from "@/components/auditions/applicant-review";
import { listRouteStateFromRoute } from "@/features/auditions/filters";
import {
  submissionId,
  isSubmissionId,
  roleId,
  ROUND_NUMBERS,
  type RoundNumber,
} from "@/features/auditions/types";

export const metadata: Metadata = {
  title: "지원자 심사",
};

export default async function ApplicantReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ roleId: string; submissionId: string }>;
  searchParams: Promise<{ round?: string; work?: string; status?: string; view?: string }>;
}) {
  const route = await params;
  const query = await searchParams;
  const rawRound = Number(query.round);
  const round = ROUND_NUMBERS.includes(rawRound as RoundNumber)
    ? (rawRound as RoundNumber)
    : 1;
  if (!isSubmissionId(route.submissionId)) notFound();

  return (
    <ApplicantReview
      key={`${route.roleId}:${route.submissionId}:${round}`}
      roleId={roleId(route.roleId)}
      submissionId={submissionId(route.submissionId)}
      round={round}
      listState={listRouteStateFromRoute(query)}
    />
  );
}
