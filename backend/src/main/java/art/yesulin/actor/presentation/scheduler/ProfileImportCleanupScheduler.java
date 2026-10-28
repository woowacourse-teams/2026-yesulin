package art.yesulin.actor.presentation.scheduler;

import art.yesulin.actor.application.profileimport.ProfileImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** PDF로 채우기 결과가 나온 뒤 24시간이 지나면 원본 PDF·추출 본문·이미지를 지운다. 30분마다 확인한다. */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class ProfileImportCleanupScheduler {

    private final ProfileImportService profileImportService;

    @Scheduled(cron = "0 */30 * * * *", zone = "Asia/Seoul")
    @SchedulerLock(name = "profileImportCleanup", lockAtLeastFor = "PT1M")
    public void cleanUp() {
        try {
            int deleted = profileImportService.deleteExpired();
            if (deleted > 0) {
                log.info("보관 기간이 지난 PDF로 채우기 결과 {}개를 지움", deleted);
            }
        } catch (RuntimeException exception) {
            log.error("PDF로 채우기 결과 정리 중 예외 발생", exception);
        }
    }
}
