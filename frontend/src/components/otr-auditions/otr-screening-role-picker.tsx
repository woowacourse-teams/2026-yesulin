"use client";

import Link from "next/link";
import { Breadcrumb } from "@/components/auditions/breadcrumb";
import { ScreenError } from "@/components/auditions/screen-status";
import { otrAuditionRoutes } from "@/features/otr-auditions/types";
import { useOtrAuditions } from "./otr-audition-context";

export function OtrScreeningRolePicker({ auditionId }: { readonly auditionId: string }) {
  const { auditions, loading, error, reload } = useOtrAuditions();
  const audition = auditions.find((candidate) => candidate.id === auditionId);

  return <>
    <Breadcrumb items={[{ label: "OTR 공고 관리", href: otrAuditionRoutes.list },
      { label: audition?.title ?? "배역별 심사 관리" }]} />
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold">{audition ? `[${audition.otrId}] ${audition.title}` : "배역별 심사 관리"}</h1>
      <p className="mt-2 text-sm text-muted-strong">심사할 배역을 선택해 접수된 지원서를 확인하세요.</p>
      {loading ? <p role="status" className="mt-8 text-muted">공고를 불러오는 중…</p> : null}
      {error ? <div className="mt-8"><ScreenError message={error} onRetry={reload} /></div> : null}
      {!loading && !error && !audition ? <p role="alert" className="mt-8 text-fail">OTR 공고를 찾을 수 없습니다.</p> : null}
      {audition ? <ul className="mt-8 grid gap-3 sm:grid-cols-2">{audition.roles.map((role, index) =>
        <li key={`${index}-${role}`}><Link href={otrAuditionRoutes.role(audition.id, index + 1, 1)}
          className="flex min-h-20 items-center justify-between rounded-card border border-border bg-card px-5 py-4 font-semibold hover:border-brand-line hover:text-brand">
          <span>{role}</span><span aria-hidden="true">→</span>
        </Link></li>)}</ul> : null}
    </div>
  </>;
}
