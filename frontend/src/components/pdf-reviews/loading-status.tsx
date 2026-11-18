import type { ReactNode } from "react";

const SPINNER_SIZES = { sm: "h-3.5 w-3.5", md: "h-5 w-5" } as const;

export function Spinner({ size = "md" }: { readonly size?: keyof typeof SPINNER_SIZES }) {
  return <span aria-hidden="true" className={`inline-block shrink-0 animate-spin rounded-full border-2 border-brand/25 border-t-brand motion-reduce:animate-none ${SPINNER_SIZES[size]}`} />;
}

export function LoadingStatus({ children }: { readonly children: ReactNode }) {
  return <p role="status" className="flex items-center gap-3 p-6 text-sm text-muted-strong"><Spinner />{children}</p>;
}
