"use client";

import { useEffect, useState } from "react";
import { fetchOtrRedirects } from "@/features/admin/api";
import type { AdminOtrRedirectReport } from "@/features/admin/types";
import { formatDateTime, formatTime } from "./admin-format";
import { AdminActionButton } from "./admin-shell";
import { formatCount } from "./admin-stat";

type Result = {
  readonly days: number;
  readonly refreshToken: number;
  readonly reload: number;
  readonly data: AdminOtrRedirectReport | null;
  readonly error: string | null;
};

function linkAddress(environment: AdminOtrRedirectReport["environment"], otrId: string): string {
  const origin = environment === "PROD" ? "https://yesulin.art"
    : environment === "DEV" ? "https://dev.yesulin.art" : "http://localhost:3000";
  return `${origin}/otr?vid=${otrId}`;
}

export function AdminOtrRedirectStats({ refreshToken }: { readonly refreshToken: number }) {
  const [days, setDays] = useState(14);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let active = true;
    fetchOtrRedirects(days)
      .then((data) => {
        if (active) setResult({ days, refreshToken, reload, data, error: null });
      })
      .catch((cause: unknown) => {
        if (active) setResult({
          days, refreshToken, reload, data: null,
          error: cause instanceof Error ? cause.message : "공고 이동 통계를 불러오지 못했습니다.",
        });
      });
    return () => { active = false; };
  }, [days, refreshToken, reload]);

  const current = result?.days === days && result.refreshToken === refreshToken && result.reload === reload
    ? result : null;
  const data = current?.data;

  return (
    <section aria-labelledby="otr-redirect-heading" className="min-w-0 rounded-card border border-border bg-card p-4 sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="otr-redirect-heading" className="text-base font-bold text-foreground">
            OTR 공고 링크 이동
            {data ? <span className="ml-2 rounded-full bg-brand-soft px-2 py-1 text-xs text-brand">{data.environment}</span> : null}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted">이 관리자 화면이 연결된 서버의 기록만 집계해요. DEV와 PROD는 합산하지 않아요.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted-strong">
            기간
            <select value={days} onChange={(event) => setDays(Number(event.target.value))}
              className="min-h-11 rounded-control border border-border bg-card px-3 text-foreground">
              <option value={1}>오늘</option>
              <option value={7}>최근 7일</option>
              <option value={14}>최근 14일</option>
            </select>
          </label>
          <AdminActionButton onClick={() => setReload((value) => value + 1)}>이동 통계 새로고침</AdminActionButton>
        </div>
      </header>

      {!current ? <p role="status" className="mt-4 text-sm text-muted">공고 이동 통계를 불러오는 중이에요.</p> : null}
      {current?.error ? <p role="alert" className="mt-4 text-sm text-fail">{current.error}</p> : null}
      {data && !data.available ? (
        <p role="status" className="mt-4 text-sm text-warn">로그 파일을 읽을 수 없어 집계할 수 없어요. 백엔드 배포와 로그 파일 설정을 확인해 주세요.</p>
      ) : null}
      {data?.available ? (
        <>
          {data.truncated ? <p role="status" className="mt-4 text-sm text-warn">일부 로그를 읽지 못했거나 읽기 상한에 도달했어요. 아래 숫자는 부분 집계예요.</p> : null}
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3 rounded-control bg-surface px-4 py-3">
            <dl>
              <dt className="text-xs font-semibold text-muted">{data.truncated ? "확인된 전체 이동 수 (부분 집계)" : "전체 공고 이동 수"}</dt>
              <dd className="mt-1 text-sm text-muted-strong"><span className="num mr-1 text-2xl font-bold text-foreground">{formatCount(data.totalClicks)}</span>건</dd>
            </dl>
            <p className="text-xs leading-5 text-muted">{data.startDate} ~ {data.endDate} (KST)<br />마지막 조회 {formatTime(data.readAt)}</p>
          </div>
          {data.links.length === 0 ? (
            <p className="mt-4 text-sm text-muted">선택 기간의 보관 로그에서 확인된 공고 이동이 없어요.</p>
          ) : (
            <div className="mt-4 max-h-96 overflow-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">공고별 링크 이동 횟수와 마지막 이동 시각</caption>
                <thead className="text-xs text-muted"><tr>
                  <th scope="col" className="py-2 pr-3">공고 링크</th>
                  <th scope="col" className="whitespace-nowrap py-2 px-3 text-right">이동 수</th>
                  <th scope="col" className="whitespace-nowrap py-2 pl-3">마지막 이동</th>
                </tr></thead>
                <tbody>{data.links.map((link) => (
                  <tr key={link.otrId} className="border-t border-border-soft">
                    <th scope="row" className="min-w-40 py-3 pr-3 font-normal">
                      <span className="block break-all text-muted-strong">{linkAddress(data.environment, link.otrId)}</span>
                      <a href={`https://otr.co.kr/audition/?vid=${link.otrId}`} target="_blank" rel="noopener noreferrer"
                        className="mt-1 inline-flex min-h-11 items-center font-semibold text-brand hover:underline">
                        OTR 원문 보기<span className="sr-only"> · 공고 {link.otrId}</span>
                      </a>
                    </th>
                    <td className="num whitespace-nowrap py-3 px-3 text-right font-bold">{formatCount(link.clicks)}</td>
                    <td className="whitespace-nowrap py-3 pl-3 text-muted-strong">{formatDateTime(link.lastClickedAt)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs leading-5 text-muted">보관 중인 로그에서 성공한 GET 리다이렉션(302)을 셉니다. 반복 클릭·봇 요청도 포함하며 HEAD·실패 요청은 제외해요. 기본 보관 기간은 14일이며 영구 누적 통계는 아니에요. 원문 보기는 이 집계를 증가시키지 않아요.</p>
        </>
      ) : null}
    </section>
  );
}
