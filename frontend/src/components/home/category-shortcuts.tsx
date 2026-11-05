"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { PiBuildings, PiMaskHappy, PiMaskSad, PiMusicNote, PiMusicNoteSimple, PiMusicNotes, PiSparkle, PiStarFour, PiUser, PiUsersThree } from "react-icons/pi";
import { getAuditionPosts } from "@/features/audition-posts/api";
import { badgeLabel, ensureCategorySeen, markCategorySeen, newPostCounts, type NewPostCounts } from "@/features/audition-posts/category-seen";
import { auditionPostRoutes, type AuditionLandingCategory, type AuditionPostSummary } from "@/features/audition-posts/types";
import { Dancer } from "./dancer";
import styles from "./category-shortcuts.module.css";

const AUTOPLAY_SCENE_MS = 2400;
const NEW_POST_POOL_SIZE = 48;

const scenes: readonly { readonly category: AuditionLandingCategory; readonly className: string; readonly art: ReactNode }[] = [
  { category: "연극", className: styles.theater, art: <><span className={`${styles.fx} ${styles.sad}`}><PiMaskSad /></span><span className={styles.main}><PiMaskHappy /></span></> },
  { category: "뮤지컬", className: styles.musical, art: <><span className={styles.main}><PiMusicNotes /></span><span className={`${styles.fx} ${styles.n1}`}><PiMusicNote /></span><span className={`${styles.fx} ${styles.n2}`}><PiMusicNoteSimple /></span><span className={`${styles.fx} ${styles.n3}`}><PiMusicNote /></span><span className={`${styles.fx} ${styles.n4}`}><PiMusicNoteSimple /></span></> },
  { category: "퍼포먼스", className: styles.dance, art: <span className={styles.main}><Dancer /></span> },
  { category: "단원", className: styles.troupe, art: <><span className={`${styles.fx} ${styles.m3}`}><PiUser /></span><span className={`${styles.fx} ${styles.m4}`}><PiUser /></span><span className={`${styles.fx} ${styles.m1}`}><PiUser /></span><span className={`${styles.fx} ${styles.m2}`}><PiUser /></span><span className={styles.main}><PiUsersThree /></span></> },
  { category: "기획사", className: styles.agency, art: <><span className={`${styles.fx} ${styles.beam}`} /><span className={`${styles.fx} ${styles.s1}`}><PiSparkle /></span><span className={`${styles.fx} ${styles.s2}`}><PiStarFour /></span><span className={`${styles.fx} ${styles.s3}`}><PiSparkle /></span><span className={styles.main}><PiBuildings /></span></> },
];

function classNames(...names: readonly (string | false | null)[]): string {
  return names.filter(Boolean).join(" ");
}

function canAutoplay(): boolean {
  return window.matchMedia("(hover: none)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 마우스가 없는 기기에서는 무대가 화면에 보이는 동안 분야 장면을 하나씩 차례로 재생한다. */
function useAutoplayScene(target: RefObject<HTMLElement | null>): number | null {
  const [playing, setPlaying] = useState<number | null>(null);
  useEffect(() => {
    const element = target.current;
    if (!element || !canAutoplay()) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => { clearInterval(timer); setPlaying(null); };
    const start = () => {
      setPlaying(0);
      timer = setInterval(() => setPlaying((current) => ((current ?? -1) + 1) % scenes.length), AUTOPLAY_SCENE_MS);
    };
    const observer = new IntersectionObserver(([entry]) => { stop(); if (entry.isIntersecting) start(); }, { threshold: 0.6 });
    observer.observe(element);
    return () => { observer.disconnect(); clearInterval(timer); };
  }, [target]);
  return playing;
}

/**
 * 마지막으로 분야를 확인한 뒤 올라온 공고 수. 서버가 미리 읽은 최신 공고가 없으면(목 환경) 브라우저에서 읽는다.
 * 기록은 이 브라우저에만 남고, 첫 방문에는 배지를 띄우지 않는다.
 */
function useNewPostCounts(posts: readonly AuditionPostSummary[] | null): readonly [NewPostCounts, (category: AuditionLandingCategory) => void] {
  const [counts, setCounts] = useState<NewPostCounts>({});
  useEffect(() => {
    let active = true;
    const seen = ensureCategorySeen();
    const apply = (loaded: readonly AuditionPostSummary[]) => { if (active) setCounts(newPostCounts(loaded, seen)); };
    if (posts) apply(posts);
    if (!posts) getAuditionPosts({ page: 0, includeClosed: false }, NEW_POST_POOL_SIZE).then((page) => apply(page.posts)).catch(() => undefined);
    return () => { active = false; };
  }, [posts]);
  const markSeen = (category: AuditionLandingCategory) => {
    markCategorySeen(category);
    setCounts((current) => ({ ...current, [category]: 0 }));
  };
  return [counts, markSeen] as const;
}

/** 분야 바로가기. 마우스를 올린 분야에만 조명이 떨어지고 분야별 짧은 장면이 재생된다. */
export function CategoryShortcuts({ posts = null }: { readonly posts?: readonly AuditionPostSummary[] | null }) {
  const stage = useRef<HTMLElement>(null);
  const playing = useAutoplayScene(stage);
  const [counts, markSeen] = useNewPostCounts(posts);
  return <nav ref={stage} aria-label="분야 바로가기" className={classNames(styles.stage, playing !== null && styles.hasOn)}>
    {scenes.map(({ category, className, art }, index) => <Link key={category} href={auditionPostRoutes.list({ category })}
      className={classNames(styles.act, className, playing === index && styles.on)} data-playing={playing === index || undefined} onClick={() => markSeen(category)}>
      <span className={styles.cone} aria-hidden="true" />
      <span className={styles.pool} aria-hidden="true" />
      <span className={styles.ic} aria-hidden="true">{art}<NewBadge count={counts[category]} /></span>
      <span className={styles.label}>{category}</span>
      <NewPostsLabel count={counts[category]} />
    </Link>)}
  </nav>;
}

function NewBadge({ count = 0 }: { readonly count?: number }) {
  if (count <= 0) return null;
  return <span className={styles.badge}>{badgeLabel(count)}</span>;
}

function NewPostsLabel({ count = 0 }: { readonly count?: number }) {
  if (count <= 0) return null;
  return <span className="sr-only">, 새 공고 {count}개</span>;
}
