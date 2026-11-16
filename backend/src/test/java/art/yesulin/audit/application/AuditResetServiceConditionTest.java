package art.yesulin.audit.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import art.yesulin.audit.domain.AuditApplicantRepository;
import art.yesulin.audit.domain.AuditRepository;
import art.yesulin.pdfextraction.application.PdfExtractionStorage;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPayloadRepository;
import art.yesulin.pdfextraction.domain.ai.PdfAiJobRepository;
import java.time.Clock;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class AuditResetServiceConditionTest {

    private static final String EXTRACTION = "yesulin.pdf-extraction.enabled=true";
    private static final String RESET = "yesulin.pdf-review.reset-enabled=true";

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(AuditResetService.class)
            .withBean(AuditRepository.class, () -> mock(AuditRepository.class))
            .withBean(AuditApplicantRepository.class, () -> mock(AuditApplicantRepository.class))
            .withBean(PdfExtractionJobRepository.class, () -> mock(PdfExtractionJobRepository.class))
            .withBean(PdfExtractionPayloadRepository.class, () -> mock(PdfExtractionPayloadRepository.class))
            .withBean(PdfAiJobRepository.class, () -> mock(PdfAiJobRepository.class))
            .withBean(PdfExtractionStorage.class, () -> mock(PdfExtractionStorage.class))
            .withBean(Clock.class, Clock::systemUTC);

    @Test
    void registeredOnlyInDevOrLocalWithResetEnabled() {
        runner.withPropertyValues("spring.profiles.active=dev", EXTRACTION, RESET)
                .run(context -> assertThat(context).hasSingleBean(AuditResetService.class));
        runner.withPropertyValues("spring.profiles.active=local", EXTRACTION, RESET)
                .run(context -> assertThat(context).hasSingleBean(AuditResetService.class));
    }

    @Test
    void prodNeverRegistersEvenWhenResetIsForcedOn() {
        runner.withPropertyValues("spring.profiles.active=prod", EXTRACTION, RESET)
                .run(context -> assertThat(context).doesNotHaveBean(AuditResetService.class));
    }

    @Test
    void devWithoutResetFlagDoesNotRegister() {
        runner.withPropertyValues("spring.profiles.active=dev", EXTRACTION)
                .run(context -> assertThat(context).doesNotHaveBean(AuditResetService.class));
    }
}
