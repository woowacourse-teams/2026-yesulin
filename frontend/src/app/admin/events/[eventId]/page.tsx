import { notFound } from "next/navigation";
import { AdminEventManagement } from "@/components/admin/admin-event-management";

export default async function AdminEventPage({ params, searchParams }: {
  readonly params: Promise<{ eventId: string }>;
  readonly searchParams: Promise<{ tab?: string }>;
}) {
  const [{ eventId }, { tab }] = await Promise.all([params, searchParams]);
  const id = Number(eventId);
  if (!/^\d+$/.test(eventId) || !Number.isSafeInteger(id) || id < 1) notFound();
  return <AdminEventManagement eventId={id} tab={tab === "settings" ? "settings" : "participants"} />;
}
