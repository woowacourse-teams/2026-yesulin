"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthSession } from "@/components/auth/auth-session";
import { auditionRoutes } from "@/features/auditions/routes";

const KAKAO_CHAT_URL = "http://pf.kakao.com/_pbTBX/chat";

export function ProducerAccessGate({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname();
  const { session } = useAuthSession();
  const pending = session?.role === "PRODUCER" && session.producerStatus === "PENDING";
  const accountPage = pathname === auditionRoutes.account;

  if (!pending || accountPage) return children;

  return (
    <div className="grid min-h-[calc(100vh-68px)] place-items-center bg-surface px-5 py-12 md:px-8">
      <section aria-labelledby="producer-pending-title" className="w-full max-w-[620px] rounded-modal border border-brand-line bg-card p-6 text-center shadow-[var(--shadow-2)] md:p-10">
        <span aria-hidden="true" className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-2xl text-brand">✓</span>
        <p className="mt-5 text-sm font-semibold text-brand">기획사/제작사 활성화 대기</p>
        <h1 id="producer-pending-title" className="mt-2 text-[clamp(26px,4vw,34px)] font-bold tracking-[-0.03em] text-foreground">기획사·제작사 인증이 필요합니다</h1>
        <p className="mx-auto mt-4 max-w-lg leading-7 text-muted-strong">
          등록한 휴대폰과 이메일로 가입 안내를 보내드렸습니다. 운영진 확인이 끝나면 공연 조회와 관리 기능이 활성화됩니다.
        </p>
        <p className="mt-3 text-sm font-medium leading-6 text-muted-strong">카카오톡 채널로 문의주시면 빠른 처리 가능합니다.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <a href={KAKAO_CHAT_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-control bg-kakao px-5 text-sm font-semibold text-kakao-ink transition-[filter,transform] hover:brightness-95 active:scale-[0.98]">카카오톡으로 문의하기</a>
          <Link href={auditionRoutes.account} className="inline-flex min-h-12 items-center justify-center rounded-control border border-border bg-white px-5 text-sm font-semibold text-foreground transition-colors hover:border-brand-line hover:bg-brand-soft">기획사/제작사 정보 설정</Link>
        </div>
      </section>
    </div>
  );
}
