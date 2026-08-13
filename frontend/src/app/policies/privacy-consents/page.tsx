import Link from "next/link";

export default function PrivacyConsentsPage() {
  return <main className="min-h-screen bg-surface px-5 py-10 text-foreground"><article className="mx-auto max-w-3xl rounded-modal border border-border bg-card p-6 leading-7 md:p-10"><Link href="/" className="text-sm font-semibold text-brand">← 예술IN</Link><h1 className="mt-6 text-3xl font-bold">지원서 개인정보 동의문</h1><p className="mt-2 text-sm text-muted">문서 버전 application-consent-v1 · 2026-08-12</p><div className="mt-8 space-y-7"><ConsentSection title="지원서 수집·이용 (필수)" purpose="선택한 공고의 접수, 지원자 식별, 중복 방지, 심사와 문의 처리" recipient="예술IN 프로젝트팀" retention="정상 전형 종료 후 90일, 미마감은 모집 마감 후 120일. 백업은 최대 90일 순환" /><ConsentSection title="공연사 제3자 제공 (필수)" purpose="선택한 공고의 접수·심사·일정·결과 연락과 동일 공연의 결원 연락" recipient="제출 화면에 표시된 해당 공연사" retention="전형 종료 후 30일" /><p className="text-sm text-muted-strong">항목은 기본 정보 8개와 해당 공고가 요구하고 이용자가 실제 제출한 추가 정보·사진·답변·선택 배역·제출 시각입니다. 각 동의를 거부할 수 있으나 해당 공고에는 지원할 수 없습니다.</p></div></article></main>;
}

function ConsentSection({ title, purpose, recipient, retention }: { title: string; purpose: string; recipient: string; retention: string }) {
  return <section className="rounded-card border border-border p-5"><h2 className="text-lg font-bold">{title}</h2><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[100px_1fr]"><dt className="font-semibold text-muted">처리 주체</dt><dd>{recipient}</dd><dt className="font-semibold text-muted">목적</dt><dd>{purpose}</dd><dt className="font-semibold text-muted">보유기간</dt><dd>{retention}</dd></dl></section>;
}
