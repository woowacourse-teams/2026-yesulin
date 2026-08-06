import type { Metadata } from "next";
import { PublicPostingDetail } from "@/components/applications/public-posting-detail";
import { PublicPostingUnavailable } from "@/components/applications/public-posting-status";
import { publicPostingAvailability, publicPostingById } from "@/features/applications/public-posting";

export async function generateMetadata({ params }: { params: Promise<{ postingId: string }> }): Promise<Metadata> {
  const { postingId } = await params;
  const posting = publicPostingById(postingId);
  if (!posting) return {
    title: "공고를 찾을 수 없어요",
    description: "주소가 올바른지 확인하거나 예술in 홈에서 다른 공고를 찾아 주세요.",
    robots: { index: false, follow: false },
  };
  const availability = publicPostingAvailability(posting);
  const title = `${posting.performanceTitle} ${posting.title}`;
  const description = `${posting.companyName} · ${availability.label} ${availability.detail} · ${posting.isOpenCall ? "전체 지원자 모집" : `모집 배역 ${posting.roles.map((role) => role.name).join(", ")}`}`;
  return {
    title,
    description,
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: "예술인",
      title,
      description,
      images: [{ url: posting.posterUrl, alt: `${posting.performanceTitle} 공연 포스터` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [posting.posterUrl] },
  };
}

export default async function PublicPostingPage({ params }: { params: Promise<{ postingId: string }> }) {
  const { postingId } = await params;
  const posting = publicPostingById(postingId);
  return posting ? <PublicPostingDetail posting={posting} /> : <PublicPostingUnavailable />;
}
