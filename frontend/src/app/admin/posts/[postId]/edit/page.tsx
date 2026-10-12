import { notFound } from "next/navigation";
import { AdminAuditionPostEdit } from "@/components/admin/admin-audition-post-edit";

const POST_ID = /^[1-9][0-9]{0,17}$/;

export default async function AdminAuditionPostEditPage({ params, searchParams }: {
  readonly params: Promise<{ postId: string }>;
  readonly searchParams: Promise<{ created?: string | string[] }>;
}) {
  const { postId } = await params;
  const { created } = await searchParams;
  if (!POST_ID.test(postId)) notFound();
  return <AdminAuditionPostEdit postId={postId} created={created === "1"} />;
}
