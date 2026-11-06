import type { Metadata } from "next";
import { MswProvider } from "@/components/mocks/msw-provider";
import { CommunityShell } from "@/components/community/community-shell";
import "./community.css";

export const metadata: Metadata = { title: "배우 수다방", description: "배우들의 이야기와 경험을 나누는 커뮤니티." };

export default function CommunityLayout({ children }: { readonly children: React.ReactNode }) {
  return <MswProvider><CommunityShell>{children}</CommunityShell></MswProvider>;
}
