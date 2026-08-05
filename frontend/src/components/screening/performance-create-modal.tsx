"use client";

import Image from "next/image";
import { useState } from "react";
import { createPerformance } from "@/features/screening/api";
import { notifyScreeningTreeChanged } from "@/features/screening/events";
import { errorMessage } from "@/features/screening/use-screening-query";
import { CreateError, CreateField, CreateSection, createInputClass } from "./create-form";
import {
  DialogFooter,
  DialogHeader,
  ModalShell,
  dialogButton,
  dialogPrimaryButton,
} from "./modal-shell";
import { emptyRoleDraft, PerformanceRoleEditor, type RoleDraft } from "./performance-role-editor";

const TITLE_ID = "performance-create-title";
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
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!posterUrl) {
      setError("공연 포스터 이미지를 선택해 주세요.");
      return;
    }
    setSaving(true);
    setError("");
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
      notifyScreeningTreeChanged();
      onCreated();
      onClose();
    } catch (cause: unknown) {
      setError(errorMessage(cause, "공연을 추가하지 못했습니다."));
    } finally {
      setSaving(false);
    }
  };

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
      setPosterUrl(String(reader.result ?? ""));
      setPosterName(file.name);
      setError("");
    };
    reader.onerror = () => setError("포스터 이미지를 읽지 못했습니다.");
    reader.readAsDataURL(file);
  };

  return (
    <ModalShell
      open
      onClose={onClose}
      labelledBy={TITLE_ID}
      className="flex max-h-[92vh] w-[min(760px,94vw)] flex-col overflow-hidden rounded-[12px] bg-card shadow-[0_20px_60px_rgba(0,0,0,0.24)]"
    >
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <DialogHeader
          id={TITLE_ID}
          title="새 공연 추가"
          subtitle="공연의 기본 정보와 공고에서 재사용할 배역 조건을 먼저 등록합니다."
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-[22px] py-5">
          <CreateSection title="공연 기본 정보">
            <div className="grid gap-4 md:grid-cols-[150px_1fr]">
              <div className="min-w-0">
                <span className="mb-1.5 block text-[12.5px] font-semibold text-muted-strong">공연 포스터</span>
                <label className="group relative flex aspect-[3/4] cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-muted-soft bg-surface text-center hover:border-brand-line hover:bg-brand-soft">
                  {posterUrl ? (
                    <Image src={posterUrl} alt="선택한 공연 포스터 미리보기" fill unoptimized className="object-cover" />
                  ) : (
                    <span className="px-3 text-[12px] font-semibold text-muted-strong group-hover:text-brand">
                      이미지 선택
                    </span>
                  )}
                  <input
                    required={!posterUrl}
                    type="file"
                    aria-label="공연 포스터 이미지 선택"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => selectPoster(event.target.files?.[0])}
                    className="sr-only"
                  />
                </label>
                {posterName ? <span className="block truncate text-[10.5px] text-muted">{posterName}</span> : null}
                <span className="mt-1.5 block text-[11.5px] text-muted">JPG, PNG, WEBP · 최대 30MB</span>
              </div>
              <div className="grid content-start gap-3">
                <CreateField label="공연 제목">
                <input
                  autoFocus
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="예: 뮤지컬 <여름의 끝>"
                  className={createInputClass}
                />
                </CreateField>
                <CreateField label="공연 장소">
                <input
                  required
                  value={venue}
                  onChange={(event) => setVenue(event.target.value)}
                  placeholder="예: 대학로예술극장"
                  className={createInputClass}
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
          <CreateError message={error} />
        </div>
        <DialogFooter>
          <button type="button" onClick={onClose} className={dialogButton}>취소</button>
          <button type="submit" disabled={saving} className={`${dialogPrimaryButton} disabled:opacity-50`}>
            {saving ? "추가 중..." : "공연 추가"}
          </button>
        </DialogFooter>
      </form>
    </ModalShell>
  );
}
