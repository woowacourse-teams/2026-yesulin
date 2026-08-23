package art.yesulin.domain.submission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SubmissionTest {

    private static final UUID SUBMISSION_ID = UUID.fromString("b4472dce-52d0-41a9-baaa-c9e86e31b72b");
    private static final Instant SUBMITTED_AT = Instant.parse("2026-08-23T03:15:00Z");
    private static final Instant RECRUITMENT_END_AT = Instant.parse("2026-08-31T14:59:00Z");

    @Test
    void createsSubmissionWithMeaningfulSnapshotSections() {
        SubmissionBasicInformation basicInformation = new SubmissionBasicInformation(
                " 김하린 ", 166, 52, LocalDate.of(1999, 4, 3), SubmissionGender.FEMALE,
                "010-1234-5678", "harin@example.com", "서울특별시 종로구"
        );
        SubmissionAdditionalInformation additionalInformation = new SubmissionAdditionalInformation(
                "한국예술종합학교", List.of("https://example.com/harin"), "대한민국", "자기소개",
                "현대무용", "영화 감상", null, List.of(new SubmissionCareer(2025, "햄릿", "오필리어"))
        );
        AuditionSnapshot auditionSnapshot = new AuditionSnapshot(2L, " 햄릿 배우 모집 ");
        ApplicantSnapshot applicantSnapshot = new ApplicantSnapshot(
                basicInformation, additionalInformation, submissionFieldSnapshot(),
                SUBMITTED_AT, RECRUITMENT_END_AT
        );
        SelectedRole selectedRole = new SelectedRole(11L, "오필리어");
        QuestionAnswer questionAnswer = new QuestionAnswer(21L, "지원 동기는?", "작품의 주제에 공감했습니다.");
        PhotoRequirementAnswer photoAnswer = new PhotoRequirementAnswer(31L, "정면 사진", 41L);
        VideoRequirementAnswer videoAnswer = new VideoRequirementAnswer(
                51L, "자유 연기", "https://youtu.be/abcdefghijk"
        );
        Submission submission = new Submission(
                SUBMISSION_ID,
                1L,
                SUBMITTED_AT,
                auditionSnapshot,
                applicantSnapshot,
                new SelectedRoles(List.of(selectedRole)),
                new SubmissionFormAnswers(
                        new QuestionAnswers(List.of(questionAnswer)),
                        new PhotoRequirementAnswers(List.of(photoAnswer)),
                        new VideoRequirementAnswers(List.of(videoAnswer))
                )
        );

        assertEquals(SUBMISSION_ID, submission.getSubmissionId());
        assertEquals(1L, submission.getApplicantId());
        assertEquals(2L, submission.getAuditionId());
        assertEquals(SUBMITTED_AT, submission.getSubmittedAt());
        assertEquals(new AuditionSnapshot(2L, "햄릿 배우 모집"), submission.getAuditionSnapshot());
        assertSame(applicantSnapshot, submission.getApplicantSnapshot());
        assertEquals(List.of(selectedRole), submission.getSelectedRoles().values());
        assertEquals(List.of(questionAnswer), submission.getFormAnswers().questionAnswers().values());
        assertEquals(List.of(photoAnswer), submission.getFormAnswers().photoRequirementAnswers().values());
        assertEquals(List.of(videoAnswer), submission.getFormAnswers().videoRequirementAnswers().values());
    }

    @Test
    void keepsCollectionSnapshotWhenSourceListChanges() {
        List<SelectedRole> sourceRoles = new ArrayList<>();
        sourceRoles.add(new SelectedRole(11L, "오필리어"));
        Submission submission = new Submission(
                SUBMISSION_ID,
                1L,
                SUBMITTED_AT,
                new AuditionSnapshot(2L, "햄릿 배우 모집"),
                new ApplicantSnapshot(
                        emptyBasicInformation(), emptyAdditionalInformation(), submissionFieldSnapshot(),
                        SUBMITTED_AT, RECRUITMENT_END_AT
                ),
                new SelectedRoles(sourceRoles),
                emptyFormAnswers()
        );

        sourceRoles.add(new SelectedRole(12L, "햄릿"));

        assertEquals(List.of(new SelectedRole(11L, "오필리어")), submission.getSelectedRoles().values());
    }

    private SubmissionBasicInformation emptyBasicInformation() {
        return new SubmissionBasicInformation(null, null, null, null, null, null, null, null);
    }

    private SubmissionAdditionalInformation emptyAdditionalInformation() {
        return new SubmissionAdditionalInformation(null, List.of(), null, null, null, null, null, List.of());
    }

    private SubmissionFieldSnapshot submissionFieldSnapshot() {
        return new SubmissionFieldSnapshot(
                List.of(SubmissionBasicInformationField.NAME),
                List.of(SubmissionAdditionalInformationField.CAREER)
        );
    }

    private SubmissionFormAnswers emptyFormAnswers() {
        return new SubmissionFormAnswers(
                new QuestionAnswers(List.of()),
                new PhotoRequirementAnswers(List.of()),
                new VideoRequirementAnswers(List.of())
        );
    }
}
