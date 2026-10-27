export const MAX_PROFILE_CAREER_COUNT = 30;

export const PROFILE_CAREER_GENRES = [
  { value: "THEATER", label: "연극" },
  { value: "MUSICAL", label: "뮤지컬" },
  { value: "DANCE", label: "무용" },
  { value: "FILM", label: "영화" },
  { value: "DRAMA", label: "드라마" },
  { value: "WEB_DRAMA", label: "웹드라마" },
  { value: "SHORT_FORM", label: "숏폼" },
  { value: "COMMERCIAL", label: "광고" },
  { value: "OTHER", label: "기타" },
] as const;

export type ProfileCareerGenre = (typeof PROFILE_CAREER_GENRES)[number]["value"];

export function profileCareerGenreLabel(genre?: ProfileCareerGenre | null) {
  return PROFILE_CAREER_GENRES.find((option) => option.value === genre)?.label ?? "미분류";
}
