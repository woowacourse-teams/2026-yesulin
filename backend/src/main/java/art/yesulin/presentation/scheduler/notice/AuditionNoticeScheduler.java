package art.yesulin.presentation.scheduler.notice;

import art.yesulin.application.notice.AuditionNoticeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Profile("dev")
@RequiredArgsConstructor
public class AuditionNoticeScheduler {

    private final AuditionNoticeService noticeService;

    @Scheduled(cron = "0 */10 9-19 * * *", zone = "Asia/Seoul")
    @Scheduled(cron = "0 0 20 * * *", zone = "Asia/Seoul")
    public void notifyAuditions() {
        try {
            noticeService.notifyAuditions();
        } catch (RuntimeException exception) {
            log.error("공고 알림 스케줄 실행 중 예외 발생", exception);
        }
    }
}
