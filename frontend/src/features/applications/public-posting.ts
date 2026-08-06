import { CATALOG } from "@/mocks/auditions/catalog";
import type { CatalogPosting, CatalogPerformance } from "@/mocks/auditions/catalog";
import { defaultApplicationFields } from "@/features/auditions/creation-types";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import type { PostingId, RoleGender } from "@/features/auditions/types";

export type PublicPostingStatus = "OPEN" | "UPCOMING" | "CLOSED";

export type PublicPosting = {
  readonly id: PostingId;
  readonly performanceTitle: string;
  readonly title: string;
  readonly venue: string;
  readonly companyName: string;
  readonly companyDescription: string;
  readonly recruitmentStart: string;
  readonly recruitmentEnd: string;
  readonly status: PublicPostingStatus;
  readonly isOpenCall: boolean;
  readonly roles: readonly PublicRole[];
  readonly schedule: readonly PublicSchedule[];
  readonly documents: readonly PublicDocument[];
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
export type PublicDocument = { readonly title: string; readonly detail: string; readonly required: boolean };

const COMPANY = {
  name: "나인진엔터테인먼트",
  description: "공연 제작과 배우 캐스팅을 운영하는 공연사입니다.",
} as const;

const baseDocuments: readonly PublicDocument[] = [
  { title: "기본 정보", detail: "이름, 생년월일, 연락처, 신체 정보", required: true },
  { title: "프로필 사진", detail: "최근 6개월 이내 촬영본 1장 이상", required: true },
  { title: "자기소개와 지원 동기", detail: "각 100자 이상", required: true },
  { title: "연기·노래 영상", detail: "유튜브 링크로 제출할 수 있어요", required: false },
  { title: "경력 사항", detail: "신인도 지원할 수 있어요", required: false },
];

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
  return {
    id: posting.id,
    performanceTitle: performance.title,
    title: posting.title,
    venue: performance.venue,
    companyName: COMPANY.name,
    companyDescription: COMPANY.description,
    recruitmentStart: posting.recruitmentStart ?? "",
    recruitmentEnd: posting.recruitmentEnd ?? "",
    status: posting.status,
    isOpenCall: posting.isOpenCall,
    roles: posting.roles,
    schedule: scheduleOf(posting),
    documents: baseDocuments,
    applicationFields: posting.applicationFields ?? defaultApplicationFields(),
    notice: posting.applicationGuide ?? "제출 자료는 이번 공고 심사 목적으로만 사용합니다.",
  };
}

export function publicPostingDate(date: string) {
  return formatDate(date);
}
