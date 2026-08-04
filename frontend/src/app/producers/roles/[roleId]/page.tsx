import type { Metadata } from "next";
import { ScreeningBoard } from "@/components/screening/screening-board";
import { roleId } from "@/features/screening/types";

export const metadata: Metadata = {
  title: "지원자 관리",
};

export default async function ScreeningBoardPage({ params }: { params: Promise<{ roleId: string }> }) {
  const { roleId: raw } = await params;
  return <ScreeningBoard roleId={roleId(raw)} />;
}
