"use client";

import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { DestructiveButton, SecondaryButton } from "@/components/ui/controls";
import { usePublicApplication } from "./public-application-context";

const TITLE_ID = "public-application-exit-title";

/** 저장되지 않은 변경이 있는 SPA 이동만 확인한다. 새로고침·탭 닫기는 beforeunload가 맡는다. */
export function PublicApplicationExitDialog() {
  const { state, actions } = usePublicApplication();
  const failed = state.draftSaveStatus === "ERROR";
  const subtitle = failed ? "최근 변경 내용을 이 기기에 저장하지 못했습니다. 이전에 저장된 내용이 있다면 그 시점까지만 복원됩니다." : "최근 변경 내용을 이 기기에 저장하고 있습니다. 지금 나가면 아직 저장되지 않은 변경이 사라질 수 있습니다.";
  const keepWriting = () => { if (failed) actions.retryDraftSave(); actions.cancelBack(); };
  return <ModalShell open={state.leaveConfirmationOpen} onClose={actions.cancelBack} labelledBy={TITLE_ID} placement="responsiveSheet" className="w-full overflow-hidden rounded-t-modal border border-border bg-card shadow-[var(--shadow-modal)] md:w-[min(440px,calc(100vw-40px))] md:rounded-modal"><DialogHeader id={TITLE_ID} title="저장되지 않은 변경이 있어요" subtitle={subtitle} /><div className="px-5 py-6 text-base leading-relaxed text-muted-strong md:px-6 md:text-sm"><p>{failed ? "계속 작성하면서 다시 저장하는 것을 권장합니다." : "저장이 끝난 뒤 이동하면 작성 내용을 안전하게 이어 쓸 수 있어요."}</p></div><DialogFooter><SecondaryButton data-autofocus="true" onClick={keepWriting}>{failed ? "다시 저장" : "저장 기다리기"}</SecondaryButton><DestructiveButton onClick={actions.confirmBack}>저장 안 하고 나가기</DestructiveButton></DialogFooter></ModalShell>;
}
