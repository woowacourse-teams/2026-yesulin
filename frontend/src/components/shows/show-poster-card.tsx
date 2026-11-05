"use client";

import Link from "next/link";
import { PosterImage } from "@/components/ui/poster-image";
import { formatShowDateTime, hasUpcomingShowSession, isShowBookingClosed } from "@/features/shows/format";
import { SHOW_GENRE_LABELS, showRoutes, type PublicShowSummary } from "@/features/shows/types";

const POSTER_SIZES = "(min-width: 1100px) 260px, (min-width: 761px) 33vw, 50vw";

/** 홈과 공연 목록이 함께 쓰는 3:4 공연 포스터 카드. 예매 중인 공연은 다음 회차 일시를 제목 위에 강조한다. */
export function ShowPosterCard({ show, now }: { readonly show: PublicShowSummary; readonly now: number }) {
  const ended = isShowBookingClosed(show, now);
  return <li className="min-w-0">
    <Link href={showRoutes.detail(show.id)} className="notebook-poster-card" data-ended={ended || undefined}>
      <div className="notebook-poster">
        <ShowBadge ended={ended} />
        <PosterImage key={show.posterUrl} src={show.posterUrl} alt={`${show.title} 포스터`} sizes={POSTER_SIZES} fallback={<span className="notebook-poster-empty">포스터 준비 중</span>} />
      </div>
      <ShowSchedule show={show} now={now} ended={ended} />
      <h3 className="notebook-poster-title">{show.title}</h3>
      <p className="notebook-poster-byline">{SHOW_GENRE_LABELS[show.genre]} · {show.venueName}</p>
      {Boolean(show.hostName) && <p className="notebook-poster-meta"><span className="sr-only">주최 </span>{show.hostName}</p>}
    </Link>
  </li>;
}

function ShowBadge({ ended }: { readonly ended: boolean }) {
  if (ended) return <span className="notebook-poster-badge" data-kind="closed">예매 마감</span>;
  return <span className="notebook-poster-badge" data-kind="open">무료 관람</span>;
}

/** 마감 공연은 미래 회차가 남았을 때만 일정을 보여 주고, 이미 지난 회차를 다음 회차로 안내하지 않는다. */
function ShowSchedule({ show, now, ended }: { readonly show: PublicShowSummary; readonly now: number; readonly ended: boolean }) {
  if (!show.nextSessionStartsAt || !hasUpcomingShowSession(show, now)) return <p className="notebook-show-when is-muted">예정 회차 없음</p>;
  const when = formatShowDateTime(show.nextSessionStartsAt);
  if (ended) return <p className="notebook-show-when is-muted num">다음 회차 {when}</p>;
  return <p className="notebook-show-when num"><span className="sr-only">다음 회차 </span>{when}</p>;
}
