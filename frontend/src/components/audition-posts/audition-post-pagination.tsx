import Link from "next/link";
import { pageItems } from "@/features/audition-posts/pagination";
import { auditionPostRoutes } from "@/features/audition-posts/types";

const ITEM_CLASS =
  "num inline-flex h-11 min-w-11 items-center justify-center rounded-control px-3 text-sm font-semibold transition-colors";

/** 주소(`?page=`)로 이동하는 번호 페이지. 뒤로 가기·새로고침·공유 때 같은 페이지가 열린다. */
export function AuditionPostPagination({ page, totalPages, includeClosed }: {
  readonly page: number;
  readonly totalPages: number;
  readonly includeClosed: boolean;
}) {
  if (totalPages <= 1) return null;
  const href = (target: number) => auditionPostRoutes.list({ page: target, includeClosed });

  return (
    <nav aria-label="공고 목록 페이지" className="mt-10 flex flex-wrap items-center justify-center gap-1">
      {page > 0 ? (
        <Link href={href(page - 1)} className={`${ITEM_CLASS} text-muted-strong hover:bg-white hover:text-foreground`}>
          이전<span className="sr-only"> 페이지</span>
        </Link>
      ) : null}
      {pageItems(page, totalPages).map((item) => item.kind === "gap" ? (
        <span key={item.key} aria-hidden="true" className="px-1 text-muted">…</span>
      ) : item.page === page ? (
        <span key={item.page} aria-current="page" className={`${ITEM_CLASS} bg-foreground text-white`}>
          {item.page + 1}
        </span>
      ) : (
        <Link
          key={item.page}
          href={href(item.page)}
          aria-label={`${item.page + 1}페이지`}
          className={`${ITEM_CLASS} text-muted-strong hover:bg-white hover:text-foreground`}
        >
          {item.page + 1}
        </Link>
      ))}
      {page < totalPages - 1 ? (
        <Link href={href(page + 1)} className={`${ITEM_CLASS} text-muted-strong hover:bg-white hover:text-foreground`}>
          다음<span className="sr-only"> 페이지</span>
        </Link>
      ) : null}
    </nav>
  );
}
