import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuditionBoard } from "@/components/auditions/audition-board";
import { listRouteStateFromRoute, type AuditionListRouteQuery } from "@/features/auditions/filters";
import { roleId } from "@/features/auditions/types";

export const metadata: Metadata = { title: "OTR 배우 심사" };

export default async function Page({ params, searchParams }: {
  readonly params: Promise<{ otrAuditionId: string; roleOrder: string }>;
  readonly searchParams: Promise<AuditionListRouteQuery>;
}) {
  const [{ otrAuditionId, roleOrder }, query] = await Promise.all([params, searchParams]);
  const order = Number(roleOrder);
  if (!Number.isSafeInteger(order) || order < 1) notFound();
  return <AuditionBoard roleId={roleId(roleOrder)} initialRound={1}
    initialFilterState={listRouteStateFromRoute(query)} source={{ kind: "OTR", auditionId: otrAuditionId, roleOrder: order }} />;
}
