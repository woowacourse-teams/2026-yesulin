import { request } from "@/features/auditions/api-client";
import { toApplicationFields } from "@/features/auditions/audition-v1-form";
import type { PublicAuditionResource } from "@/features/auditions/backend-resources";
import { applicationDocuments } from "./application-form";
import {
  publicPostingDate,
  publicPostingDateTime,
  type PublicPosting,
  type PublicPostingStatus,
} from "./public-posting";
import { postingId } from "@/features/auditions/types";

export async function getV1PublicPosting(id: string) {
  return toPublicPosting(await request<PublicAuditionResource>(`/v1/public/auditions/${id}`));
}

export async function getV1PublicPostingForServer(id: string, origin: string) {
  const response = await fetch(new URL(`/api/v1/public/auditions/${encodeURIComponent(id)}`, origin), {
    cache: "no-store",
  });
  return response.ok ? toPublicPosting(await response.json() as PublicAuditionResource) : null;
}

function toPublicPosting(resource: PublicAuditionResource): PublicPosting {
  const applicationFields = toApplicationFields(resource.applicationForm);
  return {
    id: postingId(resource.id),
    performanceTitle: resource.performanceTitle,
    title: resource.title,
    posterUrl: resource.posterUrl,
    detailImageUrl: "",
    venue: resource.roadAddress,
    venueAddress: emptyAddress(resource.roadAddress),
    performanceStart: resource.performanceStartDate,
    performanceEnd: resource.performanceEndDate ?? "",
    companyName: resource.producer.companyName || "기획사/제작사",
    companyDescription: resource.producer.description ?? "",
    recruitmentStart: resource.recruitmentStartAt,
    recruitmentEnd: resource.recruitmentEndAt,
    rehearsalVenue: resource.rehearsalVenue,
    rehearsalVenueAddress: resource.rehearsalVenueAddress,
    status: statusOf(resource),
    isOpenCall: false,
    allowsMultipleRoles: resource.multipleRoleApplicationsAllowed,
    roles: resource.roles.map((role) => ({
      id: String(role.id),
      name: role.name,
      description: role.description,
      quota: role.recruitmentCount,
      gender: role.gender,
      ageMin: role.minimumAge,
      ageMax: role.maximumAge,
    })),
    schedule: [
      { title: "접수 마감", detail: publicPostingDateTime(resource.recruitmentEndAt) },
      ...resource.stages.map((stage) => ({
        title: stage.name,
        detail: `${publicPostingDate(stage.date)}${stage.notice ? ` · ${stage.notice}` : ""}`,
        venue: stage.venue.name,
        venueAddress: stage.venue,
      })),
    ],
    documents: applicationDocuments(applicationFields),
    applicationFields,
    notice: "실제 접수 방법은 기획사/제작사에 확인해 주세요.",
  };
}

function statusOf(resource: PublicAuditionResource): PublicPostingStatus {
  if (Date.now() < Date.parse(resource.recruitmentStartAt)) return "UPCOMING";
  return Date.now() < Date.parse(resource.recruitmentEndAt) ? "OPEN" : "CLOSED";
}

function emptyAddress(roadAddress = "") {
  return { roadAddress, detailAddress: "", zonecode: "", latitude: null, longitude: null };
}
