"use client";

import { useRef, useState, type RefObject } from "react";
import { useAuthSession } from "@/components/auth/auth-session";
import { resendProducerVerificationEmail, verifyProducerEmailCode } from "@/features/auth/api";
import type { SessionResponse } from "@/features/auth/session-api";

type VerificationState = { code: string; pending: boolean; message: string; failed: boolean };
type VerificationContext = {
  state: VerificationState;
  setState: React.Dispatch<React.SetStateAction<VerificationState>>;
  acquire: () => boolean;
  release: () => void;
  refreshSession: () => Promise<void>;
  completeProducerVerification: (session: SessionResponse) => void;
};

const INITIAL_STATE: VerificationState = { code: "", pending: false, message: "", failed: false };

export function useProducerEmailVerification() {
  const context = useVerificationContext();
  return {
    ...context.state,
    updateCode: (value: string) => update(context, { code: value.replace(/\D/g, "").slice(0, 6) }),
    submit: () => submitCode(context),
    resend: () => runOperation(context, resendCode),
    check: () => runOperation(context, () => checkStatus(context)),
  };
}

function useVerificationContext(): VerificationContext {
  const [state, setState] = useState(INITIAL_STATE);
  const working = useRef(false);
  const { refreshSession, completeProducerVerification } = useAuthSession();
  return { state, setState, refreshSession, completeProducerVerification,
    acquire: () => acquireOperation(working), release: () => { working.current = false; },
  };
}

function acquireOperation(working: RefObject<boolean>) {
  if (working.current) return false;
  working.current = true;
  return true;
}

function update(context: VerificationContext, patch: Partial<VerificationState>) {
  context.setState((state) => ({ ...state, ...patch }));
}

async function submitCode(context: VerificationContext) {
  if (!/^[0-9]{6}$/.test(context.state.code)) {
    update(context, { failed: true, message: "인증번호는 숫자 6자리로 입력해 주세요." });
    return;
  }
  await runOperation(context, () => confirmCode(context));
}

async function confirmCode(context: VerificationContext) {
  const verified = await verifyProducerEmailCode(context.state.code);
  context.completeProducerVerification(verified);
  return "이메일 인증을 완료했습니다.";
}

async function resendCode() {
  await resendProducerVerificationEmail();
  return "인증번호를 다시 보냈습니다. 새 메일의 숫자 6자리를 입력해 주세요.";
}

async function checkStatus(context: VerificationContext) {
  await context.refreshSession();
  return "인증 상태를 확인했습니다. 아직 대기 중이면 메일의 인증번호를 입력해 주세요.";
}

function beginOperation(context: VerificationContext) {
  if (!context.acquire()) return false;
  update(context, { pending: true, message: "", failed: false });
  return true;
}

async function runOperation(context: VerificationContext, operation: () => Promise<string>) {
  if (!beginOperation(context)) return;
  try {
    update(context, { message: await operation() });
  } catch (cause) {
    update(context, { failed: true, message: failureMessage(cause) });
  } finally {
    finishOperation(context);
  }
}

function finishOperation(context: VerificationContext) {
  context.release();
  update(context, { pending: false });
}

function failureMessage(cause: unknown) {
  if (cause instanceof Error) return cause.message;
  return "이메일 인증을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
