package art.yesulin.company.presentation.scheduler;

import art.yesulin.company.application.photo.CompanyPhotoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** 공연사 정보나 수정 요청에 넣지 않은 채 하루가 지난 사진 업로드를 매일 새벽에 저장소에서 지운다. 모든 환경에서 실행한다. */
@Slf4j
@Component
@RequiredArgsConstructor
public class CompanyPhotoUploadCleanupScheduler {

    private final CompanyPhotoService photoService;

    @Scheduled(cron = "0 40 4 * * *", zone = "Asia/Seoul")
    @SchedulerLock(name = "companyPhotoUploadCleanup", lockAtLeastFor = "PT1M")
    public void deleteUnclaimedUploads() {
        try {
            int deleted = photoService.deleteUnclaimed();
            if (deleted > 0) {
                log.info("확정하지 않은 공연사 사진 업로드 {}개를 지움", deleted);
            }
        } catch (RuntimeException exception) {
            log.error("공연사 사진 업로드 정리 중 예외 발생", exception);
        }
    }
}
