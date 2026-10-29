"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "./service-guide.module.css";

const guides = [
  {
    id: "auditions", label: "오디션 찾기", title: "나에게 맞는 공고부터, 지원 방법까지",
    image: "/images/landing/guide-auditions.png", imageLabel: "오디션 목록 화면", href: "/auditions", cta: "오디션 찾아보기",
    steps: [
      { title: "분야와 모집 상태 고르기" },
      { title: "공고와 첨부파일 확인하기" },
      { title: "공고에 안내된 방법으로 지원하기" },
    ],
  },
  {
    id: "shows", label: "무료 공연 예매", title: "보고 싶은 공연을 골라, 내 일정에 맞게",
    image: "/images/landing/guide-shows.png", imageLabel: "무료 공연 상세의 회차 선택 화면", href: "/shows", cta: "무료 공연 둘러보기",
    steps: [
      { title: "보고 싶은 공연 고르기" },
      { title: "관람할 회차 선택하기" },
      { title: "직접 예매하거나 외부 예매처로 이동하기" },
    ],
  },
  {
    id: "producers", label: "공연사 모집과 심사", title: "공고를 올리고, 지원자를 살펴보고",
    image: "/images/landing/guide-producers.png", imageLabel: "공연사 서비스 안내 화면", href: "/producer-service", cta: "공연사 서비스 살펴보기",
    steps: [
      { title: "계정 만들고 공연·배역 등록하기" },
      { title: "지원자 프로필 검토하기" },
      { title: "심사 결과 기록하기" },
    ],
  },
] as const;

type Guide = (typeof guides)[number];

function GuideSteps({ guide }: { guide: Guide }) {
  return <ol className={styles.steps}>{guide.steps.map((step) => <li key={step.title}><h4>{step.title}</h4></li>)}</ol>;
}

function GuideScreen({ guide }: { guide: Guide }) {
  return <figure className={styles.screen}><div className={styles.screenBar}><span>{guide.imageLabel}</span></div><Image src={guide.image} alt={guide.imageLabel} width={1440} height={1000} sizes="(max-width: 760px) 90vw, 720px" /></figure>;
}

function GuideContent({ guide }: { guide: Guide }) {
  return <div className={styles.guide} id="selected-service-guide"><div className={styles.copy}><h3>{guide.title}</h3><GuideSteps guide={guide} /><Link className={styles.start} href={guide.href}>{guide.cta}</Link></div><GuideScreen guide={guide} /></div>;
}

export function ServiceGuide() {
  const [selected, setSelected] = useState<Guide>(guides[0]);
  return <section id="how-to" className={styles.section} aria-labelledby="how-title">
    <header className={styles.heading} data-reveal><h2 id="how-title">당신의 다음 장면은<br /><em>여기서 시작할 수 있어요</em></h2></header>
    <div className={styles.choices} role="group" aria-label="이용 안내 선택">{guides.map((guide) => <button key={guide.id} type="button" aria-pressed={selected.id === guide.id} aria-controls="selected-service-guide" onClick={() => setSelected(guide)}>{guide.label}</button>)}</div>
    <GuideContent guide={selected} />
  </section>;
}
