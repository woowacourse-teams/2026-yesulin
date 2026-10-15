import Link from "next/link";
import { TrackedLoginLink } from "@/components/analytics/tracked-login-link";
import { PrimaryLink } from "@/components/ui/controls";
import { NotebookFooter, NotebookHeader } from "./notebook-site-layout";
import { ProducerPreview } from "./landing-preview";

const features = [
  { title: "공연·배역별 모집", description: "공연과 배역을 등록하고 배역별로 필요한 모집 조건을 정합니다." },
  { title: "지원서 검토", description: "프로필, 경력, 사진과 영상을 확인하고 지원자를 검토합니다." },
  { title: "전형별 심사 기록", description: "합격·불합격 결과를 남기고 다음 전형을 진행합니다." },
];

export function ProducerMarketingLanding() {
  return <div className="public-notebook">
    <a className="notebook-skip" href="#main">본문으로 바로가기</a>
    <NotebookHeader service="producer" />
    <main id="main" className="notebook-container notebook-producer-intro">
      <section className="notebook-producer-hero">
        <div>
          <p className="text-sm font-semibold text-brand">기획사·제작사 서비스</p>
          <h1>공고 등록과 지원서 심사를<br />한곳에서</h1>
          <p className="notebook-producer-description">공연과 배역별로 지원자를 모으고, 사진·영상과 경력을 확인하며 전형별 심사 결과를 관리하세요.</p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <PrimaryLink href="/signup">계정 만들기</PrimaryLink>
            <TrackedLoginLink href="/login" analytics={{ entry_point: "producer_landing_hero", login_reason: "manage_production", actor_type: "producer", return_target: "producer_home" }} className="notebook-text-link">기존 계정으로 로그인</TrackedLoginLink>
          </div>
        </div>
        <div className="notebook-producer-preview max-[400px]:hidden"><ProducerPreview /></div>
      </section>
      <section className="notebook-producer-features" aria-labelledby="producer-features">
        <h2 id="producer-features">이렇게 사용할 수 있어요</h2>
        <div>{features.map((feature) => <article key={feature.title}><h3>{feature.title}</h3><p>{feature.description}</p></article>)}</div>
      </section>
      <section className="notebook-about-contact">
        <div><h2>계정을 만들고 공고를 등록해보세요</h2><p>궁금한 점은 이메일이나 카카오톡으로 문의해주세요.</p></div>
        <Link href="/signup" className="notebook-outline-button">기획사·제작사 회원가입</Link>
      </section>
    </main>
    <NotebookFooter />
  </div>;
}
