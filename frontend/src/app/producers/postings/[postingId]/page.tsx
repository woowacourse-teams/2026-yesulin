import type { Metadata } from "next";
import { RolePicker } from "@/components/screening/role-picker";
import { postingId } from "@/features/screening/types";

export const metadata: Metadata = {
  title: "배역 선택",
};

export default async function RolePickerPage({ params }: { params: Promise<{ postingId: string }> }) {
  const { postingId: raw } = await params;
  return <RolePicker postingId={postingId(raw)} />;
}
