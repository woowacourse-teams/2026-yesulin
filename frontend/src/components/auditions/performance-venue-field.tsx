"use client";

import { useEffect, useRef, useState } from "react";
import type { VenueAddress } from "@/features/auditions/creation-types";
import { FieldInput, SecondaryButton } from "@/components/ui/controls";
import { CreateField } from "./create-form";
import { PERFORMANCE_ADDRESS_MAX_LENGTH, PERFORMANCE_VENUE_MAX_LENGTH } from "@/features/auditions/performance-validation";

const POSTCODE_SCRIPT = "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

function loadScript(id: string, src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.addEventListener("load", () => { script.dataset.loaded = "true"; resolve(); }, { once: true });
    script.addEventListener("error", () => reject(new Error("script load failed")), { once: true });
    document.head.appendChild(script);
  });
}

export const emptyVenueAddress = (): VenueAddress => ({ roadAddress: "", detailAddress: "", zonecode: "", latitude: null, longitude: null });

export function PerformanceVenueField({ venue, address, onVenueChange, onAddressChange, optional = false, hideVenueName = false, venueLabel = "공연 장소명", mapLabel = "공연 장소 지도" }: {
  readonly venue: string;
  readonly address: VenueAddress;
  readonly onVenueChange: (value: string) => void;
  readonly onAddressChange: (value: VenueAddress) => void;
  readonly optional?: boolean;
  readonly hideVenueName?: boolean;
  readonly venueLabel?: string;
  readonly mapLabel?: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const mapKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;

  useEffect(() => {
    if (!mapKey || address.latitude === null || address.longitude === null || !mapRef.current) return;
    const src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(mapKey)}&autoload=false&libraries=services`;
    loadScript("kakao-map-sdk", src).then(() => window.kakao?.maps.load(() => {
      if (!mapRef.current || !window.kakao) return;
      const center = new window.kakao.maps.LatLng(address.latitude!, address.longitude!);
      const map = new window.kakao.maps.Map(mapRef.current, { center, level: 3 });
      new window.kakao.maps.Marker({ map, position: center });
    })).catch(() => setMessage("지도를 불러오지 못했습니다. 주소는 그대로 저장할 수 있어요."));
  }, [address.latitude, address.longitude, mapKey]);

  const searchAddress = async () => {
    setMessage("");
    try {
      if (!window.daum?.Postcode) await loadScript("kakao-postcode", POSTCODE_SCRIPT);
      if (!window.daum?.Postcode) throw new Error("postcode unavailable");
      new window.daum.Postcode({ oncomplete: (result) => {
        const roadAddress = result.roadAddress || result.address;
        if (hideVenueName) onVenueChange(result.buildingName?.trim() || roadAddress);
        const base: VenueAddress = { roadAddress, detailAddress: address.detailAddress, zonecode: result.zonecode, latitude: null, longitude: null };
        onAddressChange(base);
        if (!mapKey) {
          setMessage("도로명주소를 선택했습니다. 지도 좌표는 카카오 지도 키가 설정되면 함께 저장됩니다.");
          return;
        }
        const mapSrc = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(mapKey)}&autoload=false&libraries=services`;
        loadScript("kakao-map-sdk", mapSrc).then(() => window.kakao?.maps.load(() => {
          const geocoder = window.kakao && new window.kakao.maps.services.Geocoder();
          geocoder?.addressSearch(roadAddress, (items, status) => {
            if (!window.kakao || status !== window.kakao.maps.services.Status.OK || !items[0]) return;
            onAddressChange({ ...base, latitude: Number(items[0].y), longitude: Number(items[0].x) });
          });
        }));
      } }).open();
    } catch {
      setMessage("주소 검색을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <div className="space-y-3">
      {!hideVenueName ? <CreateField label={venueLabel}><FieldInput required={!optional} maxLength={PERFORMANCE_VENUE_MAX_LENGTH} value={venue} onChange={(event) => onVenueChange(event.target.value)} placeholder={optional ? "예: 대학로 연습실 A" : "예: 대학로예술극장 대극장"} /></CreateField> : null}
      <CreateField label="도로명주소">
        <div className="flex gap-2"><FieldInput readOnly required={!optional} value={address.roadAddress} placeholder="주소 검색을 이용해 주세요." /><SecondaryButton onClick={searchAddress} className="shrink-0">주소 검색</SecondaryButton></div>
      </CreateField>
      <div className="grid gap-3 md:grid-cols-[120px_1fr]">
        <CreateField label="우편번호"><FieldInput readOnly value={address.zonecode} /></CreateField>
        <CreateField label="상세 주소"><FieldInput maxLength={PERFORMANCE_ADDRESS_MAX_LENGTH} value={address.detailAddress} onChange={(event) => onAddressChange({ ...address, detailAddress: event.target.value })} placeholder="층, 호수 등" /></CreateField>
      </div>
      {address.roadAddress ? <div ref={mapRef} aria-label={mapLabel} className="h-48 overflow-hidden rounded-card border border-border bg-surface">{!mapKey ? <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted">카카오 지도 키를 설정하면 선택한 장소가 지도에 표시됩니다.</div> : null}</div> : null}
      {message ? <p role="status" className="text-sm text-muted">{message}</p> : null}
    </div>
  );
}
