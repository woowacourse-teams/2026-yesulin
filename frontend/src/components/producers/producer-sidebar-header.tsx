import Image from "next/image";
import Link from "next/link";

export function ProducerSidebarHeader({ titleId, autoFocus = false, closeLabel = "관리 사이드바 닫기", onClose }: {
  readonly titleId?: string;
  readonly autoFocus?: boolean;
  readonly closeLabel?: string;
  readonly onClose: () => void;
}) {
  return (
    <header className="flex min-h-16 shrink-0 items-center border-b border-sidebar-line lg:min-h-20">
      <h2 id={titleId} className="sr-only">예술in 관리</h2>
      <Link href="/" aria-label="예술in 홈" className="flex min-w-0 flex-1 px-4 py-3">
        <span className="relative block h-10 w-20 shrink-0 lg:h-14 lg:w-24">
          <Image
            src="/images/yesulin-logo.png"
            alt="예술in"
            fill
            sizes="(min-width: 1024px) 96px, 80px"
            priority
            className="object-contain brightness-0 invert"
          />
        </span>
      </Link>
      <button
        type="button"
        data-autofocus={autoFocus || undefined}
        aria-label={closeLabel}
        onClick={onClose}
        className="mr-3 min-h-11 shrink-0 rounded-control px-2 text-sm font-semibold text-sidebar-muted hover:bg-sidebar-hover hover:text-white"
      >
        닫기
      </button>
    </header>
  );
}
