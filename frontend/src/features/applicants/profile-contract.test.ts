import { describe, expect, it } from "vitest";
import { PROFILE_CAREER_GENRES } from "./career-genre";
import { toBackendProfileUpdate, toProfileInformation, type BackendProfileResponse } from "./profile-contract";

const profileFixture: BackendProfileResponse = {
  basicInformation: { name: "배우", height: null, weight: null, birthDate: "2000-01-01", gender: "FEMALE", phone: null, email: null, address: null },
  additionalInformation: { educationLevel: null, school: null, major: null, links: [], nationality: null, coverLetter: null, specialty: null, hobbies: null, militaryServiceStatus: null, careers: [] },
  completeness: { filled: 3, total: 8 },
};

describe("프로필 경력 장르 계약", () => {
  it.each([...PROFILE_CAREER_GENRES.map(({ value }) => value), null, undefined])("장르 %s를 왕복하고 없는 값은 null로 보낸다", (genre) => {
    const response = { ...profileFixture, additionalInformation: { ...profileFixture.additionalInformation, careers: [{ year: 2026, title: "작품", roleName: "배역", genre }] } };
    const information = toProfileInformation(response);
    const values = Object.fromEntries(information.answers.map((answer) => [answer.key, answer.value]));
    expect(toBackendProfileUpdate(values).additionalInformation.careers).toEqual([{ year: 2026, title: "작품", roleName: "배역", genre: genre ?? null }]);
  });
});
