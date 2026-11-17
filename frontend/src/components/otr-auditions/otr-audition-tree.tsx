"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { PiCaretDownBold } from "react-icons/pi";
import { ProducerSidebarItem, sidebarActionClass } from "@/components/producers/producer-sidebar-item";
import { otrAuditionRoutes, type OtrAudition } from "@/features/otr-auditions/types";
import { useOtrAuditions } from "./otr-audition-context";

export function OtrAuditionTreeNav({ onNavigate }: { readonly onNavigate?: () => void }) {
  const { auditions, loading, error, reload } = useOtrAuditions();
  const [open, setOpen] = useState(true);
  const listId = useId();

  return (
    <div>
      <ProducerSidebarItem
        href={otrAuditionRoutes.list}
        label="지원서 접수·심사"
        onNavigate={onNavigate}
        createLink={{ href: otrAuditionRoutes.create, label: "오디션 공고 만들기" }}
      >
        <button
          type="button"
          aria-label="지원서 접수·심사 목록 펼치기/접기"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((value) => !value)}
          className={`group ${sidebarActionClass}`}
        >
          <PiCaretDownBold aria-hidden="true" className="size-3.5 group-aria-expanded:rotate-180" />
        </button>
      </ProducerSidebarItem>
      <div id={listId} hidden={!open} className="ml-3 border-l border-sidebar-line pl-2">
        {loading && <p role="status" className="px-2 py-1.5 text-xs text-sidebar-muted">공고 불러오는 중…</p>}
        {error && <button type="button" onClick={reload} className="min-h-11 px-2 text-left text-sm text-sidebar-text underline">목록 다시 불러오기</button>}
        {!loading && !error && auditions.length === 0 && <p className="px-2 py-1.5 text-xs text-sidebar-muted">등록한 공고가 없어요.</p>}
        <ul className="space-y-0.5">
          {auditions.map((audition) => <li key={audition.id}><AuditionLink audition={audition} onNavigate={onNavigate} /></li>)}
        </ul>
      </div>
    </div>
  );
}

function AuditionLink({ audition, onNavigate }: { readonly audition: OtrAudition; readonly onNavigate?: () => void }) {
  const pathname = usePathname();
  const href = otrAuditionRoutes.selected(audition.id);
  let current: "page" | undefined;
  if (pathname === href) current = "page";
  return (
    <Link href={href} onClick={onNavigate} aria-current={current} title={`[${audition.otrId}] ${audition.title}`}
      className="flex min-h-11 items-center rounded-control px-2 py-2 text-sm text-sidebar-muted hover:bg-sidebar-hover hover:text-white aria-[current=page]:bg-sidebar-hover aria-[current=page]:font-semibold aria-[current=page]:text-white">
      <span className="truncate">[{audition.otrId}] {audition.title}</span>
    </Link>
  );
}
