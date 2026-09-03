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

export function ProducerPreview() {
  return (
    <figure aria-label="배우를 검토하는 예술in 심사 화면 소개 이미지" className="mx-auto w-full max-w-[650px] overflow-hidden rounded-[28px] border border-sidebar-line bg-sidebar p-3 shadow-[var(--shadow-3)] sm:p-4">
      <div className="overflow-hidden rounded-card bg-surface">
        <PreviewWindowBar title="서연 · 1차 서류 심사" dark />
        <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_168px] sm:p-5">
          <section className="rounded-card border border-border bg-card p-4 sm:p-5">
            <div className="flex gap-4">
              <div className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-control bg-surface sm:w-28">
                <Image src="/images/applicants/kim-harin-profile.png" alt="지원자 김하린" fill sizes="112px" className="object-cover object-top" />
              </div>
              <div className="min-w-0 flex-1 py-1">
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">김하린</h2><span className="rounded-full bg-pending-bg px-2 py-1 text-xs font-semibold text-pending">검토 중</span></div>
                <p className="mt-1 text-sm text-muted">만 27세 · 166cm</p>
                <dl className="mt-4 grid gap-3 text-sm">
                  <SummaryRow label="경력" value="푸른 방 · 윤서 역" />
                  <SummaryRow label="사진" value="3장" />
                  <SummaryRow label="영상" value="1개" />
                </dl>
              </div>
            </div>
            <div className="mt-4 rounded-control bg-surface px-4 py-3"><p className="text-xs font-semibold text-muted">지원 동기</p><p className="mt-1 text-sm font-medium">작품이 전하는 관계의 회복에 공감했습니다.</p></div>
          </section>

          <aside className="rounded-card border border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted">심사 결정</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-1">
              <Decision label="합격" tone="pass" />
              <Decision label="불합격" tone="fail" />
            </div>
            <div className="mt-4 border-t border-border-soft pt-4">
              <p className="text-xs font-semibold text-muted">현재 지원자</p>
              <div className="mt-2 flex items-center justify-between"><strong className="text-sm">1 / 12</strong><span className="text-xs text-muted">다음 배우 →</span></div>
            </div>
          </aside>
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

function Decision({ label, tone }: { readonly label: string; readonly tone: "pass" | "fail" }) {
  return <span className={`grid min-h-12 place-items-center rounded-control border text-sm font-bold ${tone === "pass" ? "border-pass/30 bg-pass-bg text-pass" : "border-fail/20 bg-fail-bg text-fail"}`}>{label}</span>;
}
