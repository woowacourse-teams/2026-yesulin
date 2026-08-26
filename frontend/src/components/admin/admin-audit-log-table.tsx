import type { AdminAuditLog } from "@/features/admin/types";
import { formatDateTime } from "./admin-format";

type Props = {
  readonly logs: readonly AdminAuditLog[];
};

export function AdminAuditLogTable({ logs }: Props) {
  return (
    <section aria-labelledby="audit-logs-heading" className="flex flex-col gap-3">
      <h2 id="audit-logs-heading" className="text-sm font-semibold text-neutral-500">
        운영자 변경 기록 (최근 {logs.length}건)
      </h2>
      <div className="overflow-x-auto rounded border border-neutral-200 bg-white">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-neutral-50 text-xs text-neutral-500">
            <tr>
              {["시각", "운영자", "동작", "대상", "내용"].map((header) => (
                <th key={header} scope="col" className="px-3 py-2 font-medium">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-neutral-400">아직 기록이 없습니다.</td>
              </tr>
            ) : null}
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-neutral-100">
                <td className="px-3 py-2 text-neutral-500">{formatDateTime(log.createdAt)}</td>
                <td className="px-3 py-2 tabular-nums text-neutral-600">#{log.actorMemberId}</td>
                <td className="px-3 py-2 text-neutral-600">{log.action}</td>
                <td className="px-3 py-2 tabular-nums text-neutral-600">{log.targetType} #{log.targetId}</td>
                <td className="px-3 py-2 text-neutral-900">{log.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
