import { CATALOG } from "@/mocks/auditions/catalog";
import type { CatalogPosting, CatalogPerformance } from "@/mocks/auditions/catalog";
import { defaultApplicationFields } from "@/features/auditions/creation-types";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { applicationDocuments } from "./application-form";
import type { ApplicationDocument } from "./application-form";
import type { PostingId, RoleGender } from "@/features/auditions/types";
import type { VenueAddress } from "@/features/auditions/creation-types";
import { producerProfile } from "@/mocks/auditions/producer-profile";

export type PublicPostingStatus = "OPEN" | "UPCOMING" | "CLOSED";

export type PublicPosting = {
  readonly id: PostingId;
  readonly performanceTitle: string;
  readonly title: string;
  readonly posterUrl: string;
  readonly detailImageUrl: string;
  readonly venue: string;
  readonly venueAddress: VenueAddress;
  readonly performanceStart: string;
  readonly performanceEnd: string;
  readonly companyName: string;
  readonly companyDescription: string;
  readonly recruitmentStart: string;
  readonly recruitmentEnd: string;
  readonly rehearsalVenue: string;
  readonly rehearsalVenueAddress: VenueAddress;
  readonly status: PublicPostingStatus;
  readonly isOpenCall: boolean;
  readonly allowsMultipleRoles: boolean;
  readonly roles: readonly PublicRole[];
  readonly schedule: readonly PublicSchedule[];
  readonly documents: readonly ApplicationDocument[];
  readonly applicationFields: readonly ApplicationFieldInput[];
  readonly notice: string;
};

export type PublicRole = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly quota: number;
  readonly gender: RoleGender;
  readonly ageMin: number;
  readonly ageMax: number;
};

export type PublicSchedule = { readonly title: string; readonly detail: string };
export type PublicPostingAvailability = { readonly label: string; readonly detail: string; readonly notice: string };

function findPosting(id: string): { performance: CatalogPerformance; posting: CatalogPosting } | null {
  for (const performance of CATALOG) {
    const posting = performance.postings.find((candidate) => candidate.id === id);
    if (posting) return { performance, posting };
  }
  return null;
}

const koreaDateTimeFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** 서버는 모집 일정을 UTC Instant로 준다. 화면에 쓰기 전에 한국 시간으로 옮긴다. */
function koreaDateTime(value: string) {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return null;
  const parts = koreaDateTimeFormat.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  if (!part("year")) return null;
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}

function formatDate(date?: string) {
  if (!date) return "일정 조율 중";
  const localDate = date.includes("T") ? koreaDateTime(date)?.date : date.slice(0, 10).replaceAll(".", "-");
  const [year, month, day] = (localDate ?? "").split("-");
  return year ? `${year}년 ${Number(month)}월 ${Number(day)}일` : date;
}

function formatDateTime(value?: string) {
  if (!value) return "일정 조율 중";
  const time = value.includes("T") ? koreaDateTime(value)?.time : "";
  return `${formatDate(value)}${time ? ` ${time}` : ""}`;
}

function scheduleOf(posting: CatalogPosting): readonly PublicSchedule[] {
  const closing = { title: "접수 마감", detail: formatDateTime(posting.recruitmentEnd) };
  const rounds = (posting.rounds ?? []).map((round) => ({
    title: round.name,
    detail: `${formatDate(round.date)}${round.note ? ` · ${round.note}` : ""}`,
  }));
  return [closing, ...rounds];
}

export function publicPostingById(id: string): PublicPosting | null {
  const found = findPosting(id);
  if (!found) return null;

  const { performance, posting } = found;
  if (posting.status === "DRAFT") return null;
  const company = producerProfile();
  const applicationFields = posting.applicationFields ?? defaultApplicationFields();
  return {
    id: posting.id,
    performanceTitle: performance.title,
    title: posting.title,
    posterUrl: posting.posterUrl,
    detailImageUrl: posting.detailImageUrl ?? "",
    venue: performance.venue,
    venueAddress: performance.venueAddress,
    performanceStart: posting.performanceStart,
    performanceEnd: posting.performanceEnd,
    companyName: company.companyName || "기획사/제작사",
    companyDescription: company.description ?? "",
    recruitmentStart: posting.recruitmentStart ?? "",
    recruitmentEnd: posting.recruitmentEnd ?? "",
    rehearsalVenue: posting.rehearsalVenue ?? "",
    rehearsalVenueAddress: posting.rehearsalVenueAddress ?? { roadAddress: "", detailAddress: "", zonecode: "", latitude: null, longitude: null },
    status: posting.status,
    isOpenCall: posting.isOpenCall,
    allowsMultipleRoles: posting.allowsMultipleRoles,
    roles: posting.roles,
    schedule: scheduleOf(posting),
    documents: applicationDocuments(applicationFields),
    applicationFields,
    notice: posting.applicationGuide ?? "실제 접수 방법은 기획사/제작사에 확인해 주세요.",
  };
}

export function publicPostingDate(date: string) {
  return formatDate(date);
}

export function publicPostingDateTime(date: string) {
  return formatDateTime(date);
}

/** 공고 상태별로 지원 판단에 가장 먼저 필요한 날짜와 안내를 정한다. */
export function publicPostingAvailability(posting: Pick<PublicPosting, "status" | "recruitmentStart" | "recruitmentEnd">): PublicPostingAvailability {
  if (posting.status === "UPCOMING") return {
    label: "지원 시작",
    detail: publicPostingDateTime(posting.recruitmentStart),
    notice: "모집이 시작되면 지원할 수 있어요.",
  };
  if (posting.status === "CLOSED") return {
    label: "접수 마감",
    detail: publicPostingDateTime(posting.recruitmentEnd),
    notice: "접수는 마감되었지만 공고 내용은 계속 확인할 수 있어요.",
  };
  return {
    label: "지원 마감",
    detail: publicPostingDateTime(posting.recruitmentEnd),
    notice: "로그인 전에도 작성할 수 있으며, 최종 제출은 인증 후 진행합니다.",
  };
}
