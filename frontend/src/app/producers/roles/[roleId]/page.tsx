import type { Metadata } from "next";
import { AuditionBoard } from "@/components/auditions/audition-board";
import { roleId, ROUND_NUMBERS, type RoundNumber } from "@/features/auditions/types";

export const metadata: Metadata = {
  title: "배우 관리",
};

export default async function AuditionBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ roleId: string }>;
  searchParams: Promise<{ round?: string }>;
}) {
  const { roleId: raw } = await params;
  const { round: rawRound } = await searchParams;
  const parsedRound = Number(rawRound);
  const initialRound = ROUND_NUMBERS.includes(parsedRound as RoundNumber)
    ? (parsedRound as RoundNumber)
    : null;
  return <AuditionBoard roleId={roleId(raw)} initialRound={initialRound} />;
}
