import Link from "next/link";
import { PrimaryLink } from "@/components/ui/controls";
import { LandingFooter, LandingHeader } from "./landing-header";
import { PartnerMarquee } from "./partner-marquee";
import { ProducerPreview } from "./landing-preview";

const benefits = [
  { number: "01", title: "공연과 공고를 하나의 구조로", description: "공연, 배역, 공고가 연결된 현재 업무 구조를 그대로 유지하며 모집 조건을 설정합니다." },
  { number: "02", title: "지원자 비교에 필요한 정보만", description: "프로필과 경력, 사진, 영상을 오가며 찾지 않고 심사 화면에서 빠르게 비교합니다." },
  { number: "03", title: "차수별 심사 기록을 안전하게", description: "1차부터 최종 전형까지 평가와 상태를 분리해 이전 기록을 잃지 않고 이어갑니다." },
] as const;

const workflow = ["공연·배역 등록", "공고 생성", "지원자 검토", "다음 전형 관리"];

export function ProducerMarketingLanding() {
  return (
    <main className="min-h-screen bg-white text-foreground">
      <LandingHeader service="producer" />

      <section className="relative overflow-hidden bg-sidebar text-white">
        <div aria-hidden="true" className="absolute -left-28 top-[-160px] h-[520px] w-[520px] rounded-full bg-brand/25 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-40 bottom-[-260px] h-[620px] w-[620px] rounded-full bg-brand/15 blur-3xl" />
        <div className="relative mx-auto grid min-h-[720px] max-w-[1280px] items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:py-24">
          <div className="max-w-[610px]">
            <span className="inline-flex rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-sm font-semibold text-brand-line backdrop-blur-md">공연사를 위한 캐스팅 워크스페이스</span>
            <h1 className="mt-7 text-[clamp(42px,5vw,68px)] font-bold leading-[1.1] tracking-[-0.04em] text-white">
              좋은 지원자를<br />더 빠르게 발견하는<br /><span className="text-brand-line">선명한 심사 흐름.</span>
            </h1>
            <p className="mt-6 max-w-[570px] text-lg leading-8 text-sidebar-text/80">공연과 배역별 지원자를 비교하고, 심사 결과와 다음 전형을 한 화면에서 관리하세요.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <PrimaryLink href="/signup?role=producer" className="min-h-13 px-6 shadow-[var(--shadow-cta)]">공연사로 시작하기</PrimaryLink>
              <Link href="/login" className="inline-flex min-h-[52px] items-center justify-center rounded-control border border-white/20 bg-white/5 px-6 font-semibold text-white backdrop-blur-md transition-[background-color,transform] hover:bg-white/10 active:scale-[0.98]">기존 계정으로 로그인</Link>
            </div>
            <dl className="mt-10 grid max-w-[540px] grid-cols-3 divide-x divide-white/10 border-y border-white/10 py-5">
              <div className="pr-4"><dt className="text-xs text-sidebar-muted">진행 중 공고</dt><dd className="num mt-1 text-2xl font-bold text-white">3</dd></div>
              <div className="px-4"><dt className="text-xs text-sidebar-muted">전체 지원자</dt><dd className="num mt-1 text-2xl font-bold text-white">128</dd></div>
              <div className="pl-4"><dt className="text-xs text-sidebar-muted">검토 대기</dt><dd className="num mt-1 text-2xl font-bold text-white">24</dd></div>
            </dl>
          </div>
          <div className="relative">
            <div aria-hidden="true" className="absolute inset-6 rounded-[36px] bg-brand/25 blur-3xl" />
            <div className="relative"><ProducerPreview /></div>
          </div>
        </div>
      </section>

      <PartnerMarquee />

      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start"><p className="text-sm font-bold text-brand">BUILT FOR REVIEW</p><h2 className="mt-3 text-[clamp(30px,3.2vw,42px)] font-bold leading-[1.2] tracking-[-0.035em]">지원자를 검토하는<br />방식부터 달라집니다.</h2><p className="mt-5 text-lg leading-8 text-muted-strong">더 많은 기능보다, 담당자가 더 빠르고 정확하게 판단할 수 있는 화면을 만듭니다.</p></div>
          <div className="divide-y divide-border border-y border-border">
            {benefits.map((benefit) => (
              <article key={benefit.number} className="grid gap-4 py-8 sm:grid-cols-[56px_1fr] sm:py-10">
                <span className="text-sm font-bold text-brand">{benefit.number}</span>
                <div><h3 className="text-2xl font-bold">{benefit.title}</h3><p className="mt-3 max-w-[650px] text-base leading-7 text-muted-strong">{benefit.description}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-soft py-20 lg:py-24">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-bold text-brand">ONE CONTINUOUS FLOW</p><h2 className="mt-3 text-[clamp(30px,4vw,44px)] font-bold tracking-[-0.03em]">등록부터 심사까지 끊김 없이</h2></div><p className="max-w-[430px] leading-7 text-muted-strong">각 단계의 정보가 다음 업무로 자연스럽게 이어집니다.</p></div>
          <ol className="mt-12 grid gap-3 md:grid-cols-4">
            {workflow.map((item, index) => <li key={item} className="rounded-card border border-brand-line bg-white p-5"><span className="text-sm font-bold text-brand">0{index + 1}</span><p className="mt-8 text-lg font-bold">{item}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="overflow-hidden rounded-[28px] bg-sidebar px-6 py-14 text-center sm:px-10 sm:py-18"><p className="text-sm font-bold text-brand-line">READY TO START</p><h2 className="mt-4 text-[clamp(30px,4vw,44px)] font-bold text-white">좋은 캐스팅은 명확한 관리에서 시작됩니다.</h2><p className="mx-auto mt-4 max-w-[650px] text-lg leading-8 text-sidebar-muted">공연사 가입 후 공연과 공고를 등록하고 지원자 심사 흐름을 확인해 보세요.</p><PrimaryLink href="/signup?role=producer" className="mt-8 min-h-13 px-6">공연사 계정 만들기</PrimaryLink></div>
      </section>

      <LandingFooter />
    </main>
  );
}
