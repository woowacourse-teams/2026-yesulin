import Image from "next/image";

export function ApplicantPreview() {
  return (
    <figure aria-label="배우 지원 준비 과정을 보여주는 예술in 서비스 소개 이미지" className="relative mx-auto w-full max-w-[580px] overflow-hidden rounded-[28px] border border-white/80 bg-card shadow-[var(--shadow-3)]">
      <PreviewWindowBar title="지원서 준비" />
      <div className="bg-surface p-5 sm:p-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand">달빛 아래 우리</p>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl">지원 자료를 확인해 주세요</h2>
          </div>
          <span className="num shrink-0 text-sm font-semibold text-muted">2 / 3</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-border"><span className="block h-full w-2/3 rounded-full bg-brand" /></div>

        <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_168px]">
          <section className="rounded-card border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border">
                <Image src="/images/applicants/kim-harin-profile.png" alt="김하린 배우 프로필" fill sizes="56px" className="object-cover" />
              </div>
              <div><p className="text-xs font-semibold text-muted">지원자</p><h3 className="mt-0.5 font-bold">김하린</h3></div>
              <span className="ml-auto rounded-full bg-pass-bg px-2.5 py-1 text-xs font-semibold text-pass">프로필 완료</span>
            </div>
            <ul className="mt-5 grid gap-2.5">
              <ReadyItem label="기본·추가 정보" value="불러옴" />
              <ReadyItem label="프로필·연기 사진" value="3장" />
              <ReadyItem label="연기 영상" value="1개" />
            </ul>
          </section>

          <div className="relative hidden overflow-hidden rounded-card border border-border bg-card sm:block">
            <Image src="/images/applicants/kim-harin-acting-1.png" alt="지원 사진 미리보기" fill sizes="168px" loading="eager" className="object-cover object-top" />
            <span className="absolute inset-x-3 bottom-3 rounded-lg bg-foreground/80 px-3 py-2 text-center text-xs font-semibold text-white backdrop-blur-sm">제출 사진 미리보기</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-card bg-brand px-4 py-3 text-white sm:px-5">
          <span className="text-sm font-semibold">필요한 자료가 준비됐어요</span>
          <span aria-hidden="true" className="text-xl">→</span>
        </div>
      </div>
    </figure>
  );
}

const previewPhotos = [
  { src: "/images/applicants/kim-harin-profile.png", label: "프로필 사진" },
  { src: "/images/applicants/kim-harin-full-body.png", label: "전신 사진" },
  { src: "/images/applicants/kim-harin-acting-1.png", label: "연기 이미지" },
] as const;

const previewActions = [
  { caption: "이전", mark: "↺", tone: "text-muted-strong border-border" },
  { caption: "불합격", mark: "✕", tone: "text-fail border-fail/35" },
  { caption: "합격", mark: "○", tone: "text-pass border-pass/35" },
  { caption: "보류", mark: "⋯", tone: "text-etc border-etc/35" },
  { caption: "다음", mark: "→", tone: "text-muted-strong border-border" },
] as const;

/** 실제 '한 명씩 심사' 화면을 그대로 축소해 보여 준다. 조작하지 않는 소개용 그림이다. */
export function ProducerPreview() {
  return (
    <figure aria-label="배우를 한 명씩 넘겨 보며 심사하는 예술in 화면 소개 이미지" className="mx-auto w-full max-w-[650px] overflow-hidden rounded-[28px] border border-sidebar-line bg-sidebar p-3 shadow-[var(--shadow-3)] sm:p-4">
      <div className="overflow-hidden rounded-card bg-white">
        <PreviewWindowBar title="서연 · 한 명씩 심사" dark />

        <div aria-hidden="true" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-2.5">
          <span className="flex items-center gap-1 text-sm font-bold text-foreground">1차 서류 심사<span className="text-[10px] text-muted">▼</span></span>
          <span className="relative pb-1.5 text-xs font-bold text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-foreground">심사 전 <span className="num">12</span></span>
          <span className="pb-1.5 text-xs font-semibold text-muted">심사 후 <span className="num">3</span></span>
          <span className="ml-auto flex overflow-hidden rounded-control border border-border text-[11px] font-semibold">
            <span className="bg-foreground px-2 py-1 text-white">한 명씩</span>
            <span className="px-2 py-1 text-muted">카드</span>
            <span className="px-2 py-1 text-muted">표</span>
          </span>
          <span className="text-xs font-semibold text-muted">합격 <b className="num text-sm text-pass">3</b></span>
        </div>

        <div className="p-3 sm:p-4">
          <div className="flex gap-3">
            <div aria-hidden="true" className="flex shrink-0 flex-col gap-1.5">
              {previewPhotos.map((photo, index) => (
                <span key={photo.src} className={`relative block aspect-[3/4] w-9 overflow-hidden rounded-md border-2 ${index === 0 ? "border-brand" : "border-transparent opacity-70"}`}>
                  <Image src={photo.src} alt="" fill sizes="36px" className="object-cover object-top" />
                </span>
              ))}
            </div>

            <div className="relative h-[230px] w-[173px] shrink-0 overflow-hidden rounded-card border border-border bg-surface">
              <Image src={previewPhotos[0].src} alt="지원자 김하린 프로필 사진" fill sizes="173px" className="object-cover object-top" />
              <span aria-hidden="true" className="num absolute right-2 top-2 rounded-full bg-foreground/70 px-2 py-0.5 text-[11px] font-semibold text-white">1 / 3</span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-3 pb-2 pt-10 text-white">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <strong className="text-base font-bold tracking-[-0.02em]">김하린</strong>
                  <span className="text-xs font-semibold text-white/85">서연</span>
                  <span className="rounded-full bg-white/92 px-1.5 py-0.5 text-[10px] font-bold text-pending">미검토</span>
                </div>
                <p className="num mt-0.5 text-xs text-white/85">여 · 만 27세 · 166cm</p>
              </div>
            </div>

            <aside className="hidden min-w-0 flex-1 rounded-card border border-border bg-card p-3 sm:block">
              <dl className="grid gap-2 text-xs">
                <SummaryRow label="성별" value="여" />
                <SummaryRow label="나이" value="만 27세" />
                <SummaryRow label="키" value="166cm" />
                <SummaryRow label="학력" value="연기과" />
              </dl>
              <p className="mt-3 border-t border-border-soft pt-3 text-[11px] font-bold text-muted">경력 1건</p>
              <p className="num mt-1 text-xs"><span className="text-muted">2025</span> <span className="font-semibold">푸른 방</span></p>
            </aside>
          </div>

          <div aria-hidden="true" className="mt-3 flex items-start justify-center gap-2">
            {previewActions.map((action) => (
              <span key={action.caption} className="flex w-11 flex-col items-center gap-1">
                <span className={`grid h-9 w-9 place-items-center rounded-full border-2 bg-card text-sm font-bold shadow-[var(--shadow-1)] ${action.tone}`}>{action.mark}</span>
                <span className={`text-[10px] font-bold ${action.tone.split(" ")[0]}`}>{action.caption}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

function PreviewWindowBar({ title, dark = false }: { readonly title: string; readonly dark?: boolean }) {
  return <div className={`flex items-center gap-3 border-b px-4 py-3 ${dark ? "border-sidebar-line bg-sidebar-surface text-white" : "border-border bg-card"}`}><span aria-hidden="true" className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-fail/70" /><i className="h-2.5 w-2.5 rounded-full bg-warn/70" /><i className="h-2.5 w-2.5 rounded-full bg-pass/70" /></span><strong className="ml-1 text-xs font-semibold">{title}</strong></div>;
}

function ReadyItem({ label, value }: { readonly label: string; readonly value: string }) {
  return <li className="flex min-h-11 items-center gap-3 rounded-control bg-surface px-3"><span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-pass text-xs font-bold text-white">✓</span><span className="text-sm font-semibold">{label}</span><span className="ml-auto text-xs font-semibold text-muted">{value}</span></li>;
}

function SummaryRow({ label, value }: { readonly label: string; readonly value: string }) {
  return <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-2"><dt className="text-muted">{label}</dt><dd className="truncate font-semibold">{value}</dd></div>;
}

