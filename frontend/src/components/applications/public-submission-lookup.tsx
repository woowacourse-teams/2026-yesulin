"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { lookupSubmission } from "@/features/applicants/api";
import { answerValueText, formatApplicantDate } from "@/features/applicants/presentation";
import { applicantRoutes } from "@/features/applicants/routes";
import type { LookupSubmissionResponse } from "@/features/applicants/types";
import { applyPhoneInput, formatPhoneNumber } from "@/features/applications/phone-number";
import { FieldInput, PrimaryButton, PrimaryLink, SecondaryButton, TextButton } from "@/components/ui/controls";

export function PublicSubmissionLookup() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LookupSubmissionResponse | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^YS-?\d{8}-?[A-Fa-f0-9]{6}$/.test(code.trim())) {
      setError("조회 코드는 YS-20260806-73D9DE 형식으로 입력해 주세요.");
      requestAnimationFrame(() => document.getElementById("lookup-code")?.focus());
      return;
    }
    if (!/^01\d{8,9}$/.test(phone.replace(/\D/g, ""))) {
      setError("지원서에 입력한 휴대폰 번호를 확인해 주세요.");
      requestAnimationFrame(() => document.getElementById("lookup-phone")?.focus());
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResult(await lookupSubmission({ code, phone }));
    } catch (cause) {
      console.error("[지원 내역 조회 실패]", cause);
      setError(cause instanceof Error ? cause.message : "지원 내역을 찾지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (result) return <LookupResult result={result} onReset={() => { setResult(null); setError(""); }} />;
  return <main className="min-h-screen bg-surface text-foreground"><LookupHeader /><div className="mx-auto grid max-w-[980px] gap-8 px-5 py-10 md:grid-cols-[minmax(0,1fr)_320px] md:px-8 md:py-16"><section className="rounded-modal border border-border bg-card p-6 shadow-[var(--shadow-1)] md:p-8"><p className="text-sm font-semibold text-brand">비로그인 지원 내역 조회</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">제출한 지원서를 확인하세요.</h1><p className="mt-3 leading-7 text-muted-strong">지원 완료 화면에서 받은 조회 코드와 지원서에 입력한 연락처가 모두 일치해야 내용을 보여드려요.</p><form onSubmit={submit} noValidate className="mt-8 space-y-5"><label htmlFor="lookup-code" className="block"><span className="mb-2 block text-sm font-semibold">지원 조회 코드</span><FieldInput id="lookup-code" autoComplete="off" value={code} onChange={(event) => { setCode(event.target.value.toUpperCase()); setError(""); }} placeholder="YS-20260806-73D9DE" aria-invalid={Boolean(error) || undefined} /></label><label htmlFor="lookup-phone" className="block"><span className="mb-2 block text-sm font-semibold">지원서에 입력한 연락처</span><FieldInput id="lookup-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => { applyPhoneInput(event.target, formatPhoneNumber, setPhone); setError(""); }} placeholder="010-0000-0000" aria-invalid={Boolean(error) || undefined} /></label>{error ? <p role="alert" className="rounded-control border border-fail/25 bg-fail-bg px-4 py-3 text-sm font-medium leading-6 text-fail">{error}</p> : null}<PrimaryButton type="submit" disabled={loading} className="min-h-12 w-full px-5">{loading ? "확인 중…" : "지원 내역 확인"}</PrimaryButton></form><p className="mt-5 text-xs leading-5 text-muted">보안을 위해 코드가 없거나 연락처가 일치하지 않는 경우를 구분해서 안내하지 않습니다.</p></section><aside className="self-start rounded-card bg-sidebar p-6 text-white"><h2 className="text-lg font-bold text-white">소셜 계정으로 로그인하세요</h2><p className="mt-2 text-sm leading-6 text-sidebar-muted">로그인하면 조회 코드 없이 제출한 지원서를 모아보고, 접수 마감 전 내용을 수정할 수 있어요.</p><PrimaryLink href="/login" className="mt-5 w-full">소셜 로그인</PrimaryLink></aside></div></main>;
}

function LookupResult({ result, onReset }: { readonly result: LookupSubmissionResponse; readonly onReset: () => void }) {
  return <main className="min-h-screen bg-surface text-foreground"><LookupHeader /><div className="mx-auto max-w-[880px] px-5 py-9 md:px-8 md:py-12"><TextButton onClick={onReset} className="px-2">← 다른 지원서 조회</TextButton><header className="mt-4 rounded-modal border border-border bg-card p-6 shadow-[var(--shadow-1)] md:p-8"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-brand-line bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">제출 완료</span><span className="text-sm text-muted">{result.companyName}</span></div><h1 className="mt-4 text-3xl font-bold tracking-[-0.03em]">{result.performanceTitle}</h1><p className="mt-2 text-muted-strong">{result.postingTitle} · {result.roleName}</p><dl className="mt-6 grid gap-x-4 gap-y-3 border-t border-border-soft pt-5 text-sm sm:grid-cols-[120px_1fr]"><dt className="text-muted">조회 코드</dt><dd className="num font-semibold">{result.lookupCode}</dd><dt className="text-muted">제출 시각</dt><dd className="num">{formatApplicantDate(result.submittedAt, true)}</dd><dt className="text-muted">수정 가능 시한</dt><dd className="num">{result.editable ? formatApplicantDate(result.editableUntil, true) : "접수 마감"}</dd></dl></header><section className="mt-6 overflow-hidden rounded-card border border-border bg-card"><div className="border-b border-border-soft bg-surface px-5 py-4"><h2 className="font-bold">제출 내용</h2></div><dl className="divide-y divide-border-soft px-5">{result.answers.map((answer) => <div key={answer.key} className="grid gap-2 py-4 sm:grid-cols-[140px_minmax(0,1fr)]"><dt className="text-sm text-muted">{answer.label}</dt><dd className="whitespace-pre-wrap break-words text-sm font-medium leading-6">{answer.key === "PHOTOS" && answer.previewUrls?.length ? <div className="flex gap-2">{answer.previewUrls.map((url, index) => <Image key={url} src={url} alt={`제출 사진 ${index + 1}`} width={72} height={96} unoptimized className="h-24 w-[72px] rounded-md object-cover" />)}</div> : answerValueText(answer.value)}</dd></div>)}</dl></section><div className="mt-6 flex flex-wrap gap-3"><SecondaryButton onClick={() => window.print()}>제출 내용 인쇄</SecondaryButton><PrimaryLink href="/login">소셜 로그인하고 관리하기</PrimaryLink></div><p className="mt-3 text-sm leading-6 text-muted">비로그인 조회에서는 안전을 위해 내용을 수정할 수 없어요. 계정에 연결된 지원서는 <Link href={applicantRoutes.submissions} className="font-semibold text-brand hover:underline">내 지원서</Link>에서 수정할 수 있습니다.</p></div></main>;
}

function LookupHeader() { return <header className="glass-surface sticky top-0 z-20 border-x-0 border-t-0"><div className="mx-auto flex min-h-[68px] max-w-[980px] items-center px-5 md:px-8"><Link href="/" aria-label="예술in 홈"><Image src="/images/yesulin-logo.png" alt="예술in" width={92} height={54} priority className="h-auto w-[92px]" /></Link><Link href="/login" className="ml-auto min-h-11 rounded-control px-3 py-2.5 text-sm font-semibold text-muted-strong hover:bg-surface hover:text-brand">로그인</Link></div></header>; }
