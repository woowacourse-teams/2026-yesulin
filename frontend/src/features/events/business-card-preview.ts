import type { CareerDraft, RegistrationDraft } from "./registration-draft";
import type { EventActivityField } from "./types";

/** 명함 미리보기에 그릴 문구. 실제 제작 명함과 같은 규칙으로 만든다(휴대폰 번호는 넣지 않는다). */
export type BusinessCardContent = {
  readonly name: string;
  /** `Actor · Theater · YouTube`처럼 성별 없이 Actor와 고른 분야를 잇는다. */
  readonly roleLine: string;
  /** `2001.06.25`. 아직 고르지 않았으면 null이다. */
  readonly birthDate: string | null;
  readonly email: string | null;
  /** 앞에 @를 붙인 SNS 계정 */
  readonly snsHandle: string | null;
  readonly intro: string | null;
  /** 최근 순으로 최대 {@link MAX_PREVIEW_CAREERS}줄 */
  readonly careers: readonly { readonly when: string; readonly title: string; readonly role: string | null }[];
  /** 뒷면 배치. 경력이 있으면 목록, 신입이면 소개나 분야를 가운데에 둔다. */
  readonly backLayout: "careers" | "centered";
};

export const MAX_PREVIEW_CAREERS = 5;

const FIELD_LABELS: Readonly<Record<Exclude<EventActivityField, "OTHER">, string>> = {
  THEATER: "Theater",
  MUSICAL: "Musical",
  MEDIA: "Media",
  YOUTUBE: "YouTube",
};

type CardSource = Pick<RegistrationDraft, "name" | "email" | "snsHandle" | "birthDate" | "activityFields" | "otherActivity" | "noCareer" | "careers" | "intro">;

export function businessCardContent(draft: CardSource): BusinessCardContent {
  const careers = draft.noCareer ? [] : previewCareers(draft.careers);
  return {
    name: draft.name.trim(),
    roleLine: roleLine(draft.activityFields, draft.otherActivity),
    birthDate: draft.birthDate ? draft.birthDate.replaceAll("-", ".") : null,
    email: blankToNull(draft.email),
    snsHandle: snsHandle(draft.snsHandle),
    intro: blankToNull(draft.intro),
    careers,
    backLayout: careers.length > 0 ? "careers" : "centered",
  };
}

function roleLine(fields: readonly EventActivityField[], otherActivity: string): string {
  const labels = fields
    .map((field) => field === "OTHER" ? otherActivity.trim() : FIELD_LABELS[field])
    .filter(Boolean);
  return ["Actor", ...labels].join(" · ");
}

function snsHandle(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

/** 연도·월과 작품명이 있는 줄만 최근 순으로 쓴다. 적는 중인 줄은 아직 그리지 않는다. */
function previewCareers(careers: readonly CareerDraft[]): BusinessCardContent["careers"] {
  return careers
    .filter((career) => career.year && career.month && career.workTitle.trim())
    .map((career) => ({
      sortKey: `${career.year}-${career.month}`,
      when: `${career.year}.${career.month}`,
      title: career.workTitle.trim(),
      role: blankToNull(career.role),
    }))
    .sort((left, right) => right.sortKey.localeCompare(left.sortKey))
    .slice(0, MAX_PREVIEW_CAREERS)
    .map(({ when, title, role }) => ({ when, title, role }));
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
