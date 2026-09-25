"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreatePageButton } from "@/components/auditions/create-form";
import { PickerEmpty, PickerScreen } from "@/components/auditions/picker-card";
import { ScreenError } from "@/components/auditions/screen-status";
import { FieldInput } from "@/components/ui/controls";
import { otrAuditionRoutes } from "@/features/otr-auditions/types";
import type { OtrAudition } from "@/features/otr-auditions/types";
import { OtrAuditionCreateModal } from "./otr-audition-create-modal";
import { useOtrAuditions } from "./otr-audition-context";

export function OtrAuditionList({ selectedId, autoOpenCreate = false }: {
  readonly selectedId?: string;
  readonly autoOpenCreate?: boolean;
}) {
  const { auditions, loading, error, reload } = useOtrAuditions();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(autoOpenCreate);
  const normalizedQuery = query.trim().toLowerCase();
  const shown = auditions.filter((audition) => `${audition.otrId} ${audition.title} ${audition.roles.join(" ")}`.toLowerCase().includes(normalizedQuery));

  return <PickerScreen>
    <div className="mx-auto w-full max-w-[1120px]">
      <header className="mb-8 flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-brand">OTR 협업 공고</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.025em] md:text-[28px]">OTR 공고 관리</h1>
          <p className="mt-2 text-sm text-muted-strong">OTR 공고 번호와 모집 정보를 등록하고 한곳에서 확인하세요.</p>
        </div>
        <CreatePageButton onClick={() => setCreateOpen(true)}>OTR 공고 만들기</CreatePageButton>
      </header>

      {error ? <ScreenError message={error} onRetry={() => void reload()} /> : null}
      {loading ? <p role="status" className="rounded-card border border-border bg-card px-5 py-14 text-center text-muted">공고를 불러오는 중…</p> : null}
      {!loading && !error && auditions.length === 0 ? <PickerEmpty title="아직 OTR 공고가 없습니다" description="OTR 공고 번호, 제목, 배역과 마감일을 입력해 첫 공고를 등록해 주세요." /> : null}
      {!loading && !error && auditions.length > 0 ? <>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-card border border-border bg-card p-4 md:p-5">
          <label className="w-full max-w-md text-sm font-semibold text-muted-strong">
            공고 검색
            <FieldInput type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="공고 번호, 제목 또는 배역" className="mt-2" />
          </label>
          <span className="num text-sm text-muted">{shown.length} / {auditions.length}건</span>
        </div>
        <section aria-labelledby="otr-audition-list-title" className="overflow-hidden rounded-card border border-border bg-card">
          <div className="border-b border-border-soft px-5 py-4"><h2 id="otr-audition-list-title" className="text-base font-bold">공고 목록</h2></div>
          {shown.length > 0 ? <ul className="divide-y divide-border-soft">{shown.map((audition) => <OtrAuditionRow key={audition.id} audition={audition} selected={selectedId === audition.id} />)}</ul>
            : <p className="px-5 py-14 text-center text-sm text-muted">검색 결과가 없습니다.</p>}
        </section>
      </> : null}
    </div>
    {createOpen ? <OtrAuditionCreateModal onClose={() => {
      setCreateOpen(false);
      if (autoOpenCreate) router.replace(otrAuditionRoutes.list);
    }} onCreated={(audition) => {
      setCreateOpen(false);
      router.push(otrAuditionRoutes.selected(audition.id));
    }} /> : null}
  </PickerScreen>;
}

function OtrAuditionRow({ audition, selected }: { readonly audition: OtrAudition; readonly selected: boolean }) {
  const href = otrAuditionRoutes.selected(audition.id);
  const applyHref = audition.applicationPath;
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");
  return <li className={`px-5 py-5 md:px-6 ${selected ? "bg-brand-soft" : "hover:bg-surface"}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <span className="num inline-block rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-muted-strong">OTR #{audition.otrId}</span>
        <h3 className="mt-2 text-lg font-bold"><Link href={href} aria-current={selected ? "page" : undefined} className="hover:text-brand hover:underline">{audition.title}</Link></h3>
      </div>
      <a href={audition.otrLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-control border border-border px-3 text-sm font-semibold text-muted-strong hover:border-brand-line hover:text-brand">OTR 원문 보기 ↗</a>
    </div>
    <dl className="mt-4 grid gap-3 border-t border-border-soft pt-4 text-sm sm:grid-cols-2">
      <div><dt className="text-xs text-muted">모집 배역</dt><dd className="mt-1 font-semibold">{audition.roles.join(" · ")}</dd></div>
      <div><dt className="text-xs text-muted">마감일</dt><dd className="num mt-1 font-semibold">{audition.deadline.replaceAll("-", ".")}</dd></div>
    </dl>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Link href={otrAuditionRoutes.screening(audition.id)} className="inline-flex min-h-11 items-center rounded-control border border-brand bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-strong">심사 관리</Link>
      <Link href={applyHref} target="_blank" className="inline-flex min-h-11 items-center rounded-control border border-brand-line px-3 text-sm font-semibold text-brand hover:bg-brand-soft">지원 페이지 열기 ↗</Link>
      <button type="button" onClick={() => void navigator.clipboard.writeText(new URL(applyHref, window.location.origin).href).then(() => setCopyState("success"), () => setCopyState("error"))} className="min-h-11 rounded-control border border-border px-3 text-sm font-semibold text-muted-strong hover:border-brand-line">{copyState === "success" ? "링크 복사됨" : copyState === "error" ? "복사 실패 · 다시 시도" : "지원 링크 복사"}</button>
    </div>
    <p className="mt-2 text-xs text-muted">OTR 마감일 이후에는 제출할 수 없습니다. 접수된 지원서는 배역별 심사 관리에서 확인할 수 있습니다.</p>
  </li>;
}
