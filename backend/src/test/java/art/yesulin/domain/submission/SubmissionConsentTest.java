package art.yesulin.domain.submission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SubmissionConsentTest {

    private static final UUID SUBMISSION_ID = UUID.fromString("b4472dce-52d0-41a9-baaa-c9e86e31b72b");
    private static final long APPLICANT_ID = 1L;
    private static final Instant AGREED_AT = Instant.parse("2026-08-23T03:15:00Z");

    @Test
    void recordsPrivacyCollectionAndUseConsent() {
        SubmissionConsent consent = SubmissionConsent.agreeToPrivacyCollectionAndUse(
                SUBMISSION_ID, APPLICANT_ID, "privacy-collection-v1", AGREED_AT
        );

        assertEquals(SubmissionConsentType.PRIVACY_COLLECTION_AND_USE, consent.getConsentType());
        assertEquals("privacy-collection-v1", consent.getDocumentVersion());
        assertEquals(APPLICANT_ID, consent.getApplicantId());
        assertEquals(AGREED_AT, consent.getAgreedAt());
        assertNull(consent.getRecipientNameSnapshot());
    }

    @Test
    void recordsThirdPartyRecipientSnapshot() {
        SubmissionConsent consent = SubmissionConsent.agreeToThirdPartyProvision(
                SUBMISSION_ID,
                APPLICANT_ID,
                "third-party-v1",
                " 극단 예술인 ",
                AGREED_AT
        );

        assertEquals(SubmissionConsentType.THIRD_PARTY_PROVISION, consent.getConsentType());
        assertEquals("극단 예술인", consent.getRecipientNameSnapshot());
    }

    @Test
    void requiresThirdPartyRecipientName() {
        assertThrows(
                IllegalArgumentException.class,
                () -> SubmissionConsent.agreeToThirdPartyProvision(
                        SUBMISSION_ID, APPLICANT_ID, "third-party-v1", " ", AGREED_AT
                )
        );
    }

    @Test
    void rejectsTooLongDocumentVersionAndRecipientName() {
        BusinessException versionException = assertThrows(
                BusinessException.class,
                () -> SubmissionConsent.agreeToPrivacyCollectionAndUse(
                        SUBMISSION_ID,
                        APPLICANT_ID,
                        "v".repeat(SubmissionConsent.MAX_DOCUMENT_VERSION_LENGTH + 1),
                        AGREED_AT
                )
        );
        BusinessException recipientException = assertThrows(
                BusinessException.class,
                () -> SubmissionConsent.agreeToThirdPartyProvision(
                        SUBMISSION_ID,
                        APPLICANT_ID,
                        "third-party-v1",
                        "극".repeat(SubmissionConsent.MAX_RECIPIENT_NAME_LENGTH + 1),
                        AGREED_AT
                )
        );

        assertEquals(SubmissionErrorCode.INVALID_CONSENT, versionException.getErrorCode());
        assertEquals(SubmissionErrorCode.INVALID_CONSENT, recipientException.getErrorCode());
    }
}
