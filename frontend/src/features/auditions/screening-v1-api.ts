import { request } from "./api-client";
import type {
  ScreeningBoardResource,
  ScreeningSubmissionDetailResource,
  ScreeningSubmissionResource,
} from "./backend-resources";
import {
  performanceId,
  postingId,
  roleId,
  submissionId,
  type Applicant,
  type AuditionBoardResponse,
  type Review,
  type RoundNumber,
  type SubmissionId,
} from "./types";

const BACKEND_ROLE_ID_PATTERN = /^[1-9]\d*$/;
const EMPTY_HISTORY: Applicant["reviewHistory"] = { 1: null, 2: null, 3: null, 4: null, 5: null };

export const isBackendRoleId = (value: string) => BACKEND_ROLE_ID_PATTERN.test(value);

export function getV1ScreeningBoard(rawRoleId: string, round: RoundNumber) {
  return request<ScreeningBoardResource>(
    `/v1/audition-roles/${rawRoleId}/screening-rounds/${round}/submissions`,
  ).then(toBoard);
}

export async function getV1ScreeningSubmission(
  rawRoleId: string,
  round: RoundNumber,
  targetSubmissionId: SubmissionId,
) {
  const [board, detail] = await Promise.all([
    getV1ScreeningBoard(rawRoleId, round),
    request<ScreeningSubmissionDetailResource>(
      `/v1/audition-roles/${rawRoleId}/screening-rounds/${round}/submissions/${targetSubmissionId}`,
    ),
  ]);
  const submission = toApplicant(detail.submission);
  return {
    ...board,
    applicants: board.applicants.map((candidate) => candidate.id === submission.id ? submission : candidate),
  };
}

function toBoard(resource: ScreeningBoardResource): AuditionBoardResponse {
  return {
    performance: {
      id: performanceId(String(resource.performance.id)),
      posterUrl: resource.performance.posterUrl,
      title: resource.performance.title,
    },
    posting: {
      id: postingId(resource.posting.id),
      title: resource.posting.title,
      isOpenCall: resource.posting.openCall,
    },
    role: {
      ...resource.role,
      id: roleId(String(resource.role.id)),
      postingId: postingId(resource.role.postingId),
      activeRound: resource.role.activeRound as RoundNumber,
    },
    round: resource.round as RoundNumber,
    rounds: resource.rounds.map((state) => ({ ...state, round: state.round as RoundNumber })),
    applicants: resource.submissions.map(toApplicant),
  };
}

function toApplicant(resource: ScreeningSubmissionResource): Applicant {
  const reviewHistory = { ...EMPTY_HISTORY } as Record<RoundNumber, Review | null>;
  for (const [rawRound, review] of Object.entries(resource.reviewHistory)) {
    const round = Number(rawRound);
    if (round >= 1 && round <= 5) reviewHistory[round as RoundNumber] = review;
  }
  return {
    ...resource,
    id: submissionId(resource.id),
    roleId: roleId(String(resource.roleId)),
    photos: resource.photos.map((photo, index) => ({
      ...photo,
      fallbackUrl: fallbackPhoto(resource.name, index),
    })),
    reviewHistory,
  };
}

function fallbackPhoto(name: string, index: number) {
  const hue = (Array.from(name).reduce((sum, character) => sum + character.charCodeAt(0), 0) + index * 47) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640"><rect width="100%" height="100%" fill="hsl(${hue} 32% 90%)"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
