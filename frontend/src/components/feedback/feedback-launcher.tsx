"use client";

import { useId, useState, type FormEvent } from "react";
import { PiChatTeardropText } from "react-icons/pi";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { FieldInput, FieldTextarea, PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { FEEDBACK_CONTACT_MAX, FEEDBACK_CONTENT_MAX, FEEDBACK_TYPES, type FeedbackType } from "@/features/feedback/types";
import { FeedbackImageField, useFeedbackImages } from "./feedback-images";

type Status = "editing" | "sending" | "sent";

/** 공개 화면 오른쪽 아래의 의견 보내기 버튼과 작성 창. 로그인하지 않아도 보낼 수 있다. 요청 모듈은 보낼 때 불러온다. */
export function FeedbackLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="feedback-launcher" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <PiChatTeardropText size={20} aria-hidden="true" /><span>의견 보내기</span>
      </button>
      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="feedback-title"
        placement="responsiveSheet"
        className="public-theme max-h-[calc(100dvh-24px)] w-full overflow-y-auto rounded-t-modal border border-border bg-card shadow-[var(--shadow-modal)] md:w-[min(460px,calc(100vw-40px))] md:rounded-modal"
      >
        <FeedbackForm onClose={() => setOpen(false)} />
      </ModalShell>
    </>
  );
}

function FeedbackForm({ onClose }: { readonly onClose: () => void }) {
  const form = useFeedbackForm();
  if (form.status === "sent") return <FeedbackThanks onClose={onClose} />;
  return (
    <form onSubmit={form.submit} noValidate>
      <DialogHeader id="feedback-title" title="의견 보내기" subtitle="불편한 점, 오류, 바라는 점 무엇이든 좋아요. 팀이 바로 확인해요." />
      <div className="flex flex-col gap-5 px-5 py-5 md:px-6">
        <TypePicker value={form.type} onChange={form.setType} />
        <ContentField value={form.content} onChange={form.setContent} />
        <FeedbackImageField state={form.images} disabled={form.status === "sending"} />
        <ContactField value={form.contact} onChange={form.setContact} />
        {form.error && <p role="alert" className="text-sm text-fail">{form.error}</p>}
      </div>
      <DialogFooter>
        <SecondaryButton type="button" onClick={onClose}>닫기</SecondaryButton>
        <PrimaryButton type="submit" disabled={form.status === "sending" || form.images.processing}>{sendLabel(form.status)}</PrimaryButton>
      </DialogFooter>
    </form>
  );
}

function sendLabel(status: Status): string {
  if (status === "sending") return "보내는 중…";
  return "보내기";
}

function useFeedbackForm() {
  const [type, setType] = useState<FeedbackType>("INCONVENIENCE");
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<Status>("editing");
  const [error, setError] = useState("");
  const images = useFeedbackImages();
  const send = async () => {
    setStatus("sending");
    setError("");
    const { submitFeedback } = await import("@/features/feedback/api");
    await submitFeedback({ type, content, contact, pagePath: window.location.pathname, images: images.blobs })
      .then(() => setStatus("sent"))
      .catch((cause: unknown) => { setStatus("editing"); setError(failureMessage(cause)); });
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "sending" || images.processing) return;
    if (!content.trim()) return setError("내용을 입력해 주세요.");
    await send();
  };
  return { type, setType, content, setContent, contact, setContact, images, status, error, submit };
}

/** 요청 모듈을 화면 공통 꼬리말에 미리 싣지 않으려고 오류의 status만 본다. */
function failureMessage(cause: unknown): string {
  const status = failureStatus(cause);
  if (status === 429) return "잠시 후 다시 보내 주세요. 짧은 시간에 여러 번 보내면 잠시 막혀요.";
  if (status === 413) return "사진이 너무 커요. 사진을 빼거나 다른 사진으로 바꿔 주세요.";
  if (isImageRejected(cause)) return "사진은 JPG·PNG·WebP로 한 장 5MB, 최대 3장까지 보낼 수 있어요.";
  return "보내지 못했어요. 작성한 내용은 그대로 있으니 다시 시도해 주세요.";
}

function failureStatus(cause: unknown): unknown {
  if (typeof cause !== "object" || cause === null || !("status" in cause)) return null;
  return cause.status;
}

function isImageRejected(cause: unknown): boolean {
  return typeof cause === "object" && cause !== null && "code" in cause && cause.code === "FEEDBACK_INVALID_IMAGE";
}

function TypePicker({ value, onChange }: { readonly value: FeedbackType; readonly onChange: (type: FeedbackType) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">어떤 의견인가요?</legend>
      <div className="grid grid-cols-3 gap-2">
        {FEEDBACK_TYPES.map((item) => (
          <label key={item.value} className="feedback-type">
            <input type="radio" name="feedback-type" value={item.value} checked={value === item.value} onChange={() => onChange(item.value)} />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ContentField({ value, onChange }: { readonly value: string; readonly onChange: (value: string) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">내용</label>
      <FieldTextarea id={id} required rows={5} maxLength={FEEDBACK_CONTENT_MAX} value={value} onChange={(event) => onChange(event.target.value)}
        placeholder="예) 지원서 사진을 올리는데 계속 실패해요." data-autofocus="true" />
      <span className="num self-end text-xs text-muted">{value.length}/{FEEDBACK_CONTENT_MAX}</span>
    </div>
  );
}

function ContactField({ value, onChange }: { readonly value: string; readonly onChange: (value: string) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">연락처 <span className="font-normal text-muted">(선택)</span></label>
      <FieldInput id={id} maxLength={FEEDBACK_CONTACT_MAX} value={value} onChange={(event) => onChange(event.target.value)} placeholder="답을 받고 싶으면 이메일이나 전화번호" />
      <p className="text-xs leading-5 text-muted">지금 보고 있는 화면 주소가 함께 전달돼요. 연락처는 답장에만 써요.</p>
    </div>
  );
}

function FeedbackThanks({ onClose }: { readonly onClose: () => void }) {
  return (
    <>
      <DialogHeader id="feedback-title" title="고마워요!" subtitle="보내주신 의견은 팀이 바로 확인하고 서비스에 반영할게요." />
      <DialogFooter><PrimaryButton type="button" data-autofocus="true" onClick={onClose}>닫기</PrimaryButton></DialogFooter>
    </>
  );
}
