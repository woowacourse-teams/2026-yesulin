import {
  APPLICATION_FIELD_OPTIONS,
  type ApplicationFieldInput,
} from "@/features/auditions/creation-types";

const OTR_VIDEO_REQUIREMENTS = [
  { id: "otr-video-1", description: "영상 1" },
  { id: "otr-video-2", description: "영상 2" },
  { id: "otr-video-3", description: "영상 3" },
] as const;

/** OTR 공고는 공연사가 폼을 편집하지 않고 항상 같은 업계 표준 지원서를 사용한다. */
export function otrApplicationFields(roles: readonly string[]): readonly ApplicationFieldInput[] {
  const roleField: ApplicationFieldInput = {
    id: "SELECTED_ROLE",
    label: "지원 배역",
    enabled: true,
    required: true,
    custom: false,
    section: "BASIC",
    inputType: "SELECT",
    order: 0,
    layout: "FULL",
    config: { options: roles },
  };
  const standardFields = APPLICATION_FIELD_OPTIONS.map<ApplicationFieldInput>((field) => ({
    id: field.key,
    key: field.key,
    label: field.label,
    enabled: true,
    required: field.section === "BASIC",
    custom: false,
    section: field.section,
    inputType: field.inputType,
    order: field.order,
    layout: field.layout,
    config: field.key === "PHOTOS"
      ? { maxCount: 3 }
      : field.key === "VIDEO"
        ? { ...field.config, maxCount: 3, videoRequirements: OTR_VIDEO_REQUIREMENTS }
        : { ...field.config },
  }));
  return [roleField, ...standardFields];
}
