"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import styles from "./service-guide.module.css";

const guides = [
  {
    id: "auditions", label: "오디션 찾기", audience: "무대를 찾는 배우에게", title: "나에게 맞는 공고부터, 지원 방법까지",
    description: "여러 분야의 오디션을 모아 보고 공고에 담긴 조건과 지원 방법을 확인해요",
    image: "/images/landing/guide-auditions.png", imageLabel: "오디션 목록 화면", href: "/auditions", cta: "오디션 찾아보기",
    steps: [
      { title: "분야와 모집 상태 고르기", body: "뮤지컬·연극 등 분야를 고르고 모집 중인 공고를 살펴봐요" },
      { title: "공고와 첨부파일 확인하기", body: "마감일, 페이, 모집 조건을 읽고 필요한 지원서 파일을 확인해요" },
      { title: "안내된 방법으로 지원하기", body: "공고 본문에 적힌 접수 방법에 따라 지원을 준비해요" },
    ],
  },
  {
    id: "shows", label: "무료 공연 예매", audience: "공연을 만나는 관객에게", title: "보고 싶은 공연을 골라, 내 일정에 맞게",
    description: "공연 소개와 장소를 확인하고 관람할 회차를 선택해요",
    image: "/images/landing/guide-shows.png", imageLabel: "무료 공연 상세의 회차 선택 화면", href: "/shows", cta: "무료 공연 둘러보기",
    steps: [
      { title: "보고 싶은 공연 고르기", body: "공연 기간, 장소, 관람 연령을 먼저 확인해요" },
      { title: "관람할 회차 선택하기", body: "공연 상세에서 회차별 예매 가능 여부를 확인해요" },
      { title: "예매 정보 입력하기", body: "예술in 직접 예매 공연은 이름, 휴대폰 번호, 매수를 입력해요 외부 예매 공연은 안내된 사이트에서 진행해요" },
    ],
  },
  {
    id: "producers", label: "공연사 모집과 심사", audience: "무대를 만드는 공연사에게", title: "공고를 올리고, 지원자를 살펴보고",
    description: "공연과 배역별 모집부터 지원서 검토와 전형별 심사 기록까지 이어가요",
    image: "/images/landing/guide-producers.png", imageLabel: "공연사 서비스 안내 화면", href: "/producer-service", cta: "공연사 서비스 살펴보기",
    steps: [
      { title: "계정 만들고 공연·배역 등록하기", body: "모집할 공연과 배역별 조건을 정해요" },
      { title: "지원자 프로필 검토하기", body: "접수된 지원자의 경력, 사진과 영상을 확인해요" },
      { title: "심사 결과 기록하기", body: "합격·불합격을 기록하고 다음 전형을 준비해요" },
    ],
  },
] as const;

type Guide = (typeof guides)[number];

function GuideSteps({ guide }: { guide: Guide }) {
  return <ol className={styles.steps}>{guide.steps.map((step) => <li key={step.title}><h4>{step.title}</h4><p>{step.body}</p></li>)}</ol>;
}

function GuideScreen({ guide }: { guide: Guide }) {
  return <figure className={styles.screen}><div className={styles.screenBar}><span aria-hidden="true">○ ○ ○</span><span>{guide.imageLabel}</span></div><Image src={guide.image} alt={guide.imageLabel} width={1440} height={1000} sizes="(max-width: 760px) 90vw, 720px" /><figcaption>2026년 10월 공개 서비스 화면</figcaption></figure>;
}

function GuideContent({ guide }: { guide: Guide }) {
  return <div className={styles.guide} id="selected-service-guide"><div className={styles.copy}><span>{guide.audience}</span><h3>{guide.title}</h3><p className={styles.description}>{guide.description}</p><GuideSteps guide={guide} /><Link className={styles.start} href={guide.href}>{guide.cta}</Link></div><GuideScreen guide={guide} /></div>;
}

export function ServiceGuide() {
  const [selected, setSelected] = useState<Guide>(guides[0]);
  return <section id="how-to" className={styles.section} aria-labelledby="how-title">
    <header className={styles.heading} data-reveal><span>예술in 이용 안내</span><h2 id="how-title">당신의 다음 장면은<br /><em>여기서 시작할 수 있어요</em></h2></header>
    <div className={styles.choices} role="group" aria-label="이용 안내 선택">{guides.map((guide) => <button key={guide.id} type="button" aria-pressed={selected.id === guide.id} aria-controls="selected-service-guide" onClick={() => setSelected(guide)}>{guide.label}</button>)}</div>
    <GuideContent guide={selected} />
  </section>;
}
