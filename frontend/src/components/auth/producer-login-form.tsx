"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton, TextLink } from "@/components/ui/controls";
import { useToast } from "@/components/auditions/toast";
import { AuthInput, PasswordInput } from "./auth-fields";
import { SessionApiError, login as requestLogin } from "@/features/auth/session-api";
import { frontendEnvironment } from "@/config/environment";
import { producerAuditionPostRoutes } from "@/features/audition-posts/types";
import { openProducerWorkspace } from "@/features/auth/producer-navigation";
import { createFrontendCredential, useAuthSession } from "./auth-session";
import {
  loginAttributionFor,
  trackLoginAttempt,
  trackLoginPageView,
  trackLoginSuccess,
} from "@/features/analytics/events";

type LoginErrors = Partial<Record<"identifier" | "password", string>>;

const mockingDisabled = !frontendEnvironment.apiMockingEnabled;
const realProducerLoginEnabled = frontendEnvironment.producerLoginEnabled;

export function ProducerLoginForm() {
  const toast = useToast();
  const router = useRouter();
  const { setSession } = useAuthSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [pageAttribution] = useState(() => loginAttributionFor(producerAuditionPostRoutes.list, "producer"));

  useEffect(() => {
    trackLoginPageView(pageAttribution);
  }, [pageAttribution]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: LoginErrors = {};
    const trimmedIdentifier = identifier.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmedIdentifier)) nextErrors.identifier = "올바른 이메일 주소를 입력해 주세요.";
    if (!password) nextErrors.password = "비밀번호를 입력해 주세요.";
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      requestAnimationFrame(() => document.getElementById(`login-${firstError}`)?.focus());
      return;
    }

    const producerAttribution = loginAttributionFor(producerAuditionPostRoutes.list, "producer");
    trackLoginAttempt("password", producerAttribution);

    let serverSession: Awaited<ReturnType<typeof requestLogin>> | null = null;
    if (mockingDisabled || realProducerLoginEnabled) {
      setSubmitting(true);
      try {
        serverSession = await requestLogin(trimmedIdentifier, password);
      } catch (error) {
        console.error("[로그인 실패]", error);
        const message = error instanceof SessionApiError
          ? error.message
          : "로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.";
        toast(message, { type: "error" });
        return;
      } finally {
        setSubmitting(false);
      }
    }

    // 운영자 계정은 공개 서비스 화면을 쓰지 않으므로 바로 운영 대시보드로 보낸다.
    const serverRole = serverSession?.role;
    if (serverRole === "ADMIN") {
      toast("운영자 계정으로 로그인했습니다.", { type: "success" });
      // 이전 비로그인 방문의 경로 캐시를 쓰지 않고 새 세션으로 서버 접근 검사를 받는다.
      window.location.assign("/admin");
      return;
    }

    setSession({
      credential: serverSession ? `member-${serverSession.memberId}` : createFrontendCredential(),
      role: serverRole ?? "PRODUCER",
      displayName: trimmedIdentifier,
      producerStatus: serverSession?.status ?? "ACTIVE",
    });
    trackLoginSuccess(producerAuditionPostRoutes.list, producerAttribution);
    toast("기획사/제작사 계정으로 로그인했습니다.", { type: "success" });
    if (serverSession) {
      openProducerWorkspace();
      return;
    }
    router.push(producerAuditionPostRoutes.list);
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate className="space-y-4">
      <div className="space-y-3">
        <AuthInput
          id="login-identifier"
          label="이메일"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="producer@example.com"
          value={identifier}
          error={errors.identifier}
          onChange={(event) => setIdentifier(event.target.value)}
        />
        <PasswordInput
          id="login-password"
          label="비밀번호"
          autoComplete="current-password"
          placeholder="비밀번호를 입력해 주세요"
          value={password}
          error={errors.password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <PrimaryButton type="submit" disabled={submitting} className="min-h-[52px] w-full text-base">
        {submitting ? "로그인 중..." : "기획사/제작사 로그인"}
      </PrimaryButton>
      <div className="grid gap-2 sm:grid-cols-2">
        <TextLink href="/forgot-password" className="w-full text-center">
          비밀번호를 잊으셨나요?
        </TextLink>
        <TextLink href="/signup" className="w-full text-center">
          기획사/제작사 회원가입
        </TextLink>
      </div>
    </form>
  );
}
