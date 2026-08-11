import Link from "next/link";
import { SecondaryLink } from "@/components/ui/controls";
import { ApplicantPreview } from "./landing-preview";
import { LandingFooter, LandingHeader } from "./landing-header";

type LandingContent = {
  readonly audience: "applicant";
  readonly eyebrow: string;
  readonly title: React.ReactNode;
  readonly description: string;
  readonly features: ReadonlyArray<{ title: string; description: string }>;
  readonly steps: ReadonlyArray<{ title: string; description: string }>;
};

const content: Record<LandingContent["audience"], LandingContent> = {
  applicant: {
    audience: "applicant",
    eyebrow: "지원자를 위한 오디션 플랫폼",
    title: <><span className="block lg:whitespace-nowrap">내게 맞는 무대를 찾고,</span><span className="block text-brand lg:whitespace-nowrap">지원은 더 간단하게.</span></>,
    description: "공고 확인부터 프로필 제출, 내 지원서 관리까지 흩어진 오디션 지원 과정을 하나로 연결합니다.",
    features: [
      { title: "다음 공고를 빠르게", description: "제출을 마친 뒤에도 이어서 살펴볼 추천 오디션을 확인합니다." },
      { title: "지원 자료는 간편하게", description: "반복해서 작성하던 프로필과 경력, 사진과 영상을 정리해 활용합니다." },
      { title: "제출 내용은 정확하게", description: "제출한 지원서를 다시 보고, 모집 마감 전에는 필요한 답변을 수정합니다." },
    ],
    steps: [
      { title: "공고 확인", description: "공연사가 공유한 링크와 추천에서 모집 정보를 확인합니다." },
      { title: "지원서 작성", description: "필요한 정보와 자료를 확인해 제출합니다." },
      { title: "지원서 관리", description: "제출 내역을 확인하고 마감 전까지 내용을 관리합니다." },
    ],
  },
};

export function MarketingLanding({ audience }: { readonly audience: LandingContent["audience"] }) {
  const current = content[audience];
  const signupHref = "/signup";

  return (
    <main className="min-h-screen bg-white text-foreground">
      <LandingHeader service="applicant" />

      <section className="relative overflow-hidden bg-surface">
        <div aria-hidden="true" className="absolute -right-40 top-0 h-[520px] w-[520px] rounded-full bg-brand-soft blur-3xl" />
        <div className="relative mx-auto grid min-h-[650px] max-w-[1280px] items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:px-10 lg:py-24">
          <div className="max-w-[600px]">
            <span className="inline-flex rounded-full border border-brand-line bg-white px-3 py-1.5 text-sm font-semibold text-brand">{current.eyebrow}</span>
            <h1 className="mt-6 text-[clamp(38px,3.7vw,58px)] font-bold leading-[1.15] tracking-[-0.04em]">{current.title}</h1>
            <p className="mt-6 max-w-[560px] text-lg leading-8 text-muted-strong">{current.description}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={signupHref} className="inline-flex min-h-[52px] items-center justify-center rounded-control bg-brand px-6 text-base font-semibold text-white shadow-[var(--shadow-1)] transition-[background-color,box-shadow,transform] hover:bg-brand-strong hover:shadow-[var(--shadow-2)] active:scale-[0.98]">지원자로 시작하기</Link>
              <SecondaryLink href="#features" className="min-h-13 px-6 text-base">서비스 살펴보기</SecondaryLink>
            </div>
          </div>
          <ApplicantPreview />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1280px] scroll-mt-24 px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="max-w-[650px]"><p className="text-sm font-bold text-brand">WHY YESULIN</p><h2 className="mt-3 text-[clamp(30px,4vw,44px)] font-bold tracking-[-0.03em]">복잡한 과정을 단순한 흐름으로</h2><p className="mt-4 text-lg leading-8 text-muted-strong">기능을 늘어놓기보다 지원과 심사에 꼭 필요한 순간을 자연스럽게 연결합니다.</p></div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {current.features.map((feature, index) => (
            <article key={feature.title} className="rounded-card border border-border bg-white p-6 transition-[border-color,transform,box-shadow] hover:-translate-y-1 hover:border-brand-line hover:shadow-[var(--shadow-2)]">
              <span className="grid h-10 w-10 place-items-center rounded-control bg-brand-soft text-sm font-bold text-brand">0{index + 1}</span>
              <h3 className="mt-6 text-xl font-bold">{feature.title}</h3><p className="mt-3 leading-7 text-muted-strong">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-sidebar py-20 text-white lg:py-24">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
          <p className="text-sm font-bold text-brand-line">HOW IT WORKS</p><h2 className="mt-3 text-[clamp(30px,4vw,44px)] font-bold tracking-[-0.03em] text-white">시작부터 다음 단계까지</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {current.steps.map((step, index) => <div key={step.title} className="border-l border-sidebar-line pl-5"><span className="text-sm font-bold text-brand-line">STEP {index + 1}</span><h3 className="mt-3 text-xl font-bold text-white">{step.title}</h3><p className="mt-2 leading-7 text-sidebar-muted">{step.description}</p></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="rounded-[28px] bg-brand px-6 py-12 text-center sm:px-10 sm:py-16"><h2 className="text-[clamp(28px,4vw,42px)] font-bold text-white">예술의 다음 기회를 시작해 보세요.</h2><p className="mx-auto mt-4 max-w-[620px] text-lg leading-8 text-white/80">지원자와 공연사가 각자의 일에 더 집중할 수 있도록 예술in이 과정을 연결합니다.</p><Link href={signupHref} className="mt-8 inline-flex min-h-[52px] items-center justify-center rounded-control bg-white px-6 font-semibold text-brand transition-transform active:scale-[0.98]">무료로 시작하기</Link></div>
      </section>

      <LandingFooter />
    </main>
  );
}
