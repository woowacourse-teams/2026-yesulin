import type { SocialProvider } from "./auth-session";

const providers = [
  {
    id: "kakao",
    label: "카카오",
    mark: <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-kakao-ink text-xs font-bold text-kakao">K</span>,
    className: "border-kakao bg-kakao text-kakao-ink hover:brightness-95",
  },
  {
    id: "naver",
    label: "네이버",
    mark: <span aria-hidden="true" className="grid h-6 w-6 place-items-center bg-white text-xs font-black text-naver">N</span>,
    className: "border-naver bg-naver text-white hover:brightness-95",
  },
  {
    id: "google",
    label: "Google",
    mark: <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full border border-border bg-white text-sm font-bold text-foreground">G</span>,
    className: "border-border bg-white text-foreground hover:border-brand-line hover:bg-surface",
  },
] as const satisfies ReadonlyArray<{
  readonly id: SocialProvider;
  readonly label: string;
  readonly mark: React.ReactNode;
  readonly className: string;
}>;

export function SocialButtons({ pendingProvider, onSelect }: {
  readonly pendingProvider?: SocialProvider;
  readonly onSelect: (provider: SocialProvider) => void;
}) {
  return (
    <section aria-label="배우 소셜 로그인" className="space-y-2.5">
      {providers.map((provider) => {
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
            {pending ? `${provider.label} 로그인 중…` : `${provider.label}로 계속하기`}
          </button>
        );
      })}
      <p className="pt-2 text-center text-sm leading-6 text-muted">
        처음 이용해도 소셜 로그인과 함께 배우 계정이 자동으로 만들어집니다.
      </p>
    </section>
  );
}
