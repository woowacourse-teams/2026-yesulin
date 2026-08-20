import type { Metadata } from "next";
import { RolePicker } from "@/components/auditions/role-picker";
import { postingId } from "@/features/auditions/types";

export const metadata: Metadata = {
  title: "배역별 지원 현황",
};

export default async function RolePickerPage({ params }: { params: Promise<{ postingId: string }> }) {
  const { postingId: raw } = await params;
  return <RolePicker postingId={postingId(raw)} />;
}
