"use client";

import { useProducerEmailVerification } from "./use-producer-email-verification";

type Verification = ReturnType<typeof useProducerEmailVerification>;
const KAKAO_CHAT_URL = "http://pf.kakao.com/_pbTBX/chat";
const SECONDARY_BUTTON = "inline-flex min-h-12 items-center justify-center rounded-control border border-border px-4 text-sm font-semibold disabled:opacity-50";

export function ProducerEmailVerification() {
  const verification = useProducerEmailVerification();
  return <VerificationShell>
    <VerificationHeading />
    <VerificationForm verification={verification} />
    <VerificationActions verification={verification} />
    <VerificationMessage verification={verification} />
  </VerificationShell>;
}

function VerificationShell({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-[calc(100vh-68px)] place-items-center bg-surface px-5 py-12 md:px-8">
    <section aria-labelledby="producer-pending-title" className="w-full max-w-[620px] space-y-6 rounded-modal border border-brand-line bg-card p-6 shadow-[var(--shadow-2)] md:p-10">
      {children}
    </section>
  </div>;
}

function VerificationHeading() {
  return <header className="space-y-3 text-center">
    <p className="text-sm font-semibold text-brand">기획사/제작사 이메일 인증</p>
    <h1 id="producer-pending-title" className="text-2xl font-bold">메일의 인증번호 6자리를 입력해 주세요</h1>
    <p className="text-sm leading-6 text-muted-strong">가입한 이메일에서 인증번호를 확인한 뒤 이 화면에 입력해 주세요. 발급 후 5분 동안 유효합니다.</p>
    <p className="text-sm leading-6 text-muted">메일이 없다면 스팸함을 확인해 주세요. 재전송은 60초 후 가능하며, 5회 잘못 입력하면 새 인증번호가 필요합니다.</p>
  </header>;
}

function VerificationForm({ verification }: { verification: Verification }) {
  const submit = (event: React.FormEvent) => { event.preventDefault(); void verification.submit(); };
  return <form onSubmit={submit} noValidate className="space-y-4">
    <VerificationInput verification={verification} />
    <button type="submit" disabled={verification.pending} className="min-h-12 w-full rounded-control bg-brand px-5 font-semibold text-white disabled:opacity-50">
      {verification.pending && "처리 중…"}{!verification.pending && "이메일 인증 완료"}
    </button>
  </form>;
}

function VerificationInput({ verification }: { verification: Verification }) {
  return <label htmlFor="producer-verification-code" className="block space-y-2 text-sm font-semibold">
    <span>인증번호</span>
    <input id="producer-verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
      value={verification.code} disabled={verification.pending} onChange={(event) => verification.updateCode(event.target.value)}
      aria-describedby="verification-message" className="min-h-14 w-full rounded-control border border-border px-4 text-center text-2xl tracking-[0.4em] focus:border-brand focus:outline-2 focus:outline-brand" />
  </label>;
}

function VerificationActions({ verification }: { verification: Verification }) {
  return <div className="grid gap-3 sm:grid-cols-2">
    <button type="button" disabled={verification.pending} onClick={() => void verification.resend()} className={SECONDARY_BUTTON}>인증번호 재전송</button>
    <button type="button" disabled={verification.pending} onClick={() => void verification.check()} className={SECONDARY_BUTTON}>인증 상태 확인</button>
    <a href={KAKAO_CHAT_URL} target="_blank" rel="noreferrer" className="text-center text-sm font-semibold text-brand underline sm:col-span-2">메일 수신이 어렵다면 카카오톡으로 문의하기</a>
  </div>;
}

function VerificationMessage({ verification }: { verification: Verification }) {
  if (verification.failed) {
    return <p id="verification-message" role="alert" className="text-sm text-fail">{verification.message}</p>;
  }
  return <p id="verification-message" role="status" className="text-sm text-pass">{verification.message}</p>;
}
