import { TrackedLoginLink } from "@/components/analytics/tracked-login-link";
import { PrimaryLink } from "@/components/ui/controls";
import { LandingFooter, LandingHeader } from "./landing-header";
import { ProducerPreview } from "./landing-preview";

const benefits = [
  { number: "01", title: "공연과 공고를 하나의 구조로", description: "공연, 배역, 공고가 연결된 현재 업무 구조를 그대로 유지하며 모집 조건을 설정합니다." },
  { number: "02", title: "배우 비교에 필요한 정보만", description: "프로필과 경력, 사진, 영상을 오가며 찾지 않고 심사 화면에서 빠르게 비교합니다." },
  { number: "03", title: "차수별 심사 기록을 안전하게", description: "1차부터 최종 전형까지 평가와 상태를 분리해 이전 기록을 잃지 않고 이어갑니다." },
] as const;

const workflow = ["공연·배역 등록", "공고 생성", "배우 검토", "다음 전형 관리"];

/** 출처: 2026-09-14 업무 흐름 기준 내부 계산. 가정이 많은 시간 대신 조작 수만 쓴다. */
const effortStats = [
  { label: "지원자 한 명당", before: "5번", after: "1번" },
  { label: "지원자 300명 · 배역 5개 공고", before: "1,510번", after: "305번" },
] as const;

export function ProducerMarketingLanding() {
  return (
    <main className="min-h-screen bg-white text-foreground">
      <LandingHeader service="producer" />

      <section className="relative overflow-hidden bg-sidebar text-white">
        <div aria-hidden="true" className="absolute -left-28 top-[-160px] h-[520px] w-[520px] rounded-full bg-brand/25 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-40 bottom-[-260px] h-[620px] w-[620px] rounded-full bg-brand/15 blur-3xl" />
        <div className="relative mx-auto grid min-h-[720px] max-w-[1280px] items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:py-24">
          <div className="max-w-[610px]">
            <span className="inline-flex rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-sm font-semibold text-brand-line backdrop-blur-md">기획사/제작사 배우 모집과 심사</span>
            <h1 className="mt-7 break-keep text-[clamp(26px,7.6vw,56px)] font-bold leading-[1.15] tracking-[-0.04em] text-white lg:text-[clamp(34px,3.6vw,52px)]">
              접수부터 최종 전형까지<br /><span className="text-brand-line">한 곳에서 끝냅니다.</span>
            </h1>
            <p className="mt-6 max-w-[570px] break-keep text-lg leading-8 text-sidebar-text/80">메일을 열고 첨부를 내려받아 배역 폴더로 옮기던 일이 없습니다. 사진을 보고 합격·불합격만 누르면 다음 지원자로, 차수가 끝나면 다음 전형으로 넘어갑니다.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <PrimaryLink href="/signup" className="min-h-13 px-6 shadow-[var(--shadow-cta)]">기획사/제작사로 시작하기</PrimaryLink>
              <TrackedLoginLink href="/login" analytics={{ entry_point: "producer_landing_hero", login_reason: "manage_production", actor_type: "producer", return_target: "producer_home" }} className="inline-flex min-h-[52px] items-center justify-center rounded-control border border-white/20 bg-white/5 px-6 font-semibold text-white backdrop-blur-md transition-[background-color,transform] hover:bg-white/10 active:scale-[0.98]">기존 계정으로 로그인</TrackedLoginLink>
            </div>
          </div>
          {/* 가로 400px 미만에서는 미리보기 속 글자가 줄마다 끊겨 실제 화면을 잘못 보여 주므로 감춘다. */}
          <div className="relative max-[400px]:hidden">
            <div aria-hidden="true" className="absolute inset-6 rounded-[36px] bg-brand/25 blur-3xl" />
            <div className="relative"><ProducerPreview /></div>
          </div>
        </div>
      </section>

      <ReviewEffortSection />

      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start"><p className="text-sm font-bold text-brand">BUILT FOR REVIEW</p><h2 className="mt-3 break-keep text-[clamp(30px,3.2vw,42px)] font-bold leading-[1.2] tracking-[-0.035em]">배우를 검토하는<br />방식부터 달라집니다.</h2><p className="mt-5 text-lg leading-8 text-muted-strong">더 많은 기능보다, 담당자가 더 빠르고 정확하게 판단할 수 있는 화면을 만듭니다.</p></div>
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
          <div><p className="text-sm font-bold text-brand">ONE CONTINUOUS FLOW</p><h2 className="mt-3 break-keep text-[clamp(30px,4vw,44px)] font-bold tracking-[-0.03em]">등록부터 심사까지 끊김 없이</h2></div>
          <ol className="mt-12 grid gap-3 md:grid-cols-4">
            {workflow.map((item, index) => <li key={item} className="rounded-card border border-brand-line bg-white p-5"><span className="text-sm font-bold text-brand">0{index + 1}</span><p className="mt-8 text-lg font-bold">{item}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="overflow-hidden rounded-[28px] bg-sidebar px-6 py-14 text-center sm:px-10 sm:py-18"><p className="text-sm font-bold text-brand-line">READY TO START</p><h2 className="mt-4 break-keep text-[clamp(30px,4vw,44px)] font-bold text-white">지금 올린 공고부터 바로 써 보세요.</h2><p className="mx-auto mt-4 max-w-[650px] text-lg leading-8 text-sidebar-muted">기획사/제작사 계정을 만들고 바로 공연 관리를 시작하세요.</p><PrimaryLink href="/signup" className="mt-8 min-h-13 px-6">기획사/제작사 계정 만들기</PrimaryLink></div>
      </section>

      <LandingFooter />
    </main>
  );
}

/**
 * 줄어드는 조작 수만 한 줄로 보여 준다.
 * 표까지 펼치면 읽을 것이 많아져 정작 숫자가 안 읽히고, 시간은 가정이 많아 쓰지 않는다.
 */
function ReviewEffortSection() {
  return (
    <section className="border-y border-border bg-surface py-14">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-5 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-14 lg:px-10">
        <div>
          <p className="text-sm font-bold text-brand">업무 흐름 기준 내부 계산</p>
          <h2 className="mt-3 break-keep text-[clamp(26px,2.8vw,36px)] font-bold leading-[1.25] tracking-[-0.03em]">
            지원자 한 명에 다섯 번 누르던 일을,<br />한 번으로 줄였습니다.
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {effortStats.map((stat) => (
            <div key={stat.label} className="rounded-card border border-border bg-card px-4 py-4">
              <p className="text-xs font-semibold leading-5 text-muted">{stat.label}</p>
              <p className="num mt-2 flex items-baseline gap-1.5 text-2xl font-bold tracking-[-0.03em]">
                <span className="text-base text-muted-soft line-through">{stat.before}</span>
                <span aria-hidden="true" className="text-sm text-muted">→</span>
                <span className="text-brand">{stat.after}</span>
              </p>
            </div>
          ))}
          <div className="rounded-card border border-brand bg-brand px-4 py-4 text-white">
            <p className="text-xs font-semibold leading-5 text-brand-line">줄어드는 조작</p>
            <p className="num mt-2 text-3xl font-bold tracking-[-0.03em]">약 80%</p>
          </div>
          <p className="text-xs leading-5 text-muted sm:col-span-3">실측이 아닌 내부 계산값입니다.</p>
        </div>
      </div>
    </section>
  );
}
