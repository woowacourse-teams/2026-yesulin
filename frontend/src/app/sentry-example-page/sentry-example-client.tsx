"use client";

import { useState } from "react";

class SentryExampleFrontendError extends Error {
  constructor() {
    super("Sentry frontend example error");
    this.name = "SentryExampleFrontendError";
  }
}

export function SentryExampleClient() {
  const [serverErrorSent, setServerErrorSent] = useState(false);

  const triggerError = async () => {
    const response = await fetch("/api/sentry-example-api");
    setServerErrorSent(!response.ok);
    throw new SentryExampleFrontendError();
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-5 px-5">
      <h1 className="text-2xl font-bold">Sentry 연결 확인</h1>
      <p>버튼을 누르면 서버 오류와 브라우저 오류를 각각 한 번 발생시킵니다.</p>
      <button
        type="button"
        className="rounded-xl bg-primary px-5 py-3 font-semibold text-white"
        onClick={() => void triggerError()}
      >
        테스트 오류 발생
      </button>
      {serverErrorSent && <p role="status">서버 오류 전송을 시도했습니다. Sentry Issues에서 확인해 주세요.</p>}
    </main>
  );
}
