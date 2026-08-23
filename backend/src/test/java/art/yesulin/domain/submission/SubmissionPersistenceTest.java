package art.yesulin.domain.submission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileMetadata;
import art.yesulin.support.ObjectStorageTestConfiguration;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:submission;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@Transactional
class SubmissionPersistenceTest {

    private static final long APPLICANT_ID = 1L;
    private static final Instant SUBMITTED_AT = Instant.parse("2026-08-23T03:15:00Z");
    private static final Instant RECRUITMENT_END_AT = Instant.parse("2026-08-31T14:59:00Z");

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void persistsAndRestoresCompleteSubmissionSnapshot() {
        long firstFileId = createFile("front.jpg");
        long secondFileId = createFile("profile.jpg");
        Submission submission = createSubmission(
                UUID.fromString("b4472dce-52d0-41a9-baaa-c9e86e31b72b"),
                2L,
                SUBMITTED_AT,
                firstFileId,
                secondFileId
        );
        submissionRepository.saveAndFlush(submission);
        entityManager.clear();

        Submission found = submissionRepository.findBySubmissionId(submission.getSubmissionId()).orElseThrow();

        assertEquals(submission.getSubmissionId(), found.getSubmissionId());
        assertEquals(APPLICANT_ID, found.getApplicantId());
        assertEquals(2L, found.getAuditionId());
        assertEquals("햄릿 배우 모집", found.getAuditionSnapshot().title());
        assertEquals(27, found.getApplicantSnapshot().getAgeAtRecruitmentDeadline());
        assertEquals(
                List.of(SubmissionBasicInformationField.NAME, SubmissionBasicInformationField.BIRTH),
                found.getApplicantSnapshot().getSubmissionFieldSnapshot().basicFields()
        );
        assertEquals(
                List.of(SubmissionAdditionalInformationField.LINK, SubmissionAdditionalInformationField.CAREER),
                found.getApplicantSnapshot().getSubmissionFieldSnapshot().additionalFields()
        );
        assertEquals(
                List.of("https://example.com/first", "https://example.com/second"),
                found.getApplicantSnapshot().getAdditionalInformation().links()
        );
        assertEquals(
                List.of(
                        new SubmissionCareer(2024, "리어왕", "코델리아"),
                        new SubmissionCareer(2025, "햄릿", "오필리어")
                ),
                found.getApplicantSnapshot().getAdditionalInformation().careers()
        );
        assertEquals(
                List.of(new SelectedRole(11L, "오필리어"), new SelectedRole(12L, "거트루드")),
                found.getSelectedRoles().values()
        );
        assertEquals(List.of(21L, 22L), found.getFormAnswers().questionAnswers().values().stream()
                .map(QuestionAnswer::questionId)
                .toList());
        assertEquals(List.of(firstFileId, secondFileId), found.getFormAnswers().photoRequirementAnswers().values()
                .stream()
                .map(PhotoRequirementAnswer::fileId)
                .toList());
        assertEquals(List.of(51L, 52L), found.getFormAnswers().videoRequirementAnswers().values().stream()
                .map(VideoRequirementAnswer::videoRequirementId)
                .toList());
    }

    @Test
    void findsApplicantSubmissionsInRecentOrder() {
        Submission older = createMinimalSubmission(
                UUID.fromString("40cf23df-6e9a-4d71-a575-53a0193e8306"),
                2L,
                SUBMITTED_AT.minusSeconds(60)
        );
        Submission newer = createMinimalSubmission(
                UUID.fromString("23deaf15-53de-47e2-b49e-1068f4fec24a"),
                3L,
                SUBMITTED_AT
        );
        submissionRepository.saveAllAndFlush(List.of(older, newer));
        entityManager.clear();

        List<Submission> found = submissionRepository.findAllByApplicantIdOrderBySubmittedAtDesc(APPLICANT_ID);

        assertEquals(List.of(newer.getSubmissionId(), older.getSubmissionId()), found.stream()
                .map(Submission::getSubmissionId)
                .toList());
        assertNotNull(found.getFirst().getApplicantSnapshot());
        assertNotNull(found.getFirst().getApplicantSnapshot().getBasicInformation());
        assertNotNull(found.getFirst().getApplicantSnapshot().getAdditionalInformation());
        assertNotNull(found.getFirst().getApplicantSnapshot().getSubmissionFieldSnapshot());
        assertNotNull(found.getFirst().getFormAnswers());
        assertTrue(submissionRepository.existsByApplicantIdAndAuditionId(APPLICANT_ID, 2L));
    }

    @Test
    void rejectsDuplicateApplicantAndAudition() {
        Submission first = createMinimalSubmission(UUID.randomUUID(), 2L, SUBMITTED_AT);
        Submission duplicate = createMinimalSubmission(UUID.randomUUID(), 2L, SUBMITTED_AT.plusSeconds(1));
        submissionRepository.saveAndFlush(first);

        assertThrows(DataIntegrityViolationException.class, () -> submissionRepository.saveAndFlush(duplicate));
    }

    private Submission createSubmission(
            UUID submissionId,
            long auditionId,
            Instant submittedAt,
            long firstFileId,
            long secondFileId
    ) {
        SubmissionBasicInformation basicInformation = new SubmissionBasicInformation(
                "김하린", 166, 52, LocalDate.of(1999, 4, 3), SubmissionGender.FEMALE,
                "010-1234-5678", "harin@example.com", "서울특별시 종로구"
        );
        SubmissionAdditionalInformation additionalInformation = new SubmissionAdditionalInformation(
                "한국예술종합학교",
                List.of("https://example.com/first", "https://example.com/second"),
                "대한민국",
                "자기소개",
                "현대무용",
                "영화 감상",
                MilitaryServiceStatus.NOT_APPLICABLE,
                List.of(
                        new SubmissionCareer(2024, "리어왕", "코델리아"),
                        new SubmissionCareer(2025, "햄릿", "오필리어")
                )
        );
        SubmissionFieldSnapshot fields = new SubmissionFieldSnapshot(
                List.of(SubmissionBasicInformationField.NAME, SubmissionBasicInformationField.BIRTH),
                List.of(SubmissionAdditionalInformationField.LINK, SubmissionAdditionalInformationField.CAREER)
        );
        ApplicantSnapshot applicantSnapshot = new ApplicantSnapshot(
                basicInformation,
                additionalInformation,
                fields,
                submittedAt,
                RECRUITMENT_END_AT
        );
        SubmissionFormAnswers formAnswers = new SubmissionFormAnswers(
                new QuestionAnswers(List.of(
                        new QuestionAnswer(21L, "지원 동기는?", "작품의 주제에 공감했습니다."),
                        new QuestionAnswer(22L, "참여 가능한 일정은?", "전체 일정에 참여할 수 있습니다.")
                )),
                new PhotoRequirementAnswers(List.of(
                        new PhotoRequirementAnswer(31L, "프로필 사진", firstFileId),
                        new PhotoRequirementAnswer(31L, "프로필 사진", secondFileId)
                )),
                new VideoRequirementAnswers(List.of(
                        new VideoRequirementAnswer(51L, "자유 연기", "https://youtu.be/abcdefghijk"),
                        new VideoRequirementAnswer(52L, "지정 연기", "https://youtu.be/lmnopqrstuv")
                ))
        );
        return new Submission(
                submissionId,
                APPLICANT_ID,
                submittedAt,
                new AuditionSnapshot(auditionId, "햄릿 배우 모집"),
                applicantSnapshot,
                new SelectedRoles(List.of(
                        new SelectedRole(11L, "오필리어"),
                        new SelectedRole(12L, "거트루드")
                )),
                formAnswers
        );
    }

    private Submission createMinimalSubmission(UUID submissionId, long auditionId, Instant submittedAt) {
        SubmissionBasicInformation basicInformation = new SubmissionBasicInformation(
                null, null, null, null, null, null, null, null
        );
        SubmissionAdditionalInformation additionalInformation = new SubmissionAdditionalInformation(
                null, List.of(), null, null, null, null, null, List.of()
        );
        ApplicantSnapshot applicantSnapshot = new ApplicantSnapshot(
                basicInformation,
                additionalInformation,
                new SubmissionFieldSnapshot(List.of(), List.of()),
                submittedAt,
                RECRUITMENT_END_AT
        );
        return new Submission(
                submissionId,
                APPLICANT_ID,
                submittedAt,
                new AuditionSnapshot(auditionId, "공고 " + auditionId),
                applicantSnapshot,
                new SelectedRoles(List.of(new SelectedRole(auditionId * 10, "배역"))),
                new SubmissionFormAnswers(
                        new QuestionAnswers(List.of()),
                        new PhotoRequirementAnswers(List.of()),
                        new VideoRequirementAnswers(List.of())
                )
        );
    }

    private long createFile(String filename) {
        FileMetadata metadata = new FileMetadata(filename, "image/jpeg", 1_024L);
        FileAsset file = new FileAsset("files/20260823/" + filename, APPLICANT_ID, metadata);
        return fileAssetRepository.saveAndFlush(file).getId();
    }
}
