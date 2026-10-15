"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AUDITION_ALERT_CHAT_URL, auditionPostRoutes } from "@/features/audition-posts/types";
import { getPublicShows } from "@/features/shows/api";
import { formatShowDateTime, hasUpcomingShowSession } from "@/features/shows/format";
import { SHOW_GENRE_LABELS, showRoutes, type PublicShowSummary } from "@/features/shows/types";

type ShowState = { readonly status: "loading" } | { readonly status: "error" } | { readonly status: "ready"; readonly shows: readonly PublicShowSummary[] };

export function HomeShowSection({ initialShows = null }: { readonly initialShows?: readonly PublicShowSummary[] | null }) {
  const [now] = useState(Date.now);
  const [state, setState] = useState<ShowState>(initialShows === null ? { status: "loading" } : { status: "ready", shows: initialShows });
  const load = useCallback(() => {
    let active = true;
    getPublicShows().then((shows) => { if (active) setState({ status: "ready", shows }); }).catch(() => { if (active) setState({ status: "error" }); });
    return () => { active = false; };
  }, []);
  useEffect(() => { if (initialShows === null) return load(); }, [initialShows, load]);
  return <section id="shows" className="notebook-section notebook-shows">
    <div className="notebook-section-heading"><div><h2>무료 공연</h2><p>보고 싶은 공연을 찾고 무료로 예매해보세요.</p></div><Link href={showRoutes.list} className="notebook-text-link">전체 보기</Link></div>
    {state.status === "loading" ? <div className="notebook-show-grid" aria-label="공연 목록 불러오는 중">{[0, 1, 2].map((item) => <div key={item} className="notebook-show-skeleton animate-pulse motion-reduce:animate-none" />)}</div> : null}
    {state.status === "error" ? <div role="status" className="notebook-empty"><p>공연 목록을 불러오지 못했어요.</p><button className="notebook-outline-button" onClick={() => { setState({ status: "loading" }); load(); }}>다시 시도</button></div> : null}
    {state.status === "ready" && state.shows.length === 0 ? <div className="notebook-empty"><p>지금 예매할 수 있는 공연이 없어요.</p><p>새 공연이 열리면 이곳에 안내할게요.</p></div> : null}
    {state.status === "ready" && state.shows.length > 0 ? <ul className="notebook-show-grid">{state.shows.slice(0, 3).map((show) => <li key={show.id}><Link href={showRoutes.detail(show.id)} className={`notebook-show-card${hasUpcomingShowSession(show, now) ? "" : " is-ended"}`}><div className="notebook-show-poster"><Image src={show.posterUrl} alt={`${show.title} 포스터`} fill unoptimized sizes="(min-width: 768px) 380px, 90vw" /><span>{hasUpcomingShowSession(show, now) ? "무료 관람" : "예매 마감"}</span></div><div className="notebook-show-info"><h3>{show.title}</h3><p>{SHOW_GENRE_LABELS[show.genre]} · {show.venueName}</p><p className="num">{hasUpcomingShowSession(show, now) && show.nextSessionStartsAt ? formatShowDateTime(show.nextSessionStartsAt) : "예매 가능한 회차 없음"}</p></div></Link></li>)}</ul> : null}
  </section>;
}

export function HomeFaqSection() {
  const items = [
    { question: "오디션 공고는 어떻게 찾나요?", answer: <>상단 메뉴의 <Link href={auditionPostRoutes.list()}>오디션</Link>에서 분야와 모집 상태를 고른 뒤 공고를 살펴보세요. 페이지 이동으로 더 많은 공고를 확인할 수 있습니다. 공고를 누르면 모집 내용과 지원 방법을 볼 수 있어요.</> },
    { question: "무료 공연은 어떻게 예매하나요?", answer: <>무료 공연에서 작품을 선택한 뒤 공연 안내와 회차를 확인해주세요. 예술in에서 예매받는 공연은 로그인 없이 이름과 휴대폰 번호로 신청할 수 있고, 외부 예매 공연은 공연별 신청 페이지로 연결됩니다.</> },
    { question: "궁금한 점은 어디로 문의하나요?", answer: <>페이지 아래의 이메일 문의 또는 카카오톡 문의를 이용해주세요. 오디션 공고 소식은 <a href={AUDITION_ALERT_CHAT_URL} target="_blank" rel="noopener noreferrer" aria-label="예술in 오픈채팅 (새 창에서 열림)">예술in 오픈채팅</a>에서도 확인할 수 있습니다.</> },
  ];
  return <section id="faq" className="notebook-section notebook-faq">
    <div className="notebook-section-heading"><div><h2>자주 묻는 질문</h2><p>이용 전에 궁금한 점을 확인해보세요.</p></div></div>
    <div className="notebook-faq-layout"><div className="notebook-faq-list">{items.map((item) => <details key={item.question} className="notebook-faq-item"><summary><span aria-hidden="true" className="notebook-faq-q">Q</span>{item.question}<span aria-hidden="true" className="notebook-faq-toggle" /></summary><div className="notebook-faq-answer">{item.answer}</div></details>)}</div><aside className="notebook-chat-note"><a href={AUDITION_ALERT_CHAT_URL} target="_blank" rel="noopener noreferrer" aria-label="예술in 오픈채팅에서 오디션 알림 받기 (새 창에서 열림)"><Image src="/images/banners/openchat-highlight-mobile.webp" alt="새 오디션 소식 카톡으로 받아보세요 · 오디션 알림 받기" width={1448} height={1086} sizes="(min-width: 768px) 420px, 90vw" /></a></aside></div>
  </section>;
}
