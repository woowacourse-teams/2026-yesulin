"use client";

import Image from "next/image";
import { useState } from "react";
import { createPerformance } from "@/features/auditions/api";
import { notifyAuditionTreeChanged } from "@/features/auditions/events";
import { errorMessage } from "@/features/auditions/use-audition-query";
import { CreateError, CreateField, CreateSection } from "./create-form";
import {
  DialogFooter,
  DialogHeader,
  ModalShell,
} from "./modal-shell";
import { emptyRoleDraft, PerformanceRoleEditor, type RoleDraft } from "./performance-role-editor";
import { FieldInput, PrimaryButton, SecondaryButton } from "./ui-controls";

const TITLE_ID = "performance-create-title";
const POSTER_HELP_ID = "performance-poster-help";
const POSTER_ERROR_ID = "performance-poster-error";
const FORM_ERROR_ID = "performance-create-error";
const MAX_POSTER_SIZE_BYTES = 30 * 1024 * 1024;

export function PerformanceCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [posterName, setPosterName] = useState("");
  const [roles, setRoles] = useState<readonly RoleDraft[]>(() => [emptyRoleDraft()]);
  const [saving, setSaving] = useState(false);
  const [posterError, setPosterError] = useState("");
  const [formError, setFormError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!posterUrl) {
      setPosterError("공연 포스터 이미지를 선택해 주세요.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await createPerformance({
        posterUrl,
        title,
        venue,
        roles: roles.map((role) => ({
          name: role.name,
          description: role.description,
          gender: role.gender,
          ageMin: role.ageMin,
          ageMax: role.ageMax,
        })),
      });
      notifyAuditionTreeChanged();
      onCreated();
      onClose();
    } catch (cause: unknown) {
      setFormError(errorMessage(cause, "공연을 추가하지 못했습니다."));
    } finally {
      setSaving(false);
    }
  };

  const selectPoster = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPosterError("이미지 파일만 포스터로 등록할 수 있습니다.");
      return;
    }
    if (file.size > MAX_POSTER_SIZE_BYTES) {
      setPosterError("포스터 이미지는 30MB 이하로 선택해 주세요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPosterUrl(String(reader.result ?? ""));
      setPosterName(file.name);
      setPosterError("");
    };
    reader.onerror = () => setPosterError("포스터 이미지를 읽지 못했습니다.");
    reader.readAsDataURL(file);
  };

  return (
    <ModalShell
      open
      onClose={onClose}
      labelledBy={TITLE_ID}
      placement="responsiveSheet"
      className="flex h-[calc(100dvh-8px)] w-full flex-col overflow-hidden rounded-t-modal bg-card shadow-[var(--shadow-modal)] md:h-auto md:max-h-[92vh] md:w-[min(760px,94vw)] md:rounded-modal"
    >
      <form
        onSubmit={submit}
        aria-describedby={formError ? FORM_ERROR_ID : undefined}
        className="flex min-h-0 flex-1 flex-col"
      >
        <DialogHeader
          id={TITLE_ID}
          title="새 공연 추가"
          subtitle="공연의 기본 정보와 공고에서 재사용할 배역 조건을 먼저 등록합니다."
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-6">
          <CreateSection title="공연 기본 정보">
            <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 md:grid-cols-[150px_1fr]">
              <div className="min-w-0">
                <span className="mb-1.5 block text-sm font-semibold text-muted-strong">공연 포스터</span>
                <label className="group relative flex aspect-[3/4] cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-muted-soft bg-surface text-center hover:border-brand-line hover:bg-brand-soft">
                  {posterUrl ? (
                    <Image src={posterUrl} alt="선택한 공연 포스터 미리보기" fill unoptimized className="object-cover" />
                  ) : (
                    <span className="px-3 text-[12px] font-semibold text-muted-strong group-hover:text-brand">
                      이미지 선택
                    </span>
                  )}
                  <input
                    type="file"
                    aria-label="공연 포스터 이미지 선택"
                    aria-required="true"
                    aria-invalid={posterError ? true : undefined}
                    aria-describedby={`${POSTER_HELP_ID}${posterError ? ` ${POSTER_ERROR_ID}` : ""}`}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => selectPoster(event.target.files?.[0])}
                    className="sr-only"
                  />
                </label>
                {posterName ? <span className="block truncate text-sm text-muted">{posterName}</span> : null}
                <span id={POSTER_HELP_ID} className="mt-1.5 block text-sm text-muted">
                  JPG, PNG, WEBP · 최대 30MB
                </span>
                <CreateError id={POSTER_ERROR_ID} message={posterError} />
              </div>
              <div className="grid content-start gap-3">
                <CreateField label="공연 제목">
                <FieldInput
                  data-autofocus="true"
                  required
                  name="performanceTitle"
                  autoComplete="off"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="예: 뮤지컬 <여름의 끝>"
                />
                </CreateField>
                <CreateField label="공연 장소">
                <FieldInput
                  required
                  name="performanceVenue"
                  autoComplete="off"
                  value={venue}
                  onChange={(event) => setVenue(event.target.value)}
                  placeholder="예: 대학로예술극장"
                />
                </CreateField>
              </div>
            </div>
          </CreateSection>

          <CreateSection
            title="배역과 지원 조건"
            description="공고를 만들 때 여기서 등록한 배역을 선택하고 모집 인원을 정합니다."
          >
            <PerformanceRoleEditor roles={roles} onChange={setRoles} />
          </CreateSection>
          <CreateError id={FORM_ERROR_ID} message={formError} />
        </div>
        <DialogFooter>
          <SecondaryButton onClick={onClose}>취소</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "추가 중…" : "공연 추가"}
          </PrimaryButton>
        </DialogFooter>
      </form>
    </ModalShell>
  );
}
