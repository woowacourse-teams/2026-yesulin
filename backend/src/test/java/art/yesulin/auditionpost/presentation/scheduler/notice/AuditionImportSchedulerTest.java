package art.yesulin.auditionpost.presentation.scheduler.notice;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import art.yesulin.auditionpost.application.notice.AuditionNoticeService;
import art.yesulin.global.scheduling.GlobalSchedulingConfiguration;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

class AuditionImportSchedulerTest {

    @Test
    void runsEveryTenMinutesFromNineThroughTwentyInKorea() throws NoSuchMethodException {
        Scheduled[] schedules = AuditionImportScheduler.class
                .getMethod("importAndNotifyAuditions")
                .getAnnotationsByType(Scheduled.class);

        assertEquals(List.of("0 */10 9-19 * * *", "0 0 20 * * *"),
                Arrays.stream(schedules).map(Scheduled::cron).toList());
        assertTrue(Arrays.stream(schedules).allMatch(schedule -> "Asia/Seoul".equals(schedule.zone())));
    }

    @Test
    void enablesSchedulingGloballyButRunsImportOnlyInProd() {
        Profile schedulerProfile = AuditionImportScheduler.class.getAnnotation(Profile.class);
        assertArrayEquals(new String[] {"prod"}, schedulerProfile.value());
        assertNull(GlobalSchedulingConfiguration.class.getAnnotation(Profile.class));
        assertNotNull(GlobalSchedulingConfiguration.class.getAnnotation(EnableScheduling.class));
    }

    @Test
    void delegatesToNoticeServiceAndKeepsLaterRunsAvailableAfterFailure() {
        AuditionNoticeService service = mock(AuditionNoticeService.class);
        AuditionImportScheduler scheduler = new AuditionImportScheduler(service);
        doThrow(new IllegalStateException("database unavailable")).doNothing().when(service).importAndNotifyAuditions();

        assertDoesNotThrow(scheduler::importAndNotifyAuditions);
        assertDoesNotThrow(scheduler::importAndNotifyAuditions);

        verify(service, times(2)).importAndNotifyAuditions();
    }
}
