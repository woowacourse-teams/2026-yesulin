import { AdminActorPageDetail } from "@/components/admin/admin-actor-page-detail";

export default async function AdminActorPageDetailPage({ params }: { readonly params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  return <AdminActorPageDetail publicId={publicId} />;
}
