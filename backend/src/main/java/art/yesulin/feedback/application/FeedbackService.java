package art.yesulin.feedback.application;

import art.yesulin.feedback.domain.Feedback;
import art.yesulin.feedback.domain.FeedbackErrorCode;
import art.yesulin.feedback.domain.FeedbackRepository;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository repository;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;
    private final FeedbackRateLimiter rateLimiter;

    /** 의견을 저장하고, 커밋된 뒤 알림을 보내도록 이벤트를 남긴다. 같은 접속 주소의 잦은 전송은 거절한다. */
    @Transactional
    public long submit(FeedbackSubmission submission, String clientKey) {
        if (!rateLimiter.tryAcquire(clientKey)) {
            throw new BusinessException(FeedbackErrorCode.TOO_FREQUENT, "잠시 후 다시 보내 주세요.");
        }
        Feedback feedback = repository.save(new Feedback(submission.type(), submission.content(),
                submission.contact(), submission.page(), submission.memberId(), Instant.now(clock)));
        eventPublisher.publishEvent(new FeedbackSubmittedEvent(feedback.getId(), feedback.getType(),
                feedback.getContent(), feedback.getPagePath(), submission.writer(), feedback.hasContact()));
        return feedback.getId();
    }
}
