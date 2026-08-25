import type { BackendProfileResponse, BackendProfileUpdateRequest } from "@/features/applicants/profile-contract";
import { applicantRequest } from "@/features/applicants/request";
import type { ApplicantInformation } from "./submission-v1";

const PROFILE_PATH = "/v1/applicants/me/profile";

/**
 * 제출 성공 후 이번 지원서의 기본·추가 정보를 재사용 프로필에 저장한다.
 * 값을 입력한 수집 필드만 덮어쓰고, 비워 둔 항목과 공고가 수집하지 않은 필드는
 * 기존 프로필 값을 유지한다. 사진·영상·커스텀 답변은 저장하지 않는다.
 */
export async function saveSubmissionInformationToProfile(submitted: ApplicantInformation): Promise<void> {
  const current = await applicantRequest<BackendProfileResponse>(PROFILE_PATH);
  const body: BackendProfileUpdateRequest = {
    basicInformation: mergeBasicInformation(current.basicInformation, submitted.basicInformation),
    additionalInformation: mergeAdditionalInformation(current.additionalInformation, submitted.additionalInformation),
  };
  await applicantRequest<BackendProfileResponse>(PROFILE_PATH, { method: "PATCH", body: JSON.stringify(body) });
}

function mergeBasicInformation(
  current: BackendProfileResponse["basicInformation"],
  submitted: ApplicantInformation["basicInformation"],
): BackendProfileUpdateRequest["basicInformation"] {
  return {
    name: submitted.name ?? current.name,
    height: submitted.height ?? current.height,
    weight: submitted.weight ?? current.weight,
    birthDate: submitted.birthDate ?? current.birthDate,
    gender: submitted.gender ?? current.gender,
    phone: submitted.phone ?? current.phone,
    email: submitted.email ?? current.email,
    address: submitted.address ?? current.address,
  };
}

function mergeAdditionalInformation(
  current: BackendProfileResponse["additionalInformation"],
  submitted: ApplicantInformation["additionalInformation"],
): BackendProfileUpdateRequest["additionalInformation"] {
  return {
    school: submitted.school ?? current.school,
    links: submitted.links.length ? submitted.links : current.links,
    nationality: submitted.nationality ?? current.nationality,
    coverLetter: submitted.coverLetter ?? current.coverLetter,
    specialty: submitted.specialty ?? current.specialty,
    hobbies: submitted.hobbies ?? current.hobbies,
    militaryServiceStatus: submitted.militaryServiceStatus ?? current.militaryServiceStatus,
    careers: submitted.careers.length ? submitted.careers : current.careers,
  };
}
