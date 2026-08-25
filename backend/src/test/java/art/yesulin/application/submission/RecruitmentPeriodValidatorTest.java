package art.yesulin.application.submission;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.application.submission.form.SubmissionFormDefinition;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.SubmissionErrorCode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RecruitmentPeriodValidatorTest {

    private static final Instant START_AT = Instant.parse("2026-09-01T00:00:00Z");
    private static final Instant END_AT = Instant.parse("2026-09-10T00:00:00Z");

    private final RecruitmentPeriodValidator validator = new RecruitmentPeriodValidator();

    @Test
    void acceptsFromStartUntilBeforeEnd() {
        SubmissionAudition audition = audition();

        assertDoesNotThrow(() -> validator.validate(audition, START_AT));
        assertDoesNotThrow(() -> validator.validate(audition, END_AT.minusNanos(1)));
    }

    @Test
    void rejectsBeforeStartAndAtEnd() {
        BusinessException beforeStart = assertThrows(
                BusinessException.class,
                () -> validator.validate(audition(), START_AT.minusNanos(1))
        );
        BusinessException atEnd = assertThrows(
                BusinessException.class,
                () -> validator.validate(audition(), END_AT)
        );

        assertEquals(SubmissionErrorCode.RECRUITMENT_CLOSED, beforeStart.getErrorCode());
        assertEquals(SubmissionErrorCode.RECRUITMENT_CLOSED, atEnd.getErrorCode());
    }

    private SubmissionAudition audition() {
        return new SubmissionAudition(
                1L,
                UUID.randomUUID(),
                "햄릿 오디션",
                "햄릿",
                "테스트 극단",
                1L,
                2L,
                START_AT,
                END_AT,
                false,
                List.of(),
                emptyForm()
        );
    }

    private SubmissionFormDefinition emptyForm() {
        return new SubmissionFormDefinition(List.of(), List.of(), List.of(), List.of(), List.of());
    }
}
