import { request } from "./api-client";
import type { AuditionFormResource } from "./backend-resources";
import { defaultApplicationFields, type CreatePostingRequest } from "./creation-types";

export function saveV1ApplicationForm(auditionId: string, body: CreatePostingRequest) {
  const enabled = body.applicationFields.filter((field) => field.enabled);
  const photos = enabled.find((field) => field.id === "PHOTOS")?.config.photoRequirements ?? [];
  const videos = enabled.find((field) => field.id === "VIDEO")?.config.videoRequirements ?? [];
  return request(`/v1/auditions/${auditionId}/application-form`, {
    method: "PUT",
    body: JSON.stringify({
      basicFields: enabled.filter((field) => field.section === "BASIC").map((field) => field.key),
      additionalFields: enabled.filter((field) => field.section === "ADDITIONAL").map((field) => field.key),
      photoRequirements: photos.map((photo) => ({
        requirementId: null, description: photo.description, count: photo.count,
      })),
      videoRequirements: videos.map((video) => ({ requirementId: null, description: video.description })),
      additionalQuestions: enabled.filter((field) => field.custom)
        .map((field) => ({ questionId: null, question: field.label, required: field.required })),
    }),
  });
}

export function toApplicationFields(form: AuditionFormResource | null) {
  const basic = new Set(form?.basicFields ?? []);
  const additional = new Set(form?.additionalFields ?? []);
  const fields = defaultApplicationFields().map((field) => {
    const key = field.key ?? "";
    if (field.section === "BASIC") return { ...field, enabled: basic.has(key), required: basic.has(key) };
    if (field.section === "ADDITIONAL") return { ...field, enabled: additional.has(key), required: false };
    if (field.id === "PHOTOS") return {
      ...field,
      enabled: Boolean(form?.photoRequirements.length),
      config: {
        ...field.config,
        photoRequirements: form?.photoRequirements.map((item) => ({
          id: String(item.id), description: item.description, count: item.count,
        })) ?? [],
      },
    };
    if (field.id === "VIDEO") return {
      ...field,
      enabled: Boolean(form?.videoRequirements.length),
      config: {
        ...field.config,
        videoRequirements: form?.videoRequirements.map((item) => ({
          id: String(item.id), description: item.description,
        })) ?? [],
      },
    };
    return field;
  });
  const questions = form?.additionalQuestions.map((item) => ({
    id: `question-${item.id}`,
    label: item.question,
    enabled: true,
    required: item.required,
    custom: true,
    section: "CUSTOM" as const,
    inputType: "TEXTAREA" as const,
    order: item.order * 10,
    layout: "FULL" as const,
    config: { placeholder: "답변을 입력해 주세요.", maxLength: item.answerMaxLength },
  })) ?? [];
  return [...fields, ...questions];
}
