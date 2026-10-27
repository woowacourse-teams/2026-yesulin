import type { Metadata } from "next";
import { MswProvider } from "@/components/mocks/msw-provider";
import { CommunityScreen } from "@/components/community/community-ui";
import "./community.css";

export const metadata: Metadata = { title: "커뮤니티", description: "로그인 없이 익명으로 자유롭게 이야기를 나눠요." };

export default function CommunityLayout({ children }: { readonly children: React.ReactNode }) {
  return <MswProvider><CommunityScreen>{children}</CommunityScreen></MswProvider>;
}
