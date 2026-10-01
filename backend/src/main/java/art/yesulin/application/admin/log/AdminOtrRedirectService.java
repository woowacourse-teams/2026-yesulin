package art.yesulin.application.admin.log;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminOtrRedirectService {

    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");

    private final OtrRedirectLogReader logReader;
    private final Clock clock;
    private final Environment environment;

    public OtrRedirectReport findStatistics(int days) {
        if (days < 1 || days > 14) {
            throw new IllegalArgumentException("공고 이동 집계 기간은 1~14일이어야 합니다.");
        }
        Instant readAt = clock.instant();
        LocalDate endDate = LocalDate.ofInstant(readAt, KOREA);
        LocalDate startDate = endDate.minusDays(days - 1L);
        OtrRedirectLogSummary summary = logReader.summarize(startDate, endDate);
        long totalClicks = summary.links().stream().mapToLong(OtrRedirectCount::clicks).sum();
        return new OtrRedirectReport(
                currentEnvironment(), startDate, endDate, totalClicks, summary.links(),
                summary.available(), summary.truncated(), readAt
        );
    }

    private String currentEnvironment() {
        if (Arrays.asList(environment.getActiveProfiles()).contains("prod")) {
            return "PROD";
        }
        if (Arrays.asList(environment.getActiveProfiles()).contains("dev")) {
            return "DEV";
        }
        return "LOCAL";
    }
}
