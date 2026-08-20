"use client";

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
import { FieldInput, PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { PosterUploadField } from "./poster-upload-field";
import { emptyVenueAddress, PerformanceVenueField } from "./performance-venue-field";

const TITLE_ID = "performance-create-title";
const FORM_ERROR_ID = "performance-create-error";

export function PerformanceCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [venueAddress, setVenueAddress] = useState(emptyVenueAddress);
  const [posterUrl, setPosterUrl] = useState("");
  const [roles, setRoles] = useState<readonly RoleDraft[]>(() => [emptyRoleDraft()]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!posterUrl) {
      setFormError("공연 포스터 이미지를 선택해 주세요.");
      return;
    }
    if (!venueAddress.roadAddress) {
      setFormError("도로명주소 검색으로 공연 장소를 선택해 주세요.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await createPerformance({
        posterUrl,
        title,
        venue,
        venueAddress,
        roles: roles.map((role) => ({
          name: role.name,
          description: role.description,
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
          subtitle="공연 기본 정보와 공고에서 재사용할 배역 이름을 등록합니다."
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-6">
          <CreateSection title="공연 기본 정보">
            <div className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
              <PosterUploadField label="공연 포스터" value={posterUrl} onChange={setPosterUrl} />
              <div className="grid min-w-0 content-start gap-5">
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
                <PerformanceVenueField hideVenueName venue={venue} address={venueAddress} onVenueChange={setVenue} onAddressChange={setVenueAddress} />
              </div>
            </div>
          </CreateSection>

          <CreateSection
            title="배역"
            description="배역 이름과 한 줄 설명만 등록합니다. 지원 조건과 모집 인원은 공고를 만들 때 설정합니다."
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
