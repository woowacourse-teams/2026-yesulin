import { defaultApplicationFields, type ApplicationFieldInput } from "@/features/auditions/creation-types";
import { submissionId, type SubmissionId } from "@/features/auditions/types";
import type {
  ApplicantAnswer,
  ApplicantSubmissionDetail,
  ApplicantSubmissionListResponse,
  ApplicantSubmissionSummary,
  CareerEntry,
} from "./types";
import { applicantRequest } from "./request";

type BasicField = "NAME" | "HEIGHT" | "WEIGHT" | "BIRTH" | "GENDER" | "PHONE" | "EMAIL" | "ADDRESS";
type AdditionalField = "SCHOOL" | "LINK" | "NATIONALITY" | "COVER_LETTER" | "SPECIALTY" | "HOBBIES" | "MILITARY" | "CAREER";

export type BackendSubmissionSummary = {
  readonly submissionId: string;
  readonly auditionId: string;
  readonly performanceTitle: string;
  readonly auditionTitle: string;
  readonly companyName: string;
  readonly posterUrl: string;
  readonly submittedAt: string;
  readonly selectedRoles: readonly { readonly roleId: number; readonly roleName: string }[];
};

export type BackendSubmissionListResponse = {
  readonly submissions: readonly BackendSubmissionSummary[];
};

export type BackendSubmissionDetail = BackendSubmissionSummary & {
  readonly applicant: {
    readonly basicInformation: {
      readonly name: string | null;
      readonly height: number | null;
      readonly weight: number | null;
      readonly birthDate: string | null;
      readonly gender: "MALE" | "FEMALE" | null;
      readonly phone: string | null;
      readonly email: string | null;
      readonly address: string | null;
    };
    readonly additionalInformation: {
      readonly school: string | null;
      readonly links: readonly string[];
      readonly nationality: string | null;
      readonly coverLetter: string | null;
      readonly specialty: string | null;
      readonly hobbies: string | null;
      readonly militaryServiceStatus: "COMPLETED" | "NOT_COMPLETED" | "NOT_APPLICABLE" | null;
      readonly careers: readonly { readonly year: number; readonly title: string; readonly roleName: string }[];
    };
    readonly fieldSnapshot: {
      readonly basicFields: readonly BasicField[];
      readonly additionalFields: readonly AdditionalField[];
    };
    readonly ageAtRecruitmentDeadline: number | null;
  };
  readonly formAnswers: {
    readonly questionAnswers: readonly {
      readonly questionId: number;
      readonly question: string;
      readonly answer: string;
    }[];
    readonly photoRequirementAnswers: readonly {
      readonly photoRequirementId: number;
      readonly requirementDescription: string;
      readonly fileId: number;
      readonly url: string;
    }[];
    readonly videoRequirementAnswers: readonly {
      readonly videoRequirementId: number;
      readonly requirementDescription: string;
      readonly url: string;
    }[];
  };
};

const standardFields = new Map(defaultApplicationFields().map((field) => [field.id, field]));

export async function getApplicantSubmissions(): Promise<ApplicantSubmissionListResponse> {
  const response = await applicantRequest<BackendSubmissionListResponse>("/v1/applicants/me/submissions");
  return { submissions: response.submissions.map(toSummary) };
}

export async function getApplicantSubmission(id: SubmissionId): Promise<ApplicantSubmissionDetail> {
  const response = await applicantRequest<BackendSubmissionDetail>(
    `/v1/applicants/me/submissions/${encodeURIComponent(id)}`,
  );
  return toDetail(response);
}

function toSummary(resource: BackendSubmissionSummary): ApplicantSubmissionSummary {
  return {
    id: submissionId(resource.submissionId),
    postingId: resource.auditionId,
    performanceTitle: resource.performanceTitle,
    postingTitle: resource.auditionTitle,
    posterUrl: resource.posterUrl,
    companyName: resource.companyName,
    submittedAt: resource.submittedAt,
    selectedRoles: resource.selectedRoles.map((role) => ({
      roleId: String(role.roleId),
      roleName: role.roleName,
    })),
  };
}

function toDetail(resource: BackendSubmissionDetail): ApplicantSubmissionDetail {
  const summary = toSummary(resource);
  const fields: ApplicationFieldInput[] = [];
  const answers: ApplicantAnswer[] = [];
  for (const key of resource.applicant.fieldSnapshot.basicFields) {
    addStandardField(fields, answers, key, basicValue(resource, key));
  }
  for (const key of resource.applicant.fieldSnapshot.additionalFields) {
    addStandardField(fields, answers, key, additionalValue(resource, key));
  }
  addAgeAtDeadline(resource, fields, answers);
  addQuestionAnswers(resource, fields, answers);
  addPhotoAnswers(resource, fields, answers);
  addVideoAnswers(resource, fields, answers);
  return { ...summary, answers, applicationFields: fields };
}

function addStandardField(
  fields: ApplicationFieldInput[],
  answers: ApplicantAnswer[],
  key: BasicField | AdditionalField,
  value: ApplicantAnswer["value"],
) {
  const definition = standardFields.get(key);
  if (!definition) return;
  fields.push({ ...definition, enabled: true });
  answers.push({ key, label: definition.label, value });
}

function addAgeAtDeadline(
  resource: BackendSubmissionDetail,
  fields: ApplicationFieldInput[],
  answers: ApplicantAnswer[],
) {
  const age = resource.applicant.ageAtRecruitmentDeadline;
  if (age === null) return;
  fields.push(field("AGE_AT_RECRUITMENT_DEADLINE", "모집 마감일 기준 만 나이", "BASIC", "NUMBER", 90));
  answers.push({ key: "AGE_AT_RECRUITMENT_DEADLINE", label: "모집 마감일 기준 만 나이", value: age });
}

function addQuestionAnswers(
  resource: BackendSubmissionDetail,
  fields: ApplicationFieldInput[],
  answers: ApplicantAnswer[],
) {
  resource.formAnswers.questionAnswers.forEach((answer, index) => {
    const key = `question-${answer.questionId}`;
    fields.push(field(key, answer.question, "CUSTOM", "TEXTAREA", index));
    answers.push({ key, label: answer.question, value: answer.answer, custom: true });
  });
}

function addPhotoAnswers(
  resource: BackendSubmissionDetail,
  fields: ApplicationFieldInput[],
  answers: ApplicantAnswer[],
) {
  const photos = resource.formAnswers.photoRequirementAnswers;
  if (!photos.length) return;
  const requirements = new Map<number, { id: string; description: string; count: number }>();
  photos.forEach((photo) => {
    const current = requirements.get(photo.photoRequirementId);
    requirements.set(photo.photoRequirementId, {
      id: String(photo.photoRequirementId),
      description: photo.requirementDescription,
      count: (current?.count ?? 0) + 1,
    });
  });
  fields.push({
    ...field("PHOTOS", "제출 사진", "MATERIALS", "FILE", 10),
    config: { maxCount: photos.length, photoRequirements: [...requirements.values()] },
  });
  answers.push({
    key: "PHOTOS",
    label: "제출 사진",
    value: photos.map((photo) => String(photo.fileId)),
    previewUrls: photos.map((photo) => photo.url),
  });
}

function addVideoAnswers(
  resource: BackendSubmissionDetail,
  fields: ApplicationFieldInput[],
  answers: ApplicantAnswer[],
) {
  const videos = resource.formAnswers.videoRequirementAnswers;
  if (!videos.length) return;
  fields.push({
    ...field("VIDEO", "제출 영상", "MATERIALS", "URL", 20),
    config: {
      maxCount: videos.length,
      videoRequirements: videos.map((video) => ({
        id: String(video.videoRequirementId),
        description: video.requirementDescription,
      })),
    },
  });
  answers.push({ key: "VIDEO", label: "제출 영상", value: videos.map((video) => video.url) });
}

function field(
  id: string,
  label: string,
  section: ApplicationFieldInput["section"],
  inputType: ApplicationFieldInput["inputType"],
  order: number,
): ApplicationFieldInput {
  return { id, label, enabled: true, required: false, custom: true, section, inputType, order, layout: "FULL", config: {} };
}

function basicValue(resource: BackendSubmissionDetail, key: BasicField): ApplicantAnswer["value"] {
  const basic = resource.applicant.basicInformation;
  const values = {
    NAME: basic.name ?? "",
    HEIGHT: basic.height ?? 0,
    WEIGHT: basic.weight ?? 0,
    BIRTH: basic.birthDate ?? "",
    GENDER: basic.gender === "MALE" ? "남성" : basic.gender === "FEMALE" ? "여성" : "",
    PHONE: basic.phone ?? "",
    EMAIL: basic.email ?? "",
    ADDRESS: basic.address ?? "",
  } satisfies Record<BasicField, ApplicantAnswer["value"]>;
  return values[key];
}

function additionalValue(resource: BackendSubmissionDetail, key: AdditionalField): ApplicantAnswer["value"] {
  const additional = resource.applicant.additionalInformation;
  const military = additional.militaryServiceStatus;
  const careers: CareerEntry[] = additional.careers.map((career) => ({
    year: career.year,
    title: career.title,
    part: career.roleName,
  }));
  const values = {
    SCHOOL: additional.school ?? "",
    LINK: additional.links,
    NATIONALITY: additional.nationality ?? "",
    COVER_LETTER: additional.coverLetter ?? "",
    SPECIALTY: additional.specialty ?? "",
    HOBBIES: additional.hobbies ?? "",
    MILITARY: military === "COMPLETED" ? "군필" : military === "NOT_COMPLETED" ? "미필" : military === "NOT_APPLICABLE" ? "해당 없음" : "",
    CAREER: careers,
  } satisfies Record<AdditionalField, ApplicantAnswer["value"]>;
  return values[key];
}
