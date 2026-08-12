import type { PostingManagementDetail, UpdatePerformanceRequest, UpdatePostingRequest } from "@/features/auditions/management-types";
import type { PerformanceId, PostingId } from "@/features/auditions/types";
import { findPerformance, findPosting } from "./aggregate";
import { CATALOG } from "./catalog";
import type { CatalogPerformance, CatalogPosting } from "./catalog-model";
import { allApplicants } from "./store";

const compactDate = (value: string) => value.replaceAll("-", ".");

export function updateCatalogPerformance(id: PerformanceId, body: UpdatePerformanceRequest) {
  const index = CATALOG.findIndex((performance) => performance.id === id);
  const current = CATALOG[index];
  if (!current) return null;
  const updated: CatalogPerformance = {
    ...current,
    title: body.title?.trim() ?? current.title,
    venue: body.venue?.trim() ?? current.venue,
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
    title: posting.title,
    isOpenCall: posting.isOpenCall,
    allowsMultipleRoles: posting.allowsMultipleRoles,
    recruitmentStart: posting.recruitmentStart ?? "",
    recruitmentEnd: posting.recruitmentEnd ?? "",
    phase: posting.finished ? "FINISHED" : posting.status === "CLOSED" ? "RECRUIT_CLOSED" : posting.status,
    applicantCount: allApplicants().filter((applicant) => applicant.postingId === posting.id).length,
    roleTemplates: performance.roleTemplates,
    roles: posting.roles.map((role) => ({
      templateId: performance.roleTemplates.find((template) => template.name === role.name)?.id ?? "",
      quota: role.quota,
    })).filter((role) => role.templateId),
    rounds: posting.rounds ?? [],
    applicationFields: posting.applicationFields ?? [],
    applicationGuide: posting.applicationGuide ?? "",
  };
}

export function updateCatalogPosting(id: PostingId, body: UpdatePostingRequest) {
  for (const performance of CATALOG) {
    const index = performance.postings.findIndex((posting) => posting.id === id);
    const current = performance.postings[index];
    if (!current) continue;
    const roles = body.roles ? body.roles.flatMap((input, roleIndex) => {
      const template = performance.roleTemplates.find((candidate) => candidate.id === input.templateId);
      if (!template) return [];
      return [{
        id: current.roles[roleIndex]?.id ?? (`${id}_r${roleIndex + 1}` as CatalogPosting["roles"][number]["id"]),
        name: template.name,
        description: template.description,
        quota: input.quota,
        gender: template.gender,
        ageMin: template.ageMin,
        ageMax: template.ageMax,
        applicantCount: 0,
      }];
    }) : current.roles;
    const updated: CatalogPosting = {
      ...current,
      title: body.title?.trim() ?? current.title,
      isOpenCall: body.isOpenCall ?? current.isOpenCall,
      allowsMultipleRoles: body.allowsMultipleRoles ?? current.allowsMultipleRoles,
      recruitmentStart: body.recruitmentStart ?? current.recruitmentStart,
      recruitmentEnd: body.recruitmentEnd ?? current.recruitmentEnd,
      deadline: body.recruitmentEnd ? compactDate(body.recruitmentEnd) : current.deadline,
      roles,
      rounds: body.rounds ?? current.rounds,
      applicationFields: body.applicationFields ?? current.applicationFields,
      applicationGuide: body.applicationGuide?.trim() ?? current.applicationGuide,
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
