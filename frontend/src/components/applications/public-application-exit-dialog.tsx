"use client";

import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { usePublicApplication } from "./public-application-context";

const TITLE_ID = "public-application-exit-title";

/** 공고 상세로 돌아가는 SPA 이동만 별도 확인한다. 새로고침·탭 닫기는 beforeunload가 맡는다. */
export function PublicApplicationExitDialog() {
  const { state, actions } = usePublicApplication();
  return <ModalShell open={state.leaveConfirmationOpen} onClose={actions.cancelBack} labelledBy={TITLE_ID} placement="responsiveSheet" className="w-full overflow-hidden rounded-t-modal border border-border bg-card shadow-[var(--shadow-modal)] md:w-[min(440px,calc(100vw-40px))] md:rounded-modal"><DialogHeader id={TITLE_ID} title="작성 중인 내용이 사라져요" subtitle="임시 저장되지 않은 입력값과 업로드한 사진은 공고 상세로 돌아가면 사라집니다." /><div className="px-5 py-6 text-base leading-relaxed text-muted-strong md:px-6 md:text-sm"><p>계속 공고 상세로 돌아갈까요?</p></div><DialogFooter><button type="button" data-autofocus="true" onClick={actions.cancelBack} className="min-h-11 rounded-control border border-border px-4 text-sm font-semibold text-muted-strong hover:bg-surface">계속 작성</button><button type="button" onClick={actions.confirmBack} className="min-h-11 rounded-control bg-fail px-4 text-sm font-semibold text-white hover:bg-fail/90">나가기</button></DialogFooter></ModalShell>;
}
