package art.yesulin.feedback.application;

import art.yesulin.feedback.domain.Feedback;
import art.yesulin.feedback.domain.FeedbackType;
import java.time.Instant;
import java.util.List;

/** 운영자 화면의 의견 한 건. 회원 번호가 없으면 비회원이 보낸 의견이다. */
public record AdminFeedbackItem(long id, FeedbackType type, String content, String contact, String pagePath,
                                Long memberId, String userAgent, Instant createdAt, List<String> imageUrls) {

    static AdminFeedbackItem of(Feedback feedback, List<String> imageUrls) {
        return new AdminFeedbackItem(feedback.getId(), feedback.getType(), feedback.getContent(),
                feedback.getContact(), feedback.getPagePath(), feedback.getMemberId(), feedback.getUserAgent(),
                feedback.getCreatedAt(), imageUrls);
    }
}
