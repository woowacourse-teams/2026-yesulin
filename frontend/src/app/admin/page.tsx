import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { parseAdminSection } from "@/features/admin/sections";

type Props = {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  return <AdminDashboard section={parseAdminSection(tab)} />;
}
