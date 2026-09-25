import { producerRequest } from "./api-client";
import { completeScreening, getAuditionBoard, getAuditionSubmission, saveReview } from "./api";
import type { ScreeningBoardResource, ScreeningCompletionResource, ScreeningSubmissionDetailResource } from "./backend-resources";
import { toScreeningSearchParams, toBoard } from "./screening-v1-api";
import { auditionRoutes } from "./routes";
import type { AuditionListRouteState } from "./filters";
import type { RoleId, RoundNumber, SaveReviewRequest, ScreeningSearchCondition, SubmissionId } from "./types";
import { otrAuditionRoutes } from "@/features/otr-auditions/types";

export type ScreeningSource = { readonly kind: "STANDARD" } | {
  readonly kind: "OTR";
  readonly auditionId: string;
  readonly roleOrder: number;
};

export const standardScreeningSource: ScreeningSource = { kind: "STANDARD" };

function otrBase(source: Extract<ScreeningSource, { kind: "OTR" }>, round: RoundNumber) {
  return `/v1/otr-auditions/${encodeURIComponent(source.auditionId)}/roles/${source.roleOrder}/screening-rounds/${round}`;
}

export function screeningRoleHref(source: ScreeningSource, roleId: RoleId, round: RoundNumber, state?: AuditionListRouteState) {
  return source.kind === "OTR" ? otrAuditionRoutes.role(source.auditionId, source.roleOrder, round, state)
    : auditionRoutes.role(roleId, round, state);
}

export function screeningApplicantHref(source: ScreeningSource, roleId: RoleId, submissionId: SubmissionId,
  round: RoundNumber, state?: AuditionListRouteState) {
  return source.kind === "OTR"
    ? otrAuditionRoutes.applicantReview(source.auditionId, source.roleOrder, submissionId, round, state)
    : auditionRoutes.applicantReview(roleId, submissionId, round, state);
}

export function getScreeningBoard(source: ScreeningSource, roleId: RoleId, round: RoundNumber | null,
  condition: ScreeningSearchCondition = {}) {
  if (source.kind === "STANDARD") return getAuditionBoard(roleId, round, condition);
  const query = toScreeningSearchParams(condition).toString();
  return producerRequest<ScreeningBoardResource>(`${otrBase(source, round ?? 1)}/submissions${query ? `?${query}` : ""}`)
    .then(toBoard);
}

export function getScreeningSubmission(source: ScreeningSource, roleId: RoleId,
  round: RoundNumber, submissionId: SubmissionId) {
  if (source.kind === "STANDARD") return getAuditionSubmission(roleId, round, submissionId);
  return producerRequest<ScreeningSubmissionDetailResource>(
    `${otrBase(source, round)}/submissions/${encodeURIComponent(submissionId)}`,
  ).then((resource) => toBoard({ ...resource, submissions: [resource.submission] }));
}

export async function saveScreeningReview(source: ScreeningSource, body: SaveReviewRequest,
  condition: ScreeningSearchCondition = {}) {
  if (source.kind === "STANDARD") return saveReview(body, condition);
  const { roleId, round, ...review } = body;
  await producerRequest<unknown>(`${otrBase(source, round)}/reviews`, {
    method: "PATCH",
    body: JSON.stringify(review),
  });
  return getScreeningBoard(source, roleId, round, condition);
}

export async function completeSourceScreening(source: ScreeningSource, roleId: RoleId, round: RoundNumber,
  condition: ScreeningSearchCondition = {}) {
  if (source.kind === "STANDARD") return completeScreening({ roleId }, round, condition);
  const completion = await producerRequest<ScreeningCompletionResource>(`${otrBase(source, round)}/completion`, {
    method: "PATCH",
  });
  return { completion, board: await getScreeningBoard(source, roleId, round, condition) };
}
