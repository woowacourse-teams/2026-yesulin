import { AdminShowManagement } from "@/components/admin/admin-show-management";

export default async function AdminShowPage({ params }: { readonly params: Promise<{ showId: string }> }) {
  const { showId } = await params;
  return <AdminShowManagement showId={showId} />;
}
