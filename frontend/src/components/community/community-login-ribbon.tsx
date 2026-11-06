"use client";

import { useAuthSession } from "@/components/auth/auth-session";
import { SocialLogin } from "@/components/auth/social-login";

export function CommunityLoginRibbon() {
  const { session, sessionReady } = useAuthSession();
  if (!sessionReady || session) return null;
  return <section className="community-login-ribbon" aria-label="커뮤니티 로그인">
    <h2>1초 로그인</h2>
    <SocialLogin compact returnTo="/community/new" />
  </section>;
}
