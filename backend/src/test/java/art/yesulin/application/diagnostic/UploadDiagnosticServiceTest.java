package art.yesulin.application.diagnostic;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class UploadDiagnosticServiceTest {

    @Test
    void logsOnlyAllowlistedCoarseFields() {
        Logger logger = (Logger) LoggerFactory.getLogger(UploadDiagnosticService.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);

        try {
            new UploadDiagnosticService().record(UUID.fromString("11111111-1111-4111-8111-111111111111"),
                    new UploadDiagnosticCommand(
                            UploadFlow.PROFILE_PHOTO,
                            UploadStage.PUT,
                            1,
                            UploadDiagnosticResult.FAILED,
                            UploadErrorCode.WEBKIT_FILE_NOT_FOUND,
                            null,
                            true,
                            CoarsePlatform.IOS,
                            CoarseBrowser.KAKAO
                    ));

            String log = appender.list.getFirst().getFormattedMessage();
            assertTrue(log.contains("flow=PROFILE_PHOTO"));
            assertTrue(log.contains("incidentId=11111111-1111-4111-8111-111111111111"));
            assertTrue(log.contains("errorCode=WEBKIT_FILE_NOT_FOUND"));
            assertTrue(log.contains("serviceWorkerControlled=true"));
            assertFalse(log.contains("filename"));
            assertFalse(log.contains("uploadUrl"));
            assertFalse(log.contains("userAgent"));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
