package art.yesulin.application.submission.consent;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.SubmissionConsent;
import art.yesulin.domain.submission.SubmissionConsentType;
import art.yesulin.domain.submission.SubmissionErrorCode;
import art.yesulin.support.FakeSubmissionConsentDocumentVersionProvider;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class SubmissionConsentDocumentVersionsTest {

    @Test
    void resolvesServerVersionForEachConsentType() {
        SubmissionConsentDocumentVersions versions = new SubmissionConsentDocumentVersions(
                " privacy-v1 ", " third-party-v1 "
        );

        assertEquals("privacy-v1", versions.versionOf(SubmissionConsentType.PRIVACY_COLLECTION_AND_USE));
        assertEquals("third-party-v1", versions.versionOf(SubmissionConsentType.THIRD_PARTY_PROVISION));
    }

    @Test
    void rejectsInvalidDocumentVersion() {
        assertThrows(
                IllegalArgumentException.class,
                () -> new SubmissionConsentDocumentVersions(" ", "third-party-v1")
        );
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new SubmissionConsentDocumentVersions(
                        "v".repeat(SubmissionConsent.MAX_DOCUMENT_VERSION_LENGTH + 1),
                        "third-party-v1"
                )
        );

        assertEquals(SubmissionErrorCode.INVALID_CONSENT, exception.getErrorCode());
    }

    @Test
    void fakeProviderReturnsVersionsAtServerReferenceTime() {
        Instant referenceTime = Instant.parse("2026-08-23T03:15:00Z");
        SubmissionConsentDocumentVersions versions = new SubmissionConsentDocumentVersions(
                "privacy-v1", "third-party-v1"
        );
        FakeSubmissionConsentDocumentVersionProvider provider =
                new FakeSubmissionConsentDocumentVersionProvider(versions);

        assertEquals(versions, provider.currentAt(referenceTime));
        assertEquals(referenceTime, provider.getLastReferenceTime());
    }
}
