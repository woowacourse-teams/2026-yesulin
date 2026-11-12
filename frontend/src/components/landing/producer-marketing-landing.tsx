import { PRODUCER_LOGIN_PATH } from "@/features/auth/producer-navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { TrackedLoginLink } from "@/components/analytics/tracked-login-link";
import { NotebookFooter, NotebookHeader } from "./notebook-site-layout";
import { ProducerFlowTabs } from "./producer-flow-tabs";
import { betaIncludes, PRODUCER_KAKAO_CHAT_URL, PRODUCER_STATS_AS_OF, producerFaqs, producerPerks, producerStats, sampleApplicants } from "./producer-landing-content";
import { ApplicantRow, Pill } from "./producer-landing-parts";
import { ProducerPosterWall } from "./producer-poster-wall";
import styles from "./producer-landing.module.css";

export function ProducerMarketingLanding() {
  return <div className={`public-notebook ${styles.page}`}>
    <a className="notebook-skip" href="#main">본문으로 바로가기</a>
    <NotebookHeader service="producer" />
    <main id="main">
      <Hero />
      <Stats />
      <Section id="flow" headingId="producer-flow" title="공고 한 번이면, 캐스팅까지" tinted><ProducerFlowTabs /></Section>
      <Section headingId="producer-perks" title="제일 오래 걸리던 일부터 줄였어요"><Perks /></Section>
      <Section headingId="producer-posters" title="예술in에 올라온 공연들" tinted><ProducerPosterWall /></Section>
      <Section id="price" headingId="producer-price" title="지금은 0원"><BetaPrice /></Section>
      <Section headingId="producer-faq" title="자주 묻는 질문" tinted><Faq /></Section>
      <FinalCall />
    </main>
    <NotebookFooter />
  </div>;
}

function Hero() {
  return <section className={styles.hero}><div className={`${styles.wrap} ${styles.heroGrid}`}>
    <div>
      <h1>오디션 공고부터 배우 심사까지, 한곳에서</h1>
      <p className={styles.lead}>올린 공고는 배우 오픈채팅에 공유되고, 메일로 받은 PDF 지원서도 자동으로 정리돼요.</p>
      <StartButtons />
      <p className={styles.fine}>이미 계정이 있다면 <TrackedLoginLink href={PRODUCER_LOGIN_PATH} analytics={{ entry_point: "producer_landing_hero", login_reason: "manage_production", actor_type: "producer", return_target: "producer_home" }} className={styles.inlineLink}>로그인</TrackedLoginLink></p>
    </div>
    <HeroCards />
  </div></section>;
}

function StartButtons() {
  return <div className={styles.ctas}>
    <Link className={`${styles.button} ${styles.primary}`} href="/signup">무료로 시작하기</Link>
    <a className={`${styles.button} ${styles.ghost}`} href={PRODUCER_KAKAO_CHAT_URL} target="_blank" rel="noopener noreferrer" aria-label="카카오톡으로 문의 (새 창에서 열림)">카카오톡으로 문의</a>
  </div>;
}

function HeroCards() {
  return <div className={styles.stack} aria-hidden="true">
    <div className={`${styles.card} ${styles.cardApplicants}`}>
      <h4>오늘 들어온 지원자</h4>
      <ApplicantRow applicant={sampleApplicants.kim} detail="앨리스 역"><Pill tone="new">새 지원</Pill></ApplicantRow>
      <ApplicantRow applicant={sampleApplicants.park} detail="앙상블"><Pill tone="new">새 지원</Pill></ApplicantRow>
      <ApplicantRow applicant={sampleApplicants.lee} detail="앨리스 역"><Pill tone="pass">1차 합격</Pill></ApplicantRow>
    </div>
    <div className={`${styles.card} ${styles.cardSorted}`}>
      <h4>메일 지원서 자동 정리 <Pill tone="soon">곧 열려요</Pill></h4>
      <dl className={styles.facts}><dt>이름</dt><dd>이서연</dd><dt>나이</dt><dd>만 25세</dd><dt>경력</dt><dd>「여름 정원」 외 1건</dd></dl>
    </div>
  </div>;
}

function Stats() {
  return <section className={styles.stats} aria-label="예술in 숫자"><div className={styles.wrap}>
    <div className={styles.statGrid}>{producerStats.map((stat) => <div key={stat.label} className={styles.stat}><b>{stat.value}</b><span>{stat.label}</span></div>)}</div>
    <p className={styles.asOf}>{PRODUCER_STATS_AS_OF} 기준</p>
  </div></section>;
}

type SectionProps = { id?: string; headingId: string; title: string; tinted?: boolean; children: ReactNode };

function Section({ id, headingId, title, tinted = false, children }: SectionProps) {
  return <section id={id} className={styles.block} data-tinted={tinted} aria-labelledby={headingId}>
    <div className={styles.wrap}>
      <h2 id={headingId} className={styles.sectionTitle}>{title}</h2>
      {children}
    </div>
  </section>;
}

function Perks() {
  return <ul className={styles.perks}>
    {producerPerks.map((perk) => <li key={perk.title} className={styles.perk}>
      <h3>{perk.title}</h3>
      <div>
        <p>{perk.description}</p>
        {perk.soon && <p className={styles.soonNote}><Pill tone="soon">곧 열려요</Pill> {perk.soon}</p>}
      </div>
    </li>)}
  </ul>;
}

function BetaPrice() {
  return <div className={styles.price}>
    <p className={styles.priceNote}>베타 기간에는 모든 기능이 무료예요. 요금제가 생기면 미리 알려 드려요.</p>
    <ul className={styles.includes}>{betaIncludes.map((item) => <li key={item}>{item}</li>)}</ul>
  </div>;
}

function Faq() {
  return <div className={styles.faq}>
    {producerFaqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
  </div>;
}

function FinalCall() {
  return <section className={styles.final}><div className={`${styles.wrap} ${styles.finalBox}`}>
    <h2 className={styles.finalTitle}>다음 공연의 배우, 예술in에서 찾아보세요</h2>
    <StartButtons />
  </div></section>;
}
