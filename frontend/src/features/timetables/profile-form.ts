import { normalizePhone } from "./contacts";
import { TIMETABLE_LIMITS, type TimetableProfile } from "./types";

export type ProfileFormErrors = Partial<Record<keyof TimetableProfile, string>>;

export const EMPTY_PROFILE: TimetableProfile = {
  title: "",
  organizerName: "",
  organizerPhone: "",
  location: "",
  guide: "",
};

/** 서버와 같은 길이·형식으로 검사하고 휴대폰 번호는 010-1234-5678로 맞춘다. */
export function readProfileForm(form: TimetableProfile): { profile: TimetableProfile | null; errors: ProfileFormErrors } {
  const errors: ProfileFormErrors = {};
  const title = form.title.trim();
  const organizerName = form.organizerName.trim();
  const organizerPhone = normalizePhone(form.organizerPhone);
  if (!title) errors.title = "일정표 이름을 입력해 주세요.";
  else if (title.length > TIMETABLE_LIMITS.titleLength) errors.title = `${TIMETABLE_LIMITS.titleLength}자 이하로 적어 주세요.`;
  if (!organizerName) errors.organizerName = "배우에게 안내할 단체명을 입력해 주세요.";
  else if (organizerName.length > TIMETABLE_LIMITS.organizerNameLength) {
    errors.organizerName = `${TIMETABLE_LIMITS.organizerNameLength}자 이하로 적어 주세요.`;
  }
  if (!organizerPhone) errors.organizerPhone = "담당자 휴대폰 번호를 010-1234-5678 형식으로 입력해 주세요.";
  if (form.location.trim().length > TIMETABLE_LIMITS.locationLength) {
    errors.location = `${TIMETABLE_LIMITS.locationLength}자 이하로 적어 주세요.`;
  }
  if (form.guide.trim().length > TIMETABLE_LIMITS.guideLength) errors.guide = `${TIMETABLE_LIMITS.guideLength}자 이하로 적어 주세요.`;
  if (Object.keys(errors).length > 0 || !organizerPhone) return { profile: null, errors };
  return {
    profile: { title, organizerName, organizerPhone, location: form.location.trim(), guide: form.guide.trim() },
    errors,
  };
}
