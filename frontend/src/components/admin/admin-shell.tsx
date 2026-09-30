import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
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

/** 운영 대시보드와 로그 화면이 함께 쓰는 틀이다. 데스크톱은 왼쪽 메뉴, 모바일은 가로 탭으로 이동한다. */
export function AdminShell({ current, title, description, actions, badges = {}, children }: Props) {
  const badgeOf = (id: AdminNavTarget) => (id === "logs" || id === "files" ? 0 : badges[id] ?? 0);

  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="hidden bg-sidebar text-sidebar-text lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="border-b border-sidebar-line px-5 py-5">
          <p className="text-base font-bold tracking-[-0.02em] text-white">예술in 운영</p>
          <p className="mt-1 text-xs text-sidebar-muted">개발팀 전용 화면</p>
        </div>
        <nav aria-label="운영 메뉴" className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = item.id === current;
            const count = badgeOf(item.id);
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center justify-between gap-2 rounded-control px-3 text-sm font-semibold transition-colors ${
                  active ? "bg-sidebar-hover text-white" : "text-sidebar-muted hover:bg-sidebar-surface hover:text-white"
                } ${item.id === "logs" ? "mt-3 border-t border-sidebar-line pt-3" : ""}`}
              >
                {item.label}
                {count > 0 ? <Badge count={count} dark /> : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8 lg:py-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted lg:hidden">예술in 운영</p>
              <h1 className="text-lg font-bold tracking-[-0.02em] text-foreground lg:text-xl">{title}</h1>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
          <nav aria-label="운영 메뉴" className="overflow-x-auto border-t border-border-soft lg:hidden">
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
