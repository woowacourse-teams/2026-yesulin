import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export const sidebarActionClass = "grid h-11 w-11 shrink-0 place-items-center rounded-control text-sidebar-muted hover:bg-sidebar-hover hover:text-white";

type SidebarItemProps = {
  readonly href: string;
  readonly label: string;
  readonly exact?: boolean;
  readonly createLink?: { readonly href: string; readonly label: string };
  readonly onNavigate?: () => void;
  readonly children?: ReactNode;
};

export function ProducerSidebarItem({ href, label, exact = false, createLink, onNavigate, children }: SidebarItemProps) {
  const pathname = usePathname();
  let current: "page" | undefined;
  if (pathname === href) current = "page";
  const active = current === "page" || (!exact && pathname.startsWith(`${href}/`));

  return (
    <div className="flex items-center gap-0.5">
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={current}
        data-active={active}
        className="flex min-h-11 min-w-0 flex-1 items-center break-keep rounded-control py-2 pl-3 pr-1.5 text-sm font-semibold text-sidebar-text hover:bg-sidebar-hover hover:text-white data-[active=true]:bg-sidebar-hover data-[active=true]:text-white"
      >
        {label}
      </Link>
      {children}
      {createLink && (
        <Link href={createLink.href} onClick={onNavigate} aria-label={createLink.label} title={createLink.label} className={`${sidebarActionClass} text-lg`}>
          <span aria-hidden="true">+</span>
        </Link>
      )}
    </div>
  );
}
