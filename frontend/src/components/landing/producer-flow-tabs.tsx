"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { kimHarinShots, sampleApplicants } from "./producer-landing-content";
import { ApplicantRow, Pill } from "./producer-landing-parts";
import styles from "./producer-landing.module.css";

type FlowStep = { title: string; screen: () => ReactNode };

const ARROW_STEPS: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

const flowSteps: FlowStep[] = [
  { title: "공고 올리기", screen: PostScreen },
  { title: "지원서 받기", screen: ApplicantsScreen },
  { title: "심사하기", screen: ReviewScreen },
];

export function ProducerFlowTabs() {
  const [active, setActive] = useState(0);
  const Screen = flowSteps[active].screen;
  return <div className={styles.flow}>
    <StepList active={active} onSelect={setActive} />
    <div className={styles.screen} role="tabpanel" tabIndex={0} id="producer-step-panel" aria-labelledby={`producer-step-${active}`}>
      <Screen />
    </div>
  </div>;
}

function StepList({ active, onSelect }: { active: number; onSelect: (index: number) => void }) {
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  function moveWithArrow(event: KeyboardEvent<HTMLDivElement>) {
    const direction = ARROW_STEPS[event.key];
    if (!direction) return;
    event.preventDefault();
    const next = (active + direction + flowSteps.length) % flowSteps.length;
    onSelect(next);
    tabs.current[next]?.focus();
  }
  return <div className={styles.steps} role="tablist" aria-label="진행 단계" aria-orientation="vertical" onKeyDown={moveWithArrow}>
    {flowSteps.map((step, index) => <button key={step.title} ref={(node) => { tabs.current[index] = node; }} type="button" role="tab" id={`producer-step-${index}`} aria-controls="producer-step-panel" aria-selected={active === index} tabIndex={tabIndexFor(active, index)} className={styles.step} onClick={() => onSelect(index)}>
      <span className={styles.stepNumber}>{index + 1}</span><b>{step.title}</b>
    </button>)}
  </div>;
}

function tabIndexFor(active: number, index: number) {
  if (active === index) return 0;
  return -1;
}

function PostScreen() {
  return <>
    <h3>새 오디션 공고</h3>
    <p className={styles.muted}>공연과 배역만 적으면 돼요.</p>
    <SampleField label="공연명">창작뮤지컬 〈오늘도, 온에어〉</SampleField>
    <SampleField label="분야"><span className={styles.chips}><span>연극</span><span className={styles.chipOn}>뮤지컬</span><span>퍼포먼스</span><span>단원</span></span></SampleField>
    <div className={styles.split}>
      <SampleField label="모집 배역">앨리스 (여, 20대)<br />앙상블 (남녀 2명)</SampleField>
      <SampleField label="마감일">2026.11.20 (금)</SampleField>
    </div>
    <div className={styles.decide}><span className={styles.decidePass}>공고 게시하기</span></div>
  </>;
}

function SampleField({ label, children }: { label: string; children: ReactNode }) {
  return <div className={styles.field}><span className={styles.fieldLabel}>{label}</span><div className={styles.input}>{children}</div></div>;
}

function ApplicantsScreen() {
  return <>
    <h3>지원자 24명</h3>
    <p className={styles.muted}>새 지원 5명</p>
    <ApplicantRow applicant={sampleApplicants.kim} detail="앨리스 역"><Pill tone="new">새 지원</Pill></ApplicantRow>
    <ApplicantRow applicant={sampleApplicants.park} detail="앙상블"><Pill tone="new">새 지원</Pill></ApplicantRow>
    <ApplicantRow applicant={sampleApplicants.lee} detail="앨리스 역"><Pill tone="wait">검토 전</Pill></ApplicantRow>
    <ApplicantRow applicant={sampleApplicants.jung} detail="앙상블"><Pill tone="pass">1차 합격</Pill></ApplicantRow>
  </>;
}

function ReviewScreen() {
  return <>
    <h3>1차 서류 심사</h3>
    <p className={styles.muted}>앨리스 역, 24명 중 1번째</p>
    <div className={styles.split}>
      <div className={styles.shots}>{kimHarinShots.map((src, index) => <Image key={src} src={src} alt={shotAlt(index)} width={320} height={400} sizes="(max-width: 560px) 60vw, 240px" />)}</div>
      <ReviewFacts />
    </div>
    <div className={styles.decide}><span>불합격</span><span>보류</span><span className={styles.decidePass}>합격</span></div>
  </>;
}

function ReviewFacts() {
  return <dl className={styles.facts}>
    <dt>이름</dt><dd>김하린</dd><dt>나이</dt><dd>만 27세</dd><dt>키</dt><dd>166cm</dd>
    <dt>학력</dt><dd>예술in대학교 연기과</dd><dt>경력</dt><dd>「푸른 방」 윤서 외 2건</dd>
  </dl>;
}

function shotAlt(index: number) {
  if (index === 0) return "예시 지원자 김하린 프로필 사진";
  return "";
}
