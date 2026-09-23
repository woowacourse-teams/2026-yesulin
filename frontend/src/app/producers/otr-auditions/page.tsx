import type { Metadata } from "next";
import { OtrAuditionList } from "@/components/otr-auditions/otr-audition-list";

export const metadata: Metadata = { title: "OTR 공고 관리" };

export default async function OtrAuditionsPage({ searchParams }: {
  readonly searchParams: Promise<{ create?: string }>;
}) {
  const { create } = await searchParams;
  return <OtrAuditionList key={create === "1" ? "create" : "list"} autoOpenCreate={create === "1"} />;
}
