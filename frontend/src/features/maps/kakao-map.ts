const KAKAO_MAP_SCRIPT_ID = "kakao-map-sdk";

export type KakaoMapCoordinates = {
  readonly latitude: number;
  readonly longitude: number;
};

export function loadExternalScript(id: string, src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") resolve();
      else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("script load failed")), { once: true });
      }
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

export async function loadKakaoMapSdk(appKey: string) {
  const src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services`;
  await loadExternalScript(KAKAO_MAP_SCRIPT_ID, src);
  if (!window.kakao) throw new Error("kakao maps unavailable");
  await new Promise<void>((resolve) => window.kakao!.maps.load(resolve));
}

export function geocodeKakaoAddress(address: string) {
  return new Promise<KakaoMapCoordinates>((resolve, reject) => {
    if (!window.kakao) {
      reject(new Error("kakao maps unavailable"));
      return;
    }
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(address, (items, status) => {
      if (!window.kakao || status !== window.kakao.maps.services.Status.OK || !items[0]) {
        reject(new Error("address geocoding failed"));
        return;
      }
      resolve({ latitude: Number(items[0].y), longitude: Number(items[0].x) });
    });
  });
}

export function kakaoDirectionsUrl(name: string, coordinates: KakaoMapCoordinates) {
  const label = encodeURIComponent(name.replaceAll(",", " "));
  return `https://map.kakao.com/link/to/${label},${coordinates.latitude},${coordinates.longitude}`;
}

export function kakaoMapSearchUrl(query: string) {
  return `https://map.kakao.com/link/search/${encodeURIComponent(query)}`;
}
