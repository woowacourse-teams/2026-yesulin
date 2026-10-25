import { roleId, submissionId } from "../auditions/types";
import type { PdfExtractionJob } from "../pdf-extractions/types";
import { displayAge } from "./profile-display";
import { sameKey, matchStatusLabels, type ReviewDetail, type ReviewEntry } from "./types";
import type { Applicant } from "./screening-types";

/** Adapt current Lambda results to the original screening UI without persisting legacy records. */
export function screeningApplicant(review: ReviewDetail, entry: ReviewEntry, job?: PdfExtractionJob): Applicant {
  const info = job?.result?.applicantInfo;
  const profile = info?.status === "COMPLETED" ? info.profile : null;
  const status = entry.decision === "HOLD" ? "ETC" : entry.decision;
  const saved: Applicant["review"] = { status, memo: "", note: entry.memo ?? "" };
  const ageText = displayAge(profile);
  return {
    id: submissionId(String(entry.id)), name: entry.applicantName || "이름 미확인",
    roleId: roleId(String(entry.roleId ?? review.id)), roleName: review.roles.find(role => sameKey(role.id, entry.roleId))?.name ?? matchStatusLabels[entry.matchStatus],
    gender: null, age: null, height: null, weight: null, birth: "", phone: "", email: "", address: "",
    educationLevel: null, school: "", major: "", links: [], nationality: "", specialty: "", hobbies: "", militaryServiceStatus: "",
    submittedAt: job?.uploadedAt ?? job?.createdAt ?? review.createdAt, career: [], coverLetter: "", questions: [], videos: [],
    photos: (job?.result?.pages.flatMap(page => page.images) ?? []).filter(image => image.classification === "CANDIDATE" && image.url)
      .map((image, index) => ({ label: `프로필 사진 ${index + 1}`, url: image.url, fallbackUrl: "" })),
    review: saved, reviewHistory: { 1: saved, 2: null, 3: null, 4: null, 5: null }, mismatchReasons: [],
    sourceDocument: { filename: entry.originalFilename, ageText, heightText: profile?.height.value ?? undefined,
      educationText: profile?.education.value ?? undefined,
      preparation: !job || entry.matchStatus === "WAITING" ? "정보 읽는 중" : info?.status === "COMPLETED" ? "정보 추출됨" : "원본 확인 필요",
      careers: (profile?.careers ?? []).map(c => ({ text: c.evidence, title: [c.title, c.venue].filter(Boolean).join(" / "),
        part: c.part ?? undefined, genre: c.genre ?? undefined, period: c.period ?? undefined, company: c.company ?? undefined })),
    },
  };
}
