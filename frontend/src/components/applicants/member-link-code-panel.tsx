"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/auth-session";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { issueMemberLinkCode, type MemberLinkCode } from "@/features/applicants/member-link-api";
import { ApplicantRequestError } from "@/features/applicants/request";

export function MemberLinkCodePanel() {
  const router = useRouter();
  const { setSession } = useAuthSession();
  const [issued, setIssued] = useState<MemberLinkCode | null>(null);
  const [now, setNow] = useState(Date.now);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!issued) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [issued]);

  const seconds = issued ? Math.max(0, Math.ceil((Date.parse(issued.expiresAt) - now) / 1000)) : 0;
  const cooldown = issued ? Math.max(0, Math.ceil((Date.parse(issued.reissueAvailableAt) - now) / 1000)) : 0;
  const expired = issued !== null && seconds === 0;
  const issue = async () => {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const next = await issueMemberLinkCode();
      setNow(Date.now());
      setIssued(next);
      setNotice("연결 코드를 발급했습니다. 현장 운영자에게 보여주세요.");
    } catch (cause) {
      if (cause instanceof ApplicantRequestError && cause.status === 401) {
        setIssued(null);
        setSession(null);
        router.replace("/login?returnTo=%2Fapplicants%2Fmember-link");
        return;
      }
      setError(cause instanceof Error ? cause.message : "코드를 발급하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  };
  const copy = async () => {
    if (!issued || expired) return;
    try {
      await navigator.clipboard.writeText(issued.code);
      setNotice("코드를 복사했습니다.");
    } catch {
      setError("복사하지 못했어요. 화면의 코드를 운영자에게 보여주세요.");
    }
  };

  return <section className="max-w-xl rounded-card border border-border bg-card p-5 sm:p-7" aria-labelledby="member-link-heading">
    <h2 id="member-link-heading" className="text-lg font-bold">내 회원 연결 코드</h2>
    <p className="mt-2 text-sm leading-6 text-muted-strong">현장 운영자가 참가 신청 내역에 지금 로그인한 배우 계정을 연결할 때 사용해요. 프로필을 아직 작성하지 않았어도 발급할 수 있어요.</p>
    {issued ? <div className="my-6 rounded-control bg-surface px-4 py-6 text-center">
      {expired ? <p role="status" className="font-semibold">코드가 만료됐어요. 새 코드를 발급해 주세요.</p> : <>
        <output aria-label="회원 연결 코드" className="num block select-all font-mono text-3xl font-bold tracking-wider sm:text-4xl">{issued.code}</output>
        <p className="num mt-3 text-sm text-muted-strong">남은 시간 {Math.floor(seconds / 60)}분 {seconds % 60}초</p>
      </>}
    </div> : null}
    <div className="mt-5 flex flex-wrap gap-2">
      <PrimaryButton onClick={() => void issue()} disabled={pending || cooldown > 0}>{pending ? "발급 중…" : cooldown > 0 ? `${cooldown}초 후 재발급 가능` : issued ? "새 코드 발급" : "연결 코드 발급"}</PrimaryButton>
      {issued && !expired ? <SecondaryButton onClick={() => void copy()}>코드 복사</SecondaryButton> : null}
    </div>
    <p className="mt-4 text-xs leading-5 text-muted">코드는 10분 동안 한 번만 사용할 수 있어요. 새 코드를 받으면 이전 코드는 사용할 수 없어요. 행사 운영자에게만 보여주세요.</p>
    <p className="mt-2 text-xs leading-5 text-muted">회원 연결만으로 프로필이 공개되지는 않아요.</p>
    {error ? <p role="alert" className="mt-4 text-sm text-fail">{error}</p> : null}
    {notice ? <p role="status" className="mt-4 text-sm text-pass">{notice}</p> : null}
  </section>;
}
