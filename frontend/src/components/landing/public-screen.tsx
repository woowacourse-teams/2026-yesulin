import Link from "next/link";
import type { ReactNode } from "react";
import { NotebookHeader, NotebookFooter } from "./notebook-site-layout";
import { NotebookPageMain } from "./notebook-page-main";

/** 공개 상세·오류 화면의 본문 정렬과 복귀 동선을 공유한다. */
export function PublicScreen({ children, backHref, backLabel, footerClassName }: {
  readonly children: ReactNode;
  readonly backHref?: string;
  readonly backLabel?: string;
  readonly footerClassName?: string;
}) {
  return <>
    <NotebookHeader />
    <NotebookPageMain>
      {backHref ? <Link href={backHref} className="-ml-2 mb-3 inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-muted-strong hover:bg-white hover:text-foreground">{backLabel}</Link> : null}
      {children}
    </NotebookPageMain>
    <NotebookFooter className={footerClassName} />
  </>;
}
