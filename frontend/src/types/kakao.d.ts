type KakaoPostcodeResult = {
  roadAddress: string;
  address: string;
  zonecode: string;
};

type KakaoGeocoderResult = {
  x: string;
  y: string;
};

interface Window {
  daum?: {
    Postcode: new (options: { oncomplete: (result: KakaoPostcodeResult) => void }) => { open: () => void };
  };
  kakao?: {
    maps: {
      load: (callback: () => void) => void;
      LatLng: new (latitude: number, longitude: number) => unknown;
      Map: new (container: HTMLElement, options: { center: unknown; level: number }) => unknown;
      Marker: new (options: { map: unknown; position: unknown }) => unknown;
      services: {
        Status: { OK: string };
        Geocoder: new () => { addressSearch: (address: string, callback: (result: KakaoGeocoderResult[], status: string) => void) => void };
      };
    };
  };
}
