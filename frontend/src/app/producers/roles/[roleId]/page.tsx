import type { Metadata } from "next";
import { AuditionBoard } from "@/components/auditions/audition-board";
import { roleId } from "@/features/auditions/types";

export const metadata: Metadata = {
  title: "지원자 관리",
};

export default async function AuditionBoardPage({ params }: { params: Promise<{ roleId: string }> }) {
  const { roleId: raw } = await params;
  return <AuditionBoard roleId={roleId(raw)} />;
}
