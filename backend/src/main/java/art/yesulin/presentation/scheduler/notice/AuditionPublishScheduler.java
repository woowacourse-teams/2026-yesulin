package art.yesulin.presentation.scheduler.notice;

import art.yesulin.application.notice.AuditionNoticeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 운영 서버에서 OTR 새 공고를 우리 공고로 자동 게시한 뒤 Slack으로 알린다. 개발 서버의 {@link AuditionNoticeScheduler}는
 * 운영 자동 게시가 안정될 때까지 알림만 계속 보낸다. 운영에서 잠시 멈추려면 {@code YESULIN_NOTICE_SCHEDULER_ENABLED=false}로 끈다.
 */
@Slf4j
@Component
@Profile("prod")
@ConditionalOnProperty(
        prefix = "yesulin.notice", name = "scheduler-enabled", havingValue = "true", matchIfMissing = true
)
@RequiredArgsConstructor
public class AuditionPublishScheduler {

    private final AuditionNoticeService noticeService;

    @Scheduled(cron = "0 */10 9-19 * * *", zone = "Asia/Seoul")
    @Scheduled(cron = "0 0 20 * * *", zone = "Asia/Seoul")
    public void publishAndNotifyAuditions() {
        try {
            noticeService.publishAndNotifyAuditions();
        } catch (RuntimeException exception) {
            log.error("공고 자동 게시·알림 스케줄 실행 중 예외 발생", exception);
        }
    }
}
