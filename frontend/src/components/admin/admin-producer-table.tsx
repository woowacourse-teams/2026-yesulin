"use client";

import { useState } from "react";
import { changeMemberStatus, resendMemberVerification } from "@/features/admin/api";
import type { AdminProducer } from "@/features/admin/types";
import { formatDateTime, orDash } from "./admin-format";
import { AdminActionButton, AdminEmptyState } from "./admin-shell";

type Props = {
  readonly producers: readonly AdminProducer[];
  readonly onChanged: () => void;
};

const HEADERS = ["회사", "담당자", "이메일", "연락처", "가입", "공연", "공고", "상태", ""];
const STATUS_ACTIONS = {
  PENDING: { label: "수동 활성화", status: "ACTIVE" },
  ACTIVE: { label: "비활성화", status: "PENDING" },
} as const;

export function AdminProducerTable({ producers, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function runAction(action: () => Promise<void>, fallback: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (cause) {
      if (cause instanceof Error) {
        setError(cause.message);
        return;
      }
      setError(fallback);
    } finally {
      setBusy(false);
    }
  }

  function handleChange(producer: AdminProducer) {
    return runAction(async () => {
      await changeMemberStatus(producer.memberId, STATUS_ACTIONS[producer.status].status);
      onChanged();
    }, "상태를 바꾸지 못했습니다.");
  }

  function handleResend(producer: AdminProducer) {
    if (!window.confirm(`${producer.companyName} (${producer.email})에 인증 메일을 다시 보낼까요?`)) return;
    return runAction(async () => {
      await resendMemberVerification(producer.memberId);
      setNotice("인증 메일을 다시 보냈습니다.");
    }, "인증 메일을 다시 보내지 못했습니다.");
  }

  return (
    <section aria-labelledby="producers-heading" className="flex flex-col gap-3">
      <h2 id="producers-heading" className="text-base font-semibold text-foreground">
        기획사·제작사 목록 <span className="num ml-1 text-sm font-normal text-muted">{producers.length}곳</span>
      </h2>
      {error ? <p role="alert" className="text-sm text-fail">{error}</p> : null}
      {notice && <p role="status" className="text-sm text-pass">{notice}</p>}
      {producers.length === 0 ? <AdminEmptyState title="해당 조건의 기획사·제작사가 없어요" description="가입한 기획사·제작사의 정보와 인증 상태를 여기서 확인할 수 있어요." /> : <div className="overflow-x-auto rounded-card border border-border bg-card">
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
                <td className="px-3 py-2">
                  <div className="flex flex-wrap justify-end gap-2">
                    {producer.status === "PENDING" && (
                      <AdminActionButton disabled={busy} onClick={() => handleResend(producer)}>
                        인증 메일 재전송
                      </AdminActionButton>
                    )}
                    <AdminActionButton disabled={busy} onClick={() => handleChange(producer)}>
                      {STATUS_ACTIONS[producer.status].label}
                    </AdminActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </section>
  );
}
