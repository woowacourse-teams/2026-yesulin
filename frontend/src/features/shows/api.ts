import { request } from "@/features/auditions/api-client";
import type { CreateReservation, PublicShow, PublicShowSummary, ReservationReceipt } from "./types";

const PUBLIC_SHOWS_PATH = "/v1/public/shows";

export async function getPublicShows(): Promise<readonly PublicShowSummary[]> {
  const response = await request<{ readonly shows: readonly PublicShowSummary[] }>(PUBLIC_SHOWS_PATH);
  return response.shows;
}

export function getPublicShow(showId: string): Promise<PublicShow> {
  return request<PublicShow>(`${PUBLIC_SHOWS_PATH}/${encodeURIComponent(showId)}`);
}

/** 비회원 예매. 휴대폰은 010-1234-5678 형식으로 보낸다. */
export function createReservation(
  showId: string,
  sessionId: number,
  input: CreateReservation,
): Promise<ReservationReceipt> {
  return request<ReservationReceipt>(
    `${PUBLIC_SHOWS_PATH}/${encodeURIComponent(showId)}/sessions/${sessionId}/reservations`,
    {
      method: "POST",
      body: JSON.stringify({
        bookerName: input.bookerName.trim(),
        bookerPhone: input.bookerPhone.trim(),
        ticketCount: input.ticketCount,
        privacyAgreed: input.privacyAgreed,
      }),
    },
  );
}
