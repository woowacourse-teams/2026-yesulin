package art.yesulin.application.admin.log;

import java.time.LocalDate;

public interface OtrRedirectLogReader {

    OtrRedirectLogSummary summarize(LocalDate startDate, LocalDate endDate);
}
