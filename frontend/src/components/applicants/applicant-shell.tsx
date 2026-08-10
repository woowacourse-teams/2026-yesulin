"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { applicantRoutes } from "@/features/applicants/routes";

const navigation = [
  { href: applicantRoutes.home, label: "홈", icon: "⌂" },
  { href: applicantRoutes.applications, label: "내 지원서", icon: "▤" },
  { href: applicantRoutes.profile, label: "프로필", icon: "○" },
] as const;

export function ApplicantShell({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="min-h-screen bg-surface text-foreground">
    <a href="#applicant-main" className="fixed left-4 top-3 z-50 -translate-y-24 rounded-control bg-foreground px-4 py-2 text-sm font-semibold text-white focus:translate-y-0">본문으로 바로가기</a>
    <header className="glass-surface sticky top-0 z-30 border-x-0 border-t-0">
      <div className="mx-auto flex min-h-[68px] max-w-[1180px] items-center px-5 md:px-8">
        <Link href={applicantRoutes.home} aria-label="예술in 지원자 홈" className="inline-flex rounded-control">
          <Image src="/images/yesulin-logo-transparent.png" alt="예술in" width={96} height={48} priority className="h-auto w-24 object-contain" />
        </Link>
        <nav aria-label="지원자 주요 메뉴" className="ml-10 hidden items-center gap-1 md:flex">
          {navigation.map((item) => <ApplicantNavLink key={item.href} {...item} pathname={pathname} />)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href={applicantRoutes.lookup} className="hidden min-h-11 items-center rounded-control px-3 text-sm font-semibold text-muted-strong hover:bg-surface hover:text-brand sm:inline-flex">조회 코드로 찾기</Link>
          <div className="flex min-h-11 items-center gap-2 rounded-control px-2" aria-label="현재 로그인 계정: 김서윤">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand" aria-hidden="true">김</span>
            <span className="hidden text-sm font-semibold sm:inline">김서윤</span>
          </div>
          <Link
            href="/login"
            aria-label="로그아웃"
            title="로그아웃"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-2.5 text-sm font-semibold text-muted-strong transition-colors hover:bg-surface hover:text-foreground sm:px-3"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
              <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />
            </svg>
            <span className="hidden sm:inline">로그아웃</span>
          </Link>
        </div>
      </div>
    </header>
    <main id="applicant-main" className="min-h-[calc(100vh-68px)] pb-24 md:pb-0">{children}</main>
    <nav aria-label="지원자 모바일 메뉴" className="glass-surface fixed inset-x-0 bottom-0 z-30 border-x-0 border-b-0 md:hidden">
      <div className="grid grid-cols-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-1">
        {navigation.map((item) => {
          const active = item.href === applicantRoutes.home ? pathname === item.href : pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-control text-xs font-semibold ${active ? "text-brand" : "text-muted"}`}><span aria-hidden="true" className="text-lg leading-none">{item.icon}</span>{item.label}</Link>;
        })}
      </div>
    </nav>
  </div>;
}

function ApplicantNavLink({ href, label, pathname }: { href: string; label: string; icon: string; pathname: string }) {
  const active = href === applicantRoutes.home ? pathname === href : pathname.startsWith(href);
  return <Link href={href} aria-current={active ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-control px-4 text-sm font-semibold transition-colors ${active ? "bg-brand-soft text-brand" : "text-muted-strong hover:bg-surface hover:text-foreground"}`}>{label}</Link>;
}
