import Link from "next/link";

export default function TermsPage() {
  return <PolicyPage title="예술IN 이용약관" updated="2026-08-12">
    <p>예술IN 프로젝트팀은 지원자와 공연사가 공연 공고의 접수와 심사를 관리할 수 있는 서비스를 제공합니다.</p>
    <h2>계정과 이용 책임</h2><p>이용자는 정확한 정보를 사용하고 계정 접근 정보를 안전하게 관리해야 합니다. 공연사는 적법한 모집 공고와 심사를 운영하고 지원자 정보를 공고 목적에 한해 사용해야 합니다.</p>
    <h2>지원서</h2><p>동일 계정은 같은 공고에 한 번만 제출할 수 있습니다. 제출 완료 후 내용과 선택 배역은 일반 수정할 수 없으며 개인정보 정정 요청은 별도 절차로 처리합니다.</p>
    <h2>문의</h2><p>약관과 서비스 문의: contact@yesulin.art</p>
  </PolicyPage>;
}

function PolicyPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-surface px-5 py-10 text-foreground"><article className="mx-auto max-w-3xl rounded-modal border border-border bg-card p-6 leading-7 md:p-10"><Link href="/" className="text-sm font-semibold text-brand">← 예술IN</Link><h1 className="mt-6 text-3xl font-bold">{title}</h1><p className="mt-2 text-sm text-muted">최종 수정일 {updated} · 출시 전 초안</p><div className="mt-8 space-y-5 [&_h2]:pt-3 [&_h2]:text-xl [&_h2]:font-bold [&_p]:text-muted-strong">{children}</div></article></main>;
}
