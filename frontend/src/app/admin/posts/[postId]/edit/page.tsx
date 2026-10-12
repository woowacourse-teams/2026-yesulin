import { notFound } from "next/navigation";
import { AdminAuditionPostEdit } from "@/components/admin/admin-audition-post-edit";

const POST_ID = /^[1-9][0-9]{0,17}$/;

export default async function AdminAuditionPostEditPage({ params }: { readonly params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  if (!POST_ID.test(postId)) notFound();
  return <AdminAuditionPostEdit postId={postId} />;
}
