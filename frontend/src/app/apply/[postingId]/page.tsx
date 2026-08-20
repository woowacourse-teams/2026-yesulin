import type { Metadata } from "next";
import { PublicPostingRoute } from "@/components/applications/public-posting-route";
import { publicPostingAvailability } from "@/features/applications/public-posting";
import { publicPostingForServer } from "@/features/applications/public-posting-server";
import { MswProvider } from "@/components/mocks/msw-provider";

export async function generateMetadata({ params }: { params: Promise<{ postingId: string }> }): Promise<Metadata> {
  const { postingId } = await params;
  const posting = await publicPostingForServer(postingId);
  if (!posting) return {
    title: "공고를 찾을 수 없어요",
    description: "주소가 올바른지 확인하거나 예술in 홈에서 다른 공고를 찾아 주세요.",
    robots: { index: false, follow: false },
  };
  const availability = publicPostingAvailability(posting);
  const title = `${posting.performanceTitle} ${posting.title}`;
  const description = `${posting.companyName} · ${availability.label} ${availability.detail} · ${posting.isOpenCall ? "전체 배우 모집" : `모집 배역 ${posting.roles.map((role) => role.name).join(", ")}`}`;
  return {
    title,
    description,
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: "예술in",
      title,
      description,
      images: [{ url: posting.posterUrl, alt: `${posting.performanceTitle} 공연 포스터` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [posting.posterUrl] },
  };
}

export default async function PublicPostingPage({ params, searchParams }: { params: Promise<{ postingId: string }>; searchParams: Promise<{ prefill?: string; resumeDraft?: string; roleId?: string | string[] }> }) {
  const { postingId } = await params;
  const { prefill, resumeDraft, roleId } = await searchParams;
  const posting = await publicPostingForServer(postingId);
  const initialRoleIds = Array.isArray(roleId) ? roleId : roleId ? [roleId] : [];
  return <MswProvider><PublicPostingRoute postingId={postingId} initialPosting={posting} useProfilePrefill={prefill === "1"} resumeDraft={resumeDraft === "1"} initialRoleIds={initialRoleIds} /></MswProvider>;
}
