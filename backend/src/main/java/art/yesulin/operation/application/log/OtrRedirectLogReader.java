package art.yesulin.operation.application.log;

import java.time.LocalDate;

public interface OtrRedirectLogReader {

    OtrRedirectLogSummary summarize(LocalDate startDate, LocalDate endDate);
}
