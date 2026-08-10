import type { ProducerProfile, UpdateProducerProfileRequest } from "@/features/auditions/management-types";

let profile: ProducerProfile = {
  companyName: "나인진엔터테인먼트",
  contactName: "김프로듀서",
  contactRole: "캐스팅 담당",
  logoUrl: "/images/ninejin-group-logo.png",
  description: "공연 제작과 배우 캐스팅을 운영하는 공연사입니다.",
  email: "producer@yesulin.example",
  businessNumber: "123-45-67890",
  representativeName: "김대표",
  verificationStatus: "VERIFIED",
  verifiedAt: "2026-08-07T10:12:00+09:00",
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
