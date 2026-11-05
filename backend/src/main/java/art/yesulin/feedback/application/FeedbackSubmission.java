package art.yesulin.feedback.application;

import art.yesulin.feedback.domain.FeedbackPage;
import art.yesulin.feedback.domain.FeedbackType;

/** 화면에서 받은 의견과 보낸 사람의 로그인 구분. 비회원은 writer가 GUEST다. */
public record FeedbackSubmission(FeedbackType type, String content, String contact, FeedbackPage page,
                                 Long memberId, FeedbackWriter writer) {
}
