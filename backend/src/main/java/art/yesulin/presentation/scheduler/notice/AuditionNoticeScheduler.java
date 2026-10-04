package art.yesulin.presentation.scheduler.notice;

import art.yesulin.application.notice.AuditionNoticeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 운영 서버에서만 OTR 새 공고를 읽어 자동 게시와 Slack 알림을 한다. 개발·로컬은 관리자 화면에서 직접 가져온다.
 * 운영에서 잠시 멈춰야 하면 {@code YESULIN_NOTICE_SCHEDULER_ENABLED=false}로 끈다.
 */
@Slf4j
@Component
@Profile("prod")
@ConditionalOnProperty(
        prefix = "yesulin.notice", name = "scheduler-enabled", havingValue = "true", matchIfMissing = true
)
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
