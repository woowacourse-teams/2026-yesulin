import Link from "next/link";
import { adminAuditionPostRoutes } from "@/features/admin/audition-posts";

const TABS = [
  { value: "posts", label: "전체 공고", href: adminAuditionPostRoutes.list },
  { value: "owners", label: "업체별", href: adminAuditionPostRoutes.owners },
  { value: "companies", label: "공연사", href: adminAuditionPostRoutes.companies },
  { value: "edit-requests", label: "수정 요청", href: adminAuditionPostRoutes.editRequests },
] as const;

/** 공고 관리의 전체 공고 목록, 업체별 보기, 공연사 정보와 공연사 정보 수정 요청을 오간다. */
export function AdminAuditionPostTabs({ current }: { readonly current: (typeof TABS)[number]["value"] }) {
  return (
    <nav aria-label="공고 보기" className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          aria-current={current === tab.value ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-control border px-4 text-sm font-semibold transition-colors lg:min-h-10 ${
            current === tab.value
              ? "border-foreground bg-foreground text-white"
              : "border-border bg-card text-foreground hover:border-brand-line hover:bg-brand-soft"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
