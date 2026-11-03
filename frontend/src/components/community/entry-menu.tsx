"use client";

import { useState } from "react";
import { PiDotsThree, PiFlag, PiLink, PiPencilSimple, PiTrash } from "react-icons/pi";
import { SubmissionAttempt } from "@/features/community/draft";
import { useCommunityAction } from "@/features/community/hooks";
import { copyLink } from "@/features/community/share";
import type { CommunityEntry } from "@/features/community/types";
import { CommunitySheet } from "./community-sheet";
import { CommunityError } from "./community-ui";
import { ReportForm } from "./report-form";

type Step = "menu" | "delete" | "report";

type MenuProps = {
  readonly entry: CommunityEntry;
  readonly label: string;
  readonly notify: (message: string) => void;
  readonly shareUrl?: () => string;
  readonly onEdit?: () => void;
  readonly onDelete?: () => Promise<void>;
  readonly deleteQuestion?: string;
};

type ReportState = { readonly attempt: SubmissionAttempt; readonly reported: boolean; readonly markReported: () => void };
type StepProps = MenuProps & ReportState & { readonly step: Step; readonly moveTo: (step: Step) => void; readonly close: () => void };

export function EntryMenu(props: MenuProps) {
  const [step, setStep] = useState<Step | null>(null);
  const [reported, setReported] = useState(false);
  const [attempt] = useState(() => new SubmissionAttempt());
  const close = () => setStep(null);
  return <><button type="button" className="community-icon-button" aria-label={props.label} aria-haspopup="dialog" onClick={() => setStep("menu")}>
    <PiDotsThree size={22} aria-hidden="true" /></button>
    <CommunitySheet open={step !== null} label={props.label} onClose={close}>
      {step && <MenuStep {...props} step={step} moveTo={setStep} close={close} attempt={attempt} reported={reported} markReported={() => setReported(true)} />}</CommunitySheet></>;
}

function MenuStep(props: StepProps) {
  const { entry, step, close, notify, attempt, markReported } = props;
  const sent = () => { markReported(); close(); notify("신고가 접수되었어요. 팀에서 확인할게요."); };
  if (step === "report") return <ReportForm entryId={entry.id} attempt={attempt} onSent={sent} />;
  if (step === "delete") return <DeleteConfirm {...props} />;
  return <MenuActions {...props} />;
}

function MenuActions({ entry, shareUrl, onEdit, onDelete, moveTo, close, notify, reported }: StepProps) {
  const editable = entry.editable;
  return <ul className="community-sheet-list">
    {shareUrl && <li><button type="button" className="community-sheet-row" onClick={() => { close(); void copyLink(shareUrl(), notify); }}><PiLink size={19} aria-hidden="true" />링크 복사</button></li>}
    {editable && onEdit && <li><button type="button" className="community-sheet-row" onClick={() => { close(); onEdit(); }}><PiPencilSimple size={19} aria-hidden="true" />수정</button></li>}
    {editable && onDelete && <li><button type="button" className="community-sheet-row community-danger" onClick={() => moveTo("delete")}><PiTrash size={19} aria-hidden="true" />삭제</button></li>}
    <li><ReportAction reported={reported} report={() => moveTo("report")} /></li></ul>;
}

function ReportAction({ reported, report }: { readonly reported: boolean; readonly report: () => void }) {
  if (reported) return <p className="community-sheet-row community-sheet-done"><PiFlag size={19} aria-hidden="true" />신고가 접수되었어요</p>;
  return <button type="button" className="community-sheet-row" onClick={report}><PiFlag size={19} aria-hidden="true" />신고하기</button>;
}

function DeleteConfirm({ deleteQuestion, onDelete, moveTo, close }: StepProps) {
  const action = useCommunityAction();
  const remove = () => action.run(async () => { await onDelete?.(); close(); });
  return <div className="community-sheet-confirm"><p>{deleteQuestion}</p><CommunityError message={action.error} />
    <div className="community-sheet-buttons"><button type="button" disabled={action.busy} onClick={() => moveTo("menu")}>취소</button>
      <button type="button" className="community-danger-button" disabled={action.busy} onClick={() => void remove()}>삭제</button></div></div>;
}
