export const APPLICANT_PROFILE_CHANGED = "yesulin:applicant-profile-changed";

export const notifyApplicantProfileChanged = () => {
  window.dispatchEvent(new Event(APPLICANT_PROFILE_CHANGED));
};
