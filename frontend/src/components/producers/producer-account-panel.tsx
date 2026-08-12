"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { getProducerProfile } from "@/features/auditions/api";
import { PRODUCER_PROFILE_CHANGED } from "@/features/auditions/events";
import { auditionRoutes } from "@/features/auditions/routes";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";

export function ProducerAccountPanel() {
  const query = useAuditionQuery("producer-sidebar-profile", getProducerProfile, "");
  useEffect(() => {
    window.addEventListener(PRODUCER_PROFILE_CHANGED, query.reload);
    return () => window.removeEventListener(PRODUCER_PROFILE_CHANGED, query.reload);
  }, [query.reload]);
  const profile = query.data;
  return (
    <div className="border-t border-sidebar-line px-4 py-4">
      <div className="flex items-center gap-2.5">
        <Image
          src={profile?.logoUrl || "/images/yesulin-logo-mark.png"}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 rounded-full border border-sidebar-line bg-white object-contain"
        />
        <div className="min-w-0 text-xs leading-tight text-sidebar-text">
          <div className="truncate font-semibold">{profile?.companyName || "공연사"}</div>
          <div className="mt-1 text-sidebar-muted">{profile?.contactRole || "계정 정보"}</div>
        </div>
      </div>
      <Link href={auditionRoutes.account} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-control border border-sidebar-line px-3 text-sm font-semibold text-sidebar-text hover:bg-sidebar-hover hover:text-white">공연사 설정</Link>
      <Link
        href="/login"
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-sidebar-line bg-transparent px-3 text-sm font-semibold text-sidebar-text transition-[background-color,border-color,color,transform] duration-150 hover:border-sidebar-muted hover:bg-sidebar-hover hover:text-white active:scale-[0.98]"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
          <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />
        </svg>
        로그아웃
      </Link>
    </div>
  );
}
