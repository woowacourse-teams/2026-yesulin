type SocialProvider = "카카오톡" | "네이버";

export function SocialButtons({ mode, onUnavailable }: {
  readonly mode: "로그인" | "회원가입";
  readonly onUnavailable: (provider: SocialProvider) => void;
}) {
  return (
    <section aria-label={`소셜 ${mode}`}>
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted">또는 소셜 계정으로</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onUnavailable("카카오톡")}
          className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-control border border-kakao bg-kakao px-4 text-sm font-semibold text-kakao-ink transition-[filter,transform] hover:brightness-95 active:scale-[0.99]"
        >
          <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-kakao-ink text-xs font-bold text-kakao">K</span>
          카카오톡으로 {mode}
        </button>
        <button
          type="button"
          onClick={() => onUnavailable("네이버")}
          className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-control border border-naver bg-naver px-4 text-sm font-semibold text-white transition-[filter,transform] hover:brightness-95 active:scale-[0.99]"
        >
          <span aria-hidden="true" className="grid h-6 w-6 place-items-center bg-white text-xs font-black text-naver">N</span>
          네이버로 {mode}
        </button>
      </div>
    </section>
  );
}
