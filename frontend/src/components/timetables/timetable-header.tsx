import Image from "next/image";
import Link from "next/link";

const WIDTH_CLASS = {
  narrow: "max-w-[640px]",
  regular: "max-w-[720px]",
  wide: "max-w-[1600px]",
} as const;

/** 일정표 화면 머리말. 로그인·오디션 메뉴 없이 서비스 이름만 보여 주고 본문과 같은 폭에 맞춘다. */
export function TimetableHeader({ width = "regular" }: { readonly width?: keyof typeof WIDTH_CLASS }) {
  return (
    <header className="glass-surface sticky top-0 z-30 border-x-0 border-t-0">
      <div className={`mx-auto flex min-h-16 items-center gap-2 px-4 md:px-8 ${WIDTH_CLASS[width]}`}>
        <Link
          href="/"
          aria-label="예술in 홈"
          className="inline-flex min-h-11 items-center gap-3 rounded-control px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <Image src="/images/yesulin-logo.png" alt="" width={84} height={49} priority className="h-auto w-[84px] object-contain" />
          <span aria-hidden="true" className="h-5 w-px bg-border" />
          <span className="text-sm font-semibold text-foreground">오디션 일정표</span>
        </Link>
      </div>
    </header>
  );
}
