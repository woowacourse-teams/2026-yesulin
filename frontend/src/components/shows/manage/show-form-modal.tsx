"use client";

import { useState } from "react";
import { CreateError, CreateField } from "@/components/auditions/create-form";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { PerformanceVenueField } from "@/components/auditions/performance-venue-field";
import { PosterUploadField } from "@/components/auditions/poster-upload-field";
import { FieldInput, FieldTextarea, PrimaryButton, SecondaryButton, SegmentButton } from "@/components/ui/controls";
import { AuditionRequestError } from "@/features/auditions/api-client";
import type { VenueAddress } from "@/features/auditions/creation-types";
import { createShow, updateShow, uploadShowImage } from "@/features/shows/producer-api";
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
const INQUIRY_PHONE_PATTERN = /^\d{2,4}-\d{3,4}(-\d{4})?$/;

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
  const close = useModalClose(onClose, saving);

  const updateImage = (index: number, next: Partial<ImageSlot>) => setImages((current) => current.map(
    (slot, slotIndex) => slotIndex === index ? { ...slot, ...next, fileId: null } : slot,
  ));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = validate();
    if (invalid) {
      setError(invalid);
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

  function validate() {
    if (!title.trim()) return "공연명을 입력해 주세요.";
    if (!genre) return "장르를 선택해 주세요.";
    if (!venueName.trim() || !address.roadAddress.trim()) return "공연 장소명과 주소를 입력해 주세요.";
    const minutes = Number(runningMinutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) return "공연 시간은 1분 이상 1440분 이하로 입력해 주세요.";
    if (!INQUIRY_PHONE_PATTERN.test(inquiryPhone.trim())) return "문의 전화번호를 02-123-4567 형식으로 입력해 주세요.";
    if (!poster.url) return "포스터를 등록해 주세요.";
    return null;
  }

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
      <form noValidate onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 md:px-6">
          {error ? <CreateError message={error} /> : null}
          <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
            <PosterUploadField
              label="포스터 (필수)"
              value={poster.url}
              onChange={(url) => setPoster((current) => ({ ...current, url, fileId: null }))}
              onFileChange={(file) => setPoster((current) => ({ ...current, file }))}
            />
            <div className="min-w-0 space-y-5">
              <CreateField label="공연명" htmlFor="show-title">
                <FieldInput id="show-title" maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 달빛 아래 소극장" data-autofocus="true" />
              </CreateField>
              <fieldset>
                <legend className="mb-2 text-base font-semibold text-muted-strong md:text-sm">장르</legend>
                <div className="inline-flex overflow-hidden rounded-control border border-border">
                  {SHOW_GENRES.map((option) => (
                    <SegmentButton key={option} pressed={genre === option} onClick={() => setGenre(option)} className="min-h-11 px-5">
                      {SHOW_GENRE_LABELS[option]}
                    </SegmentButton>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-5 sm:grid-cols-2">
                <CreateField label="공연 시간 (분)" htmlFor="show-running-minutes">
                  <FieldInput id="show-running-minutes" type="number" inputMode="numeric" min={1} max={1440} value={runningMinutes} onChange={(event) => setRunningMinutes(event.target.value)} placeholder="100" />
                </CreateField>
                <CreateField label="관람 연령 (선택)" htmlFor="show-age-rating">
                  <FieldInput id="show-age-rating" maxLength={50} value={ageRating} onChange={(event) => setAgeRating(event.target.value)} placeholder="예: 8세 이상" />
                </CreateField>
              </div>
              <CreateField label="취소·단체 문의 전화" htmlFor="show-inquiry-phone" hint="관객에게 공개되며, 예매 취소와 11명 이상 단체 관람 문의를 받습니다.">
                <FieldInput id="show-inquiry-phone" type="tel" maxLength={13} value={inquiryPhone} onChange={(event) => setInquiryPhone(event.target.value)} placeholder="02-123-4567" />
              </CreateField>
            </div>
          </div>

          <CreateField label="공연 소개 (선택)" htmlFor="show-description">
            <FieldTextarea id="show-description" rows={5} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="줄거리, 출연진, 입장 안내 등을 적어 주세요." className="resize-y" />
          </CreateField>

          <PerformanceVenueField venue={venueName} address={address} onVenueChange={setVenueName} onAddressChange={setAddress} />

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
        <DialogFooter>
          <SecondaryButton onClick={close} disabled={saving}>취소</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving} aria-busy={saving || undefined}>
            {saving ? "저장 중…" : show ? "수정 저장" : "공연 등록"}
          </PrimaryButton>
        </DialogFooter>
      </form>
    </ModalShell>
  );
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
