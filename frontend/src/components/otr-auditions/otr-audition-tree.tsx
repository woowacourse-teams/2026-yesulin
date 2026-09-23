"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { otrAuditionRoutes } from "@/features/otr-auditions/types";
import { useOtrAuditions } from "./otr-audition-context";

export function OtrAuditionTreeNav({ onNavigate }: { readonly onNavigate?: () => void }) {
  const pathname = usePathname();
  const { auditions, loading, error, reload } = useOtrAuditions();
  const [open, setOpen] = useState(true);
  const isActive = pathname.startsWith(otrAuditionRoutes.list);

  return <nav aria-label="OTR 공고" className="border-b border-sidebar-line px-2 pb-4 pt-2">
    <div className="flex items-center gap-0.5">
      <button type="button" aria-label="OTR 공고 목록 펼치기/접기" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-sidebar-muted hover:bg-sidebar-hover hover:text-white lg:h-[30px] lg:w-[26px]">
        <span aria-hidden="true" className={`inline-block border-y-4 border-l-[6px] border-y-transparent border-l-current transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      <Link href={otrAuditionRoutes.list} onClick={onNavigate} aria-current={pathname === otrAuditionRoutes.list ? "page" : undefined} className={`flex min-h-11 flex-1 items-center rounded-control py-2 pl-0.5 pr-1.5 text-left text-base font-bold transition-colors hover:bg-sidebar-hover lg:min-h-0 lg:text-dense ${isActive ? "text-brand-line" : "text-sidebar-muted hover:text-white"}`}>
        OTR 공고 관리
      </Link>
      <Link href={otrAuditionRoutes.create} onClick={onNavigate} aria-label="OTR 공고 만들기" title="OTR 공고 만들기" className="grid h-11 w-11 shrink-0 place-items-center rounded-control text-lg font-semibold text-sidebar-muted hover:bg-sidebar-hover hover:text-white lg:h-[30px] lg:w-[30px]">+</Link>
    </div>
    {open ? <div className="ml-3.5 border-l border-sidebar-line pl-4">
      {loading ? <p role="status" className="px-2 py-2 text-xs text-sidebar-muted">공고 불러오는 중…</p> : null}
      {error ? <button type="button" onClick={() => void reload()} className="min-h-11 px-2 text-left text-xs text-sidebar-muted underline">목록 다시 불러오기</button> : null}
      {!loading && !error && auditions.length === 0 ? <p className="px-2 py-2 text-xs text-sidebar-muted">등록된 공고가 없습니다.</p> : null}
      <ul className="space-y-0.5">{auditions.map((audition) => {
        const href = otrAuditionRoutes.selected(audition.id);
        return <li key={audition.id}>
          <Link href={href} onClick={onNavigate} aria-current={pathname === href ? "page" : undefined} title={`${audition.otrId} - ${audition.title}`} className={`flex min-h-11 items-center rounded-control px-2 py-2 text-sm transition-colors lg:min-h-8 lg:text-xs ${pathname === href ? "bg-brand font-semibold text-white" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-white"}`}>
            <span className="truncate">[{audition.otrId}] {audition.title}</span>
          </Link>
        </li>;
      })}</ul>
    </div> : null}
  </nav>;
}
