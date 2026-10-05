export const ADMIN_SECTIONS = [
  { id: "overview", label: "개요", title: "운영 개요" },
  { id: "members", label: "회원", title: "회원" },
  { id: "producers", label: "기획사", title: "기획사·제작사" },
  { id: "auditions", label: "오디션", title: "오디션 공고" },
  { id: "shows", label: "무료 공연", title: "무료 공연 예매" },
  { id: "audit", label: "변경 기록", title: "운영자 변경 기록" },
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number]["id"];

/** 사이드바에서 대시보드 섹션과 같은 줄에 놓는 별도 화면이다. */
export type AdminNavTarget = AdminSection | "posts" | "messages" | "files" | "logs";

const SECTION_IDS: ReadonlySet<string> = new Set(ADMIN_SECTIONS.map((section) => section.id));

/** URL `tab` 값이 없거나 모르는 값이면 개요를 연다. */
export function parseAdminSection(value: string | readonly string[] | undefined): AdminSection {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === "string" && SECTION_IDS.has(candidate) ? candidate as AdminSection : "overview";
}

export function adminSectionHref(section: AdminSection): string {
  return section === "overview" ? "/admin" : `/admin?tab=${section}`;
}

export function adminSectionTitle(section: AdminSection): string {
  return ADMIN_SECTIONS.find((candidate) => candidate.id === section)?.title ?? "운영 개요";
}
