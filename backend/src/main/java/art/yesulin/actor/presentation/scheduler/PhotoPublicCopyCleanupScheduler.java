package art.yesulin.actor.presentation.scheduler;

import art.yesulin.actor.application.photolibrary.PhotoPublicCopyService;
import java.util.function.IntSupplier;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 사진에 붙이지 않은 채 하루가 지난 배우 페이지 사진 사본 업로드와, 사진에서 떼어 냈지만 지우지 못한 사본을 매일 새벽에
 * 저장소에서 지운다. 모든 환경에서 실행한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PhotoPublicCopyCleanupScheduler {

    private final PhotoPublicCopyService publicCopyService;

    @Scheduled(cron = "0 0 5 * * *", zone = "Asia/Seoul")
    @SchedulerLock(name = "photoPublicCopyCleanup", lockAtLeastFor = "PT1M")
    public void cleanUp() {
        run("확정하지 않은 배우 페이지 사진 사본 업로드", publicCopyService::deleteUnclaimed);
        run("지우지 못했던 배우 페이지 사진 사본", publicCopyService::retryFailedDeletions);
    }

    private void run(String target, IntSupplier cleanup) {
        try {
            int deleted = cleanup.getAsInt();
            if (deleted > 0) {
                log.info("{} {}개를 지움", target, deleted);
            }
        } catch (RuntimeException exception) {
            log.error("{} 정리 중 예외 발생", target, exception);
        }
    }
}
