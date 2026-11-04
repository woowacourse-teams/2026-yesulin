"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { PiBuildings, PiMaskHappy, PiMaskSad, PiMusicNote, PiMusicNoteSimple, PiMusicNotes, PiSparkle, PiStarFour, PiUser, PiUsersThree } from "react-icons/pi";
import { getAuditionPosts } from "@/features/audition-posts/api";
import { auditionPostRoutes, type AuditionLandingCategory } from "@/features/audition-posts/types";
import { Dancer } from "./dancer";
import styles from "./category-shortcuts.module.css";

export type CategoryOpenCounts = Readonly<Record<AuditionLandingCategory, number>>;

const TOUCH_SCENE_MS = 1800;

function classNames(...names: readonly (string | false | null)[]): string {
  return names.filter(Boolean).join(" ");
}

const scenes: readonly { readonly category: AuditionLandingCategory; readonly className: string; readonly art: ReactNode }[] = [
  { category: "뮤지컬", className: styles.musical, art: <><span className={styles.main}><PiMusicNotes /></span><span className={`${styles.fx} ${styles.n1}`}><PiMusicNote /></span><span className={`${styles.fx} ${styles.n2}`}><PiMusicNoteSimple /></span><span className={`${styles.fx} ${styles.n3}`}><PiMusicNote /></span><span className={`${styles.fx} ${styles.n4}`}><PiMusicNoteSimple /></span></> },
  { category: "연극", className: styles.theater, art: <><span className={`${styles.fx} ${styles.sad}`}><PiMaskSad /></span><span className={styles.main}><PiMaskHappy /></span></> },
  { category: "퍼포먼스", className: styles.dance, art: <span className={styles.main}><Dancer /></span> },
  { category: "단원", className: styles.troupe, art: <><span className={`${styles.fx} ${styles.m3}`}><PiUser /></span><span className={`${styles.fx} ${styles.m4}`}><PiUser /></span><span className={`${styles.fx} ${styles.m1}`}><PiUser /></span><span className={`${styles.fx} ${styles.m2}`}><PiUser /></span><span className={styles.main}><PiUsersThree /></span></> },
  { category: "기획사", className: styles.agency, art: <><span className={`${styles.fx} ${styles.beam}`} /><span className={`${styles.fx} ${styles.s1}`}><PiSparkle /></span><span className={`${styles.fx} ${styles.s2}`}><PiStarFour /></span><span className={`${styles.fx} ${styles.s3}`}><PiSparkle /></span><span className={styles.main}><PiBuildings /></span></> },
];

async function loadCounts(): Promise<CategoryOpenCounts> {
  const pages = await Promise.all(scenes.map(({ category }) => getAuditionPosts({ page: 0, includeClosed: false, category }, 1)));
  return Object.fromEntries(scenes.map(({ category }, index) => [category, pages[index].openCount])) as CategoryOpenCounts;
}

/** 분야 바로가기 무대. 마우스를 올리거나 누른 분야에만 조명이 떨어지고 분야별 짧은 장면이 재생된다. */
export function CategoryShortcuts({ initialCounts = null }: { readonly initialCounts?: CategoryOpenCounts | null }) {
  const [counts, setCounts] = useState<CategoryOpenCounts | null>(initialCounts);
  const [touched, setTouched] = useState<AuditionLandingCategory | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (initialCounts) return;
    let active = true;
    loadCounts().then((next) => { if (active) setCounts(next); }).catch(() => undefined);
    return () => { active = false; };
  }, [initialCounts]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const playOnTouch = (category: AuditionLandingCategory) => (event: PointerEvent) => {
    if (event.pointerType === "mouse") return;
    setTouched(category);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setTouched(null), TOUCH_SCENE_MS);
  };
  return <nav aria-label="분야 바로가기" className={classNames(styles.stage, touched && styles.hasOn)}>
    {scenes.map(({ category, className, art }) => <Link key={category} href={auditionPostRoutes.list({ category })} onPointerDown={playOnTouch(category)}
      className={classNames(styles.act, className, touched === category && styles.on)}>
      <span className={styles.cone} aria-hidden="true" />
      <span className={styles.pool} aria-hidden="true" />
      <span className={styles.ic} aria-hidden="true">{art}</span>
      <b className={styles.label}>{category}</b>{" "}
      <OpenCount count={counts?.[category]} />
    </Link>)}
  </nav>;
}

function OpenCount({ count }: { readonly count?: number }) {
  if (count === undefined) return <small className={styles.count} aria-hidden="true">&nbsp;</small>;
  return <small className={`${styles.count} num`}>모집 중 {count.toLocaleString("ko-KR")}</small>;
}
