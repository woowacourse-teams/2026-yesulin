package art.yesulin.domain.submission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.support.ObjectStorageTestConfiguration;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:submission-consent;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@Transactional
class SubmissionConsentPersistenceTest {

    private static final long APPLICANT_ID = 1L;
    private static final Instant AGREED_AT = Instant.parse("2026-08-23T03:15:00Z");
    private static final Instant RECRUITMENT_END_AT = Instant.parse("2026-08-31T14:59:00Z");

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private SubmissionConsentRepository consentRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void persistsAndRestoresSubmissionConsents() {
        Submission submission = submissionRepository.saveAndFlush(createSubmission(UUID.randomUUID(), 1L));
        consentRepository.saveAllAndFlush(List.of(
                SubmissionConsent.agreeToPrivacyCollectionAndUse(
                        submission.getSubmissionId(), APPLICANT_ID, "privacy-collection-v1", AGREED_AT
                ),
                SubmissionConsent.agreeToThirdPartyProvision(
                        submission.getSubmissionId(),
                        APPLICANT_ID,
                        "third-party-v1",
                        "극단 예술인",
                        AGREED_AT
                )
        ));
        entityManager.clear();

        Map<SubmissionConsentType, SubmissionConsent> found = consentRepository
                .findAllBySubmissionId(submission.getSubmissionId())
                .stream()
                .collect(Collectors.toMap(SubmissionConsent::getConsentType, Function.identity()));

        assertEquals(2, found.size());
        assertEquals("privacy-collection-v1", found.get(SubmissionConsentType.PRIVACY_COLLECTION_AND_USE)
                .getDocumentVersion());
        assertEquals("극단 예술인", found.get(SubmissionConsentType.THIRD_PARTY_PROVISION)
                .getRecipientNameSnapshot());
        assertEquals(AGREED_AT, found.get(SubmissionConsentType.THIRD_PARTY_PROVISION).getAgreedAt());
    }

    @Test
    void rejectsDuplicateConsentTypeForSubmission() {
        Submission submission = submissionRepository.saveAndFlush(createSubmission(UUID.randomUUID(), 1L));
        SubmissionConsent first = SubmissionConsent.agreeToPrivacyCollectionAndUse(
                submission.getSubmissionId(), APPLICANT_ID, "privacy-collection-v1", AGREED_AT
        );
        SubmissionConsent duplicate = SubmissionConsent.agreeToPrivacyCollectionAndUse(
                submission.getSubmissionId(), APPLICANT_ID, "privacy-collection-v1", AGREED_AT
        );
        consentRepository.saveAndFlush(first);

        assertThrows(DataIntegrityViolationException.class, () -> consentRepository.saveAndFlush(duplicate));
    }

    private Submission createSubmission(UUID submissionId, long auditionId) {
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
                AGREED_AT,
                RECRUITMENT_END_AT
        );
        return new Submission(
                submissionId,
                APPLICANT_ID,
                AGREED_AT,
                new AuditionSnapshot(
                        auditionId,
                        UUID.randomUUID(),
                        "지원서 테스트 공고",
                        "테스트 공연",
                        "테스트 극단",
                        1L,
                        2L
                ),
                applicantSnapshot,
                new SelectedRoles(List.of(new SelectedRole(1L, "햄릿"))),
                new SubmissionFormAnswers(
                        new QuestionAnswers(List.of()),
                        new PhotoRequirementAnswers(List.of()),
                        new VideoRequirementAnswers(List.of())
                )
        );
    }
}
