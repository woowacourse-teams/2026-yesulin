package art.yesulin.auditionpost.presentation.scheduler.notice;

import art.yesulin.auditionpost.application.notice.AuditionNoticeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 운영 서버에서 OTR 새 공고를 우리 공고로 숨긴 채 가져온 뒤 Slack으로 알린다. 개발 서버는 공고를 수집·알림하지 않는다.
 * 운영에서 잠시 멈추려면 {@code YESULIN_NOTICE_SCHEDULER_ENABLED=false}로 끈다.
 */
@Slf4j
@Component
@Profile("prod")
@ConditionalOnProperty(
        prefix = "yesulin.notice", name = "scheduler-enabled", havingValue = "true", matchIfMissing = true
)
@RequiredArgsConstructor
public class AuditionImportScheduler {

    private final AuditionNoticeService noticeService;

    @Scheduled(cron = "0 */10 9-19 * * *", zone = "Asia/Seoul")
    @Scheduled(cron = "0 0 20 * * *", zone = "Asia/Seoul")
    public void importAndNotifyAuditions() {
        try {
            noticeService.importAndNotifyAuditions();
        } catch (RuntimeException exception) {
            log.error("공고 자동 가져오기·알림 스케줄 실행 중 예외 발생", exception);
        }
    }
}
