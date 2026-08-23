package art.yesulin.support;

import art.yesulin.application.submission.consent.SubmissionConsentDocumentMetadata;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@TestConfiguration
public class SubmissionConsentDocumentTestConfiguration {

    @Bean
    @Primary
    FakeSubmissionConsentDocumentProvider fakeSubmissionConsentDocumentProvider() {
        return new FakeSubmissionConsentDocumentProvider(
                new SubmissionConsentDocumentMetadata(
                        "test-privacy-v1", "test-third-party-v1", "테스트 극단"
                )
        );
    }
}
