import type { ReactNode } from "react";

/** 빈 목록과 찾을 수 없는 상세는 같은 여백·제목·후속 행동 구조를 사용한다. */
export function ContentState({ title, description, action, headingLevel = 2, className = "" }: {
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
  readonly headingLevel?: 1 | 2;
  readonly className?: string;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return <section className={`rounded-card border border-border bg-card px-5 py-14 text-center sm:px-6 ${className}`}>
    <Heading className="text-lg font-bold text-foreground">{title}</Heading>
    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-strong">{description}</p>
    {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
  </section>;
}

export function ContentSkeleton({ label, children, className = "" }: {
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return <div role="status" aria-label={label} className={`animate-pulse motion-reduce:animate-none ${className}`}>
    {children}<p className="sr-only">{label}</p>
  </div>;
}
