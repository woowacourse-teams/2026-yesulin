package art.yesulin.application.file.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import art.yesulin.domain.file.FileStatus;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.stream.LongStream;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.slf4j.LoggerFactory;

class UnusedFileReportServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-28T00:00:00Z");
    private static final Instant CUTOFF = Instant.parse("2026-09-21T00:00:00Z");
    private static final Instant OLD = Instant.parse("2026-09-20T00:00:00Z");

    private final UnusedFileCandidateReader reader = Mockito.mock(UnusedFileCandidateReader.class);
    private final UnusedFileReportService service = new UnusedFileReportService(
            reader, Clock.fixed(NOW, ZoneOffset.UTC)
    );

    @Test
    void reportsEveryPageWithFixedSevenDayCutoffAndStatusCounts() {
        List<UnusedFileCandidate> firstPage = LongStream.rangeClosed(1L, 500L)
                .mapToObj(id -> new UnusedFileCandidate(
                        id,
                        id % 2 == 0 ? FileStatus.READY : FileStatus.PENDING,
                        OLD
                ))
                .toList();
        UnusedFileCandidate lastCandidate = new UnusedFileCandidate(501L, FileStatus.READY, CUTOFF);
        when(reader.readPage(CUTOFF, Optional.empty(), 500)).thenReturn(firstPage);
        when(reader.readPage(CUTOFF, Optional.of(new UnusedFileCursor(OLD, 500L)), 500))
                .thenReturn(List.of(lastCandidate));
        Logger logger = (Logger) LoggerFactory.getLogger(UnusedFileReportService.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);

        try {
            UnusedFileReportSummary summary = service.generate();

            assertEquals(new UnusedFileReportSummary(CUTOFF, 250, 251), summary);
            assertEquals(502, appender.list.size());
            assertTrue(appender.list.getFirst().getFormattedMessage().contains("fileId=1"));
            assertTrue(appender.list.getFirst().getFormattedMessage().contains("status=PENDING"));
            assertTrue(appender.list.getLast().getFormattedMessage().contains("total=501"));
            verify(reader).readPage(CUTOFF, Optional.of(new UnusedFileCursor(OLD, 500L)), 500);
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
