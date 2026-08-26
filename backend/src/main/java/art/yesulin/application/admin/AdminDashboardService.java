package art.yesulin.application.admin;

import art.yesulin.domain.admin.AdminAuditLog;
import art.yesulin.domain.admin.AdminAuditLogRepository;
import art.yesulin.domain.admin.query.AdminAuditionRow;
import art.yesulin.domain.admin.query.AdminDashboardRepository;
import art.yesulin.domain.admin.query.AdminOverview;
import art.yesulin.domain.admin.query.AdminProducerRow;
import art.yesulin.domain.audition.AuditionStatus;
import art.yesulin.domain.member.MemberStatus;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private static final Duration RECENT_WINDOW = Duration.ofDays(7);
    private static final int AUDITION_LIST_LIMIT = 100;
    private static final int AUDIT_LOG_LIMIT = 50;

    private final AdminDashboardRepository adminDashboardRepository;
    private final AdminAuditLogRepository adminAuditLogRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public AdminOverview findOverview() {
        return adminDashboardRepository.findOverview(Instant.now(clock).minus(RECENT_WINDOW));
    }

    @Transactional(readOnly = true)
    public List<AdminProducerRow> findProducers(MemberStatus status) {
        return adminDashboardRepository.findProducers(status);
    }

    @Transactional(readOnly = true)
    public List<AdminAuditionRow> findAuditions(AuditionStatus status) {
        return adminDashboardRepository.findAuditions(status, AUDITION_LIST_LIMIT);
    }

    @Transactional(readOnly = true)
    public List<AdminAuditLog> findRecentAuditLogs() {
        return adminAuditLogRepository.findAllByOrderByCreatedAtDesc(Limit.of(AUDIT_LOG_LIMIT));
    }
}
