import Link from "next/link";

export type CrumbItem = {
  readonly label: string;
  /** 마지막 항목은 href 없이 현재 위치로 표시된다. */
  readonly href?: string;
};

const SHOW_PROTOTYPE = process.env.NODE_ENV === "development";

export function Breadcrumb({ items }: { items: readonly CrumbItem[] }) {
  return (
    <div className="glass-surface flex min-h-12 flex-wrap items-center gap-2 border-b border-border px-4 py-[11px] md:px-6">
      <nav aria-label="현재 위치" className="-ml-[7px] flex min-w-0 flex-wrap items-center gap-0.5">
        {items.map((item, index) => (
          <span key={`${item.label}-${index}`} className="flex items-center">
            {index > 0 ? (
              <span aria-hidden="true" className="select-none px-px text-[13px] text-muted-soft">
                /
              </span>
            ) : null}
            {item.href ? (
              <Link
                href={item.href}
                className="inline-flex min-h-11 max-w-[280px] items-center whitespace-nowrap rounded-control px-2 py-1 text-base text-muted-strong transition-colors hover:bg-border-soft hover:text-foreground lg:min-h-0 lg:text-[13.5px]"
              >
                <span className="truncate">{item.label}</span>
              </Link>
            ) : (
              <span
                aria-current="page"
                className="inline-flex max-w-[280px] items-center whitespace-nowrap rounded-control px-2 py-1 text-base font-semibold text-foreground lg:text-[13.5px]"
              >
                <span className="truncate">{item.label}</span>
              </span>
            )}
          </span>
        ))}
      </nav>
      {SHOW_PROTOTYPE ? (
        <span className="ml-auto rounded-lg border border-dashed border-muted-soft px-2 py-0.5 text-[11px] uppercase tracking-[0.06em] text-muted">
          prototype
        </span>
      ) : null}
    </div>
  );
}
