import type {
  Applicant,
  MismatchReason,
  PerformanceRef,
  PerformanceSummary,
  PostingRef,
  PostingListResponse,
  PostingSummary,
  Review,
  RoleSummary,
  RoundNumber,
  AuditionTree,
} from "@/features/auditions/types";
import { ROUND_NUMBERS } from "@/features/auditions/types";
import type { MockApplicant } from "./applicants";
import type { CatalogPerformance, CatalogPosting, CatalogRole } from "./catalog";
import { CATALOG } from "./catalog";
import {
  activeRound,
  allApplicants,
  allRoundsClosed,
  applicantsOfRole,
  poolFor,
  readReview,
} from "./store";
import {
  countsFor,
  pendingCountOf,
  postingAllRoundsClosed,
  postingPhase,
  postingProgress,
  progressOf,
} from "./aggregate";

const PREVIEW_PHOTO_COUNT = 5;

const previewPhotos = (list: readonly MockApplicant[]) =>
  list.slice(0, PREVIEW_PHOTO_COUNT).map((applicant) => applicant.photos[0]?.url ?? "");

const applicantsOfPosting = (posting: CatalogPosting) =>
  allApplicants().filter((applicant) => applicant.postingId === posting.id);

export const toPerformanceRef = (performance: CatalogPerformance): PerformanceRef => ({
  id: performance.id,
  posterUrl: performance.posterUrl,
  title: performance.title,
});

export const toPostingRef = (posting: CatalogPosting): PostingRef => ({
  id: posting.id,
  title: posting.title,
  isOpenCall: posting.isOpenCall,
});

export function toPerformanceSummary(performance: CatalogPerformance): PerformanceSummary {
  const applicants = allApplicants().filter((applicant) => applicant.performanceId === performance.id);

  return {
    id: performance.id,
    posterUrl: performance.posterUrl,
    title: performance.title,
    venue: performance.venue,
    venueAddress: performance.venueAddress,
    postingCount: performance.postings.length,
    openPostingCount: performance.postings.filter((posting) => posting.status === "OPEN").length,
    applicantCount: applicants.length,
    pendingReviewCount: performance.postings.reduce((sum, posting) => sum + pendingCountOf(posting), 0),
    postings: performance.postings.map(toPostingSummary),
  };
}

export function toPostingSummary(posting: CatalogPosting): PostingSummary {
  const applicants = applicantsOfPosting(posting);

  return {
    id: posting.id,
    performanceId: posting.performanceId,
    title: posting.title,
    deadline: posting.deadline,
    phase: postingPhase(posting),
    isOpenCall: posting.isOpenCall,
    roleCount: posting.roles.length,
    quotaTotal: posting.roles.reduce((sum, role) => sum + role.quota, 0),
    applicantCount: applicants.length,
    pendingReviewCount: pendingCountOf(posting),
    allRoundsClosed: postingAllRoundsClosed(posting),
    progress: postingProgress(posting),
    previewPhotoUrls: previewPhotos(applicants),
  };
}

export function toPostingListResponse(
  performance: CatalogPerformance,
): PostingListResponse {
  return {
    performance: toPerformanceRef(performance),
    roleTemplates: performance.roleTemplates,
    postings: performance.postings.map(toPostingSummary),
  };
}

export function toRoleSummary(role: CatalogRole, posting: CatalogPosting): RoleSummary {
  const round = activeRound(role.id);
  const counts = countsFor(role.id, round);

  return {
    id: role.id,
    postingId: posting.id,
    name: role.name,
    description: role.description,
    quota: role.quota,
    gender: role.gender,
    ageMin: role.ageMin,
    ageMax: role.ageMax,
    applicantCount: applicantsOfRole(role.id).length,
    activeRound: round,
    allRoundsClosed: allRoundsClosed(role.id),
    progress: progressOf(counts),
    counts,
  };
}

/** 배역이 명시한 성별·나이 조건을 벗어난 배우인지 판정한다. */
function mismatchReasons(applicant: MockApplicant, role: CatalogRole): readonly MismatchReason[] {
  const reasons: MismatchReason[] = [];
  if (role.gender !== "ANY" && applicant.gender !== role.gender) reasons.push("GENDER");
  if (applicant.age < role.ageMin || applicant.age > role.ageMax) reasons.push("AGE");
  return reasons;
}

/** 아직 대상이 아니었던 차수는 null로 남겨 '해당 없음'으로 표시되게 한다. */
function reviewHistoryOf(applicant: MockApplicant, role: CatalogRole) {
  const history: Record<RoundNumber, Review | null> = { 1: null, 2: null, 3: null, 4: null, 5: null };

  for (const round of ROUND_NUMBERS) {
    const inPool = poolFor(role.id, round).some((candidate) => candidate.id === applicant.id);
    history[round] = inPool ? readReview(applicant.id, role.id, round) : null;
  }

  return history;
}

/** 지원서 응답. 상위 식별자는 배역 응답이 이미 갖고 있어 중복해 싣지 않는다. */
export function toApplicant(applicant: MockApplicant, role: CatalogRole, round: RoundNumber): Applicant {
  return {
    id: applicant.id,
    name: applicant.name,
    gender: applicant.gender,
    age: applicant.age,
    height: applicant.height,
    weight: applicant.weight,
    roleId: role.id,
    roleName: role.name,
    birth: applicant.birth,
    phone: applicant.phone,
    email: applicant.email,
    school: applicant.school,
    submittedAt: applicant.submittedAt,
    career: applicant.career,
    coverLetter: applicant.coverLetter,
    questions: applicant.motivation ? [{ question: "이 작품에 지원한 동기를 적어 주세요.", answer: applicant.motivation }] : [],
    address: "",
    links: [],
    nationality: "",
    specialty: "",
    hobbies: "",
    militaryServiceStatus: "",
    photos: applicant.photos,
    videos: applicant.videos,
    review: readReview(applicant.id, role.id, round),
    reviewHistory: reviewHistoryOf(applicant, role),
    mismatchReasons: mismatchReasons(applicant, role),
  };
}

export function toAuditionTree(): AuditionTree {
  return {
    performances: CATALOG.map((performance) => ({
      id: performance.id,
      posterUrl: performance.posterUrl,
      title: performance.title,
      postings: performance.postings.map((posting) => ({
        id: posting.id,
        title: posting.title,
        phase: postingPhase(posting),
        applicantCount: applicantsOfPosting(posting).length,
        roleIds: posting.roles.map((role) => role.id),
      })),
    })),
  };
}
