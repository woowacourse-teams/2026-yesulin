import type { ApplicationFieldInput, ApplicationFieldSection, ApplicationInputType } from "@/features/auditions/creation-types";
import { postingId } from "@/features/auditions/types";
import { applicationDocuments } from "./application-form";
import type { PublicPosting, PublicRole } from "./public-posting";

export type PublicPostingApiResponse = {
  readonly id: number;
  readonly performance: {
    readonly id: number;
    readonly title: string;
    readonly venue: string | null;
    readonly posterUrl: string | null;
  };
  readonly company: { readonly id: number; readonly name: string };
  readonly title: string;
  readonly status: PublicPosting["status"];
  readonly allowsMultipleRoles: boolean;
  readonly recruitmentStartsAt: string;
  readonly recruitmentEndsAt: string;
  readonly applicationGuide: string | null;
  readonly roles: readonly {
    readonly id: number;
    readonly name: string;
    readonly description: string | null;
    readonly quota: number | null;
    readonly genderCondition: PublicRole["gender"] | null;
    readonly ageMin: number | null;
    readonly ageMax: number | null;
  }[];
  readonly applicationFields: readonly {
    readonly id: number;
    readonly key: string;
    readonly label: string;
    readonly required: boolean;
    readonly custom: boolean;
    readonly section: string;
    readonly inputType: string;
    readonly order: number;
    readonly config: Readonly<Record<string, unknown>>;
  }[];
};

function toField(field: PublicPostingApiResponse["applicationFields"][number]): ApplicationFieldInput {
  const config = field.config as ApplicationFieldInput["config"];
  return {
    id: field.key,
    label: field.label,
    enabled: true,
    required: field.required,
    custom: field.custom,
    section: field.section as ApplicationFieldSection,
    inputType: field.inputType as ApplicationInputType,
    order: field.order,
    layout: "FULL",
    config,
  };
}

export function toPublicPosting(response: PublicPostingApiResponse): PublicPosting {
  const fields = response.applicationFields.map(toField);
  return {
    id: postingId(String(response.id)),
    performanceTitle: response.performance.title,
    title: response.title,
    posterUrl: response.performance.posterUrl ?? "",
    venue: response.performance.venue ?? "",
    companyName: response.company.name,
    companyDescription: "",
    recruitmentStart: response.recruitmentStartsAt,
    recruitmentEnd: response.recruitmentEndsAt,
    status: response.status,
    allowsMultipleRoles: response.allowsMultipleRoles,
    roles: response.roles.map((role) => ({
      id: String(role.id),
      name: role.name,
      description: role.description ?? "",
      quota: role.quota ?? 1,
      gender: role.genderCondition ?? "ANY",
      ageMin: role.ageMin ?? 0,
      ageMax: role.ageMax ?? 150,
    })),
    schedule: [{ title: "접수 마감", detail: response.recruitmentEndsAt }],
    documents: applicationDocuments(fields),
    applicationFields: fields,
    notice: response.applicationGuide ?? "",
  };
}
