"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRODUCER_DASHBOARD_PATH } from "@/features/auth/producer-navigation";

export function ProducerDashboardLink() {
  const pathname = usePathname();
  let current: "page" | undefined;
  if (pathname === PRODUCER_DASHBOARD_PATH) current = "page";
  return (
    <Link
      href={PRODUCER_DASHBOARD_PATH}
      aria-current={current}
      className="inline-flex min-h-11 shrink-0 items-center rounded-control px-2 text-sm font-semibold text-muted-strong aria-[current=page]:text-foreground hover:bg-brand-soft hover:text-brand-strong"
    >
      대시보드
    </Link>
  );
}
