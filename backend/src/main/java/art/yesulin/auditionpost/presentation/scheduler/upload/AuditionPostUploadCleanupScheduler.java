package art.yesulin.auditionpost.presentation.scheduler.upload;

import art.yesulin.auditionpost.application.AuditionPostUploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** 공고에 넣지 않은 채 하루가 지난 사진·첨부 업로드를 매일 새벽에 저장소에서 지운다. 모든 환경에서 실행한다. */
@Slf4j
@Component
@RequiredArgsConstructor
public class AuditionPostUploadCleanupScheduler {

    private final AuditionPostUploadService uploadService;

    @Scheduled(cron = "0 30 4 * * *", zone = "Asia/Seoul")
    public void deleteUnclaimedUploads() {
        try {
            int deleted = uploadService.deleteUnclaimed();
            if (deleted > 0) {
                log.info("확정하지 않은 공고 업로드 {}개를 지움", deleted);
            }
        } catch (RuntimeException exception) {
            log.error("공고 업로드 정리 중 예외 발생", exception);
        }
    }
}
