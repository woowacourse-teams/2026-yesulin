import type { Metadata } from "next";
import { MswProvider } from "@/components/mocks/msw-provider";
import { CommunityShell } from "@/components/community/community-shell";
import "./community.css";

export const metadata: Metadata = { title: "익명게시판", description: "로그인 없이 익명으로 자유롭게 이야기를 나눠요." };

export default function CommunityLayout({ children }: { readonly children: React.ReactNode }) {
  return <MswProvider><CommunityShell>{children}</CommunityShell></MswProvider>;
}
