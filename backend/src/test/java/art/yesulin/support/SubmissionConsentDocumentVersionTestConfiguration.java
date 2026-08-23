package art.yesulin.support;

import art.yesulin.application.submission.consent.SubmissionConsentDocumentVersions;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@TestConfiguration
public class SubmissionConsentDocumentVersionTestConfiguration {

    @Bean
    @Primary
    FakeSubmissionConsentDocumentVersionProvider fakeSubmissionConsentDocumentVersionProvider() {
        return new FakeSubmissionConsentDocumentVersionProvider(
                new SubmissionConsentDocumentVersions("test-privacy-v1", "test-third-party-v1")
        );
    }
}
