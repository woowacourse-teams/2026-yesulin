import Image from "next/image";
import Link from "next/link";

export type PolicyNavigationItem = {
  readonly href: string;
  readonly label: string;
};

export function PolicyLayout({
  title,
  description,
  version,
  effectiveDate,
  navigation,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly version: string;
  readonly effectiveDate: string;
  readonly navigation: readonly PolicyNavigationItem[];
  readonly children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface text-foreground">
      <header className="glass-surface sticky top-0 z-30 border-x-0 border-t-0">
        <div className="mx-auto flex min-h-16 max-w-[1120px] items-center gap-4 px-5 sm:min-h-[72px] sm:px-8">
          <Link href="/" aria-label="예술in 홈" className="inline-flex rounded-control">
            <Image src="/images/yesulin-logo.png" alt="예술in" width={104} height={61} priority className="h-auto w-[92px] object-contain sm:w-[104px]" />
          </Link>
          <nav aria-label="정책 문서" className="ml-auto flex items-center gap-1 text-sm font-semibold text-muted-strong sm:gap-2">
            <Link href="/terms" className="rounded-control px-2.5 py-2 hover:bg-surface hover:text-foreground sm:px-3">이용약관</Link>
            <Link href="/privacy" className="rounded-control px-2.5 py-2 hover:bg-surface hover:text-foreground sm:px-3">개인정보</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1120px] gap-8 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden lg:block">
          <nav aria-label={`${title} 목차`} className="sticky top-28 rounded-card border border-border bg-card p-4">
            <p className="px-2 pb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted">목차</p>
            <ul className="space-y-1">
              {navigation.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="block rounded-control px-2 py-2 text-sm leading-5 text-muted-strong hover:bg-brand-soft hover:text-brand">{item.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0 rounded-card border border-border bg-card px-5 py-8 shadow-[var(--shadow-1)] sm:px-8 sm:py-10 lg:px-12">
          <header className="border-b border-border pb-8">
            <p className="text-sm font-semibold text-brand">예술in 정책 문서</p>
            <h1 className="mt-2 text-[clamp(28px,4vw,42px)] font-bold leading-tight tracking-[-0.035em]">{title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-strong">{description}</p>
            <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <div className="flex gap-2"><dt className="font-semibold text-muted-strong">문서 버전</dt><dd>{version}</dd></div>
              <div className="flex gap-2"><dt className="font-semibold text-muted-strong">공고일·시행일</dt><dd className="num">{effectiveDate}</dd></div>
            </dl>
          </header>
          <div className="policy-content pt-2">{children}</div>
        </article>
      </main>

      <footer className="border-t border-border bg-white">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© 2026 예술in 프로젝트팀</p>
          <PolicyLinks />
        </div>
      </footer>
    </div>
  );
}

export function PolicyLinks({ className = "" }: { readonly className?: string }) {
  return (
    <nav aria-label="정책 및 문의" className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`}>
      <Link href="/terms" className="font-medium text-muted-strong hover:text-brand hover:underline">이용약관</Link>
      <Link href="/privacy" className="font-medium text-muted-strong hover:text-brand hover:underline">개인정보 처리방침</Link>
      <Link href="/privacy/consents" className="font-medium text-muted-strong hover:text-brand hover:underline">개인정보 동의문</Link>
      <a href="mailto:contact@yesulin.art" className="font-medium text-muted-strong hover:text-brand hover:underline">문의</a>
    </nav>
  );
}

export function PolicySection({ id, title, children }: { readonly id: string; readonly title: string; readonly children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-b border-border-soft py-8 last:border-b-0">
      <h2 className="text-xl font-bold leading-8 tracking-[-0.02em] sm:text-2xl">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-7 text-muted-strong sm:text-base">{children}</div>
    </section>
  );
}

export function PolicyTable({ headers, rows }: { readonly headers: readonly string[]; readonly rows: readonly (readonly React.ReactNode[])[] }) {
  return (
    <div className="overflow-x-auto rounded-control border border-border">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm leading-6">
        <thead className="bg-surface text-foreground">
          <tr>{headers.map((header) => <th key={header} scope="col" className="border-b border-border px-4 py-3 font-bold">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border-soft">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="align-top">
              {row.map((cell, cellIndex) => <td key={cellIndex} className={`px-4 py-3 ${cellIndex === 0 ? "font-semibold text-foreground" : "text-muted-strong"}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PolicyNotice({ children }: { readonly children: React.ReactNode }) {
  return <div className="rounded-card border border-brand-line bg-brand-soft px-4 py-4 text-sm leading-6 text-muted-strong sm:px-5">{children}</div>;
}
