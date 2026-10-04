import Image from "next/image";

const previewPhotos = [
  { src: "/images/applicants/kim-harin-profile.png", label: "프로필 사진" },
  { src: "/images/applicants/kim-harin-full-body.png", label: "전신 사진" },
  { src: "/images/applicants/kim-harin-acting-1.png", label: "연기 이미지" },
] as const;

const previewFacts = [
  { label: "성별", value: "여" },
  { label: "나이", value: "만 27세" },
  { label: "키", value: "166cm" },
  { label: "몸무게", value: "52kg" },
  { label: "학력", value: "예술in대학교 연기과" },
] as const;

const previewActions = [
  { caption: "이전", mark: "↺", ring: "border-border", ink: "text-muted-strong" },
  { caption: "불합격", mark: "✕", ring: "border-fail/35", ink: "text-fail" },
  { caption: "합격", mark: "○", ring: "border-pass/35", ink: "text-pass" },
  { caption: "보류", mark: "⋯", ring: "border-etc/35", ink: "text-etc" },
  { caption: "다음", mark: "→", ring: "border-border", ink: "text-muted-strong" },
] as const;

/**
 * 실제 '한 명씩 심사' 화면을 축소해 보여 준다. 조작하지 않는 소개용 그림이다.
 * 바깥 히어로가 흰 글자를 상속시키므로 안쪽에서 본문 색을 다시 지정한다.
 */
export function ProducerPreview() {
  return (
    <figure aria-label="배우를 한 명씩 넘겨 보며 심사하는 예술in 화면 소개 이미지" className="mx-auto w-full max-w-[640px] overflow-hidden rounded-[26px] border border-sidebar-line bg-sidebar p-2.5 shadow-[var(--shadow-3)] sm:p-3">
      <div className="overflow-hidden rounded-card bg-white text-foreground">
        <PreviewWindowBar title="서연 · 한 명씩 심사" dark />

        <div aria-hidden="true" className="flex items-center gap-2.5 border-b border-border px-3.5 py-2">
          <span className="flex items-center gap-1 text-[12px] font-bold">1차 서류 심사<span className="text-[8px] text-muted">▼</span></span>
          <span className="relative pb-1 text-[11px] font-bold after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-foreground">심사 전 <span className="num">12</span></span>
          <span className="pb-1 text-[11px] font-semibold text-muted">심사 후 <span className="num">3</span></span>
          <span className="ml-auto flex overflow-hidden rounded-lg border border-border text-[10px] font-semibold">
            <span className="bg-foreground px-1.5 py-0.5 text-white">한 명씩</span>
            <span className="px-1.5 py-0.5 text-muted">카드</span>
            <span className="px-1.5 py-0.5 text-muted">표</span>
          </span>
          <span className="text-[11px] font-semibold text-muted">합격 <b className="num text-pass">3</b></span>
        </div>

        <div className="flex justify-center gap-2.5 p-3.5 sm:justify-start">
          <div aria-hidden="true" className="flex shrink-0 flex-col gap-1.5">
            {previewPhotos.map((photo, index) => (
              <span key={photo.src} className={`relative block aspect-[3/4] w-[30px] overflow-hidden rounded border-2 ${index === 0 ? "border-brand" : "border-transparent opacity-65"}`}>
                <Image src={photo.src} alt="" fill sizes="30px" className="object-cover object-top" />
              </span>
            ))}
          </div>

          <div className="relative aspect-[3/4] w-[186px] shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
            <Image src={previewPhotos[0].src} alt="지원자 김하린 프로필 사진" fill sizes="186px" className="object-cover object-top" />
            <span aria-hidden="true" className="num absolute right-1.5 top-1.5 rounded-full bg-foreground/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">1 / 3</span>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-2.5 pb-2 pt-8 text-white">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <strong className="text-sm font-bold tracking-[-0.02em]">김하린</strong>
                <span className="text-[11px] font-semibold text-white/85">서연</span>
                <span className="rounded-full bg-white/92 px-1.5 text-[9px] font-bold leading-[15px] text-pending">미검토</span>
              </div>
              <p className="num mt-0.5 text-[11px] text-white/85">여 · 만 27세 · 166cm</p>
            </div>
          </div>

          <aside aria-hidden="true" className="hidden min-w-0 flex-1 flex-col rounded-lg border border-border bg-card px-3 py-2.5 sm:flex">
            <dl className="grid gap-1.5 text-[11px]">
              {previewFacts.map((fact) => (
                <div key={fact.label} className="grid grid-cols-[38px_minmax(0,1fr)] gap-2 border-b border-border-soft pb-1.5 last:border-0">
                  <dt className="text-muted">{fact.label}</dt>
                  <dd className="truncate font-semibold text-foreground">{fact.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wide text-muted">경력 1건</p>
            <p className="num mt-1 text-[11px] text-foreground"><span className="text-muted">2025</span> <span className="font-semibold">푸른 방</span> · 윤서</p>
            <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wide text-muted">제출 자료</p>
            <p className="mt-1 text-[11px] font-semibold text-foreground">사진 3장 · 영상 1개</p>
            <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wide text-muted">SNS 링크</p>
            <div className="mt-1 flex gap-1">
              <span className="rounded border border-brand-line bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">instagram.com</span>
            </div>
          </aside>
        </div>

        <div aria-hidden="true" className="flex items-start justify-center gap-2.5 border-t border-border-soft py-3.5">
          {previewActions.map((action) => (
            <span key={action.caption} className="flex w-12 flex-col items-center gap-1">
              <span className={`grid h-11 w-11 place-items-center rounded-full border-2 bg-card text-base font-bold shadow-[var(--shadow-1)] ${action.ring} ${action.ink}`}>{action.mark}</span>
              <span className={`text-[11px] font-bold ${action.ink}`}>{action.caption}</span>
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

function PreviewWindowBar({ title, dark = false }: { readonly title: string; readonly dark?: boolean }) {
  return <div className={`flex items-center gap-3 border-b px-4 py-3 ${dark ? "border-sidebar-line bg-sidebar-surface text-white" : "border-border bg-card"}`}><span aria-hidden="true" className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-fail/70" /><i className="h-2.5 w-2.5 rounded-full bg-warn/70" /><i className="h-2.5 w-2.5 rounded-full bg-pass/70" /></span><strong className="ml-1 text-xs font-semibold">{title}</strong></div>;
}

