import { redirect } from "next/navigation";
import { AdminCompanies } from "@/components/admin/admin-companies";
import { AdminCompanyEditRequests } from "@/components/admin/admin-company-edit-requests";
import { AdminAuditionPostOwners } from "@/components/admin/admin-audition-post-owners";
import { AdminAuditionPosts } from "@/components/admin/admin-audition-posts";
import { adminOpenChatRoutes } from "@/features/admin/openchat";

export default async function AdminAuditionPostsPage({ searchParams }: {
  readonly searchParams: Promise<{ view?: string; owner?: string }>;
}) {
  const { view, owner } = await searchParams;
  if (view === "owners") return <AdminAuditionPostOwners />;
  if (view === "companies") return <AdminCompanies />;
  if (view === "edit-requests") return <AdminCompanyEditRequests />;
  if (view === "alert-chat") redirect(adminOpenChatRoutes.root);
  const ownerId = Number(owner);
  const validOwner = Number.isSafeInteger(ownerId) && ownerId > 0 ? ownerId : undefined;
  return <AdminAuditionPosts key={validOwner ?? "all"} ownerId={validOwner} />;
}
