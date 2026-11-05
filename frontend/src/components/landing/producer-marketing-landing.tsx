import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { TrackedLoginLink } from "@/components/analytics/tracked-login-link";
import { landingPosters } from "./landing-posters";
import { NotebookFooter, NotebookHeader } from "./notebook-site-layout";
import { ProducerFlowTabs } from "./producer-flow-tabs";
import { betaIncludes, PRODUCER_KAKAO_CHAT_URL, producerFaqs, producerPerks, producerStats, sampleApplicants } from "./producer-landing-content";
import { ApplicantRow, Pill } from "./producer-landing-parts";
import styles from "./producer-landing.module.css";

const wallPosters = landingPosters.slice(0, 12);

export function ProducerMarketingLanding() {
  return <div className={`public-notebook ${styles.page}`}>
    <a className="notebook-skip" href="#main">본문으로 바로가기</a>
    <NotebookHeader service="producer" />
    <main id="main">
      <Hero />
      <Stats />
      <Section id="flow" eyebrow="이렇게 진행돼요" title="공고 한 번이면, 캐스팅까지" tinted><ProducerFlowTabs /></Section>
      <Section eyebrow="예술in만의 기능" title="제일 오래 걸리던 일부터 줄였어요"><Perks /></Section>
      <Section eyebrow="함께한 공연" title="예술in에서 배우를 찾은 공연들" tinted><PosterWall /></Section>
      <section className={styles.block}><div className={styles.wrap}><BetaPrice /></div></section>
      <Section eyebrow="자주 묻는 질문" title="공연사들이 많이 물어봐요" tinted><Faq /></Section>
      <FinalCall />
    </main>
    <NotebookFooter />
  </div>;
}

function Hero() {
  return <section className={styles.hero}><div className={`${styles.wrap} ${styles.heroGrid}`}>
    <div>
      <span className={styles.eyebrow}>기획사·제작사 서비스</span>
      <h1>오디션 공고부터 <em>배우 심사까지</em>, 한곳에서</h1>
      <p className={styles.lead}>공고를 올리면 배우 240+명에게 알림이 가고, PDF 지원서는 자동으로 정리돼요.</p>
      <StartButtons />
      <p className={styles.fine}>지금은 모든 기능 무료 · 이미 계정이 있다면 <TrackedLoginLink href="/login" analytics={{ entry_point: "producer_landing_hero", login_reason: "manage_production", actor_type: "producer", return_target: "producer_home" }} className={styles.inlineLink}>로그인</TrackedLoginLink></p>
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
      <h4>새 지원자 · 오늘</h4>
      <ApplicantRow applicant={sampleApplicants.kim} detail="앨리스 역 · 2분 전"><Pill tone="new">새 지원</Pill></ApplicantRow>
      <ApplicantRow applicant={sampleApplicants.park} detail="앙상블 · 14분 전"><Pill tone="new">새 지원</Pill></ApplicantRow>
      <ApplicantRow applicant={sampleApplicants.lee} detail="앨리스 역 · 1시간 전"><Pill tone="pass">1차 합격</Pill></ApplicantRow>
    </div>
    <div className={`${styles.card} ${styles.cardSorted}`}>
      <h4>메일 지원서 자동 정리 <Pill tone="soon">곧 열려요</Pill></h4>
      <dl className={styles.facts}><dt>이름</dt><dd>김하린</dd><dt>나이</dt><dd>만 27세 · 166cm</dd><dt>경력</dt><dd>3건 · 최근 「푸른 방」</dd></dl>
    </div>
    <div className={`${styles.card} ${styles.cardReach}`}>
      <h4>내 공고 반응 · 3일째</h4>
      <p className={styles.bigNumber}>124<small> 명이 봤어요</small></p>
      <div className={styles.meter}><i /></div>
      <p className={styles.cardNote}>오픈채팅 243명에게 알림 발송됨</p>
    </div>
  </div>;
}

function Stats() {
  return <section className={styles.stats} aria-label="예술in 숫자"><div className={`${styles.wrap} ${styles.statGrid}`}>
    {producerStats.map((stat) => <div key={stat.label} className={styles.stat}><b>{stat.value}</b><span>{stat.label}</span></div>)}
  </div></section>;
}

type SectionProps = { id?: string; eyebrow: string; title: string; tinted?: boolean; children: ReactNode };

function Section({ id, eyebrow, title, tinted = false, children }: SectionProps) {
  const headingId = `producer-${eyebrow.replaceAll(" ", "-")}`;
  return <section id={id} className={styles.block} data-tinted={tinted} aria-labelledby={headingId}>
    <div className={styles.wrap}>
      <div className={styles.heading}><small>{eyebrow}</small><h2 id={headingId}>{title}</h2></div>
      {children}
    </div>
  </section>;
}

function Perks() {
  return <div className={styles.perks}>
    {producerPerks.map((perk) => <article key={perk.title} className={styles.perk}>
      <span className={styles.perkMark} aria-hidden="true">{perk.mark}</span>
      <h3>{perk.title}</h3>
      <p>{perk.description}</p>
      {perk.soon && <p className={styles.soonNote}><Pill tone="soon">곧 열려요</Pill> {perk.soon}</p>}
    </article>)}
  </div>;
}

function PosterWall() {
  return <div className={styles.wall}>
    <ul className={styles.track}>
      {wallPosters.map((poster) => <li key={poster.id}><Image src={poster.image} alt={poster.caption} width={300} height={400} sizes="150px" /></li>)}
      {wallPosters.map((poster) => <li key={`again-${poster.id}`} aria-hidden="true"><Image src={poster.image} alt="" width={300} height={400} sizes="150px" /></li>)}
    </ul>
  </div>;
}

function BetaPrice() {
  return <div id="price" className={styles.price}>
    <div>
      <span className={styles.eyebrow}>베타 기간</span>
      <p className={styles.free}>지금은 0원<small> / 모든 기능</small></p>
      <p className={styles.muted}>요금제가 생기면 미리 알려 드려요.</p>
    </div>
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
    <div><h2>다음 공연의 배우, 예술in에서 찾아보세요</h2><p>이메일 인증만 마치면 바로 공고를 올릴 수 있어요.</p></div>
    <StartButtons />
  </div></section>;
}
