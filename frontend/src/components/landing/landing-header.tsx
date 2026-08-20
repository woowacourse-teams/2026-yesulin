import Image from "next/image";
import Link from "next/link";

export function LandingHeader({ service }: { readonly service: "applicant" | "producer" }) {
  const isProducer = service === "producer";

  return (
    <header className="glass-surface sticky top-0 z-30 border-x-0 border-t-0">
      <div className="mx-auto flex min-h-16 max-w-[1280px] items-center px-5 sm:min-h-[72px] sm:px-8 lg:px-10">
        <Link href="/" aria-label="예술in 홈" className="inline-flex rounded-control">
          <Image
            src="/images/yesulin-logo.png"
            alt="예술in"
            width={104}
            height={61}
            priority
            className="h-auto w-[92px] object-contain sm:w-[104px]"
          />
        </Link>
        <nav aria-label="주요 메뉴" className="ml-auto flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-control px-3 text-sm font-semibold text-muted-strong transition-colors hover:bg-surface hover:text-foreground sm:px-4"
          >
            로그인
          </Link>
          <Link
            href={isProducer ? "/" : "/producer-service"}
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-border bg-white px-3 text-sm font-semibold text-foreground transition-[background-color,border-color,transform] hover:border-brand-line hover:bg-brand-soft active:scale-[0.98] sm:px-4"
          >
            {isProducer ? "배우 서비스" : "기획사/제작사 서비스"}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <Image src="/images/yesulin-logo.png" alt="예술in" width={84} height={49} className="h-auto w-[84px] object-contain" />
        <p>© 2026 예술in. 예술의 문을 열다.</p>
      </div>
    </footer>
  );
}
