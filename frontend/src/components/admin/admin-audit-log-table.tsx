import type { AdminAuditLogPage } from "@/features/admin/types";
import { formatDateTime } from "./admin-format";

type Props = {
  readonly page: AdminAuditLogPage;
  readonly onPageChange: (page: number) => void;
};

export function AdminAuditLogTable({ page, onPageChange }: Props) {
  const hasPreviousPage = page.page > 0;
  const hasNextPage = page.page + 1 < page.totalPages;

  return (
    <section aria-labelledby="audit-logs-heading" className="flex flex-col gap-3">
      <h2 id="audit-logs-heading" className="text-sm font-semibold text-neutral-500">
        운영자 변경 기록 (총 {page.totalElements}건 · 페이지당 {page.size}건)
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
            {page.logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-neutral-400">아직 기록이 없습니다.</td>
              </tr>
            ) : null}
            {page.logs.map((log) => (
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
      {page.totalPages > 1 ? (
        <nav aria-label="운영자 변경 기록 페이지" className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={!hasPreviousPage}
            onClick={() => onPageChange(page.page - 1)}
            className="min-h-11 rounded-control border border-border px-4 text-sm font-semibold text-muted-strong enabled:hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
          >
            이전
          </button>
          <span aria-live="polite" className="min-w-16 text-center text-sm text-muted-strong">
            {page.page + 1} / {page.totalPages}
          </span>
          <button
            type="button"
            disabled={!hasNextPage}
            onClick={() => onPageChange(page.page + 1)}
            className="min-h-11 rounded-control border border-border px-4 text-sm font-semibold text-muted-strong enabled:hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
          >
            다음
          </button>
        </nav>
      ) : null}
    </section>
  );
}
