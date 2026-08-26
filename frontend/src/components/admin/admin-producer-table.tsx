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
      setError(cause instanceof Error ? cause.message : "상태를 바꾸지 못했습니다.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section aria-labelledby="producers-heading" className="flex flex-col gap-3">
      <h2 id="producers-heading" className="text-sm font-semibold text-neutral-500">
        기획사/제작사 ({producers.length})
      </h2>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      <div className="overflow-x-auto rounded border border-neutral-200 bg-white">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="bg-neutral-50 text-xs text-neutral-500">
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
                <td colSpan={HEADERS.length} className="px-3 py-6 text-center text-neutral-400">
                  해당 조건의 기획사가 없습니다.
                </td>
              </tr>
            ) : null}
            {producers.map((producer) => (
              <tr key={producer.memberId} className="border-t border-neutral-100">
                <td className="px-3 py-2 text-neutral-900">{orDash(producer.companyName)}</td>
                <td className="px-3 py-2 text-neutral-600">
                  {orDash(producer.contactName)}
                  {producer.contactRole ? <span className="text-neutral-400"> · {producer.contactRole}</span> : null}
                </td>
                <td className="px-3 py-2 text-neutral-600">{producer.email}</td>
                <td className="px-3 py-2 text-neutral-600">{orDash(producer.phone)}</td>
                <td className="px-3 py-2 text-neutral-500">{formatDateTime(producer.joinedAt)}</td>
                <td className="px-3 py-2 tabular-nums text-neutral-600">{producer.performanceCount}</td>
                <td className="px-3 py-2 tabular-nums text-neutral-600">{producer.auditionCount}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      producer.status === "PENDING"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
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
                    className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
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
