import type { Metadata } from "next";
import { AuditionBoard } from "@/components/auditions/audition-board";
import { listRouteStateFromRoute, type AuditionListRouteQuery } from "@/features/auditions/filters";
import { roleId, ROUND_NUMBERS, type RoundNumber } from "@/features/auditions/types";

export const metadata: Metadata = {
  title: "배우 관리",
};

export default async function AuditionBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ roleId: string }>;
  searchParams: Promise<{ round?: string } & AuditionListRouteQuery>;
}) {
  const { roleId: raw } = await params;
  const query = await searchParams;
  const rawRound = query.round;
  const parsedRound = Number(rawRound);
  const initialRound = ROUND_NUMBERS.includes(parsedRound as RoundNumber)
    ? (parsedRound as RoundNumber)
    : null;
  return (
    <AuditionBoard
      roleId={roleId(raw)}
      initialRound={initialRound}
      initialFilterState={listRouteStateFromRoute(query)}
    />
  );
}
