package art.yesulin.community.application;

import art.yesulin.community.domain.CommunityReport;
import art.yesulin.community.domain.CommunityReportRepository;
import java.time.Clock;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommunityReportDelivery {

    private final CommunityReportRepository reports;
    private final CommunityReportNotifier notifier;
    private final Clock clock;

    @Transactional
    public void deliver(long id) {
        reports.lockById(id).filter(report -> report.isDue(clock.instant())).ifPresent(this::send);
    }

    private void send(CommunityReport report) {
        try {
            notifier.send(CommunityReportNotice.from(report));
            report.delivered(clock.instant());
        } catch (RuntimeException exception) {
            report.retryLater(clock.instant());
            log.warn("COMMUNITY_REPORT_NOTIFICATION_FAILED reportId={} attempts={}",
                    report.getId(), report.getAttempts());
        }
    }
}
