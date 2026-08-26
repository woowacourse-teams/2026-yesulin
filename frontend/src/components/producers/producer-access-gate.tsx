"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthSession } from "@/components/auth/auth-session";
import { resendProducerVerificationEmail } from "@/features/auth/api";
import { auditionRoutes } from "@/features/auditions/routes";

const KAKAO_CHAT_URL = "http://pf.kakao.com/_pbTBX/chat";

export function ProducerAccessGate({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname();
  const { session } = useAuthSession();
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendFailed, setResendFailed] = useState(false);
  const pending = session?.role === "PRODUCER" && session.producerStatus === "PENDING";
  const accountPage = pathname === auditionRoutes.account;

  const resendEmail = async () => {
    setResending(true);
    setResendMessage("");
    setResendFailed(false);
    try {
      await resendProducerVerificationEmail();
      setResendMessage("인증 이메일을 다시 보냈습니다. 새 이메일의 링크를 5분 안에 눌러 주세요.");
    } catch (cause) {
      setResendFailed(true);
      setResendMessage(cause instanceof Error ? cause.message : "인증 이메일을 재전송하지 못했습니다.");
    } finally {
      setResending(false);
    }
  };

  if (!pending || accountPage) return children;

  return (
    <div className="grid min-h-[calc(100vh-68px)] place-items-center bg-surface px-5 py-12 md:px-8">
      <section aria-labelledby="producer-pending-title" className="w-full max-w-[620px] rounded-modal border border-brand-line bg-card p-6 text-center shadow-[var(--shadow-2)] md:p-10">
        <span aria-hidden="true" className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-2xl text-brand">✓</span>
        <p className="mt-5 text-sm font-semibold text-brand">기획사/제작사 활성화 대기</p>
        <h1 id="producer-pending-title" className="mt-2 text-[clamp(26px,4vw,34px)] font-bold tracking-[-0.03em] text-foreground">기획사·제작사 인증이 필요합니다</h1>
        <p className="mx-auto mt-4 max-w-lg leading-7 text-muted-strong">
          가입 시 입력한 이메일로 인증 안내를 보내드렸습니다. 이메일을 받은 뒤 5분 안에 인증을 완료해 주세요.
        </p>
        <p className="mx-auto mt-3 max-w-lg text-sm font-medium leading-6 text-muted-strong">
          5분이 지났거나 이메일이 도착하지 않았다면 재전송해 주세요. 처리가 어렵다면 카카오톡 채널로 문의해 주세요.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <a href={KAKAO_CHAT_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-control bg-kakao px-5 text-sm font-semibold text-kakao-ink transition-[filter,transform] hover:brightness-95 active:scale-[0.98]">카카오톡으로 문의하기</a>
          <button type="button" disabled={resending} onClick={() => void resendEmail()} className="inline-flex min-h-12 items-center justify-center rounded-control border border-border bg-white px-5 text-sm font-semibold text-foreground transition-colors hover:border-brand-line hover:bg-brand-soft disabled:cursor-not-allowed disabled:bg-border-soft disabled:text-muted">
            {resending ? "재전송 중…" : "이메일 재전송"}
          </button>
        </div>
        {resendMessage ? (
          <p role={resendFailed ? "alert" : "status"} className={`mx-auto mt-4 max-w-lg text-sm font-medium leading-6 ${resendFailed ? "text-fail" : "text-pass"}`}>
            {resendMessage}
          </p>
        ) : null}
      </section>
    </div>
  );
}
