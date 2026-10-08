package art.yesulin.operation.domain.query;

import java.time.LocalDate;

/**
 * 한국 날짜 하루의 활동 수다. 예매는 그날 생성돼 현재 확정 상태인 예매만 센다.
 */
public record AdminDailyActivity(
        LocalDate date,
        long applicantSignups,
        long producerSignups,
        long submissions,
        long otrSubmissions,
        long reservations,
        long reservedTickets
) {
}
