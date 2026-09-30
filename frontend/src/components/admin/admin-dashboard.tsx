"use client";

import { useState } from "react";
import { adminSectionTitle, type AdminSection } from "@/features/admin/sections";
import { logout } from "@/features/auth/session-api";
import { formatTime } from "./admin-format";
import { AdminLoginForm } from "./admin-login-form";
import { AdminOverviewSection } from "./admin-overview-section";
import {
  AdminAuditionsSection,
  AdminAuditSection,
  AdminMembersSection,
  AdminProducersSection,
  AdminShowsSection,
} from "./admin-sections";
import { AdminActionButton, AdminShell } from "./admin-shell";
import { useAdminDashboard, type DashboardData } from "./use-admin-dashboard";

type Props = {
  readonly section: AdminSection;
};

function SectionBody({
  section,
  data,
  onChanged,
}: {
  readonly section: Exclude<AdminSection, "audit">;
  readonly data: DashboardData;
  readonly onChanged: () => void;
}) {
  switch (section) {
    case "overview":
      return <AdminOverviewSection data={data} />;
    case "members":
      return <AdminMembersSection data={data} />;
    case "producers":
      return <AdminProducersSection data={data} onChanged={onChanged} />;
    case "auditions":
      return <AdminAuditionsSection data={data} onChanged={onChanged} />;
    case "shows":
      return <AdminShowsSection data={data} />;
  }
}

export function AdminDashboard({ section }: Props) {
  const [auditLogPage, setAuditLogPage] = useState(0);
  const { phase, data, auditLogs, error, refresh, restart, signOut } = useAdminDashboard(auditLogPage);

  async function handleLogout() {
    await logout().catch(() => null);
    signOut();
  }

  if (phase === "unauthorized") {
    return <AdminLoginForm onSuccess={restart} />;
  }

  const actions = (
    <>
      {data ? (
        <span className="hidden text-xs text-muted sm:inline" aria-live="polite">
          {formatTime(new Date(data.loadedAt).toISOString())} 기준
        </span>
      ) : null}
      <AdminActionButton onClick={refresh}>새로고침</AdminActionButton>
      <AdminActionButton onClick={handleLogout}>로그아웃</AdminActionButton>
    </>
  );

  return (
    <AdminShell
      current={section}
      title={adminSectionTitle(section)}
      actions={actions}
      badges={data ? { producers: data.overview.pendingProducers } : {}}
    >
      {phase === "failed" && error ? (
        <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">
          {error} 새로고침으로 다시 시도해 주세요.
        </p>
      ) : null}
      {section === "audit" ? (
        <AdminAuditSection auditLogs={auditLogs} onPageChange={setAuditLogPage} />
      ) : data ? (
        <SectionBody section={section} data={data} onChanged={refresh} />
      ) : phase === "loading" ? (
        <p className="text-sm text-muted" role="status">운영 현황을 불러오는 중이에요.</p>
      ) : null}
    </AdminShell>
  );
}
