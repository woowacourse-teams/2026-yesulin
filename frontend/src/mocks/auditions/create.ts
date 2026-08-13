import type {
  CreatePerformanceRequest,
  CreatePostingRequest,
  PerformanceRoleTemplate,
} from "@/features/auditions/creation-types";
import { performanceId, postingId, roleId } from "@/features/auditions/types";
import type { CatalogPerformance, CatalogPosting } from "./catalog";
import { CATALOG } from "./catalog";

let performanceSequence = 0;
let postingSequence = 0;
let roleTemplateSequence = 0;
let roleSequence = 0;

const compactDate = (value: string) => value.replaceAll("-", ".");

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function postingStatus(start: string, end: string): CatalogPosting["status"] {
  const today = localToday();
  if (today < start) return "UPCOMING";
  if (today <= end) return "OPEN";
  return "CLOSED";
}

export function addPerformance(body: CreatePerformanceRequest): CatalogPerformance {
  performanceSequence += 1;
  const id = performanceId(String(performanceSequence));
  const roleTemplates: PerformanceRoleTemplate[] = body.roles.map((role) => ({
    ...role,
    id: String(++roleTemplateSequence),
  }));

  const performance: CatalogPerformance = {
    id,
    posterUrl: body.posterUrl,
    title: body.title.trim(),
    venue: body.venue.trim(),
    roleTemplates,
    postings: [],
  };
  CATALOG.unshift(performance);
  return performance;
}

export function addPosting(
  performance: CatalogPerformance,
  body: CreatePostingRequest,
): CatalogPosting {
  postingSequence += 1;
  const id = postingId(String(postingSequence));
  const templates = new Map(performance.roleTemplates.map((role) => [role.id, role]));

  const roles = body.roles.flatMap((selected) => {
    const source = templates.get(selected.templateId);
    if (!source) return [];
    return [{
      id: roleId(String(++roleSequence)),
      name: source.name,
      description: source.description,
      quota: selected.quota,
      gender: source.gender,
      ageMin: source.ageMin,
      ageMax: source.ageMax,
      applicantCount: 0,
    }];
  });

  const posting: CatalogPosting = {
    id,
    performanceId: performance.id,
    title: body.title.trim(),
    deadline: compactDate(body.recruitmentEnd),
    status: postingStatus(body.recruitmentStart, body.recruitmentEnd),
    allowsMultipleRoles: body.allowsMultipleRoles,
    finished: false,
    roles,
    recruitmentStart: body.recruitmentStart,
    recruitmentEnd: body.recruitmentEnd,
    rounds: body.rounds,
    applicationFields: body.applicationFields,
    applicationGuide: body.applicationGuide.trim(),
  };
  performance.postings.unshift(posting);
  return posting;
}
