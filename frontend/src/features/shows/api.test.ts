import { afterEach, describe, expect, it, vi } from "vitest";
import { createReservation, getPublicShows } from "./api";
import { showRoutes } from "./types";

afterEach(() => {
  vi.unstubAllGlobals();
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

describe("public show API", () => {
  it("공개 공연 목록 응답에서 공연 배열만 꺼낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ shows: [{ id: "show-1" }] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getPublicShows()).resolves.toEqual([{ id: "show-1" }]);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/public/shows", expect.objectContaining({ credentials: "include" }));
  });

  it("예매 요청은 회차 경로로 공백을 정리한 입력을 보낸다", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => Promise.resolve(
      url.endsWith("/reservations")
        ? json({ code: "ABCD2345", showTitle: "햄릿", startsAt: "2026-10-10T10:00:00Z", ticketCount: 2, bookerName: "홍길동" }, 201)
        : json({}, 401),
    ));
    vi.stubGlobal("fetch", fetchMock);

    await createReservation("show 1", 7, {
      bookerName: " 홍길동 ",
      bookerPhone: "010-1234-5678 ",
      ticketCount: 2,
      privacyAgreed: true,
    });

    const reservationCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/reservations"));
    expect(reservationCall?.[0]).toBe("/api/v1/public/shows/show%201/sessions/7/reservations");
    expect(JSON.parse(String(reservationCall?.[1].body))).toEqual({
      bookerName: "홍길동",
      bookerPhone: "010-1234-5678",
      ticketCount: 2,
      privacyAgreed: true,
    });
  });

  it("공연 링크는 공개 ID를 인코딩한다", () => {
    expect(showRoutes.detail("a/b")).toBe("/shows/a%2Fb");
  });
});
