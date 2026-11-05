package art.yesulin.feedback.application;

import art.yesulin.feedback.domain.FeedbackType;

/** 저장된 의견의 알림 내용. 연락처 원문은 담지 않고 남겼는지만 알린다. */
public record FeedbackSubmittedEvent(long feedbackId, FeedbackType type, String content, String pagePath,
                                     FeedbackWriter writer, boolean contactLeft) {
}
