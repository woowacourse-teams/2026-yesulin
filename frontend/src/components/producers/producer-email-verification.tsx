"use client";

import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from "input-otp";
import { KakaoMark } from "@/components/ui/kakao-mark";
import { useProducerEmailVerification } from "./use-producer-email-verification";

type Verification = ReturnType<typeof useProducerEmailVerification>;
const KAKAO_CHAT_URL = "http://pf.kakao.com/_pbTBX/chat";
const SECONDARY_BUTTON = "inline-flex min-h-11 items-center justify-center rounded-control px-2 text-sm font-semibold text-muted-strong transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50";

export function ProducerEmailVerification() {
  const verification = useProducerEmailVerification();
  return <VerificationShell>
    <VerificationHeading />
    <VerificationForm verification={verification} />
    <VerificationMessage verification={verification} />
    <VerificationActions verification={verification} />
  </VerificationShell>;
}

function VerificationShell({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-[calc(100dvh-68px)] place-items-center bg-surface px-5 py-10 md:px-8">
    <section aria-labelledby="producer-pending-title" className="flex w-full max-w-md flex-col gap-6 rounded-card border border-border bg-card px-5 py-8 sm:p-8">
      {children}
    </section>
  </div>;
}

function VerificationHeading() {
  return <header className="space-y-2 text-center">
    <p className="text-sm font-semibold text-brand">이메일 인증</p>
    <h1 id="producer-pending-title" className="text-2xl font-bold tracking-tight text-foreground">이메일을 확인해 주세요</h1>
    <p className="text-sm leading-6 text-muted-strong">메일로 받은 인증번호 6자리를 입력해 주세요.</p>
  </header>;
}

function VerificationForm({ verification }: { verification: Verification }) {
  const submit = (event: React.FormEvent) => { event.preventDefault(); void verification.submit(); };
  return <form onSubmit={submit} noValidate className="mx-auto w-full max-w-72 space-y-4">
    <VerificationInput verification={verification} />
    <button type="submit" disabled={verification.pending} className="min-h-12 w-full rounded-control bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50">
      {verification.pending && "처리 중…"}{!verification.pending && "인증하기"}
    </button>
  </form>;
}

function VerificationInput({ verification }: { verification: Verification }) {
  return <div className="space-y-2 text-center">
    <label htmlFor="producer-verification-code" className="sr-only">인증번호</label>
    <OTPInput id="producer-verification-code" inputMode="numeric" autoComplete="one-time-code" pattern={REGEXP_ONLY_DIGITS} maxLength={6}
      value={verification.code} disabled={verification.pending} onChange={verification.updateCode}
      pasteTransformer={(value) => value.replace(/\D/g, "")}
      aria-describedby="verification-expiry verification-message" containerClassName="w-full has-[:disabled]:opacity-50"
      render={({ slots }) => <div aria-hidden="true" className="grid w-full grid-cols-6 gap-2">
        {slots.map((slot, index) => <VerificationSlot key={index} {...slot} />)}
      </div>} />
    <p id="verification-expiry" className="text-xs text-muted">발급 후 5분 동안 유효해요</p>
  </div>;
}

function VerificationSlot({ char, isActive, hasFakeCaret }: SlotProps) {
  return <span data-active={isActive} className="num relative flex h-13 min-w-0 items-center justify-center rounded-lg border border-border bg-card text-2xl font-semibold text-foreground transition-colors data-[active=true]:border-brand data-[active=true]:bg-brand-soft data-[active=true]:ring-2 data-[active=true]:ring-brand/20">
    {char}
    {hasFakeCaret && <span className="h-6 w-px animate-pulse bg-brand motion-reduce:animate-none" />}
  </span>;
}

function VerificationActions({ verification }: { verification: Verification }) {
  return <div className="space-y-3 border-t border-border-soft pt-5">
    <p className="rounded-control bg-brand-soft px-4 py-3 text-center text-sm leading-6 text-muted-strong">
      메일이 안 보이나요?<br /><strong className="font-semibold text-foreground">스팸함도 꼭 확인해 주세요.</strong>
    </p>
    <div className="flex flex-wrap justify-center gap-x-3">
      <button type="button" disabled={verification.pending} onClick={() => void verification.resend()} className={SECONDARY_BUTTON}>인증번호 재전송</button>
      <button type="button" disabled={verification.pending} onClick={() => void verification.check()} className={SECONDARY_BUTTON}>인증 상태 확인</button>
    </div>
    <div className="text-center text-xs leading-5 text-muted">
      <p>재전송은 60초 후 가능해요.<br />5회 잘못 입력하면 새 인증번호를 받아 주세요.</p>
      <a href={KAKAO_CHAT_URL} target="_blank" rel="noopener noreferrer" aria-label="카카오톡 문의하기 (새 창에서 열림)"
        className="mt-4 inline-flex min-h-11 w-full max-w-72 items-center justify-center gap-2 rounded-control bg-kakao px-4 text-sm font-semibold text-kakao-ink transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
        <KakaoMark className="h-5 w-5 shrink-0" />
        카카오톡 문의하기
      </a>
    </div>
  </div>;
}

function VerificationMessage({ verification }: { verification: Verification }) {
  if (!verification.message) return <p id="verification-message" role="status" className="sr-only" />;
  if (verification.failed) {
    return <p id="verification-message" role="alert" className="text-sm text-fail">{verification.message}</p>;
  }
  return <p id="verification-message" role="status" className="text-sm text-pass">{verification.message}</p>;
}
