"use client";

import { useProducerNavigation } from "./producer-navigation-context";

export function ProducerSidebarToggle() {
  const { sidebarOpen, openSidebar } = useProducerNavigation();

  return (
    <button
      type="button"
      aria-label="관리 사이드바 열기"
      aria-expanded={sidebarOpen}
      title="사이드바 열기"
      onClick={openSidebar}
      className={`${sidebarOpen ? "hidden" : "grid"} h-11 w-11 shrink-0 place-items-center rounded-control border border-brand-line bg-brand-soft text-brand transition-colors hover:bg-brand-soft-strong`}
    >
      <span aria-hidden="true" className="grid gap-1">
        <span className="block h-0.5 w-5 rounded-full bg-current" />
        <span className="block h-0.5 w-5 rounded-full bg-current" />
        <span className="block h-0.5 w-5 rounded-full bg-current" />
      </span>
    </button>
  );
}
