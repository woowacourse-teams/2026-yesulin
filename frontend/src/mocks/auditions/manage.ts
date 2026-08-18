import type { PostingManagementDetail, UpdatePerformanceRequest, UpdatePostingRequest } from "@/features/auditions/management-types";
import type { PerformanceId, PostingId } from "@/features/auditions/types";
import { findPerformance, findPosting } from "./aggregate";
import { CATALOG } from "./catalog";
import type { CatalogPerformance, CatalogPosting } from "./catalog-model";
import { allApplicants } from "./store";

const compactDate = (value: string) => value.slice(0, 10).replaceAll("-", ".");

export function updateCatalogPerformance(id: PerformanceId, body: UpdatePerformanceRequest) {
  const index = CATALOG.findIndex((performance) => performance.id === id);
  const current = CATALOG[index];
  if (!current) return null;
  const updated: CatalogPerformance = {
    ...current,
    title: body.title?.trim() ?? current.title,
    venue: body.venue?.trim() ?? current.venue,
    venueAddress: body.venueAddress ?? current.venueAddress,
    posterUrl: body.posterUrl ?? current.posterUrl,
    roleTemplates: body.roleTemplates?.map((role, roleIndex) => ({ ...role, id: role.id ?? `${id}_template_${roleIndex + 1}` })) ?? current.roleTemplates,
  };
  CATALOG.splice(index, 1, updated);
  return updated;
}

export function removeCatalogPerformance(id: PerformanceId) {
  const index = CATALOG.findIndex((performance) => performance.id === id);
  if (index < 0) return false;
  CATALOG.splice(index, 1);
  return true;
}

export function postingManagementDetail(id: PostingId): PostingManagementDetail | null {
  const posting = findPosting(id);
  if (!posting) return null;
  const performance = findPerformance(posting.performanceId);
  if (!performance) return null;
  return {
    id: posting.id,
    performanceId: performance.id,
    performanceTitle: performance.title,
    posterUrl: posting.posterUrl,
    detailImageUrl: posting.detailImageUrl ?? "",
    title: posting.title,
    isOpenCall: posting.isOpenCall,
    allowsMultipleRoles: posting.allowsMultipleRoles,
    recruitmentStart: posting.recruitmentStart ?? "",
    recruitmentEnd: posting.recruitmentEnd ?? "",
    performanceStart: posting.performanceStart,
    performanceEnd: posting.performanceEnd,
    phase: posting.finished ? "FINISHED" : posting.status === "CLOSED" ? "RECRUIT_CLOSED" : posting.status,
    applicantCount: allApplicants().filter((applicant) => applicant.postingId === posting.id).length,
    roleTemplates: performance.roleTemplates,
    roles: posting.roles.map((role) => ({
      templateId: performance.roleTemplates.find((template) => template.name === role.name)?.id ?? "",
      quota: role.quota,
      gender: role.gender,
      ageMin: role.ageMin,
      ageMax: role.ageMax,
    })).filter((role) => role.templateId),
    rounds: posting.rounds ?? [],
    lockedRounds: posting.finished ? (posting.rounds ?? []).map((round) => round.round) : [],
    applicationFields: posting.applicationFields ?? [],
    applicationGuide: posting.applicationGuide ?? "",
    rehearsalVenue: posting.rehearsalVenue ?? "",
    rehearsalVenueAddress: posting.rehearsalVenueAddress ?? { roadAddress: "", detailAddress: "", zonecode: "", latitude: null, longitude: null },
  };
}

export function updateCatalogPosting(id: PostingId, body: UpdatePostingRequest) {
  for (const performance of CATALOG) {
    const index = performance.postings.findIndex((posting) => posting.id === id);
    const current = performance.postings[index];
    if (!current) continue;
    const updated: CatalogPosting = {
      ...current,
      performanceStart: body.performanceStart ?? current.performanceStart,
      performanceEnd: body.performanceEnd ?? current.performanceEnd,
      recruitmentStart: body.recruitmentStart ?? current.recruitmentStart,
      recruitmentEnd: body.recruitmentEnd ?? current.recruitmentEnd,
      deadline: body.recruitmentEnd ? compactDate(body.recruitmentEnd) : current.deadline,
      rounds: body.rounds ?? current.rounds,
    };
    performance.postings.splice(index, 1, updated);
    return updated;
  }
  return null;
}

export function removeCatalogPosting(id: PostingId) {
  for (const performance of CATALOG) {
    const index = performance.postings.findIndex((posting) => posting.id === id);
    if (index >= 0) {
      performance.postings.splice(index, 1);
      return performance;
    }
  }
  return null;
}
