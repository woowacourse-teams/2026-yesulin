"use client";

import Image from "next/image";
import { useState } from "react";

type ApplicantPreviewTab = "APPLICATION" | "PROFILE" | "STATUS";

const applicantTabs: readonly { id: ApplicantPreviewTab; label: string }[] = [
  { id: "APPLICATION", label: "지원서 작성" },
  { id: "PROFILE", label: "프로필" },
  { id: "STATUS", label: "지원 현황" },
];

export function ApplicantPreview() {
  const [active, setActive] = useState<ApplicantPreviewTab>("APPLICATION");

  return (
    <div aria-label="예술in 배우 서비스 실제 화면 미리보기" className="relative mx-auto w-full max-w-[580px] overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[var(--shadow-3)]">
      <div className="border-b border-border bg-card px-4 pt-4 sm:px-6 sm:pt-5">
        <p className="text-xs font-semibold text-muted">예술in 배우</p>
        <div className="scrollbar-compact mt-3 flex gap-1 overflow-x-auto" role="tablist" aria-label="배우 화면 미리보기 선택">
          {applicantTabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} onClick={() => setActive(tab.id)} className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-semibold ${active === tab.id ? "border-brand text-brand" : "border-transparent text-muted hover:text-foreground"}`}>{tab.label}</button>)}
        </div>
      </div>
      <div className="min-h-[370px] bg-surface p-4 sm:min-h-[410px] sm:p-6">
        {active === "APPLICATION" ? <ApplicationPreview /> : active === "PROFILE" ? <ProfilePreview /> : <StatusPreview />}
      </div>
    </div>
  );
}

function ApplicationPreview() {
  return <section className="rounded-card border border-border bg-card p-4 sm:p-5"><div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">2</span><div><p className="text-xs font-semibold text-brand">지원서 작성 · 2/4</p><h2 className="mt-1 text-lg font-bold">추가 정보</h2><p className="mt-1 text-xs leading-5 text-muted">공고에서 요청한 항목만 작성해요.</p></div></div><div className="mt-5 grid gap-4"><PreviewField label="학력" value="한국예술종합학교 연극원" /><PreviewField label="SNS / 외부 링크" value="https://instagram.com/actor" /><div><div className="flex items-center justify-between"><span className="text-xs font-semibold">경력</span><span className="text-xs text-muted">1개</span></div><div className="mt-2 grid grid-cols-[56px_1fr_auto] gap-2 rounded-control border border-border bg-surface px-3 py-3 text-xs"><span className="num text-muted">2025</span><strong>푸른 방</strong><span className="text-muted">윤서</span></div></div></div><div className="mt-5 flex items-center justify-between border-t border-border-soft pt-4"><span className="text-xs text-muted">작성 내용 자동 저장</span><span className="inline-flex min-h-11 items-center rounded-control bg-brand px-4 text-sm font-semibold text-white">다음</span></div></section>;
}

function ProfilePreview() {
  return <section className="grid gap-3 sm:grid-cols-[116px_minmax(0,1fr)]"><nav className="flex gap-2 overflow-x-auto"><span className="shrink-0 rounded-control border border-brand bg-brand-soft px-3 py-3 text-xs font-semibold text-brand">기본정보 · 8/8</span><span className="shrink-0 rounded-control border border-border bg-card px-3 py-3 text-xs font-semibold text-muted">추가정보 · 3/8</span><span className="shrink-0 rounded-control border border-border bg-card px-3 py-3 text-xs font-semibold text-muted">사진 · 4/20</span></nav><div className="rounded-card border border-border bg-card p-4 sm:col-start-2 sm:row-start-1"><div className="flex items-center gap-3"><div className="relative h-14 w-14 overflow-hidden rounded-full border border-border"><Image src="/images/applicants/kim-harin-profile.png" alt="배우 프로필 예시" fill sizes="56px" className="object-cover" /></div><div><h2 className="font-bold">김하린 배우님</h2><p className="mt-1 text-xs text-muted">다음 지원서에 다시 사용할 정보</p></div></div><dl className="mt-5 grid grid-cols-[72px_1fr] gap-x-3 gap-y-3 text-xs"><dt className="text-muted">키·몸무게</dt><dd className="font-semibold">166cm · 52kg</dd><dt className="text-muted">연락처</dt><dd>010-2468-1357</dd><dt className="text-muted">자기소개</dt><dd className="line-clamp-2 leading-5">장면의 호흡을 세심하게 듣는 배우입니다.</dd></dl></div></section>;
}

function StatusPreview() {
  return <section><div className="flex items-end justify-between"><div><p className="text-xs font-semibold text-brand">내 지원서</p><h2 className="mt-1 text-lg font-bold">지원 현황</h2></div><span className="num text-xs text-muted">1건</span></div><article className="mt-4 rounded-card border border-border bg-card p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-pass/30 bg-pass-bg px-2.5 py-1 text-xs font-semibold text-pass">전형 진행 중</span><span className="text-xs text-muted">달빛컴퍼니</span></div><h3 className="mt-3 font-bold">2026 하반기 주·조연 배우 모집</h3><p className="mt-1 text-sm text-muted-strong">서연 · 지우 지원</p><div className="mt-5 grid gap-2 sm:grid-cols-2"><div className="rounded-control bg-surface p-3"><span className="text-xs text-muted">서연</span><strong className="mt-1 block text-sm">1차 서류 검토 중</strong></div><div className="rounded-control bg-surface p-3"><span className="text-xs text-muted">지우</span><strong className="mt-1 block text-sm">접수 완료</strong></div></div><div className="mt-4 border-t border-border-soft pt-4 text-right"><span className="inline-flex min-h-11 items-center rounded-control border border-border px-4 text-sm font-semibold text-muted-strong">제출한 지원서 보기</span></div></article></section>;
}

function PreviewField({ label, value }: { readonly label: string; readonly value: string }) {
  return <label><span className="mb-1.5 block text-xs font-semibold">{label}</span><span className="block min-h-11 truncate rounded-control border border-border bg-card px-3 py-3 text-xs text-muted-strong">{value}</span></label>;
}

export function ProducerPreview() {
  return (
    <div aria-label="예술in 지원자 심사 실제 화면 미리보기" className="mx-auto w-full max-w-[650px] overflow-hidden rounded-[28px] border border-sidebar-line bg-sidebar p-3 shadow-[var(--shadow-3)] sm:p-4">
      <div className="overflow-hidden rounded-card bg-surface">
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3"><div><p className="text-xs font-semibold text-brand">서연 · 1차 서류</p><p className="mt-0.5 text-sm font-bold">지원자 심사</p></div><span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-muted-strong">1 / 12</span></div>
        <div className="grid min-h-[390px] grid-cols-[112px_minmax(0,1fr)] sm:grid-cols-[168px_minmax(0,1fr)_148px]">
          <aside className="border-r border-border bg-card p-3"><div className="relative mx-auto aspect-[3/4] w-full max-w-[132px] overflow-hidden rounded-control border border-border"><Image src="/images/applicants/kim-harin-profile.png" alt="지원자 김하린" fill sizes="132px" className="object-cover" /></div><h2 className="mt-3 text-sm font-bold">김하린</h2><p className="mt-1 text-xs text-muted">여 · 만 27세 · 166cm</p><span className="mt-3 inline-flex rounded-full border border-border bg-surface px-2 py-1 text-xs font-semibold text-muted-strong">미검토</span></aside>
          <section className="min-w-0 p-4"><h3 className="text-sm font-bold">제출한 지원서</h3><dl className="mt-4 grid grid-cols-[58px_minmax(0,1fr)] gap-x-3 gap-y-3 text-xs"><dt className="text-muted">학력</dt><dd>한국예술종합학교 연극원</dd><dt className="text-muted">경력</dt><dd><strong>2025 · 푸른 방</strong><span className="block text-muted">윤서 역</span></dd><dt className="text-muted">자기소개</dt><dd className="line-clamp-3 leading-5">인물의 작은 선택이 장면 전체의 온도를 바꾼다고 믿습니다.</dd><dt className="text-muted">추가 질문</dt><dd><span className="block text-muted">이 작품에 지원한 동기</span><span className="mt-1 line-clamp-2 block leading-5">관계의 회복과 성장에 공감해 지원했습니다.</span></dd></dl><div className="mt-4 aspect-video rounded-control border border-border bg-sidebar p-3 text-xs font-semibold text-sidebar-text">연기 영상 · 지원서에서 바로 재생</div></section>
          <aside className="hidden border-l border-border bg-card p-3 sm:block"><h3 className="text-sm font-bold">심사 결정</h3><div className="mt-4 grid gap-2"><span className="grid min-h-11 place-items-center rounded-control border border-pass/40 bg-pass-bg text-xs font-bold text-pass">합격</span><span className="grid min-h-11 place-items-center rounded-control border border-border text-xs font-semibold">불합격</span><span className="grid min-h-11 place-items-center rounded-control border border-border text-xs font-semibold">기타</span></div><p className="mt-5 border-t border-border-soft pt-4 text-xs leading-5 text-muted">내부 심사 메모는 배우에게 공개되지 않아요.</p></aside>
        </div>
      </div>
    </div>
  );
}
