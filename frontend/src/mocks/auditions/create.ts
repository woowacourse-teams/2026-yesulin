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

const compactDate = (value: string) => value.slice(0, 10).replaceAll("-", ".");

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function postingStatus(start: string, end: string): CatalogPosting["status"] {
  const today = `${localToday()}T${new Date().toTimeString().slice(0, 5)}`;
  if (today < start) return "UPCOMING";
  if (today <= end) return "OPEN";
  return "CLOSED";
}

export function addPerformance(body: CreatePerformanceRequest): CatalogPerformance {
  performanceSequence += 1;
  const id = performanceId(`created_p${performanceSequence}`);
  const roleTemplates: PerformanceRoleTemplate[] = body.roles.map((role, index) => ({
    ...role,
    id: `${id}_template_${index + 1}`,
  }));

  const performance: CatalogPerformance = {
    id,
    posterUrl: body.posterUrl,
    title: body.title.trim(),
    venue: body.venue.trim(),
    venueAddress: body.venueAddress,
    performanceStart: body.performanceStart,
    performanceEnd: body.performanceEnd,
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
  const id = postingId(`created_po${postingSequence}`);
  const templates = new Map(performance.roleTemplates.map((role) => [role.id, role]));

  const roles = body.roles.flatMap((selected, index) => {
    const source = templates.get(selected.templateId);
    if (!source) return [];
    return [{
      id: roleId(`${id}_r${index + 1}`),
      name: source.name,
      description: source.description,
      quota: selected.quota,
      gender: selected.gender,
      ageMin: selected.ageMin,
      ageMax: selected.ageMax,
      applicantCount: 0,
    }];
  });

  const posting: CatalogPosting = {
    id,
    performanceId: performance.id,
    title: body.title.trim(),
    posterUrl: body.posterUrl,
    detailImageUrl: body.detailImageUrl,
    performanceStart: performance.performanceStart,
    performanceEnd: performance.performanceEnd,
    deadline: compactDate(body.recruitmentEnd),
    status: postingStatus(body.recruitmentStart, body.recruitmentEnd),
    isOpenCall: body.isOpenCall,
    allowsMultipleRoles: body.allowsMultipleRoles,
    finished: false,
    roles,
    recruitmentStart: body.recruitmentStart,
    recruitmentEnd: body.recruitmentEnd,
    rehearsalVenue: body.rehearsalVenue.trim(),
    rehearsalVenueAddress: body.rehearsalVenueAddress,
    rounds: body.rounds,
    applicationFields: body.applicationFields,
    applicationGuide: body.applicationGuide.trim(),
  };
  performance.postings.unshift(posting);
  return posting;
}
