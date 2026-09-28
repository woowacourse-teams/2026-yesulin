package art.yesulin.presentation.scheduling.file;

import art.yesulin.application.file.report.UnusedFileReportService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UnusedFileReportScheduler {

    private static final Logger LOGGER = LoggerFactory.getLogger(UnusedFileReportScheduler.class);

    private final UnusedFileReportService reportService;

    @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Seoul")
    public void runDailyReport() {
        try {
            reportService.generate();
        } catch (Exception exception) {
            LOGGER.error("UNUSED_FILE_REPORT_FAILED reason={}", exception.getClass().getSimpleName(), exception);
        }
    }
}
