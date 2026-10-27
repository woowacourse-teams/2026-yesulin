package art.yesulin.community.presentation;

import art.yesulin.community.application.CommunityReportDelivery;
import art.yesulin.community.application.CommunityReportNotifier;
import art.yesulin.community.domain.CommunityReportRepository;
import java.time.Clock;
import lombok.RequiredArgsConstructor;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "yesulin.community.notifications-enabled", havingValue = "true", matchIfMissing = true)
public class CommunityReportScheduler {

    private final CommunityReportRepository reports;
    private final CommunityReportDelivery delivery;
    private final CommunityReportNotifier notifier;
    private final Clock clock;

    @Scheduled(fixedDelay = 5000)
    @SchedulerLock(name = "communityReports", lockAtMostFor = "PT2M")
    public void deliverPending() {
        if (!notifier.enabled()) {
            return;
        }
        reports.pending(clock.instant(), PageRequest.of(0, 10)).forEach(delivery::deliver);
    }
}
