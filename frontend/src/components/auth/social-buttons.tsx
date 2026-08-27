import type { SocialProvider } from "./auth-session";

const providers = [
  {
    id: "kakao",
    label: "카카오 로그인",
    pendingLabel: "카카오 로그인 중…",
    mark: <KakaoMark />,
    className: "border-kakao bg-kakao text-kakao-ink hover:brightness-95",
  },
  {
    id: "naver",
    label: "네이버 로그인",
    pendingLabel: "네이버 로그인 중…",
    mark: <NaverMark />,
    className: "border-naver bg-naver text-white hover:brightness-95",
  },
  {
    id: "google",
    label: "Google로 로그인",
    pendingLabel: "Google 로그인 중…",
    mark: <GoogleMark />,
    className: "border-[#747775] bg-white text-[#1f1f1f] hover:bg-[#f8fafd]",
  },
] as const satisfies ReadonlyArray<{
  readonly id: SocialProvider;
  readonly label: string;
  readonly pendingLabel: string;
  readonly mark: React.ReactNode;
  readonly className: string;
}>;

export function SocialButtons({ pendingProvider, onSelect }: {
  readonly pendingProvider?: SocialProvider;
  readonly onSelect: (provider: SocialProvider) => void;
}) {
  return (
    <section aria-label="배우 소셜 로그인" className="space-y-2.5">
      {providers.filter((provider) => provider.id !== "naver").map((provider) => {
        const pending = pendingProvider === provider.id;
        return (
          <button
            key={provider.id}
            type="button"
            disabled={Boolean(pendingProvider)}
            onClick={() => onSelect(provider.id)}
            className={`inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-control border px-4 text-sm font-semibold transition-[background-color,border-color,filter,transform] active:scale-[0.99] disabled:cursor-wait disabled:opacity-65 ${provider.className}`}
          >
            {provider.mark}
            {pending ? provider.pendingLabel : provider.label}
          </button>
        );
      })}
      <p className="pt-2 text-center text-sm leading-6 text-muted">
        처음 이용해도 소셜 로그인과 함께 배우 계정이 자동으로 만들어집니다.
      </p>
    </section>
  );
}

function KakaoMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M12 3C6.48 3 2 6.48 2 10.78c0 2.76 1.86 5.18 4.66 6.56l-1.19 4.38c-.1.39.34.7.67.47l5.15-3.42c.23.02.47.03.71.03 5.52 0 10-3.48 10-7.78S17.52 3 12 3Z" /></svg>;
}

function NaverMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-white"><path d="M14.1 12.55 9.63 6H5v12h4.9v-6.55L14.37 18H19V6h-4.9v6.55Z" /></svg>;
}

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5"><path fill="#4285F4" d="M21.35 12.23c0-.72-.06-1.41-.18-2.08H12v3.94h5.24a4.48 4.48 0 0 1-1.94 2.94v2.55h3.15c1.84-1.69 2.9-4.19 2.9-7.35Z" /><path fill="#34A853" d="M12 21.75c2.63 0 4.83-.87 6.45-2.36l-3.15-2.55c-.87.58-1.99.93-3.3.93-2.53 0-4.68-1.71-5.45-4.01H3.3v2.63A9.75 9.75 0 0 0 12 21.75Z" /><path fill="#FBBC05" d="M6.55 13.76A5.87 5.87 0 0 1 6.24 12c0-.61.11-1.2.31-1.76V7.61H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.39l3.25-2.63Z" /><path fill="#EA4335" d="M12 6.23c1.43 0 2.71.49 3.72 1.45l2.8-2.8A9.38 9.38 0 0 0 12 2.25a9.75 9.75 0 0 0-8.7 5.36l3.25 2.63c.77-2.3 2.92-4.01 5.45-4.01Z" /></svg>;
}
