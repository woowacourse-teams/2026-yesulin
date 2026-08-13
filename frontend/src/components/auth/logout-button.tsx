"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/features/auth/api";

export function LogoutButton({ className }: { readonly className: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await logout();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button type="button" disabled={pending} onClick={handleLogout} className={className}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
        <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />
      </svg>
      <span className="hidden sm:inline">{pending ? "로그아웃 중…" : "로그아웃"}</span>
    </button>
  );
}
