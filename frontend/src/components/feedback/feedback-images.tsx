"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { PiImageSquare, PiX } from "react-icons/pi";
import { FEEDBACK_IMAGE_MAX, FEEDBACK_IMAGE_MAX_BYTES } from "@/features/feedback/types";

type AttachedImage = { readonly id: number; readonly blob: Blob; readonly previewUrl: string };

const TOO_LARGE = "사진이 너무 커요. 다른 사진을 골라 주세요.";
const UNREADABLE = "이 사진은 열 수 없어요. JPG나 PNG로 다시 골라 주세요.";

/** 고른 사진을 긴 변 1600px JPEG로 줄여 붙인다. 줄이는 모듈은 사진을 고를 때 불러온다. */
export function useFeedbackImages() {
  const [images, setImages] = useState<readonly AttachedImage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const nextId = useRef(1);
  const latest = useRef(images);
  useEffect(() => { latest.current = images; }, [images]);
  useEffect(() => () => latest.current.forEach(image => URL.revokeObjectURL(image.previewUrl)), []);
  const add = async (files: readonly File[]) => {
    setError("");
    setProcessing(true);
    const attached = await shrinkAll(files.slice(0, FEEDBACK_IMAGE_MAX - images.length), setError);
    setImages(current => [...current, ...attached.map(blob => ({ id: nextId.current++, blob, previewUrl: URL.createObjectURL(blob) }))]);
    setProcessing(false);
  };
  const remove = (id: number) => setImages(current => current.filter(image => keepOrRevoke(image, id)));
  return { images, processing, error, add, remove, blobs: images.map(image => image.blob) };
}

async function shrinkAll(files: readonly File[], onError: (message: string) => void): Promise<Blob[]> {
  const { shrinkPhoto } = await import("@/features/companies/photo-image");
  const blobs: Blob[] = [];
  for (const file of files) {
    const blob = await shrinkPhoto(file).catch(() => null);
    if (!blob) { onError(UNREADABLE); continue; }
    if (blob.size > FEEDBACK_IMAGE_MAX_BYTES) { onError(TOO_LARGE); continue; }
    blobs.push(blob);
  }
  return blobs;
}

function keepOrRevoke(image: AttachedImage, removedId: number) {
  if (image.id !== removedId) return true;
  URL.revokeObjectURL(image.previewUrl);
  return false;
}

type FieldProps = { readonly state: ReturnType<typeof useFeedbackImages>; readonly disabled: boolean };

export function FeedbackImageField({ state, disabled }: FieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const full = state.images.length >= FEEDBACK_IMAGE_MAX;
  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length) void state.add(files);
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">사진 <span className="font-normal text-muted">(선택, 최대 {FEEDBACK_IMAGE_MAX}장)</span></span>
      <div className="flex flex-wrap gap-2">
        {state.images.map((image, index) => <ImageThumb key={image.id} url={image.previewUrl} order={index + 1} onRemove={() => state.remove(image.id)} />)}
        {!full && <button type="button" className="feedback-image-add" disabled={disabled || state.processing} onClick={() => input.current?.click()}>
          <PiImageSquare size={20} aria-hidden="true" /><span>{addLabel(state.processing)}</span>
        </button>}
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={choose} />
      {state.error && <p role="alert" className="text-xs text-fail">{state.error}</p>}
      <p className="text-xs leading-5 text-muted">화면 캡처를 붙이면 더 빨리 확인할 수 있어요. 이름·연락처 같은 개인정보는 가려 주세요.</p>
    </div>
  );
}

function addLabel(processing: boolean) {
  if (processing) return "줄이는 중…";
  return "사진 추가";
}

function ImageThumb({ url, order, onRemove }: { readonly url: string; readonly order: number; readonly onRemove: () => void }) {
  return (
    <span className="feedback-image-thumb">
      {/* eslint-disable-next-line @next/next/no-img-element -- 브라우저 안의 미리보기 주소라 이미지 최적화를 거치지 않는다. */}
      <img src={url} alt={`첨부한 사진 ${order}`} />
      <button type="button" onClick={onRemove} aria-label={`첨부한 사진 ${order} 빼기`}><PiX size={14} aria-hidden="true" /></button>
    </span>
  );
}
