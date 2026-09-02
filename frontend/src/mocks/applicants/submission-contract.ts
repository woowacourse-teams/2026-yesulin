import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import type {
  ApplicantAnswer,
  ApplicantAnswerValue,
  ApplicantSubmissionDetail,
  ApplicantSubmissionSummary,
  CareerEntry,
  EducationInformation,
} from "@/features/applicants/types";
import type {
  BackendSubmissionDetail,
  BackendSubmissionListResponse,
  BackendSubmissionSummary,
} from "@/features/applicants/submission-api";

const BASIC_FIELDS = ["NAME", "HEIGHT", "WEIGHT", "BIRTH", "GENDER", "PHONE", "EMAIL", "ADDRESS"] as const;
const ADDITIONAL_FIELDS = ["SCHOOL", "LINK", "NATIONALITY", "COVER_LETTER", "SPECIALTY", "HOBBIES", "MILITARY", "CAREER"] as const;

export const toBackendSubmissionList = (
  summaries: readonly ApplicantSubmissionSummary[],
): BackendSubmissionListResponse => ({ submissions: summaries.map(toBackendSummary) });

export function toBackendSubmissionDetail(detail: ApplicantSubmissionDetail): BackendSubmissionDetail {
  const fields = detail.applicationFields.filter((field) => field.enabled);
  const answers = new Map(detail.answers.map((answer) => [answer.key, answer]));
  return {
    ...toBackendSummary(detail),
    applicant: {
      basicInformation: {
        name: text(answers.get("NAME")),
        height: number(answers.get("HEIGHT")),
        weight: number(answers.get("WEIGHT")),
        birthDate: text(answers.get("BIRTH")),
        gender: gender(answers.get("GENDER")),
        phone: text(answers.get("PHONE")),
        email: text(answers.get("EMAIL")),
        address: text(answers.get("ADDRESS")),
      },
      additionalInformation: {
        ...education(answers.get("SCHOOL")),
        links: strings(answers.get("LINK")),
        nationality: text(answers.get("NATIONALITY")),
        coverLetter: text(answers.get("COVER_LETTER")),
        specialty: text(answers.get("SPECIALTY")),
        hobbies: text(answers.get("HOBBIES")),
        militaryServiceStatus: military(answers.get("MILITARY")),
        careers: careers(answers.get("CAREER")),
      },
      fieldSnapshot: {
        basicFields: BASIC_FIELDS.filter((key) => fields.some((field) => field.id === key)),
        additionalFields: ADDITIONAL_FIELDS.filter((key) => fields.some((field) => field.id === key)),
      },
      ageAtRecruitmentDeadline: number(answers.get("AGE_AT_RECRUITMENT_DEADLINE")),
    },
    formAnswers: {
      questionAnswers: questionAnswers(detail.answers, fields),
      photoRequirementAnswers: photoAnswers(answers.get("PHOTOS"), fields),
      videoRequirementAnswers: videoAnswers(answers.get("VIDEO"), fields),
    },
  };
}

function education(answer?: ApplicantAnswer): Pick<BackendSubmissionDetail["applicant"]["additionalInformation"], "educationLevel" | "school" | "major"> {
  const value = answer?.value;
  if (!isEducation(value)) return { educationLevel: null, school: null, major: null };
  return { educationLevel: value.level, school: value.school || null, major: value.major || null };
}

function isEducation(value: ApplicantAnswerValue | undefined): value is EducationInformation {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "level" in value && "school" in value && "major" in value;
}

function toBackendSummary(summary: ApplicantSubmissionSummary): BackendSubmissionSummary {
  return {
    submissionId: summary.id,
    auditionId: summary.postingId,
    performanceTitle: summary.performanceTitle,
    auditionTitle: summary.postingTitle,
    companyName: summary.companyName,
    posterUrl: summary.posterUrl,
    submittedAt: summary.submittedAt,
    selectedRoles: summary.selectedRoles.map((role, index) => ({
      roleId: index + 1,
      roleName: role.roleName,
    })),
  };
}

function questionAnswers(answers: readonly ApplicantAnswer[], fields: readonly ApplicationFieldInput[]) {
  const fieldById = new Map(fields.map((field) => [field.id, field]));
  return answers.flatMap((answer, index) => {
    const field = fieldById.get(answer.key);
    if (!field?.custom || answer.key === "AGE_AT_RECRUITMENT_DEADLINE") return [];
    return [{ questionId: index + 1, question: answer.label, answer: String(answer.value) }];
  });
}

function photoAnswers(answer: ApplicantAnswer | undefined, fields: readonly ApplicationFieldInput[]) {
  const values = array(answer?.value);
  const urls = answer?.previewUrls ?? values.map(String);
  const requirements = fields.find((field) => field.id === "PHOTOS")?.config.photoRequirements ?? [];
  const expanded = requirements.flatMap((requirement) => Array.from({ length: requirement.count }, () => requirement));
  return values.map((_, index) => {
    const requirement = expanded[index] ?? { id: String(index + 1), description: `제출 사진 ${index + 1}` };
    return {
      photoRequirementId: index + 1,
      requirementDescription: requirement.description,
      fileId: index + 1,
      url: urls[index] ?? String(values[index]),
    };
  });
}

function videoAnswers(answer: ApplicantAnswer | undefined, fields: readonly ApplicationFieldInput[]) {
  const urls = strings(answer);
  const requirements = fields.find((field) => field.id === "VIDEO")?.config.videoRequirements ?? [];
  return urls.map((url, index) => ({
    videoRequirementId: index + 1,
    requirementDescription: requirements[index]?.description ?? `제출 영상 ${index + 1}`,
    url,
  }));
}

function text(answer?: ApplicantAnswer): string | null {
  return typeof answer?.value === "string" && answer.value ? answer.value : null;
}

function number(answer?: ApplicantAnswer): number | null {
  return typeof answer?.value === "number" && Number.isFinite(answer.value) ? answer.value : null;
}

function strings(answer?: ApplicantAnswer): readonly string[] {
  if (typeof answer?.value === "string") return answer.value ? [answer.value] : [];
  return array(answer?.value).filter((value): value is string => typeof value === "string");
}

function array(value?: ApplicantAnswerValue): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function gender(answer?: ApplicantAnswer): "MALE" | "FEMALE" | null {
  if (answer?.value === "남성" || answer?.value === "MALE") return "MALE";
  if (answer?.value === "여성" || answer?.value === "FEMALE") return "FEMALE";
  return null;
}

function military(answer?: ApplicantAnswer): "COMPLETED" | "NOT_COMPLETED" | "NOT_APPLICABLE" | null {
  if (answer?.value === "군필") return "COMPLETED";
  if (answer?.value === "미필") return "NOT_COMPLETED";
  if (answer?.value === "해당 없음") return "NOT_APPLICABLE";
  return null;
}

function careers(answer?: ApplicantAnswer) {
  return array(answer?.value).flatMap((value) => isCareer(value)
    ? [{ year: value.year, title: value.title, roleName: value.part }]
    : []);
}

function isCareer(value: unknown): value is CareerEntry {
  return typeof value === "object" && value !== null && "year" in value && "title" in value && "part" in value;
}
