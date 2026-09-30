"use client";

import { useState } from "react";
import { changeMemberStatus } from "@/features/admin/api";
import type { AdminProducer, MemberStatus } from "@/features/admin/types";
import { formatDateTime, orDash } from "./admin-format";

type Props = {
  readonly producers: readonly AdminProducer[];
  readonly onChanged: () => void;
};

const HEADERS = ["회사", "담당자", "이메일", "연락처", "가입", "공연", "공고", "상태", ""];

export function AdminProducerTable({ producers, onChanged }: Props) {
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(producer: AdminProducer, next: MemberStatus) {
    setPendingId(producer.memberId);
    setError(null);
    try {
      await changeMemberStatus(producer.memberId, next);
      onChanged();
    } catch (cause) {
      console.error("[기획사 상태 변경 실패]", cause);
      setError(cause instanceof Error ? cause.message : "상태를 바꾸지 못했습니다.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section aria-labelledby="producers-heading" className="flex flex-col gap-3">
      <h2 id="producers-heading" className="text-sm font-semibold text-muted">
        기획사/제작사 ({producers.length})
      </h2>
      {error ? <p role="alert" className="text-sm text-fail">{error}</p> : null}
      <div className="overflow-x-auto rounded-card border border-border bg-card">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="bg-surface text-xs text-muted">
            <tr>
              {HEADERS.map((header, index) => (
                <th key={header || `actions-${index}`} scope="col" className="px-3 py-2 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {producers.length === 0 ? (
              <tr>
                <td colSpan={HEADERS.length} className="px-3 py-6 text-center text-muted">
                  해당 조건의 기획사가 없어요.
                </td>
              </tr>
            ) : null}
            {producers.map((producer) => (
              <tr key={producer.memberId} className="border-t border-border-soft">
                <td className="px-3 py-2 text-foreground">{orDash(producer.companyName)}</td>
                <td className="px-3 py-2 text-muted-strong">
                  {orDash(producer.contactName)}
                  {producer.contactRole ? <span className="text-muted"> · {producer.contactRole}</span> : null}
                </td>
                <td className="px-3 py-2 text-muted-strong">{producer.email}</td>
                <td className="px-3 py-2 text-muted-strong">{orDash(producer.phone)}</td>
                <td className="px-3 py-2 text-muted">{formatDateTime(producer.joinedAt)}</td>
                <td className="px-3 py-2 num text-muted-strong">{producer.performanceCount}</td>
                <td className="px-3 py-2 num text-muted-strong">{producer.auditionCount}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      producer.status === "PENDING"
                        ? "bg-warn-bg text-warn"
                        : "bg-pass-bg text-pass"
                    }`}
                  >
                    {producer.status === "PENDING" ? "인증 대기" : "활성"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={pendingId === producer.memberId}
                    onClick={() => handleChange(producer, producer.status === "PENDING" ? "ACTIVE" : "PENDING")}
                    className="min-h-9 whitespace-nowrap rounded-control border border-border bg-card px-3 text-sm font-semibold text-muted-strong hover:bg-surface disabled:opacity-50"
                  >
                    {producer.status === "PENDING" ? "수동 활성화" : "비활성화"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
