package art.yesulin.infrastructure.submission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.application.submission.consent.SubmissionConsentDocumentMetadata;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class MvpSubmissionConsentDocumentProviderTest {

    private static final Instant REFERENCE_TIME = Instant.parse("2026-09-08T01:23:45Z");

    private final MvpSubmissionConsentDocumentProvider provider = new MvpSubmissionConsentDocumentProvider();

    @Test
    void usesValidatedRecipientNameAndPublishedDocumentVersions() {
        SubmissionConsentDocumentMetadata metadata = provider.currentFor(
                1L,
                "  테스트 극단  ",
                REFERENCE_TIME
        );

        assertEquals("submission-collection-v1.0", metadata.privacyCollectionAndUseVersion());
        assertEquals("submission-third-party-v1.0", metadata.thirdPartyProvisionVersion());
        assertEquals("테스트 극단", metadata.thirdPartyRecipientName());
    }

    @Test
    void rejectsBlankRecipientName() {
        assertThrows(
                IllegalArgumentException.class,
                () -> provider.currentFor(1L, "   ", REFERENCE_TIME)
        );
    }
}
