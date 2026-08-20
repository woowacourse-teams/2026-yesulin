"use client";

import Image from "next/image";
import Link from "next/link";
import { useProducerNavigation } from "@/components/producers/producer-navigation-context";
import { auditionRoutes } from "@/features/auditions/routes";

export type CrumbItem = {
  readonly label: string;
  /** 마지막 항목은 href 없이 현재 위치로 표시된다. */
  readonly href?: string;
};

const SHOW_PROTOTYPE = process.env.NODE_ENV === "development";

export function Breadcrumb({ items }: { items: readonly CrumbItem[] }) {
  const { focusMode, openSidebar } = useProducerNavigation();
  return (
    <div className={`glass-surface flex min-h-12 flex-wrap items-center gap-2 border-b border-border px-4 py-2 md:px-6 ${focusMode ? "lg:sticky lg:top-0 lg:z-30" : ""}`}>
      {focusMode ? (
        <div className="mr-1 hidden shrink-0 items-center gap-2 lg:flex">
          <button
            type="button"
            aria-label="공연 관리 사이드바 열기"
            onClick={openSidebar}
            className="grid h-10 w-10 place-items-center rounded-control border border-brand-line bg-brand-soft text-brand transition-colors hover:bg-brand-soft-strong"
          >
            <span aria-hidden="true" className="grid gap-1">
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
            </span>
          </button>
          <Link href={auditionRoutes.performances} aria-label="예술in 공연 관리 홈" className="relative block h-10 w-[72px] rounded-control">
            <Image src="/images/yesulin-logo.png" alt="예술in" fill sizes="72px" priority className="object-contain" />
          </Link>
          <span aria-hidden="true" className="h-6 w-px bg-border" />
        </div>
      ) : null}
      <nav aria-label="현재 위치" className={`${focusMode ? "" : "-ml-2"} flex min-w-0 flex-wrap items-center gap-0.5`}>
        {items.map((item, index) => (
          <span key={`${item.label}-${index}`} className="flex items-center">
            {index > 0 ? (
              <span aria-hidden="true" className="select-none px-px text-dense text-muted-soft">
                /
              </span>
            ) : null}
            {item.href ? (
              <Link
                href={item.href}
                className="inline-flex min-h-11 max-w-[280px] items-center whitespace-nowrap rounded-control px-2 py-1 text-base text-muted-strong transition-colors hover:bg-border-soft hover:text-foreground lg:min-h-0 lg:text-dense"
              >
                <span className="truncate">{item.label}</span>
              </Link>
            ) : (
              <span
                aria-current="page"
                className="inline-flex max-w-[280px] items-center whitespace-nowrap rounded-control px-2 py-1 text-base font-semibold text-foreground lg:text-dense"
              >
                <span className="truncate">{item.label}</span>
              </span>
            )}
          </span>
        ))}
      </nav>
      {SHOW_PROTOTYPE ? (
        <span className="ml-auto rounded-lg border border-dashed border-muted-soft px-2 py-0.5 text-xs uppercase tracking-[0.06em] text-muted">
          prototype
        </span>
      ) : null}
    </div>
  );
}
