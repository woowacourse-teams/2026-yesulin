"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "대시보드", href: null, icon: "grid" },
  { label: "공연 관리", href: "/producers/performances", icon: "stage" },
  { label: "지원 공고 관리", href: null, icon: "document" },
  { label: "지원자 관리", href: null, icon: "people" },
  { label: "모집 공고 만들기", href: null, icon: "plus" },
] as const;

export function ProducerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[248px_1fr]">
      <a
        href="#producer-main"
        className="fixed left-4 top-4 z-50 -translate-y-24 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white focus:translate-y-0"
      >
        본문으로 바로가기
      </a>

      <aside className="hidden border-r border-border bg-sidebar lg:flex lg:flex-col">
        <Link
          href="/producers/performances"
          className="flex items-center gap-2.5 border-b border-border px-6 py-5"
        >
          <BrandMark />
          <div className="flex flex-col leading-none">
            <BrandWordmark />
            <span className="mt-1 text-[10px] uppercase tracking-widest text-muted">
              Producer Console
            </span>
          </div>
        </Link>

        <nav className="flex-1 space-y-0.5 p-3" aria-label="주요 메뉴">
          {navigation.map((item) => {
            const active = item.href ? pathname.startsWith(item.href) : false;

            if (!item.href) {
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground opacity-55"
                  aria-disabled="true"
                >
                  <NavigationIcon name={item.icon} />
                  <span>{item.label}</span>
                  <span className="ml-auto text-[9px] text-muted">준비 중</span>
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary text-white shadow-elev-1"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <NavigationIcon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/ninejin-group-logo.png"
              alt="나인진엔터테인먼트"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full border border-border bg-white object-contain"
            />
            <div className="min-w-0 text-xs leading-tight">
              <div className="truncate font-semibold text-foreground">나인진엔터테인먼트</div>
              <div className="text-muted">캐스팅 담당</div>
            </div>
            <button
              type="button"
              aria-label="로그아웃"
              className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted hover:bg-sidebar-accent hover:text-foreground"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 bg-background">
        <MobileHeader pathname={pathname} />
        <main id="producer-main" className="mx-auto max-w-[1400px] p-4 md:p-8 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}

function MobileHeader({ pathname }: { pathname: string }) {
  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/producers/performances" className="flex items-center gap-2">
          <BrandMark />
          <BrandWordmark />
        </Link>
        <div className="flex items-center gap-2">
          <Image
            src="/images/ninejin-group-logo.png"
            alt="나인진엔터테인먼트"
            width={32}
            height={32}
            className="h-8 w-8 rounded-full border border-border bg-white object-contain"
          />
          <span className="max-w-32 truncate text-xs font-semibold">나인진엔터테인먼트</span>
          <button
            type="button"
            aria-label="로그아웃"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border"
          >
            <LogoutIcon />
          </button>
        </div>
      </header>
      <nav
        className="flex gap-1 overflow-x-auto border-b border-border bg-background/90 px-4 py-2 lg:hidden"
        aria-label="주요 메뉴"
      >
        {navigation.map((item) => {
          const active = item.href ? pathname.startsWith(item.href) : false;
          return item.href ? (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm ${
                active ? "bg-primary text-white" : "text-muted"
              }`}
            >
              <NavigationIcon name={item.icon} /> {item.label}
            </Link>
          ) : null;
        })}
      </nav>
    </>
  );
}

function BrandMark() {
  return (
    <span
      className="relative inline-flex h-8 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white px-1.5 py-1 shadow-[0_4px_14px_rgba(0,0,0,0.1)] ring-1 ring-black/10"
      aria-hidden="true"
    >
      <Image
        src="/images/yesulin-logo-mark.png"
        alt=""
        width={64}
        height={32}
        className="h-full w-full object-contain"
      />
    </span>
  );
}

function BrandWordmark() {
  return (
    <span className="inline-flex h-5 w-[3.75rem] shrink-0 items-center">
      <Image
        src="/images/yesulin-wordmark.png"
        alt="예술IN"
        width={60}
        height={20}
        className="h-full w-full object-contain"
      />
    </span>
  );
}

function NavigationIcon({ name }: { name: (typeof navigation)[number]["icon"] }) {
  const paths = {
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    stage: "M4 6h16v12H4zM8 18v2m8-2v2M8 10h8m-6 4h4",
    document: "M6 3h9l3 3v15H6zM14 3v4h4M9 12h6m-6 4h6",
    people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6-1a2.5 2.5 0 1 0 0-5M3 20a6 6 0 0 1 12 0m1-7a5 5 0 0 1 5 5",
    plus: "M12 5v14m-7-7h14M4 3h16v18H4z",
  } as const;

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <path
        d="M10 5H5v14h5m4-3 4-4-4-4m4 4H9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
