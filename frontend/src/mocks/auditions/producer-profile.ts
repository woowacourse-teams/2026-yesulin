import type { ProducerProfileResource } from "@/features/auditions/backend-resources";
import type { UpdateProducerProfileRequest } from "@/features/auditions/management-types";

let profile: ProducerProfileResource = {
  companyName: "",
  contactName: null,
  contactRole: null,
  description: null,
  email: "",
  phone: "",
  verificationStatus: "ACTIVE",
};

export const producerProfile = (): ProducerProfileResource => structuredClone(profile);

/** 실제 백엔드처럼 전달한 필드만 교체하고 contactRole·description은 빈 값으로 지운다. */
export function patchProducerProfile(body: UpdateProducerProfileRequest): ProducerProfileResource {
  profile = {
    ...profile,
    ...(body.companyName !== undefined ? { companyName: body.companyName.trim() } : {}),
    ...(body.contactName !== undefined ? { contactName: emptyToNull(body.contactName) } : {}),
    ...(body.contactRole !== undefined ? { contactRole: emptyToNull(body.contactRole) } : {}),
    ...(body.description !== undefined ? { description: emptyToNull(body.description) } : {}),
  };
  return producerProfile();
}

export function registerPendingProducer(input: { readonly companyName: string; readonly email: string; readonly phone: string }) {
  registerProducer(input, "PENDING");
}

export function registerActiveProducer(input: { readonly companyName: string; readonly email: string; readonly phone: string }) {
  registerProducer(input, "ACTIVE");
}

function registerProducer(
  input: { readonly companyName: string; readonly email: string; readonly phone: string },
  verificationStatus: ProducerProfileResource["verificationStatus"],
) {
  profile = {
    ...profile,
    companyName: input.companyName.trim(),
    email: input.email.trim(),
    phone: input.phone,
    verificationStatus,
  };
}

function emptyToNull(value: string) {
  const text = value.trim();
  return text || null;
}
