import { CATALOG } from "@/mocks/auditions/catalog";
import type { CatalogPosting, CatalogPerformance } from "@/mocks/auditions/catalog";
import { defaultApplicationFields } from "@/features/auditions/creation-types";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { applicationDocuments } from "./application-form";
import type { ApplicationDocument } from "./application-form";
import type { PostingId, RoleGender } from "@/features/auditions/types";

export type PublicPostingStatus = "OPEN" | "UPCOMING" | "CLOSED";

export type PublicPosting = {
  readonly id: PostingId;
  readonly performanceTitle: string;
  readonly title: string;
  readonly posterUrl: string;
  readonly venue: string;
  readonly companyName: string;
  readonly companyDescription: string;
  readonly recruitmentStart: string;
  readonly recruitmentEnd: string;
  readonly status: PublicPostingStatus;
  readonly isOpenCall: boolean;
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
const COMPANY = {
  name: "나인진엔터테인먼트",
  description: "공연 제작과 배우 캐스팅을 운영하는 공연사입니다.",
} as const;

function findPosting(id: string): { performance: CatalogPerformance; posting: CatalogPosting } | null {
  for (const performance of CATALOG) {
    const posting = performance.postings.find((candidate) => candidate.id === id);
    if (posting) return { performance, posting };
  }
  return null;
}

function formatDate(date?: string) {
  if (!date) return "일정 조율 중";
  const [year, month, day] = date.replaceAll(".", "-").split("-");
  return year ? `${year}년 ${Number(month)}월 ${Number(day)}일` : date;
}

function scheduleOf(posting: CatalogPosting): readonly PublicSchedule[] {
  const closing = { title: "접수 마감", detail: `${formatDate(posting.recruitmentEnd)} 23:59` };
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
  const applicationFields = posting.applicationFields ?? defaultApplicationFields();
  return {
    id: posting.id,
    performanceTitle: performance.title,
    title: posting.title,
    posterUrl: performance.posterUrl,
    venue: performance.venue,
    companyName: COMPANY.name,
    companyDescription: COMPANY.description,
    recruitmentStart: posting.recruitmentStart ?? "",
    recruitmentEnd: posting.recruitmentEnd ?? "",
    status: posting.status,
    isOpenCall: posting.isOpenCall,
    roles: posting.roles,
    schedule: scheduleOf(posting),
    documents: applicationDocuments(applicationFields),
    applicationFields,
    notice: posting.applicationGuide ?? "실제 접수 방법은 공연사에 확인해 주세요.",
  };
}

export function publicPostingDate(date: string) {
  return formatDate(date);
}

export function publicPostingRecommendations(excludeId: PostingId, limit = 3): readonly PublicPosting[] {
  const statusOrder: Record<PublicPostingStatus, number> = { OPEN: 0, UPCOMING: 1, CLOSED: 2 };
  return CATALOG.flatMap((performance) => performance.postings)
    .filter((posting) => posting.id !== excludeId)
    .map((posting) => publicPostingById(posting.id))
    .filter((posting): posting is PublicPosting => posting !== null)
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]
      || (a.status === "CLOSED" ? b.recruitmentEnd.localeCompare(a.recruitmentEnd) : a.recruitmentStart.localeCompare(b.recruitmentStart)))
    .slice(0, limit);
}

/** 공고 상태별로 지원 판단에 가장 먼저 필요한 날짜와 안내를 정한다. */
export function publicPostingAvailability(posting: Pick<PublicPosting, "status" | "recruitmentStart" | "recruitmentEnd">): PublicPostingAvailability {
  if (posting.status === "UPCOMING") return {
    label: "지원 시작",
    detail: publicPostingDate(posting.recruitmentStart),
    notice: "모집이 시작되면 지원할 수 있어요.",
  };
  if (posting.status === "CLOSED") return {
    label: "접수 마감",
    detail: `${publicPostingDate(posting.recruitmentEnd)} 23:59`,
    notice: "접수는 마감되었지만 공고 내용은 계속 확인할 수 있어요.",
  };
  return {
    label: "지원 마감",
    detail: `${publicPostingDate(posting.recruitmentEnd)} 23:59`,
    notice: "로그인 없이 지원서를 작성할 수 있어요.",
  };
}
