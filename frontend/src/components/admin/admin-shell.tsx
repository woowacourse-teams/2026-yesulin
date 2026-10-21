"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useRef, type ButtonHTMLAttributes, type ComponentProps, type ReactNode } from "react";
import { ADMIN_SECTIONS, adminSectionHref, type AdminNavTarget, type AdminSection } from "@/features/admin/sections";
import { DestructiveButton, PrimaryButton, PrimaryLink, SecondaryButton, SecondaryLink, TextButton, TextLink } from "@/components/ui/controls";
import "./admin-workspace.css";

type NavItem = {
  readonly id: AdminNavTarget;
  readonly label: string;
  readonly href: string;
};

const NAV_ITEMS: readonly NavItem[] = [
  { id: "overview", label: "개요", href: "/admin" },
  { id: "posts", label: "공고 관리", href: "/admin/posts" },
  { id: "events", label: "이벤트", href: "/admin/events" },
  ...ADMIN_SECTIONS.filter((section) => section.id !== "overview" && section.id !== "producers" && section.id !== "audit")
    .map((section) => ({ id: section.id, label: section.label, href: adminSectionHref(section.id) })),
  { id: "messages", label: "문자 대기열", href: "/admin/messages" },
  { id: "audit", label: "변경 기록", href: adminSectionHref("audit") },
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
  readonly layout?: "workspace" | "form";
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
export function AdminShell({ current, title, description, actions, badges = {}, children, layout = "workspace" }: Props) {
  const activeTarget = current === "producers" ? "members" : current;
  const badgeOf = (id: AdminNavTarget) => (id === "logs" || id === "files" || id === "messages" || id === "posts" || id === "events" ? 0 : badges[id] ?? 0);
  const mobileNavRef = useRef<HTMLElement>(null);

  // 모바일 가로 탭에서 뒤쪽 메뉴(파일·로그)에 있어도 현재 탭이 보이도록 가운데로 스크롤한다.
  useEffect(() => {
    const nav = mobileNavRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    const navRect = nav.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    nav.scrollLeft += activeRect.left - navRect.left - (navRect.width - activeRect.width) / 2;
  }, [activeTarget]);

  return (
    <div className="admin-workspace min-h-dvh bg-surface lg:grid lg:grid-cols-[224px_minmax(0,1fr)]">
      <a href="#admin-content" className="sr-only z-50 rounded-control bg-card px-4 py-3 font-semibold focus:not-sr-only focus:fixed focus:left-4 focus:top-4">본문으로 바로가기</a>
      <aside className="hidden overflow-y-auto bg-sidebar text-sidebar-text lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="border-b border-sidebar-line px-5 py-4">
          <Link href="/admin" aria-label="운영 대시보드 개요" className="relative block h-12 w-20 rounded-control">
            <Image src="/images/yesulin-logo.png" alt="예술in" fill sizes="80px" priority className="object-contain brightness-0 invert" />
          </Link>
          <p className="mt-2 text-xs text-sidebar-muted">관리자</p>
        </div>
        <nav aria-label="운영 메뉴" className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = item.id === activeTarget;
            const count = badgeOf(item.id);
            return (
              <Fragment key={item.id}>
                {item.id === "audit" ? (
                  <div className="mb-2 mt-5 border-t border-sidebar-line px-3 pt-5">
                    <h2 className="text-xs font-bold tracking-wide text-sidebar-text">운영 도구</h2>
                  </div>
                ) : null}
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center justify-between gap-2 rounded-control px-3 text-sm font-semibold transition-colors ${
                    active ? "bg-sidebar-hover text-white shadow-[inset_3px_0_0_var(--brand)]" : "text-sidebar-muted hover:bg-sidebar-surface hover:text-white"
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
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8 lg:py-4">
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
                const active = item.id === activeTarget;
                const count = badgeOf(item.id);
                return (
                  <li key={item.id} className={item.id === "audit" ? "ml-3 border-l border-border pl-3" : undefined}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold ${
                        active ? "border-foreground text-foreground" : "border-transparent text-muted hover:text-foreground"
                      }`}
                    >
                      {item.id === "logs" ? "로그" : item.id === "files" ? "파일" : item.id === "posts" ? "공고" : item.label}
                      {count > 0 ? <Badge count={count} dark={false} /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </header>

        <main id="admin-content" tabIndex={-1} className={`mx-auto flex w-full flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8 ${layout === "form" ? "max-w-[1040px]" : "max-w-[1600px]"}`}>
          {description ? <p className="max-w-3xl text-sm leading-6 text-muted-strong">{description}</p> : null}
          {children}
        </main>
      </div>
    </div>
  );
}

type ActionTone = "primary" | "secondary" | "quiet" | "destructive";

export function AdminActionButton({ tone = "secondary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { readonly tone?: ActionTone }) {
  const Button = tone === "primary" ? PrimaryButton : tone === "quiet" ? TextButton : tone === "destructive" ? DestructiveButton : SecondaryButton;
  return <Button className={`whitespace-nowrap ${className}`} {...props} />;
}

export function AdminActionLink({ tone = "secondary", className = "", ...props }: ComponentProps<typeof SecondaryLink> & { readonly tone?: Exclude<ActionTone, "destructive"> }) {
  const ActionLink = tone === "primary" ? PrimaryLink : tone === "quiet" ? TextLink : SecondaryLink;
  return <ActionLink className={`whitespace-nowrap ${className}`} {...props} />;
}

export function AdminFilterButton({ pressed, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { readonly pressed: boolean }) {
  return <AdminActionButton aria-pressed={pressed} className={`${pressed ? "!border-foreground !bg-foreground !text-white" : ""} ${className}`} {...props} />;
}

export function AdminEmptyState({ title, description, children }: { readonly title: string; readonly description?: string; readonly children?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-border bg-card px-5 py-12 text-center sm:py-16">
      <p className="font-semibold text-foreground">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{description}</p> : null}
      {children ? <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}
