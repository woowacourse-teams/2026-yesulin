package art.yesulin.presentation.scheduling.file;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import art.yesulin.application.file.report.UnusedFileReportService;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;

class UnusedFileReportSchedulerTest {

    private final UnusedFileReportService service = Mockito.mock(UnusedFileReportService.class);
    private final UnusedFileReportScheduler scheduler = new UnusedFileReportScheduler(service);

    @Test
    void runsEveryDayAtThreeInKorea() throws NoSuchMethodException {
        Scheduled schedule = UnusedFileReportScheduler.class
                .getMethod("runDailyReport")
                .getAnnotation(Scheduled.class);

        assertEquals("0 0 3 * * *", schedule.cron());
        assertEquals("Asia/Seoul", schedule.zone());
    }

    @Test
    void recordsFailureWithoutStoppingLaterRuns() {
        when(service.generate()).thenThrow(new IllegalStateException("database unavailable"));
        Logger logger = (Logger) LoggerFactory.getLogger(UnusedFileReportScheduler.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);

        try {
            assertDoesNotThrow(scheduler::runDailyReport);
            assertDoesNotThrow(scheduler::runDailyReport);

            verify(service, Mockito.times(2)).generate();
            assertEquals(2, appender.list.size());
            assertTrue(appender.list.getFirst().getFormattedMessage().contains("UNUSED_FILE_REPORT_FAILED"));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
