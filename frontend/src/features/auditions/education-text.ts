import { educationText } from "@/features/applicants/education";
import type { Applicant } from "./types";

export function applicantEducationText(applicant: Pick<Applicant, "educationLevel" | "school" | "major">) {
  return educationText({ level: applicant.educationLevel, school: applicant.school, major: applicant.major });
}
