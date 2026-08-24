"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuthSession } from "@/components/auth/auth-session";
import { useToast } from "@/components/auditions/toast";
import { getApplicantProfile } from "@/features/applicants/api";
import { APPLICANT_PROFILE_CHANGED } from "@/features/applicants/events";
import { applicantRoutes } from "@/features/applicants/routes";
import type { ApplicantProfileResponse } from "@/features/applicants/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { SessionApiError } from "@/features/auth/session-api";

const navigation = [
  { href: applicantRoutes.home, label: "홈", icon: "home" },
  { href: applicantRoutes.submissions, label: "내 지원서", icon: "submissions" },
  { href: applicantRoutes.profile, label: "프로필", icon: "profile" },
] as const;

export function ApplicantShell({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const { session, logoutSession } = useAuthSession();
  const accountName = session?.role === "APPLICANT" ? session.displayName : "배우";
  const profileQuery = useAuditionQuery("applicant-header-profile", getApplicantProfile, "");
  useEffect(() => {
    window.addEventListener(APPLICANT_PROFILE_CHANGED, profileQuery.reload);
    return () => window.removeEventListener(APPLICANT_PROFILE_CHANGED, profileQuery.reload);
  }, [profileQuery.reload]);
  const logout = () => {
    void logoutSession()
      .then(() => router.replace("/login"))
      .catch((error: unknown) => {
        const message = error instanceof SessionApiError
          ? error.message
          : "로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.";
        toast(message, { type: "error" });
      });
  };
  return <div className="min-h-screen bg-surface text-foreground">
    <a href="#applicant-main" className="fixed left-4 top-3 z-50 -translate-y-24 rounded-control bg-foreground px-4 py-2 text-sm font-semibold text-white focus:translate-y-0">본문으로 바로가기</a>
    <header className="glass-surface sticky top-0 z-30 border-x-0 border-t-0">
      <div className="mx-auto flex min-h-[68px] max-w-[1180px] items-center px-5 md:px-8">
        <Link href={applicantRoutes.home} aria-label="예술in 배우 홈" className="relative inline-flex h-12 w-24 rounded-control">
          <Image src="/images/yesulin-logo.png" alt="예술in" fill sizes="96px" priority className="object-contain" />
        </Link>
        <nav aria-label="배우 주요 메뉴" className="ml-10 hidden items-center gap-1 md:flex">
          {navigation.map((item) => <ApplicantNavLink key={item.href} {...item} pathname={pathname} />)}
        </nav>
        <div className="ml-auto">
          <ApplicantAccountMenu profile={profileQuery.data} fallbackName={accountName} onLogout={logout} />
        </div>
      </div>
    </header>
    <main id="applicant-main" className="min-h-[calc(100vh-68px)] pb-24 md:pb-0">{children}</main>
    <nav aria-label="배우 모바일 메뉴" className="glass-surface fixed inset-x-0 bottom-0 z-30 border-x-0 border-b-0 md:hidden">
      <div className="grid grid-cols-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-1">
        {navigation.map((item) => {
          const active = item.href === applicantRoutes.home ? pathname === item.href : pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-control text-xs font-semibold ${active ? "text-brand" : "text-muted"}`}><ApplicantIcon name={item.icon} />{item.label}</Link>;
        })}
      </div>
    </nav>
  </div>;
}

function ApplicantAccountMenu({ profile, fallbackName, onLogout }: { readonly profile: ApplicantProfileResponse | null; readonly fallbackName: string; readonly onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const nameValue = profile?.answers.find((answer) => answer.key === "NAME")?.value;
  const profileName = typeof nameValue === "string" && nameValue.trim() ? nameValue.trim() : fallbackName.replace(/\s*배우$/, "");
  const greeting = profileName ? `${profileName} 배우님` : "배우님";
  const photoUrl = profile?.photoLibrary.find((photo) => photo.representative)?.url ?? profile?.photoLibrary[0]?.url;

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <div ref={containerRef} className="relative">
    <button
      type="button"
      aria-label={`${greeting} 계정 메뉴`}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls="applicant-account-menu"
      onClick={() => setOpen((current) => !current)}
      className="flex min-h-11 items-center gap-1 rounded-full p-1 transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-brand-soft text-brand">
        {photoUrl
          ? <Image src={photoUrl} alt="" fill sizes="40px" unoptimized className="object-cover" />
          : <DefaultProfileIcon />}
      </span>
      <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-4 w-4 fill-current text-muted transition-transform ${open ? "rotate-180" : ""}`}><path d="m5.5 7.5 4.5 4 4.5-4" /></svg>
    </button>
    {open ? <div id="applicant-account-menu" role="menu" className="absolute right-0 top-[calc(100%+8px)] z-40 w-56 overflow-hidden rounded-card border border-border bg-card p-2 shadow-[var(--shadow-2)]">
      <div className="px-3 py-3"><p className="truncate text-sm font-bold text-foreground">{greeting}</p><p className="mt-1 text-xs text-muted">예술in 배우 계정</p></div>
      <div className="border-t border-border-soft pt-1">
        <button type="button" role="menuitem" onClick={onLogout} className="flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-left text-sm font-semibold text-muted-strong transition-colors hover:bg-surface hover:text-foreground">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" /></svg>
          로그아웃
        </button>
      </div>
    </div> : null}
  </div>;
}

function DefaultProfileIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.8]" strokeLinecap="round"><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.7-3.8 2.8-5.7 6.5-5.7s5.8 1.9 6.5 5.7" /></svg>;
}

function ApplicantNavLink({ href, label, pathname }: { href: string; label: string; icon: string; pathname: string }) {
  const active = href === applicantRoutes.home ? pathname === href : pathname.startsWith(href);
  return <Link href={href} aria-current={active ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-control px-4 text-sm font-semibold transition-colors ${active ? "bg-brand-soft text-brand" : "text-muted-strong hover:bg-surface hover:text-foreground"}`}>{label}</Link>;
}

function ApplicantIcon({ name }: { name: (typeof navigation)[number]["icon"] }) {
  const paths = {
    home: <><path d="m3.5 10.5 8.5-7 8.5 7" /><path d="M5.5 9.5v10h13v-10M9.5 19.5v-6h5v6" /></>,
    submissions: <><path d="M6 3.5h9l3 3v14H6z" /><path d="M15 3.5v4h3M9 11h6M9 14.5h6M9 18h4" /></>,
    profile: <><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20.5c.5-4 2.6-6 6.5-6s6 2 6.5 6" /></>,
  } as const;
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
