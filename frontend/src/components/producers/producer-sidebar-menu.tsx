"use client";

import type { ReactNode } from "react";
import { OtrAuditionTreeNav } from "@/components/otr-auditions/otr-audition-tree";
import { actorBookmarkRoutes } from "@/features/actor-pages/bookmark-api";
import { producerAuditionPostRoutes } from "@/features/audition-posts/types";
import { PRODUCER_DASHBOARD_PATH } from "@/features/auth/producer-navigation";
import { showRoutes } from "@/features/shows/types";
import { ProducerSidebarItem } from "./producer-sidebar-item";
import { SidebarSlotTarget, type SidebarSurface } from "./sidebar-slot";

const PDF_REVIEW_PATH = "/producers/pdf-reviews";

export function ProducerSidebarMenu({ onNavigate, reviewSlot }: { readonly onNavigate?: () => void; readonly reviewSlot?: SidebarSurface }) {
  return (
    <nav aria-label="공연사 관리 메뉴" className="min-h-0 flex-1 divide-y divide-sidebar-line overflow-y-auto overscroll-contain px-2 py-2">
      <div className="pb-2">
        <ProducerSidebarItem href={PRODUCER_DASHBOARD_PATH} label="대시보드" exact onNavigate={onNavigate} />
      </div>
      <SidebarGroup label="오디션">
        <ProducerSidebarItem href={producerAuditionPostRoutes.list} label="내 오디션 공고" onNavigate={onNavigate}
          createLink={{ href: producerAuditionPostRoutes.create, label: "공고 올리기" }} />
        <OtrAuditionTreeNav onNavigate={onNavigate} />
        <ProducerSidebarItem href={PDF_REVIEW_PATH} label="PDF 지원서 심사" onNavigate={onNavigate}
          createLink={{ href: `${PDF_REVIEW_PATH}?create=1`, label: "심사함 추가하기" }} />
        {reviewSlot && <SidebarSlotTarget surface={reviewSlot} />}
      </SidebarGroup>
      <SidebarGroup label="공연">
        <ProducerSidebarItem href={showRoutes.manageList} label="무료 공연 관리" onNavigate={onNavigate}
          createLink={{ href: `${showRoutes.manageList}?create=1`, label: "무료 공연 등록" }} />
      </SidebarGroup>
      <SidebarGroup label="배우">
        <ProducerSidebarItem href={actorBookmarkRoutes.list()} label="관심 배우" onNavigate={onNavigate} />
      </SidebarGroup>
    </nav>
  );
}

function SidebarGroup({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <section className="py-3">
      <h3 className="mb-1 px-3 text-xs font-semibold text-sidebar-muted">{label}</h3>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}
