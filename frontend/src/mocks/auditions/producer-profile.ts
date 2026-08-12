import type { ProducerProfile, UpdateProducerProfileRequest } from "@/features/auditions/management-types";

let profile: ProducerProfile = {
  companyName: "",
  contactName: "",
  contactRole: "",
  logoUrl: "",
  description: "",
  email: "",
  businessNumber: "",
  representativeName: "",
  verificationStatus: "PENDING",
  verifiedAt: null,
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
