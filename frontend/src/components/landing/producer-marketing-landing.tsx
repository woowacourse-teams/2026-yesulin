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

/** 지원자 한 명을 검토할 때 기존 방식에서 사라지는 단계. 출처: 2026-09-14 업무 흐름 기준 내부 계산. */
const reviewSteps = [
  { step: "메일 열기", before: "1번", after: "없음", note: "접수 목록에 바로 표시" },
  { step: "첨부파일 내려받기", before: "1번", after: "없음", note: "주고받는 파일이 없음" },
  { step: "배역 폴더로 옮기기", before: "1번", after: "없음", note: "신청한 배역으로 자동 분류" },
  { step: "파일 열기", before: "1번", after: "없음", note: "화면에서 바로 확인" },
  { step: "합격·불합격 판정", before: "1번", after: "1번", note: "" },
] as const;

const scaleRows = [
  { scale: "3~4인극", detail: "100명 · 4배역", before: "508번", after: "104번", cut: "79.5%", beforeTime: "약 22분", afterTime: "약 5분" },
  { scale: "중형 시즌 공연", detail: "300명 · 5배역", before: "1,510번", after: "305번", cut: "79.8%", beforeTime: "약 65분", afterTime: "약 15분" },
  { scale: "대형 공모", detail: "500명 · 5배역", before: "2,510번", after: "505번", cut: "79.9%", beforeTime: "약 109분", afterTime: "약 25분" },
] as const;

const headlineStats = [
  { label: "지원자 한 명당 조작", before: "5번", after: "1번" },
  { label: "300명·5배역 한 공고", before: "1,510번", after: "305번" },
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
            <span className="inline-flex rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-sm font-semibold text-brand-line backdrop-blur-md">기획사/제작사를 위한 캐스팅 워크스페이스</span>
            <h1 className="mt-7 text-[clamp(42px,5vw,68px)] font-bold leading-[1.1] tracking-[-0.04em] text-white">
              좋은 배우를<br />더 빠르게 발견하는<br /><span className="text-brand-line">선명한 심사 흐름.</span>
            </h1>
            <p className="mt-6 max-w-[570px] text-lg leading-8 text-sidebar-text/80">공연과 배역별 배우를 비교하고, 심사 결과와 다음 전형을 한 화면에서 관리하세요.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <PrimaryLink href="/signup" className="min-h-13 px-6 shadow-[var(--shadow-cta)]">기획사/제작사로 시작하기</PrimaryLink>
              <TrackedLoginLink href="/login" analytics={{ entry_point: "producer_landing_hero", login_reason: "manage_production", actor_type: "producer", return_target: "producer_home" }} className="inline-flex min-h-[52px] items-center justify-center rounded-control border border-white/20 bg-white/5 px-6 font-semibold text-white backdrop-blur-md transition-[background-color,transform] hover:bg-white/10 active:scale-[0.98]">기존 계정으로 로그인</TrackedLoginLink>
            </div>
          </div>
          <div className="relative">
            <div aria-hidden="true" className="absolute inset-6 rounded-[36px] bg-brand/25 blur-3xl" />
            <div className="relative"><ProducerPreview /></div>
          </div>
        </div>
      </section>

      <ReviewEffortSection />

      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start"><p className="text-sm font-bold text-brand">BUILT FOR REVIEW</p><h2 className="mt-3 text-[clamp(30px,3.2vw,42px)] font-bold leading-[1.2] tracking-[-0.035em]">배우를 검토하는<br />방식부터 달라집니다.</h2><p className="mt-5 text-lg leading-8 text-muted-strong">더 많은 기능보다, 담당자가 더 빠르고 정확하게 판단할 수 있는 화면을 만듭니다.</p></div>
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
        <div className="overflow-hidden rounded-[28px] bg-sidebar px-6 py-14 text-center sm:px-10 sm:py-18"><p className="text-sm font-bold text-brand-line">READY TO START</p><h2 className="mt-4 text-[clamp(30px,4vw,44px)] font-bold text-white">좋은 캐스팅은 명확한 관리에서 시작됩니다.</h2><p className="mx-auto mt-4 max-w-[650px] text-lg leading-8 text-sidebar-muted">기획사/제작사 계정을 만들고 바로 공연 관리를 시작하세요.</p><PrimaryLink href="/signup" className="mt-8 min-h-13 px-6">기획사/제작사 계정 만들기</PrimaryLink></div>
      </section>

      <LandingFooter />
    </main>
  );
}

/**
 * 무엇이 얼마나 줄어드는지를 숫자로 먼저 보여 준다.
 * 내부 계산값이므로 근거와 가정을 같은 화면에 두어 실측처럼 읽히지 않게 한다.
 */
function ReviewEffortSection() {
  return (
    <section className="bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10">
        <p className="text-sm font-bold text-brand">업무 흐름 기준 내부 계산</p>
        <h2 className="mt-3 max-w-[760px] text-[clamp(30px,3.6vw,44px)] font-bold leading-[1.2] tracking-[-0.035em]">
          지원자 한 명에 다섯 번 누르던 일을,<br />한 번으로 줄였습니다.
        </h2>
        <p className="mt-5 max-w-[640px] text-lg leading-8 text-muted-strong">
          메일을 열고, 첨부를 내려받고, 배역 폴더로 옮기고, 파일을 여는 네 단계가 사라집니다. 남는 것은 합격·불합격을 정하는 한 번뿐입니다.
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {headlineStats.map((stat) => (
            <div key={stat.label} className="rounded-card border border-border bg-card p-6">
              <p className="text-sm font-semibold text-muted">{stat.label}</p>
              <p className="num mt-4 flex items-baseline gap-2 text-3xl font-bold tracking-[-0.03em]">
                <span className="text-muted-soft line-through">{stat.before}</span>
                <span aria-hidden="true" className="text-xl text-muted">→</span>
                <span className="text-brand">{stat.after}</span>
              </p>
            </div>
          ))}
          <div className="rounded-card border border-brand bg-brand p-6 text-white">
            <p className="text-sm font-semibold text-brand-line">줄어드는 조작</p>
            <p className="num mt-4 text-4xl font-bold tracking-[-0.03em]">약 80%</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <EffortTable caption="지원자 한 명을 검토할 때" columns={["단계", "기존 방식", "예술in"]}>
            {reviewSteps.map((row) => (
              <tr key={row.step} className="border-t border-border-soft">
                <th scope="row" className="py-3 pr-3 text-left font-semibold">
                  {row.step}
                  {row.note ? <span className="mt-0.5 block text-xs font-normal text-muted">{row.note}</span> : null}
                </th>
                <td className="num py-3 pr-3 text-right text-muted-strong">{row.before}</td>
                <td className={`num py-3 text-right font-bold ${row.after === "없음" ? "text-pass" : "text-foreground"}`}>{row.after}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-border">
              <th scope="row" className="py-3 pr-3 text-left font-bold">합계</th>
              <td className="num py-3 pr-3 text-right font-bold text-muted-strong">5번</td>
              <td className="num py-3 text-right text-lg font-bold text-brand">1번</td>
            </tr>
          </EffortTable>

          <EffortTable caption="공고 하나를 끝까지 검토할 때" columns={["규모", "조작 수", "걸리는 시간"]}>
            {scaleRows.map((row) => (
              <tr key={row.scale} className="border-t border-border-soft">
                <th scope="row" className="py-3 pr-3 text-left font-semibold">
                  {row.scale}
                  <span className="num mt-0.5 block text-xs font-normal text-muted">{row.detail}</span>
                </th>
                <td className="num py-3 pr-3 text-right">
                  <span className="text-muted-soft line-through">{row.before}</span>
                  <span className="ml-1.5 font-bold text-brand">{row.after}</span>
                  <span className="mt-0.5 block text-xs font-normal text-pass">−{row.cut}</span>
                </td>
                <td className="num py-3 text-right">
                  <span className="text-muted-soft line-through">{row.beforeTime}</span>
                  <span className="ml-1.5 font-bold text-foreground">{row.afterTime}</span>
                </td>
              </tr>
            ))}
          </EffortTable>
        </div>

        <p className="mt-6 max-w-[860px] text-xs leading-6 text-muted">
          기획사/제작사 업무 흐름을 기준으로 계산한 <strong className="font-semibold text-muted-strong">내부 추정치이며 실측값이 아닙니다.</strong> 시간은 조작 한 번 2초,
          파일이 열릴 때까지 3초를 가정했고 지원서를 읽는 시간은 양쪽 모두 제외했습니다. 파일을 닫는 조작, 사진·영상을 따로 내려받는 경우,
          파일명 규칙을 지키지 않은 지원서의 배역을 확인하는 조작은 계산에서 빼 실제 기존 방식은 이보다 더 많습니다.
        </p>
      </div>
    </section>
  );
}

function EffortTable({ caption, columns, children }: {
  readonly caption: string;
  readonly columns: readonly [string, string, string];
  readonly children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-card">
      <div className="scrollbar-hidden overflow-x-auto px-5 py-4 sm:px-6">
        <table className="w-full min-w-[320px] text-sm">
          <caption className="mb-3 text-left text-base font-bold text-foreground">{caption}</caption>
          <thead>
            <tr className="text-xs font-semibold text-muted">
              <th scope="col" className="pb-2 pr-3 text-left">{columns[0]}</th>
              <th scope="col" className="pb-2 pr-3 text-right">{columns[1]}</th>
              <th scope="col" className="pb-2 text-right">{columns[2]}</th>
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
