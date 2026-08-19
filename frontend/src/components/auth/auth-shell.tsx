import Image from "next/image";
import Link from "next/link";

type AuthShellProps = {
  readonly title: React.ReactNode;
  readonly description: React.ReactNode;
  readonly children: React.ReactNode;
  readonly footer: React.ReactNode;
  readonly intent?: "default" | "application";
};

function BrandLogo({ inverse = false }: { readonly inverse?: boolean }) {
  return (
    <Link href="/" aria-label="예술in 홈" className="relative inline-flex h-14 w-28 rounded-control focus-visible:outline-offset-4">
      <Image
        src="/images/yesulin-logo-transparent.png"
        alt="예술in"
        fill
        sizes="112px"
        priority
        className={`object-contain ${inverse ? "brightness-0 invert" : ""}`}
      />
    </Link>
  );
}

export function AuthShell({ title, description, children, footer, intent = "default" }: AuthShellProps) {
  const applicationIntent = intent === "application";
  return (
    <main className="min-h-screen bg-surface lg:grid lg:grid-cols-[minmax(360px,0.82fr)_minmax(560px,1.18fr)]">
      <section className="relative hidden overflow-hidden bg-sidebar px-12 py-10 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:self-start lg:flex-col xl:px-16 xl:py-12">
        <div aria-hidden="true" className="absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-brand/25 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-40 bottom-[-80px] h-96 w-96 rounded-full bg-brand/15 blur-3xl" />

        <div className="relative z-1">
          <BrandLogo inverse />
        </div>

        <div className="relative z-1 my-auto max-w-[480px] pb-16">
          <span className="inline-flex rounded-full border border-white/15 bg-white/8 px-3 py-1 text-sm font-semibold text-brand-line backdrop-blur-md">
            {applicationIntent ? "지원서 제출 계속하기" : "예술의 문을 열다"}
          </span>
          <h2 className="mt-6 text-[clamp(34px,3.2vw,52px)] font-bold leading-[1.18] tracking-[-0.035em] text-white">
            {applicationIntent ? <>작성하던 지원서를<br />인증 후 제출하세요.</> : <>지원부터 캐스팅까지,<br />한 흐름으로 연결하세요.</>}
          </h2>
          <p className="mt-6 max-w-[420px] text-lg leading-8 text-sidebar-text/80">
            {applicationIntent ? "로그인해도 지금까지 작성한 지원 내용은 삭제되지 않습니다. 인증 후 바로 제출을 이어가세요." : "배우는 기회를 놓치지 않고, 기획사/제작사는 좋은 배우를 더 빠르게 만날 수 있습니다."}
          </p>
        </div>

        <p className="relative z-1 text-sm text-sidebar-muted">© 2026 예술in</p>
      </section>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-8 sm:px-8 lg:px-12">
        <div aria-hidden="true" className="absolute right-[-120px] top-[-120px] h-72 w-72 rounded-full bg-brand-soft blur-3xl" />
        <div className="relative z-1 w-full max-w-[560px]">
          <div className="mb-6 flex justify-center lg:hidden">
            <BrandLogo />
          </div>

          <div className="border-border bg-card px-0 py-2 sm:rounded-modal sm:border sm:px-10 sm:py-10 sm:shadow-[var(--shadow-2)]">
            <header className="text-center">
              {applicationIntent ? <p className="mb-3 text-sm font-semibold text-brand">지원서 제출을 위한 인증</p> : null}
              <h1 className="flex min-h-10 items-center justify-center text-[28px] font-bold leading-tight tracking-[-0.025em] text-foreground sm:text-[32px]">{title}</h1>
              <p className="mt-3 text-base leading-relaxed text-muted-strong">{description}</p>
            </header>

            <div className="mt-8">{children}</div>
          </div>

          <div className="mt-6 text-center text-base text-muted-strong">{footer}</div>
        </div>
      </section>
    </main>
  );
}
