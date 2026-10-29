"use client";

import { useSyncExternalStore, useState } from "react";
import { isInternalBrowser, setInternalBrowser } from "@/features/analytics/product-analytics";
import { PRODUCT_SETTINGS_EVENT } from "@/features/analytics/posthog-contract";

function subscribe(callback: () => void) {
  window.addEventListener(PRODUCT_SETTINGS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener(PRODUCT_SETTINGS_EVENT, callback); window.removeEventListener("storage", callback); };
}

export function InternalTestSettings() {
  const internal = useSyncExternalStore(subscribe, isInternalBrowser, () => false);
  const [error, setError] = useState(false);
  return <main className="mx-auto max-w-xl space-y-6 px-5 py-12">
    <h1 className="text-2xl font-bold">팀원 테스트 설정</h1>
    <p>이 브라우저에서 하는 테스트를 실제 사용자 성과 지표에서 제외합니다. PC·휴대폰·다른 브라우저마다 설정해 주세요.</p>
    <p className="rounded-card border border-border p-4" role="status">현재: <strong>{internal ? "내부 테스트 · 성과 지표에서 제외" : "일반 방문"}</strong></p>
    <button type="button" className="rounded-control bg-brand px-5 py-3 text-white" onClick={() => setError(!setInternalBrowser(!internal))}>
      {internal ? "일반 방문으로 되돌리기" : "이 브라우저를 내부 테스트로 표시"}
    </button>
    {error ? <p role="alert">브라우저 저장이 차단되어 설정하지 못했습니다. 저장을 허용한 뒤 다시 시도해 주세요.</p> : null}
    <p className="text-sm text-muted">변경 이후 행동부터 적용됩니다. 로그인하지 않아도 유지되지만, 저장 데이터를 지우거나 시크릿 모드를 쓰면 다시 설정해야 합니다. 운영·개발 사이트에서 각각 설정해 주세요. 분석 끄기 설정은 그대로 존중합니다.</p>
  </main>;
}
