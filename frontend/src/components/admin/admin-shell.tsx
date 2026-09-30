"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ADMIN_SECTIONS, adminSectionHref, type AdminNavTarget, type AdminSection } from "@/features/admin/sections";

type NavItem = {
  readonly id: AdminNavTarget;
  readonly label: string;
  readonly href: string;
};

const NAV_ITEMS: readonly NavItem[] = [
  ...ADMIN_SECTIONS.map((section) => ({ id: section.id, label: section.label, href: adminSectionHref(section.id) })),
  { id: "files", label: "파일 관리", href: "/admin/files" },
  { id: "logs", label: "애플리케이션 로그", href: "/admin/logs" },
];

type Props = {
  readonly current: AdminNavTarget;
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  /** 확인이 필요한 건수를 메뉴 옆에 보여 준다. 0이면 표시하지 않는다. */
  readonly badges?: Partial<Record<AdminSection, number>>;
  readonly children: ReactNode;
};

function Badge({ count, dark }: { readonly count: number; readonly dark: boolean }) {
  return (
    <span
      className={`num inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
        dark ? "bg-warn text-white" : "bg-warn-bg text-warn"
      }`}
    >
      {count}
      <span className="sr-only">건 확인 필요</span>
    </span>
  );
}

/** 운영 대시보드·파일 관리·로그 화면이 함께 쓰는 틀이다. 데스크톱은 왼쪽 메뉴, 모바일은 가로 탭으로 이동한다. */
export function AdminShell({ current, title, description, actions, badges = {}, children }: Props) {
  const badgeOf = (id: AdminNavTarget) => (id === "logs" || id === "files" ? 0 : badges[id] ?? 0);
  const mobileNavRef = useRef<HTMLElement>(null);

  // 모바일 가로 탭에서 뒤쪽 메뉴(파일·로그)에 있어도 현재 탭이 보이도록 가운데로 스크롤한다.
  useEffect(() => {
    const nav = mobileNavRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    const navRect = nav.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    nav.scrollLeft += activeRect.left - navRect.left - (navRect.width - activeRect.width) / 2;
  }, [current]);

  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="hidden bg-sidebar text-sidebar-text lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="border-b border-sidebar-line px-5 py-4">
          <Link href="/admin" aria-label="운영 대시보드 개요" className="relative block h-12 w-20 rounded-control">
            <Image src="/images/yesulin-logo.png" alt="예술in" fill sizes="80px" priority className="object-contain brightness-0 invert" />
          </Link>
          <p className="mt-2 text-xs text-sidebar-muted">운영 · 개발팀 전용 화면</p>
        </div>
        <nav aria-label="운영 메뉴" className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = item.id === current;
            const count = badgeOf(item.id);
            return (
              <Fragment key={item.id}>
                {/* 대시보드 탭과 별도 화면(파일·로그)을 나눈다. */}
                {item.id === "files" ? <hr className="my-2 border-sidebar-line" /> : null}
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center justify-between gap-2 rounded-control px-3 text-sm font-semibold transition-colors ${
                    active ? "bg-sidebar-hover text-white" : "text-sidebar-muted hover:bg-sidebar-surface hover:text-white"
                  }`}
                >
                  {item.label}
                  {count > 0 ? <Badge count={count} dark /> : null}
                </Link>
              </Fragment>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8 lg:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/admin" aria-label="운영 대시보드 개요" className="relative block h-8 w-14 shrink-0 rounded-control lg:hidden">
                <Image src="/images/yesulin-logo.png" alt="예술in" fill sizes="56px" priority className="object-contain" />
              </Link>
              <h1 className="text-lg font-bold tracking-[-0.02em] text-foreground lg:text-xl">{title}</h1>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
          <nav ref={mobileNavRef} aria-label="운영 메뉴" className="overflow-x-auto border-t border-border-soft lg:hidden">
            <ul className="flex min-w-max gap-1 px-2">
              {NAV_ITEMS.map((item) => {
                const active = item.id === current;
                const count = badgeOf(item.id);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold ${
                        active ? "border-foreground text-foreground" : "border-transparent text-muted hover:text-foreground"
                      }`}
                    >
                      {item.id === "logs" ? "로그" : item.id === "files" ? "파일" : item.label}
                      {count > 0 ? <Badge count={count} dark={false} /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </header>

        <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
          {description ? <p className="-mb-2 text-sm text-muted">{description}</p> : null}
          {children}
        </main>
      </div>
    </div>
  );
}

const ACTION_CLASS =
  "inline-flex min-h-11 items-center rounded-control border border-border bg-card px-4 text-sm font-semibold text-muted-strong transition-colors hover:bg-surface hover:text-foreground";

export function AdminActionButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={ACTION_CLASS} {...props} />;
}
