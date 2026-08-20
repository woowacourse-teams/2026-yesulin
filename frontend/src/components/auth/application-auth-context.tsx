import Link from "next/link";
import type { ApplicationAuthContext } from "@/features/auth/application-auth-context-server";

export function ApplicationAuthContextCard({ context }: { readonly context: ApplicationAuthContext }) {
  return <section aria-labelledby="application-auth-context-title" className="mb-6 rounded-card border border-brand-line bg-brand-soft p-4 text-left">
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">✓</span>
      <div>
        <p className="text-xs font-semibold text-brand">지원서 제출 문맥</p>
        <h2 id="application-auth-context-title" className="text-base font-bold text-foreground">작성 중인 지원서를 이어서 제출합니다</h2>
      </div>
    </div>
    {context.performanceTitle || context.postingTitle || context.roleName ? <dl className="mt-4 grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
      {context.performanceTitle ? <><dt className="text-muted">공연</dt><dd className="font-semibold text-foreground">{context.performanceTitle}</dd></> : null}
      {context.postingTitle ? <><dt className="text-muted">공고</dt><dd className="text-muted-strong">{context.postingTitle}</dd></> : null}
      {context.roleName ? <><dt className="text-muted">배역</dt><dd className="font-semibold text-brand">{context.roleName}</dd></> : null}
    </dl> : null}
    <p className="mt-4 border-t border-brand-line pt-3 text-sm font-medium leading-6 text-muted-strong">로그인해도 지금까지 작성한 지원 내용은 삭제되지 않습니다. 로그인 후 같은 지원서로 돌아와 제출을 이어갈 수 있어요.</p>
    <Link href={context.cancelHref} className="mt-4 inline-flex min-h-11 items-center rounded-control border border-brand-line bg-card px-3 text-sm font-semibold text-brand hover:bg-white">← 지원서로 돌아가기</Link>
  </section>;
}
