package art.yesulin.feedback.application;

import art.yesulin.feedback.domain.Feedback;
import art.yesulin.feedback.domain.FeedbackImage;
import art.yesulin.feedback.domain.FeedbackRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** 의견을 저장하고, 커밋된 뒤 알림을 보내도록 이벤트를 남긴다. 이미지 업로드는 이 트랜잭션 밖에서 끝낸다. */
@Component
@RequiredArgsConstructor
class FeedbackRecorder {

    private final FeedbackRepository repository;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;

    @Transactional
    public long record(FeedbackSubmission submission, List<FeedbackImage> images) {
        Feedback feedback = repository.save(new Feedback(submission.type(), submission.content(),
                submission.contact(), submission.page(), submission.memberId(), Instant.now(clock), images));
        eventPublisher.publishEvent(new FeedbackSubmittedEvent(feedback.getId(), feedback.getType(),
                feedback.getContent(), feedback.getPagePath(), submission.writer(), feedback.hasContact(),
                feedback.imageCount()));
        return feedback.getId();
    }
}
