"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuthSession } from "@/components/auth/auth-session";
import { LogoutButton } from "@/components/auth/logout-button";
import { actorPageRoutes } from "@/features/actor-pages/types";
import { applicantRoutes } from "@/features/applicants/routes";
import { TrackedLoginLink } from "@/components/analytics/tracked-login-link";
import { PolicyLinks } from "@/components/policies/policy-links";
import { AUDITION_ALERT_CHAT_URL, auditionPostRoutes } from "@/features/audition-posts/types";
import { eventRoutes } from "@/features/events/types";
import { showRoutes } from "@/features/shows/types";
import { SiteIcon } from "@/components/ui/site-icon";

const menuItems = [
  { key: "auditions", href: auditionPostRoutes.list(), label: "오디션" },
  { key: "shows", href: showRoutes.list, label: "무료 공연" },
  { key: "events", href: eventRoutes.list, label: "이벤트" },
  { key: "actors", href: actorPageRoutes.list(), label: "배우" },
] as const;

export function NotebookHeader({ service = "applicant" }: { readonly service?: "applicant" | "producer" }) {
  const pathname = usePathname() ?? "/";
  const current = currentMenu(pathname);
  return <header className="notebook-header"><div className="notebook-container notebook-header-inner">
    <Link href="/" aria-label="예술in 홈" className="notebook-logo"><Image src="/images/yesulin-logo-transparent.png" alt="예술in" width={96} height={56} priority /></Link>
    <nav aria-label="주요 메뉴" className="notebook-main-nav">{menuItems.map((item) => <Link key={item.key} href={item.href} aria-current={current === item.key ? "page" : undefined}>{item.label}</Link>)}</nav>
    <div className="notebook-account"><HeaderAccountLinks service={service} producerLinkClassName="notebook-producer-link" /></div>
    <MobileNavigation key={pathname} current={current} service={service} />
  </div></header>;
}

function currentMenu(pathname: string): (typeof menuItems)[number]["key"] | undefined {
  if (pathname.startsWith("/shows")) return "shows";
  if (pathname === "/events" || pathname.startsWith("/events/")) return "events";
  if (pathname === "/actors" || pathname.startsWith("/actors/") || pathname.startsWith("/actor-page/")) return "actors";
  if (pathname === "/auditions" || pathname.startsWith("/auditions/") || pathname.startsWith("/posts/")) return "auditions";
  return undefined;
}

function HeaderAccountLinks({ service, producerLinkClassName }: { readonly service: "applicant" | "producer"; readonly producerLinkClassName?: string }) {
  const { session } = useAuthSession();
  if (session) return <>
    {session.role === "APPLICANT"
      ? <Link href={applicantRoutes.submissions}>내 지원서</Link>
      : <Link href="/producers/shows">공연사 대시보드</Link>}
    <LogoutButton />
  </>;
  const producer = service === "producer";
  return <>
    <TrackedLoginLink href="/login" analytics={{ entry_point: producer ? "producer_landing_header" : "landing_header", login_reason: producer ? "manage_production" : "account_access", actor_type: service, return_target: producer ? "producer_home" : "other" }}>로그인</TrackedLoginLink>
    <Link href="/producer-service" className={producerLinkClassName}>기획사·제작사 서비스</Link>
  </>;
}

function MobileNavigation({ current, service }: { readonly current?: string; readonly service: "applicant" | "producer" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div ref={rootRef} className="notebook-mobile-navigation" onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <button ref={buttonRef} type="button" className="notebook-menu-toggle" aria-label={open ? "메뉴 닫기" : "메뉴 열기"} aria-expanded={open} aria-controls="notebook-mobile-menu" onClick={() => setOpen(!open)}><SiteIcon name={open ? "close" : "menu"} size={26} /></button>
    {open ? <nav id="notebook-mobile-menu" aria-label="모바일 주요 메뉴" className="notebook-mobile-menu" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}>
      {menuItems.map((item) => <Link key={item.key} href={item.href} aria-current={current === item.key ? "page" : undefined}>{item.label}</Link>)}
      <div className="notebook-mobile-account"><HeaderAccountLinks service={service} /></div>
    </nav> : null}
  </div>;
}

export function NotebookFooter({ className = "" }: { readonly className?: string }) {
  return <footer className={`notebook-footer ${className}`}><div className="notebook-container">
    <div className="notebook-footer-top">
      <div className="notebook-footer-brand">
        <Link className="notebook-footer-logo" href="/" aria-label="예술in 홈"><Image src="/images/yesulin-logo-transparent.png" alt="예술in" width={86} height={50} /></Link>
        <p className="notebook-footer-slogan">예술의 문을 열다, 예술in</p>
      </div>
      <div className="notebook-footer-navigation">
        <nav aria-label="푸터 서비스" className="notebook-footer-nav">
          <strong>둘러보기</strong>
          <div className="notebook-footer-links"><Link href="/about">서비스 소개</Link><Link href={auditionPostRoutes.list()}>오디션 공고</Link><Link href={showRoutes.list}>무료 공연</Link><Link href={eventRoutes.list}>이벤트</Link><Link href={actorPageRoutes.list()}>배우</Link><Link href="/#faq">자주 묻는 질문</Link></div>
        </nav>
        <nav aria-label="문의" className="notebook-footer-nav">
          <strong>소식·문의</strong>
          <div className="notebook-footer-links"><span className="notebook-email-address">contact@yesulin.art</span><a href="https://pf.kakao.com/_pbTBX/chat" target="_blank" rel="noopener noreferrer" aria-label="카카오톡 문의 (새 창에서 열림)">카카오톡 문의</a><a href={AUDITION_ALERT_CHAT_URL} target="_blank" rel="noopener noreferrer" aria-label="공고 알림 (새 창에서 열림)">공고 알림</a></div>
        </nav>
      </div>
    </div><div className="notebook-footer-bottom"><p>© 2026 예술in 프로젝트팀. All rights reserved.</p><PolicyLinks includeConsent={false} includeContact={false} /></div>
  </div></footer>;
}
