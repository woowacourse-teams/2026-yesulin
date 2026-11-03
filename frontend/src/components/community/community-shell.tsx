"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PiArrowLeft, PiChatCircle, PiHouseSimple, PiMaskHappy, PiPlus, PiTicket } from "react-icons/pi";

const destinations = [
  { href: "/", label: "예술in 홈", icon: PiHouseSimple },
  { href: "/community", label: "커뮤니티", icon: PiChatCircle },
  { href: "/community/new", label: "글 쓰기", icon: PiPlus },
  { href: "/auditions", label: "오디션", icon: PiMaskHappy },
  { href: "/shows", label: "공연", icon: PiTicket },
] as const;

export function CommunityShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  return <div className="community-app public-theme"><a className="community-skip" href="#main">본문으로 바로가기</a>
    <CommunityRail pathname={pathname} /><div className="community-layout"><div className="community-column">
      <header className="community-topbar"><CommunityBack pathname={pathname} /><Link href="/community">커뮤니티</Link><span className="community-topbar-note">예술in</span></header>
      <main id="main" className="community-content">{children}</main></div><CommunityAside /></div>
    <Link className="community-floating-write" href="/community/new" aria-label="새 글 쓰기"><PiPlus size={30} aria-hidden="true" /></Link>
  </div>;
}

function CommunityRail({ pathname }: { readonly pathname: string | null }) {
  return <><Link className="community-wordmark" href="/" aria-label="예술in 홈">예<span>술in</span></Link>
    <nav className="community-rail" aria-label="주요 메뉴">{destinations.map(item => <Link key={item.href} href={item.href}
      aria-label={item.label} title={item.label} aria-current={currentPage(pathname, item.href)}>
      <item.icon size={27} aria-hidden="true" /><span className="community-sr-only">{item.label}</span>
    </Link>)}</nav></>;
}

function currentPage(pathname: string | null, href: string) {
  if (pathname === href) return "page";
  if (href === "/community" && pathname?.match(/^\/community\/\d+$/)) return "page";
  return undefined;
}

function CommunityBack({ pathname }: { readonly pathname: string | null }) {
  if (pathname === "/community") return <span className="community-topbar-spacer" />;
  return <Link className="community-icon-button" href="/community" aria-label="커뮤니티 목록으로"><PiArrowLeft size={22} aria-hidden="true" /></Link>;
}

function CommunityAside() {
  return <aside className="community-aside"><section className="community-welcome"><span className="community-eyebrow">배우들의 자유로운 이야기</span>
    <h2>이름은 내려놓고,<br />이야기를 나눠요.</h2><p>오늘의 연습, 작은 고민, 반가운 소식.<br />무슨 이야기든 괜찮아요.</p>
    <Link className="community-button community-primary" href="/community/new">익명으로 글 쓰기</Link><small>가입 없이, 누구나 함께할 수 있어요.</small></section>
    <div className="community-aside-note"><strong>모든 이야기는 익명으로</strong><p>서로의 경험을 존중하며 편하게 이야기해 주세요.</p></div>
    <footer className="community-footer"><span>© 2026 예술in</span><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보 처리방침</Link></footer></aside>;
}
