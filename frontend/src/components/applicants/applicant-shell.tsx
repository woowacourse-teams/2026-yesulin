"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotebookFooter, NotebookHeader } from "@/components/landing/notebook-site-layout";
import { applicantRoutes } from "@/features/applicants/routes";

const navigation = [
  { href: applicantRoutes.home, label: "마이페이지" },
  { href: applicantRoutes.submissions, label: "내 지원서" },
  { href: applicantRoutes.profile, label: "내 프로필" },
] as const;

export function ApplicantShell({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="public-notebook applicant-theme">
    <a href="#applicant-main" className="notebook-skip">본문으로 바로가기</a>
    <NotebookHeader />
    <nav aria-label="배우 주요 메뉴" className="workspace-tabs">
      <div className="notebook-container">
        {navigation.map((item) => {
          const active = item.href === applicantRoutes.home ? pathname === item.href : pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>{item.label}</Link>;
        })}
        <span className="workspace-account-label">배우 계정</span>
      </div>
    </nav>
    <main id="applicant-main">{children}</main>
    <NotebookFooter />
  </div>;
}
