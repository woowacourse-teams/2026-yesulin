"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/auth-session";
import { logout as requestLogout } from "@/features/auth/session-api";
import { getProducerProfile } from "@/features/auditions/api";
import { PRODUCER_PROFILE_CHANGED } from "@/features/auditions/events";
import { auditionRoutes } from "@/features/auditions/routes";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";

export function ProducerAccountPanel() {
  const router = useRouter();
  const { clearSession } = useAuthSession();
  const query = useAuditionQuery("producer-sidebar-profile", getProducerProfile, "");
  useEffect(() => {
    window.addEventListener(PRODUCER_PROFILE_CHANGED, query.reload);
    return () => window.removeEventListener(PRODUCER_PROFILE_CHANGED, query.reload);
  }, [query.reload]);
  const profile = query.data;
  const logout = async () => {
    // 서버 세션을 먼저 지운다. 실패해도 화면 상태는 비워 로그인 화면으로 보낸다.
    try {
      await requestLogout();
    } catch {
      // 세션이 이미 없거나 네트워크가 끊긴 경우에도 로그아웃을 진행한다.
    }
    clearSession();
    router.push("/login");
  };
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
          <div className="truncate font-semibold">{profile?.companyName || "기획사/제작사"}</div>
          <div className="mt-1 text-sidebar-muted">{profile?.contactRole || "계정 정보"}</div>
        </div>
      </div>
      <Link href={auditionRoutes.account} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-control border border-sidebar-line px-3 text-sm font-semibold text-sidebar-text hover:bg-sidebar-hover hover:text-white">기획사/제작사 설정</Link>
      <button
        type="button"
        onClick={() => void logout()}
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-sidebar-line bg-transparent px-3 text-sm font-semibold text-sidebar-text transition-[background-color,border-color,color,transform] duration-150 hover:border-sidebar-muted hover:bg-sidebar-hover hover:text-white active:scale-[0.98]"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
          <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />
        </svg>
        로그아웃
      </button>
    </div>
  );
}
