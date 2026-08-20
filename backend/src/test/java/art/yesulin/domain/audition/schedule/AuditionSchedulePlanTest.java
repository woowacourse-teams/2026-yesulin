package art.yesulin.domain.audition.schedule;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.AuditionErrorCode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class AuditionSchedulePlanTest {

    @Test
    void recruitmentMustEndAfterItStarts() {
        Instant startAt = Instant.parse("2026-09-01T09:00:00Z");

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new RecruitmentPeriod(startAt, startAt)
        );

        assertEquals(AuditionErrorCode.INVALID_SCHEDULE, exception.getErrorCode());
    }

    @Test
    void allowsUpToFiveScreeningStages() {
        List<ScreeningStagePlan> stages = List.of(
                stage(null, "1차", LocalDate.of(2026, 9, 10)),
                stage(null, "2차", LocalDate.of(2026, 9, 11)),
                stage(null, "3차", LocalDate.of(2026, 9, 12)),
                stage(null, "4차", LocalDate.of(2026, 9, 13)),
                stage(null, "5차", LocalDate.of(2026, 9, 14))
        );

        ScreeningStagePlans plans = new ScreeningStagePlans(stages);

        assertEquals(5, plans.values().size());
    }

    @Test
    void rejectsDuplicateExistingStageIds() {
        List<ScreeningStagePlan> stages = List.of(
                stage(1L, "1차", LocalDate.of(2026, 9, 10)),
                stage(1L, "2차", LocalDate.of(2026, 9, 11))
        );

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new ScreeningStagePlans(stages)
        );

        assertEquals(AuditionErrorCode.INVALID_SCHEDULE, exception.getErrorCode());
    }

    @Test
    void rejectsStagesWhoseDatesGoBackwards() {
        List<ScreeningStagePlan> stages = List.of(
                stage(null, "1차", LocalDate.of(2026, 9, 11)),
                stage(null, "2차", LocalDate.of(2026, 9, 10))
        );

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new ScreeningStagePlans(stages)
        );

        assertEquals(AuditionErrorCode.INVALID_SCHEDULE, exception.getErrorCode());
    }

    @Test
    void rejectsMoreThanFiveScreeningStages() {
        List<ScreeningStagePlan> stages = List.of(
                stage(null, "1차", LocalDate.of(2026, 9, 10)),
                stage(null, "2차", LocalDate.of(2026, 9, 11)),
                stage(null, "3차", LocalDate.of(2026, 9, 12)),
                stage(null, "4차", LocalDate.of(2026, 9, 13)),
                stage(null, "5차", LocalDate.of(2026, 9, 14)),
                stage(null, "6차", LocalDate.of(2026, 9, 15))
        );

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new ScreeningStagePlans(stages)
        );

        assertEquals(AuditionErrorCode.INVALID_SCHEDULE, exception.getErrorCode());
    }

    private ScreeningStagePlan stage(Long id, String name, LocalDate date) {
        return new ScreeningStagePlan(id, name, date, "시간을 준수해 주세요.");
    }
}
