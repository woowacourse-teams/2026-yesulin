package art.yesulin.application.submission.consent;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.SubmissionConsent;
import art.yesulin.domain.submission.SubmissionConsentType;
import art.yesulin.domain.submission.SubmissionErrorCode;
import art.yesulin.support.FakeSubmissionConsentDocumentProvider;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class SubmissionConsentDocumentMetadataTest {

    @Test
    void resolvesServerVersionForEachConsentType() {
        SubmissionConsentDocumentMetadata metadata = new SubmissionConsentDocumentMetadata(
                " privacy-v1 ", " third-party-v1 ", " 극단 예술인 "
        );

        assertEquals("privacy-v1", metadata.versionOf(SubmissionConsentType.PRIVACY_COLLECTION_AND_USE));
        assertEquals("third-party-v1", metadata.versionOf(SubmissionConsentType.THIRD_PARTY_PROVISION));
        assertEquals("극단 예술인", metadata.thirdPartyRecipientName());
    }

    @Test
    void rejectsInvalidDocumentVersion() {
        assertThrows(
                IllegalArgumentException.class,
                () -> new SubmissionConsentDocumentMetadata(" ", "third-party-v1", "극단 예술인")
        );
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new SubmissionConsentDocumentMetadata(
                        "v".repeat(SubmissionConsent.MAX_DOCUMENT_VERSION_LENGTH + 1),
                        "third-party-v1",
                        "극단 예술인"
                )
        );

        assertEquals(SubmissionErrorCode.INVALID_CONSENT, exception.getErrorCode());
    }

    @Test
    void fakeProviderReturnsMetadataAtServerReferenceTime() {
        Instant referenceTime = Instant.parse("2026-08-23T03:15:00Z");
        SubmissionConsentDocumentMetadata metadata = new SubmissionConsentDocumentMetadata(
                "privacy-v1", "third-party-v1", "극단 예술인"
        );
        FakeSubmissionConsentDocumentProvider provider = new FakeSubmissionConsentDocumentProvider(metadata);

        assertEquals(metadata, provider.currentFor(10L, referenceTime));
        assertEquals(10L, provider.getLastAuditionId());
        assertEquals(referenceTime, provider.getLastReferenceTime());
    }
}
