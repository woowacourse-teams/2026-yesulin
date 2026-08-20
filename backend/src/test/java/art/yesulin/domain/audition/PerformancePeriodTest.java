package art.yesulin.domain.audition;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.common.exception.BusinessException;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class PerformancePeriodTest {

    @Test
    void derivesOpenRunWhenEndDateIsMissing() {
        PerformancePeriod period = new PerformancePeriod(LocalDate.of(2026, 9, 1), null);

        assertTrue(period.isOpenRun());
    }

    @Test
    void rejectsEndDateBeforeStartDate() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new PerformancePeriod(LocalDate.of(2026, 9, 2), LocalDate.of(2026, 9, 1))
        );

        assertEquals(AuditionErrorCode.INVALID_BASIC_INFORMATION, exception.getErrorCode());
    }
}
