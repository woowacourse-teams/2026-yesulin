import Link from "next/link";

export type CrumbItem = {
  readonly icon: string;
  readonly label: string;
  /** 마지막 항목은 href 없이 현재 위치로 표시된다. */
  readonly href?: string;
};

export function Breadcrumb({ items }: { items: readonly CrumbItem[] }) {
  return (
    <div className="flex min-h-12 flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-[11px] md:px-6">
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
                className="inline-flex max-w-[280px] items-center gap-1.5 whitespace-nowrap rounded-[5px] px-2 py-1 text-[13.5px] text-muted-strong transition-colors hover:bg-border-soft hover:text-foreground"
              >
                <span aria-hidden="true" className="text-sm leading-none">
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            ) : (
              <span
                aria-current="page"
                className="inline-flex max-w-[280px] items-center gap-1.5 whitespace-nowrap rounded-[5px] px-2 py-1 text-[13.5px] font-semibold text-foreground"
              >
                <span aria-hidden="true" className="text-sm leading-none">
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </span>
            )}
          </span>
        ))}
      </nav>
      <span className="ml-auto rounded-full border border-dashed border-muted-soft px-2 py-[3px] text-[11px] uppercase tracking-[0.06em] text-muted">
        prototype
      </span>
    </div>
  );
}
