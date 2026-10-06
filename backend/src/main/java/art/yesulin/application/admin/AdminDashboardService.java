package art.yesulin.application.admin;

import art.yesulin.domain.admin.AdminAuditLog;
import art.yesulin.domain.admin.AdminAuditLogRepository;
import art.yesulin.domain.admin.query.AdminActivity;
import art.yesulin.domain.admin.query.AdminActivityEvent;
import art.yesulin.domain.admin.query.AdminAuditionRow;
import art.yesulin.domain.admin.query.AdminDailyActivity;
import art.yesulin.domain.admin.query.AdminDashboardRepository;
import art.yesulin.domain.admin.query.AdminMemberStats;
import art.yesulin.domain.admin.query.AdminOverview;
import art.yesulin.domain.admin.query.AdminProducerRow;
import art.yesulin.domain.admin.query.AdminShowRow;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.show.ShowStatus;
import art.yesulin.legacy.domain.audition.AuditionStatus;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private static final Duration RECENT_WINDOW = Duration.ofDays(7);
    private static final Duration MONTH_WINDOW = Duration.ofDays(30);
    /** 운영 대시보드의 날짜 경계는 한국 시간 자정이다. */
    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    static final int ACTIVITY_DAYS = 14;
    private static final int AUDIT_LOG_PAGE_SIZE = 10;

    private final AdminDashboardRepository adminDashboardRepository;
    private final AdminAuditLogRepository adminAuditLogRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public AdminOverview findOverview() {
        return adminDashboardRepository.findOverview(Instant.now(clock).minus(RECENT_WINDOW));
    }

    @Transactional(readOnly = true)
    public AdminMemberStats findMemberStats() {
        Instant now = Instant.now(clock);
        Instant todayStart = LocalDate.ofInstant(now, KOREA).atStartOfDay(KOREA).toInstant();
        return adminDashboardRepository.findMemberStats(todayStart, now.minus(RECENT_WINDOW), now.minus(MONTH_WINDOW));
    }

    /** 오늘을 포함한 최근 14일을 한국 날짜로 나눠 센다. 활동이 없는 날도 0으로 채운다. */
    @Transactional(readOnly = true)
    public AdminActivity findActivity() {
        LocalDate today = LocalDate.ofInstant(Instant.now(clock), KOREA);
        LocalDate firstDay = today.minusDays(ACTIVITY_DAYS - 1L);
        Instant from = firstDay.atStartOfDay(KOREA).toInstant();

        Map<LocalDate, Long> applicantSignups = countByDate(
                adminDashboardRepository.findSignups(MemberType.APPLICANT, from), event -> 1L);
        Map<LocalDate, Long> producerSignups = countByDate(
                adminDashboardRepository.findSignups(MemberType.PRODUCER, from), event -> 1L);
        Map<LocalDate, Long> submissions = countByDate(adminDashboardRepository.findSubmissions(from), event -> 1L);
        Map<LocalDate, Long> otrSubmissions = countByDate(
                adminDashboardRepository.findOtrSubmissions(from), event -> 1L);
        List<AdminActivityEvent> reservations = adminDashboardRepository.findConfirmedReservations(from);
        Map<LocalDate, Long> reservationCounts = countByDate(reservations, event -> 1L);
        Map<LocalDate, Long> reservedTickets = countByDate(reservations, AdminActivityEvent::quantity);

        return new AdminActivity(firstDay.datesUntil(today.plusDays(1))
                .map(date -> new AdminDailyActivity(
                        date,
                        applicantSignups.getOrDefault(date, 0L),
                        producerSignups.getOrDefault(date, 0L),
                        submissions.getOrDefault(date, 0L),
                        otrSubmissions.getOrDefault(date, 0L),
                        reservationCounts.getOrDefault(date, 0L),
                        reservedTickets.getOrDefault(date, 0L)
                ))
                .toList());
    }

    @Transactional(readOnly = true)
    public List<AdminProducerRow> findProducers(MemberStatus status) {
        return adminDashboardRepository.findProducers(status);
    }

    @Transactional(readOnly = true)
    public List<AdminAuditionRow> findAuditions(AuditionStatus status) {
        return adminDashboardRepository.findAuditions(status);
    }

    @Transactional(readOnly = true)
    public List<AdminShowRow> findShows(ShowStatus status) {
        return adminDashboardRepository.findShows(status);
    }

    @Transactional(readOnly = true)
    public Page<AdminAuditLog> findAuditLogs(int page) {
        PageRequest pageable = PageRequest.of(
                page,
                AUDIT_LOG_PAGE_SIZE,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))
        );
        return adminAuditLogRepository.findAll(pageable);
    }

    private static Map<LocalDate, Long> countByDate(
            List<AdminActivityEvent> events,
            Function<AdminActivityEvent, Long> quantity
    ) {
        return events.stream().collect(Collectors.groupingBy(
                event -> LocalDate.ofInstant(event.occurredAt(), KOREA),
                Collectors.summingLong(quantity::apply)
        ));
    }
}
