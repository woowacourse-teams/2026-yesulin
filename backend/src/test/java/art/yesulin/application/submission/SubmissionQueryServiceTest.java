package art.yesulin.application.submission;

import static art.yesulin.domain.submission.SubmissionErrorCode.NOT_FOUND;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.ApplicantSnapshot;
import art.yesulin.domain.submission.AuditionSnapshot;
import art.yesulin.domain.submission.MilitaryServiceStatus;
import art.yesulin.domain.submission.PhotoRequirementAnswer;
import art.yesulin.domain.submission.PhotoRequirementAnswers;
import art.yesulin.domain.submission.QuestionAnswer;
import art.yesulin.domain.submission.QuestionAnswers;
import art.yesulin.domain.submission.SelectedRole;
import art.yesulin.domain.submission.SelectedRoles;
import art.yesulin.domain.submission.Submission;
import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionAdditionalInformationField;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionBasicInformationField;
import art.yesulin.domain.submission.SubmissionCareer;
import art.yesulin.domain.submission.SubmissionConsent;
import art.yesulin.domain.submission.SubmissionConsentRepository;
import art.yesulin.domain.submission.SubmissionFieldSnapshot;
import art.yesulin.domain.submission.SubmissionFormAnswers;
import art.yesulin.domain.submission.SubmissionGender;
import art.yesulin.domain.submission.SubmissionRepository;
import art.yesulin.domain.submission.VideoRequirementAnswer;
import art.yesulin.domain.submission.VideoRequirementAnswers;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:submission-query-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@Transactional
class SubmissionQueryServiceTest {

    private static final long APPLICANT_ID = 1L;
    private static final Instant SUBMITTED_AT = Instant.parse("2026-08-24T03:15:00Z");
    private static final Instant RECRUITMENT_END_AT = Instant.parse("2026-08-31T14:59:00Z");

    @Autowired
    private SubmissionQueryService submissionQueryService;
    @Autowired
    private SubmissionRepository submissionRepository;
    @Autowired
    private SubmissionConsentRepository consentRepository;

    @Test
    void findsOnlyApplicantSubmissionSummariesInRecentOrder() {
        Submission older = saveSubmission(APPLICANT_ID, 2L, SUBMITTED_AT.minusSeconds(60));
        Submission newer = saveSubmission(APPLICANT_ID, 3L, SUBMITTED_AT);
        saveSubmission(2L, 4L, SUBMITTED_AT.plusSeconds(60));

        List<SubmissionSummaryResult> results = submissionQueryService.findAll(APPLICANT_ID);

        assertEquals(List.of(newer.getSubmissionId(), older.getSubmissionId()), results.stream()
                .map(SubmissionSummaryResult::submissionId)
                .toList());
        assertEquals(List.of("배역 3"), results.getFirst().selectedRoles().stream()
                .map(SubmissionSelectedRoleResult::roleName)
                .toList());
    }

    @Test
    void findsCompleteOwnedSubmissionSnapshot() {
        Submission submission = saveSubmission(APPLICANT_ID, 2L, SUBMITTED_AT);
        consentRepository.saveAll(List.of(
                SubmissionConsent.agreeToPrivacyCollectionAndUse(
                        submission.getSubmissionId(), APPLICANT_ID, "privacy-v1", SUBMITTED_AT
                ),
                SubmissionConsent.agreeToThirdPartyProvision(
                        submission.getSubmissionId(), APPLICANT_ID, "third-party-v1", "테스트 극단", SUBMITTED_AT
                )
        ));

        SubmissionDetailResult result = submissionQueryService.find(APPLICANT_ID, submission.getSubmissionId());

        assertEquals("공고 2", result.auditionTitle());
        assertEquals("김하린", result.applicant().basicInformation().name());
        assertEquals(27, result.applicant().ageAtRecruitmentDeadline());
        assertEquals(List.of("https://example.com/profile"), result.applicant().additionalInformation().links());
        assertEquals(
                List.of(SubmissionBasicInformationField.NAME),
                result.applicant().fieldSnapshot().basicFields()
        );
        assertEquals("지원 동기", result.formAnswers().questionAnswers().getFirst().question());
        assertEquals(41L, result.formAnswers().photoRequirementAnswers().getFirst().fileId());
        assertEquals("https://youtu.be/abcdefghijk", result.formAnswers().videoRequirementAnswers().getFirst().url());
        assertEquals(List.of("privacy-v1", "third-party-v1"), result.consents().stream()
                .map(SubmissionDetailResult.ConsentResult::documentVersion)
                .toList());
    }

    @Test
    void hidesAnotherApplicantsSubmissionAsNotFound() {
        Submission submission = saveSubmission(2L, 2L, SUBMITTED_AT);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> submissionQueryService.find(APPLICANT_ID, submission.getSubmissionId())
        );

        assertEquals(NOT_FOUND, exception.getErrorCode());
    }

    @Test
    void rejectsUnknownSubmissionAsNotFound() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> submissionQueryService.find(APPLICANT_ID, UUID.randomUUID())
        );

        assertEquals(NOT_FOUND, exception.getErrorCode());
    }

    private Submission saveSubmission(long applicantId, long auditionId, Instant submittedAt) {
        Submission submission = new Submission(
                applicantId,
                submittedAt,
                new AuditionSnapshot(auditionId, "공고 " + auditionId),
                createApplicantSnapshot(submittedAt),
                new SelectedRoles(List.of(new SelectedRole(auditionId * 10, "배역 " + auditionId))),
                createFormAnswers()
        );
        return submissionRepository.saveAndFlush(submission);
    }

    private ApplicantSnapshot createApplicantSnapshot(Instant submittedAt) {
        return new ApplicantSnapshot(
                new SubmissionBasicInformation(
                        "김하린", 165, 50, LocalDate.of(1999, 4, 3), SubmissionGender.FEMALE,
                        "010-1234-5678", "harin@example.com", "서울특별시 종로구"
                ),
                new SubmissionAdditionalInformation(
                        "한국예술종합학교",
                        List.of("https://example.com/profile"),
                        "대한민국",
                        "자기소개",
                        "현대무용",
                        "영화 감상",
                        MilitaryServiceStatus.NOT_APPLICABLE,
                        List.of(new SubmissionCareer(2025, "햄릿", "오필리어"))
                ),
                new SubmissionFieldSnapshot(
                        List.of(SubmissionBasicInformationField.NAME),
                        List.of(SubmissionAdditionalInformationField.LINK)
                ),
                submittedAt,
                RECRUITMENT_END_AT
        );
    }

    private SubmissionFormAnswers createFormAnswers() {
        return new SubmissionFormAnswers(
                new QuestionAnswers(List.of(new QuestionAnswer(21L, "지원 동기", "작품에 공감했습니다."))),
                new PhotoRequirementAnswers(List.of(new PhotoRequirementAnswer(31L, "정면 사진", 41L))),
                new VideoRequirementAnswers(List.of(new VideoRequirementAnswer(
                        51L, "자유 연기", "https://youtu.be/abcdefghijk"
                )))
        );
    }
}
