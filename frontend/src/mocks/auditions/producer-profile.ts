import type { ProducerProfile, UpdateProducerProfileRequest } from "@/features/auditions/management-types";

let profile: ProducerProfile = {
  companyName: "",
  contactName: "",
  contactRole: "",
  logoUrl: "",
  description: "",
  email: "",
  phone: "",
  verificationStatus: "ACTIVE",
  verifiedAt: "2026-08-01T00:00:00.000Z",
};

export const producerProfile = () => structuredClone(profile);

export function patchProducerProfile(body: UpdateProducerProfileRequest) {
  profile = {
    ...profile,
    ...(body.companyName !== undefined ? { companyName: body.companyName.trim() } : {}),
    ...(body.contactName !== undefined ? { contactName: body.contactName.trim() } : {}),
    ...(body.contactRole !== undefined ? { contactRole: body.contactRole.trim() } : {}),
    ...(body.description !== undefined ? { description: body.description.trim() } : {}),
  };
  return producerProfile();
}

export function registerPendingProducer(input: { readonly companyName: string; readonly email: string; readonly phone: string }) {
  profile = {
    ...profile,
    companyName: input.companyName.trim(),
    email: input.email.trim(),
    phone: input.phone,
    verificationStatus: "PENDING",
    verifiedAt: null,
  };
}
