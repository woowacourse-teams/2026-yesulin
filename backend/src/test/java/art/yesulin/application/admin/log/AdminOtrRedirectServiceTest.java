package art.yesulin.application.admin.log;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.env.MockEnvironment;

class AdminOtrRedirectServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-30T16:00:00Z");
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 1);

    private final OtrRedirectLogReader reader = mock(OtrRedirectLogReader.class);
    private final MockEnvironment environment = new MockEnvironment();
    private final AdminOtrRedirectService service = new AdminOtrRedirectService(
            reader, Clock.fixed(NOW, ZoneOffset.UTC), environment
    );

    @ParameterizedTest
    @ValueSource(strings = {"dev", "prod"})
    void separatesEnvironmentsAndUsesKoreanDate(String profile) {
        environment.setActiveProfiles(profile);
        LocalDate start = TODAY.minusDays(6);
        when(reader.summarize(start, TODAY)).thenReturn(new OtrRedirectLogSummary(
                List.of(new OtrRedirectCount("22310", 32, NOW), new OtrRedirectCount("22311", 18, NOW)), true, false
        ));

        OtrRedirectReport report = service.findStatistics(7);

        assertThat(report.environment()).isEqualTo(profile.toUpperCase(java.util.Locale.ROOT));
        assertThat(report.startDate()).isEqualTo(start);
        assertThat(report.endDate()).isEqualTo(TODAY);
        assertThat(report.totalClicks()).isEqualTo(50);
        assertThat(report.readAt()).isEqualTo(NOW);
        verify(reader).summarize(start, TODAY);
    }

    @Test
    void distinguishesUnavailableLogsFromZeroClicks() {
        when(reader.summarize(TODAY, TODAY)).thenReturn(new OtrRedirectLogSummary(List.of(), false, false));

        assertThat(service.findStatistics(1).available()).isFalse();
    }

    @Test
    void preservesPartialAggregationFlag() {
        when(reader.summarize(TODAY, TODAY)).thenReturn(new OtrRedirectLogSummary(
                List.of(new OtrRedirectCount("22310", 2, NOW)), true, true
        ));

        OtrRedirectReport report = service.findStatistics(1);

        assertThat(report.totalClicks()).isEqualTo(2);
        assertThat(report.truncated()).isTrue();
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1, 15, 100})
    void rejectsUnboundedPeriods(int days) {
        assertThatThrownBy(() -> service.findStatistics(days)).isInstanceOf(IllegalArgumentException.class);
    }
}
