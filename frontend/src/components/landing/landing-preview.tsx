function EmptyRow({ label }: { readonly label: string }) {
  return (
    <div className="rounded-control border border-dashed border-border bg-white px-4 py-5 text-center text-sm text-muted">
      {label}
    </div>
  );
}

export function ApplicantPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[560px] rounded-[28px] border border-white/80 bg-white/88 p-4 shadow-[var(--shadow-3)] backdrop-blur-xl sm:p-6">
      <div className="flex items-center justify-between border-b border-border-soft pb-4">
        <div><p className="text-sm font-semibold text-brand">추천 오디션</p><p className="mt-1 text-lg font-bold">새로운 무대를 찾아보세요</p></div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">맞춤 추천</span>
      </div>
      <div className="mt-4"><EmptyRow label="새로운 공고가 등록되면 이곳에 표시됩니다." /></div>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-card bg-surface p-3 text-center">
        <div><strong className="num block text-lg">0</strong><span className="text-xs text-muted">제출한 지원서</span></div>
        <div className="border-x border-border"><strong className="num block text-lg">0</strong><span className="text-xs text-muted">읽기 전용</span></div>
        <div><strong className="num block text-lg">0%</strong><span className="text-xs text-muted">프로필 완성도</span></div>
      </div>
    </div>
  );
}

export function ProducerPreview() {
  return (
    <div className="mx-auto w-full max-w-[600px] overflow-hidden rounded-[28px] border border-sidebar-line bg-sidebar p-3 shadow-[var(--shadow-3)] sm:p-4">
      <div className="grid min-h-[390px] grid-cols-[92px_1fr] overflow-hidden rounded-card bg-surface sm:grid-cols-[130px_1fr]">
        <aside className="bg-sidebar-surface p-3 text-sidebar-text">
          <p className="text-sm font-bold text-white">공연 관리</p>
          <div className="mt-6 space-y-2 text-xs text-sidebar-muted"><p className="rounded-lg bg-sidebar-hover px-2 py-2 text-white">전체 공고</p><p className="px-2 py-2">검토 중</p><p className="px-2 py-2">전형 완료</p></div>
        </aside>
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-brand">지원자 검토</p><p className="mt-1 font-bold">등록된 공고가 없습니다</p></div><span className="rounded-full bg-brand-soft px-2 py-1 text-xs font-semibold text-brand">0명</span></div>
          <div className="mt-5"><EmptyRow label="공연과 공고를 등록하면 지원자 검토를 시작할 수 있습니다." /></div>
          <div className="mt-4 rounded-control border border-brand-line bg-brand-soft p-3"><p className="text-sm font-semibold text-brand-strong">한 화면에서 비교하고 결정하세요</p><p className="mt-1 text-xs leading-relaxed text-muted-strong">프로필, 영상, 평가 상태를 흐름에 맞춰 확인합니다.</p></div>
        </div>
      </div>
    </div>
  );
}
