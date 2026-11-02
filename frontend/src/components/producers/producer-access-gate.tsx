"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthSession } from "@/components/auth/auth-session";
import { resendProducerVerificationEmail } from "@/features/auth/api";
import { auditionRoutes } from "@/features/auditions/routes";

const KAKAO_CHAT_URL = "http://pf.kakao.com/_pbTBX/chat";

export function ProducerAccessGate({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, refreshSession } = useAuthSession();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendFailed, setResendFailed] = useState(false);
  const pending = session?.role === "PRODUCER" && session.producerStatus === "PENDING";
  const accountPage = pathname === auditionRoutes.account;

  async function checkVerification() {
    setChecking(true);
    setResendMessage("");
    try {
      await refreshSession();
      setResendFailed(false);
      setResendMessage("인증 상태를 확인했습니다. 아직 대기 중이면 받은 메일의 인증 링크를 눌러 주세요.");
    } catch {
      setResendFailed(true);
      setResendMessage("인증 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setChecking(false);
    }
  }

  const resendEmail = async () => {
    setResending(true);
    setResendMessage("");
    setResendFailed(false);
    try {
      await resendProducerVerificationEmail();
      setResendMessage("인증 이메일을 다시 보냈습니다. 새 이메일의 링크를 5분 안에 눌러 주세요.");
    } catch (cause) {
      console.error("[인증 이메일 재전송 실패]", cause);
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
          가입 시 입력한 이메일의 인증 링크를 눌러 주세요. 링크는 발급 후 5분 동안 유효합니다.
        </p>
        <p className="mx-auto mt-3 max-w-lg text-sm font-medium leading-6 text-muted-strong">
          메일이 없다면 스팸함을 확인하고 재전송해 주세요. 다른 탭이나 메일 앱에서 인증했다면 돌아와 인증 상태를 확인해 주세요.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" disabled={checking} onClick={() => void checkVerification()} className="inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-5 text-sm font-semibold text-white disabled:opacity-50">
            {checking && "확인 중…"}
            {!checking && "인증 상태 확인"}
          </button>
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
