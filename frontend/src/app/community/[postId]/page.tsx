import { notFound } from "next/navigation";
import { CommunityDetail } from "@/components/community/community-detail";
import { communityPostExists } from "@/features/community/server";

export const dynamic = "force-dynamic";

export default async function CommunityPostPage({ params }: { readonly params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const id = Number(postId);
  if (!/^\d+$/.test(postId) || !Number.isSafeInteger(id) || id < 1) notFound();
  if (await communityPostExists(id) === false) notFound();
  return <CommunityDetail key={id} id={id} />;
}
