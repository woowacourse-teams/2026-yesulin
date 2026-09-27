"use client";

import { useEffect, useRef, useState } from "react";
import { CreateError, CreateField } from "@/components/auditions/create-form";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { PerformanceVenueField } from "@/components/auditions/performance-venue-field";
import { PosterUploadField } from "@/components/auditions/poster-upload-field";
import { DestructiveButton, FieldInput, FieldTextarea, PrimaryButton, SecondaryButton, SegmentButton } from "@/components/ui/controls";
import { AuditionRequestError } from "@/features/auditions/api-client";
import type { VenueAddress } from "@/features/auditions/creation-types";
import { createShow, updateShow, uploadShowImage } from "@/features/shows/producer-api";
import {
  SHOW_FORM_FIELDS,
  validateShowField,
  validateShowForm,
  type ShowFormErrors,
  type ShowFormField,
  type ShowFormValues,
} from "@/features/shows/show-form";
import {
  MAX_SHOW_IMAGES,
  SHOW_GENRE_LABELS,
  SHOW_GENRES,
  type ProducerShow,
  type SaveShow,
  type ShowGenre,
} from "@/features/shows/types";
import { useModalClose } from "../use-modal-close";

const TITLE_ID = "show-form-title";
const KEEP_WRITING_ID = "show-form-keep-writing";
const FIELD_ERROR_CLASS = "border-fail focus:border-fail focus:ring-fail-bg";

/** 오류 항목에서 포커스를 받을 입력. 공용 포스터·장소 필드는 id를 받지 않아 감싼 영역 안에서 찾는다. */
const FIELD_FOCUS_SELECTOR: Record<ShowFormField, string> = {
  poster: "#show-poster-field input",
  title: "#show-title",
  genre: "#show-genre button",
  runningMinutes: "#show-running-minutes",
  inquiryPhone: "#show-inquiry-phone",
  venue: "#show-venue-field input",
};

/** 이미 저장된 이미지는 fileId를, 새로 고른 이미지는 저장할 때 올릴 파일을 가진다. */
type ImageSlot = { readonly fileId: number | null; readonly url: string; readonly file: File | null };

const EMPTY_SLOT: ImageSlot = { fileId: null, url: "", file: null };

export function ShowFormModal({ show, onClose, onSaved }: {
  readonly show?: ProducerShow;
  readonly onClose: () => void;
  readonly onSaved: (show: ProducerShow) => void;
}) {
  const [title, setTitle] = useState(show?.title ?? "");
  const [genre, setGenre] = useState<ShowGenre | null>(show?.genre ?? null);
  const [description, setDescription] = useState(show?.description ?? "");
  const [venueName, setVenueName] = useState(show?.venue.name ?? "");
  const [address, setAddress] = useState<VenueAddress>(() => ({
    roadAddress: show?.venue.roadAddress ?? "",
    detailAddress: show?.venue.detailAddress ?? "",
    zonecode: show?.venue.zonecode ?? "",
    latitude: show?.venue.latitude ?? null,
    longitude: show?.venue.longitude ?? null,
  }));
  const [runningMinutes, setRunningMinutes] = useState(show ? String(show.runningMinutes) : "");
  const [ageRating, setAgeRating] = useState(show?.ageRating ?? "");
  const [inquiryPhone, setInquiryPhone] = useState(show?.inquiryPhone ?? "");
  const [poster, setPoster] = useState<ImageSlot>(
    show ? { fileId: show.poster.fileId, url: show.poster.url, file: null } : EMPTY_SLOT,
  );
  const [images, setImages] = useState<readonly ImageSlot[]>(() => Array.from(
    { length: MAX_SHOW_IMAGES },
    (_, index) => show?.images[index] ? { fileId: show.images[index].fileId, url: show.images[index].url, file: null } : EMPTY_SLOT,
  ));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<ShowFormErrors>({});
  const [confirmingClose, setConfirmingClose] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const values: ShowFormValues = { posterUrl: poster.url, title, genre, runningMinutes, inquiryPhone, venueName, roadAddress: address.roadAddress };
  // 한 번 오류가 난 항목은 입력할 때마다 다시 검사해, 고치면 바로 오류가 사라진다.
  const fieldError = (field: ShowFormField) => errors[field] ? validateShowField(field, values) ?? undefined : undefined;
  const invalidCount = SHOW_FORM_FIELDS.filter((field) => fieldError(field)).length;
  const snapshot = JSON.stringify({ title, genre, description, venueName, address, runningMinutes, ageRating, inquiryPhone, poster: poster.url, images: images.map((slot) => slot.url) });
  const [initialSnapshot] = useState(snapshot);

  /** 입력한 내용이 있으면 바로 닫지 않고 한 번 더 묻는다. 배경 클릭·Escape·취소가 모두 여기로 온다. */
  const requestClose = () => {
    if (confirmingClose) return;
    if (snapshot === initialSnapshot) {
      onClose();
      return;
    }
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setConfirmingClose(true);
  };
  const close = useModalClose(requestClose, saving);

  useEffect(() => {
    if (confirmingClose) document.getElementById(KEEP_WRITING_ID)?.focus();
  }, [confirmingClose]);

  const keepWriting = () => {
    setConfirmingClose(false);
    const target = returnFocusRef.current;
    requestAnimationFrame(() => {
      const inForm = target?.isConnected && formRef.current?.contains(target);
      (inForm ? target : document.getElementById("show-title"))?.focus();
    });
  };

  const updateImage = (index: number, next: Partial<ImageSlot>) => setImages((current) => current.map(
    (slot, slotIndex) => slotIndex === index ? { ...slot, ...next, fileId: null } : slot,
  ));

  const focusField = (field: ShowFormField) => {
    // 장소명을 적었는데 주소만 비었으면 주소 검색 버튼으로 보낸다.
    const selector = field === "venue" && venueName.trim() ? "#show-venue-field button" : FIELD_FOCUS_SELECTOR[field];
    const element = document.querySelector<HTMLElement>(selector);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "center" });
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmingClose(false);
    const nextErrors = validateShowForm(values);
    setErrors(nextErrors);
    const firstInvalid = SHOW_FORM_FIELDS.find((field) => nextErrors[field]);
    if (firstInvalid) {
      setError("");
      focusField(firstInvalid);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const input: SaveShow = {
        title: title.trim(),
        genre: genre!,
        description: description.trim(),
        venue: { name: venueName.trim(), ...address },
        runningMinutes: Number(runningMinutes),
        ageRating: ageRating.trim(),
        inquiryPhone: inquiryPhone.trim(),
        posterFileId: await fileIdOf(poster),
        imageFileIds: await uploadImages(images),
      };
      onSaved(show ? await updateShow(show.id, input) : await createShow(input));
    } catch (cause) {
      console.error("[무료 공연 저장 실패]", cause);
      setError(cause instanceof AuditionRequestError ? cause.message : "이미지를 올리거나 공연을 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  const describedBy = (field: ShowFormField) => fieldError(field) ? errorId(field) : undefined;
  const inputState = (field: ShowFormField) => ({
    "aria-invalid": fieldError(field) ? true : undefined,
    "aria-describedby": describedBy(field),
    className: fieldError(field) ? FIELD_ERROR_CLASS : "",
  });

  return (
    <ModalShell
      open
      onClose={close}
      labelledBy={TITLE_ID}
      placement="responsiveSheet"
      className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-modal bg-card shadow-[var(--shadow-modal)] md:w-[min(760px,calc(100vw-40px))] md:rounded-modal"
    >
      <DialogHeader
        id={TITLE_ID}
        title={show ? "무료 공연 수정" : "무료 공연 등록"}
        subtitle={show ? "수정한 내용은 공연 페이지에 바로 반영됩니다." : "등록한 공연은 회차를 추가하고 공개해야 관객에게 보입니다."}
      />
      <form ref={formRef} noValidate onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 md:px-6">
          <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
            <div id="show-poster-field" className="min-w-0">
              <PosterUploadField
                label="포스터 (필수)"
                value={poster.url}
                onChange={(url) => setPoster((current) => ({ ...current, url, fileId: null }))}
                onFileChange={(file) => setPoster((current) => ({ ...current, file }))}
              />
              <FieldError field="poster" message={fieldError("poster")} />
            </div>
            <div className="min-w-0 space-y-5">
              <div>
                <CreateField label="공연명" htmlFor="show-title">
                  <FieldInput id="show-title" maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 달빛 아래 소극장" data-autofocus="true" {...inputState("title")} />
                </CreateField>
                <FieldError field="title" message={fieldError("title")} />
              </div>
              <fieldset id="show-genre" aria-describedby={describedBy("genre")}>
                <legend className="mb-2 text-base font-semibold text-muted-strong md:text-sm">장르</legend>
                <div className={`inline-flex overflow-hidden rounded-control border ${fieldError("genre") ? "border-fail" : "border-border"}`}>
                  {SHOW_GENRES.map((option) => (
                    <SegmentButton key={option} pressed={genre === option} onClick={() => setGenre(option)} className="min-h-11 px-5">
                      {SHOW_GENRE_LABELS[option]}
                    </SegmentButton>
                  ))}
                </div>
                <FieldError field="genre" message={fieldError("genre")} />
              </fieldset>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <CreateField label="공연 시간 (분)" htmlFor="show-running-minutes">
                    <FieldInput id="show-running-minutes" type="number" inputMode="numeric" min={1} max={1440} value={runningMinutes} onChange={(event) => setRunningMinutes(event.target.value)} placeholder="100" {...inputState("runningMinutes")} />
                  </CreateField>
                  <FieldError field="runningMinutes" message={fieldError("runningMinutes")} />
                </div>
                <CreateField label="관람 연령 (선택)" htmlFor="show-age-rating">
                  <FieldInput id="show-age-rating" maxLength={50} value={ageRating} onChange={(event) => setAgeRating(event.target.value)} placeholder="예: 8세 이상" />
                </CreateField>
              </div>
              <div>
                <CreateField label="취소·단체 문의 전화" htmlFor="show-inquiry-phone" hint="관객에게 공개되며, 예매 취소와 11명 이상 단체 관람 문의를 받습니다.">
                  <FieldInput id="show-inquiry-phone" type="tel" maxLength={13} value={inquiryPhone} onChange={(event) => setInquiryPhone(event.target.value)} placeholder="02-123-4567" {...inputState("inquiryPhone")} />
                </CreateField>
                <FieldError field="inquiryPhone" message={fieldError("inquiryPhone")} />
              </div>
            </div>
          </div>

          <CreateField label="공연 소개 (선택)" htmlFor="show-description">
            <FieldTextarea id="show-description" rows={5} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="줄거리, 출연진, 입장 안내 등을 적어 주세요." className="resize-y" />
          </CreateField>

          <div id="show-venue-field">
            <PerformanceVenueField venue={venueName} address={address} onVenueChange={setVenueName} onAddressChange={setAddress} />
            <FieldError field="venue" message={fieldError("venue")} />
          </div>

          <fieldset>
            <legend className="mb-2 text-base font-semibold text-muted-strong md:text-sm">상세 이미지 (선택, 최대 {MAX_SHOW_IMAGES}장)</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              {images.map((slot, index) => (
                <PosterUploadField
                  key={index}
                  label={`상세 이미지 ${index + 1}`}
                  variant="detail"
                  required={false}
                  value={slot.url}
                  onChange={(url) => updateImage(index, { url })}
                  onFileChange={(file) => updateImage(index, { file })}
                />
              ))}
            </div>
          </fieldset>
        </div>
        {/* 스크롤 영역 위쪽에 두면 아래에서 저장을 눌렀을 때 보이지 않으므로 버튼 바로 위에 둔다. */}
        <FooterNotice
          confirmingClose={confirmingClose}
          editing={Boolean(show)}
          error={error}
          invalidCount={invalidCount}
        />
        <DialogFooter>
          {confirmingClose ? (
            <>
              <SecondaryButton id={KEEP_WRITING_ID} onClick={keepWriting}>계속 작성</SecondaryButton>
              <DestructiveButton onClick={onClose}>저장하지 않고 닫기</DestructiveButton>
            </>
          ) : (
            <>
              <SecondaryButton onClick={close} disabled={saving}>취소</SecondaryButton>
              <PrimaryButton type="submit" disabled={saving} aria-busy={saving || undefined}>
                {saving ? "저장 중…" : show ? "수정 저장" : "공연 등록"}
              </PrimaryButton>
            </>
          )}
        </DialogFooter>
      </form>
    </ModalShell>
  );
}

function errorId(field: ShowFormField) {
  return `show-form-${field}-error`;
}

function FieldError({ field, message }: { readonly field: ShowFormField; readonly message?: string }) {
  return message ? <p id={errorId(field)} className="mt-2 text-sm font-medium leading-6 text-fail">{message}</p> : null;
}

function FooterNotice({ confirmingClose, editing, error, invalidCount }: {
  readonly confirmingClose: boolean;
  readonly editing: boolean;
  readonly error: string;
  readonly invalidCount: number;
}) {
  if (confirmingClose) {
    return (
      <div className="px-5 pb-3 md:px-6">
        <p role="alert" className="rounded-control border border-border bg-surface px-4 py-3 text-sm leading-6 text-foreground">
          {editing ? "수정한 내용이 저장되지 않았어요. 저장하지 않고 닫을까요?" : "작성 중인 내용이 있어요. 닫으면 입력한 내용이 사라져요."}
        </p>
      </div>
    );
  }
  const message = error || (invalidCount ? `확인이 필요한 항목이 ${invalidCount}개 있어요. 표시한 항목을 고쳐 주세요.` : "");
  return message ? <div className="px-5 pb-3 md:px-6"><CreateError message={message} /></div> : null;
}

async function fileIdOf(slot: ImageSlot): Promise<number> {
  if (slot.file) return uploadShowImage(slot.file);
  if (slot.fileId !== null) return slot.fileId;
  throw new Error("이미지 파일 정보가 없습니다.");
}

/** 비어 있는 칸은 건너뛰고 순서대로 올린다. 여러 장을 동시에 올리지 않아 모바일 업로드 실패를 줄인다. */
async function uploadImages(slots: readonly ImageSlot[]): Promise<number[]> {
  const fileIds: number[] = [];
  for (const slot of slots) {
    if (slot.url) fileIds.push(await fileIdOf(slot));
  }
  return fileIds;
}
