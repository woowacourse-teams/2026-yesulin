"use client";

import { useEffect, useRef, useState } from "react";
import type { VenueAddress } from "@/features/auditions/creation-types";
import { SecondaryButton, SecondaryLink } from "@/components/ui/controls";
import { geocodeKakaoAddress, kakaoDirectionsUrl, kakaoMapSearchUrl, loadKakaoMapSdk } from "@/features/maps/kakao-map";
import type { KakaoMapCoordinates } from "@/features/maps/kakao-map";

export function PublicVenueGuide({ venue, address }: { readonly venue: string; readonly address: VenueAddress }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [coordinates, setCoordinates] = useState<KakaoMapCoordinates | null>(() => coordinatesOf(address));
  const [mapFailed, setMapFailed] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const mapKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
  const fullAddress = [address.roadAddress, address.detailAddress].filter(Boolean).join(" ");
  const venueName = venue.trim() && venue.trim() !== address.roadAddress.trim() ? venue.trim() : "공연 장소";

  useEffect(() => {
    if (!mapKey || !address.roadAddress || !mapRef.current) return;
    let cancelled = false;
    loadKakaoMapSdk(mapKey)
      .then(async () => {
        const nextCoordinates = coordinates ?? await geocodeKakaoAddress(address.roadAddress);
        if (cancelled || !mapRef.current || !window.kakao) return;
        const center = new window.kakao.maps.LatLng(nextCoordinates.latitude, nextCoordinates.longitude);
        const map = new window.kakao.maps.Map(mapRef.current, { center, level: 3 });
        new window.kakao.maps.Marker({ map, position: center });
        setCoordinates(nextCoordinates);
        setMapFailed(false);
      })
      .catch((cause) => { if (!cancelled) { console.error("[공연장 지도 불러오기 실패]", cause); setMapFailed(true); } });
    return () => { cancelled = true; };
  }, [address.roadAddress, coordinates, mapKey]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(fullAddress);
      setCopyMessage("주소를 복사했습니다.");
    } catch (cause) {
      console.error("[공연장 주소 복사 실패]", cause);
      setCopyMessage("주소를 복사하지 못했습니다. 주소를 직접 선택해 주세요.");
    }
  };
  const externalUrl = coordinates
    ? kakaoDirectionsUrl(venueName, coordinates)
    : kakaoMapSearchUrl(fullAddress || venue);

  return <section aria-labelledby="performance-venue-title" className="rounded-card border border-border bg-card p-4 sm:p-5">
    <div className="grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.8fr)] md:items-stretch">
      <div ref={mapRef} aria-label="공연 장소 지도" className="h-56 overflow-hidden rounded-card border border-border bg-surface sm:h-64">
        {!mapKey || mapFailed ? <MapFallback failed={mapFailed} /> : <div className="grid h-full place-items-center px-5 text-center text-sm text-muted">공연 장소 지도를 불러오고 있어요.</div>}
      </div>
      <div className="flex min-w-0 flex-col">
        <p className="text-sm font-semibold text-brand">공연 장소</p>
        <h3 id="performance-venue-title" className="mt-2 text-lg font-bold">{venueName}</h3>
        <p className="mt-2 break-words text-sm leading-6 text-muted-strong">{fullAddress || "상세 주소를 준비하고 있습니다."}</p>
        <p className="mt-4 text-xs leading-5 text-muted">이곳은 공연이 열리는 장소입니다. 오디션 장소는 전형 안내를 별도로 확인해 주세요.</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          {fullAddress ? <SecondaryButton onClick={copyAddress}>주소 복사</SecondaryButton> : null}
          {(fullAddress || venue) ? <SecondaryLink href={externalUrl} target="_blank" rel="noreferrer">{coordinates ? "길찾기" : "카카오맵에서 보기"}<span className="sr-only"> 새 창</span></SecondaryLink> : null}
        </div>
        <p aria-live="polite" className="mt-2 min-h-5 text-xs text-muted">{copyMessage}</p>
      </div>
    </div>
  </section>;
}

function coordinatesOf(address: VenueAddress): KakaoMapCoordinates | null {
  return address.latitude !== null && address.longitude !== null
    ? { latitude: address.latitude, longitude: address.longitude }
    : null;
}

function MapFallback({ failed }: { readonly failed: boolean }) {
  return <div className="grid h-full place-items-center px-5 text-center text-sm leading-6 text-muted">{failed ? "지도를 불러오지 못했습니다. 주소와 카카오맵 링크를 이용해 주세요." : "주소와 카카오맵 링크로 공연 장소를 확인할 수 있어요."}</div>;
}
