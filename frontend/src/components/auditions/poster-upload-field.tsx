"use client";

import Image from "next/image";
import { useState } from "react";
import { CreateError } from "./create-form";

const MAX_POSTER_SIZE_BYTES = 30 * 1024 * 1024;

export function PosterUploadField({
  label,
  value,
  onChange,
  onFileChange,
  required = true,
  variant = "poster",
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onFileChange?: (file: File | null) => void;
  readonly required?: boolean;
  readonly variant?: "poster" | "detail";
}) {
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const selectPoster = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 포스터로 등록할 수 있습니다.");
      return;
    }
    if (file.size > MAX_POSTER_SIZE_BYTES) {
      setError("포스터 이미지는 30MB 이하로 선택해 주세요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange(String(reader.result ?? ""));
      onFileChange?.(file);
      setFileName(file.name);
      setError("");
    };
    reader.onerror = () => setError("포스터 이미지를 읽지 못했습니다.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-w-0">
      <span className="mb-1.5 block text-sm font-semibold text-muted-strong">{label}</span>
      <label className={`group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-control border border-dashed border-muted-soft bg-surface text-center transition-[border-color,background-color] hover:border-brand hover:bg-brand-soft ${variant === "poster" ? "aspect-[3/4]" : "aspect-video"}`}>
        {value ? <Image src={value} alt={`${label} 미리보기`} fill unoptimized className={variant === "poster" ? "object-cover" : "object-contain"} /> : <span className="px-3 text-sm font-semibold text-muted-strong group-hover:text-brand"><span aria-hidden="true" className="mb-1 block text-xl leading-none">＋</span>이미지 선택</span>}
        {value ? <span className="absolute inset-x-2 bottom-2 rounded-lg bg-foreground/80 px-3 py-2 text-xs font-semibold text-white shadow-[var(--shadow-1)] backdrop-blur-sm">클릭하여 이미지 변경</span> : null}
        <input
          type="file"
          aria-label={`${label} 이미지 선택`}
          aria-required={required}
          aria-invalid={error ? true : undefined}
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => selectPoster(event.target.files?.[0])}
          className="sr-only"
        />
      </label>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {fileName ? <span className="min-w-0 flex-1 truncate text-sm text-muted">{fileName}</span> : <span className="text-sm text-muted">JPG, PNG, WEBP · 최대 30MB</span>}
        {!required && value ? <button type="button" onClick={() => { onChange(""); onFileChange?.(null); setFileName(""); setError(""); }} className="text-xs font-semibold text-fail hover:underline">이미지 제거</button> : null}
      </div>
      {fileName ? <span className="mt-1 block text-xs text-muted">JPG, PNG, WEBP · 최대 30MB</span> : null}
      <CreateError message={error} />
    </div>
  );
}
