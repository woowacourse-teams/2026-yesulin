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

export function getV1ScreeningSubmission(
  rawRoleId: string,
  round: RoundNumber,
  targetSubmissionId: SubmissionId,
) {
  return request<ScreeningSubmissionDetailResource>(
    `/v1/audition-roles/${rawRoleId}/screening-rounds/${round}/submissions/${targetSubmissionId}`,
  ).then((resource) => toBoard({ ...resource, submissions: [resource.submission] }));
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
  const displayName = resource.name?.trim() || "이름 미수집";
  return {
    ...resource,
    id: submissionId(resource.id),
    name: displayName,
    roleId: roleId(String(resource.roleId)),
    birth: resource.birth ?? "미수집",
    phone: resource.phone ?? "미수집",
    email: resource.email ?? "미수집",
    address: resource.address ?? "미수집",
    school: resource.school ?? "미수집",
    nationality: resource.nationality ?? "미수집",
    specialty: resource.specialty ?? "미수집",
    hobbies: resource.hobbies ?? "미수집",
    militaryServiceStatus: resource.militaryServiceStatus ?? "미수집",
    coverLetter: resource.coverLetter ?? "미수집",
    photos: resource.photos.map((photo, index) => ({
      ...photo,
      fallbackUrl: fallbackPhoto(displayName, index),
    })),
    reviewHistory,
  };
}

function fallbackPhoto(name: string, index: number) {
  const hue = (Array.from(name).reduce((sum, character) => sum + character.charCodeAt(0), 0) + index * 47) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640"><rect width="100%" height="100%" fill="hsl(${hue} 32% 90%)"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
