"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { SiteIcon } from "@/components/ui/site-icon";

/** 홈의 가로 포스터 줄. 모바일은 스와이프, 데스크톱은 양옆 버튼으로 넘긴다. */
export function PosterRow({ id, title, moreHref, toolbar, label, fallback, children }: {
  readonly id?: string;
  readonly title: string;
  readonly moreHref?: string;
  readonly toolbar?: ReactNode;
  readonly label: string;
  /** 목록 대신 보여 줄 로딩·오류·빈 상태. */
  readonly fallback?: ReactNode;
  readonly children?: ReactNode;
}) {
  const scroller = useRef<HTMLUListElement>(null);
  const move = (direction: number) => scroller.current?.scrollBy({ left: direction * scroller.current.clientWidth * 0.85, behavior: "smooth" });
  return <section id={id} className="home-row" aria-label={label}>
    <div className="home-row-heading">
      <h2>{title}</h2>
      {moreHref && <Link href={moreHref} className="home-row-more">전체 보기<SiteIcon name="next" size={16} /></Link>}
    </div>
    {toolbar}
    {fallback}
    {!fallback && <div className="home-row-body">
      <ul ref={scroller} className="home-row-scroller">{children}</ul>
      <button type="button" className="home-row-arrow is-previous" aria-label={`${title} 이전 포스터`} onClick={() => move(-1)}><SiteIcon name="previous" size={20} /></button>
      <button type="button" className="home-row-arrow is-next" aria-label={`${title} 다음 포스터`} onClick={() => move(1)}><SiteIcon name="next" size={20} /></button>
    </div>}
  </section>;
}

export function PosterRowSkeleton({ count = 6 }: { readonly count?: number }) {
  return <ul className="home-row-scroller" role="status" aria-label="포스터 불러오는 중">
    {Array.from({ length: count }, (_, item) => <li key={item}><div className="notebook-poster-skeleton animate-pulse motion-reduce:animate-none" /></li>)}
  </ul>;
}
