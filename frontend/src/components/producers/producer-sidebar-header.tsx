import Image from "next/image";
import Link from "next/link";
import { auditionRoutes } from "@/features/auditions/routes";

export function ProducerSidebarHeader({ titleId, autoFocus = false, onClose }: {
  readonly titleId?: string;
  readonly autoFocus?: boolean;
  readonly onClose: () => void;
}) {
  return (
    <header className="flex min-h-20 shrink-0 items-center border-b border-sidebar-line">
      <h2 id={titleId} className="sr-only">공연 관리</h2>
      <Link href={auditionRoutes.performances} aria-label="예술in 공연 관리 홈" className="flex min-w-0 flex-1 px-4 py-3">
        <span className="relative block h-14 w-24 shrink-0">
          <Image
            src="/images/yesulin-logo.png"
            alt="예술in"
            fill
            sizes="96px"
            priority
            className="object-contain brightness-0 invert"
          />
        </span>
      </Link>
      <button
        type="button"
        data-autofocus={autoFocus || undefined}
        aria-label="공연 관리 사이드바 닫기"
        onClick={onClose}
        className="mr-3 min-h-11 shrink-0 rounded-control px-2 text-sm font-semibold text-sidebar-muted hover:bg-sidebar-hover hover:text-white"
      >
        닫기
      </button>
    </header>
  );
}
