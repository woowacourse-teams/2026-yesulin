import { notFound } from "next/navigation";
import { AdminAuditionPostPreview } from "@/components/admin/admin-audition-post-preview";

export default async function AdminAuditionPostPreviewPage({ params }: {
  readonly params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  if (!/^[1-9][0-9]{0,17}$/.test(postId)) notFound();
  return <AdminAuditionPostPreview postId={postId} />;
}
