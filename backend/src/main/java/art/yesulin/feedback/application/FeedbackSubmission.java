package art.yesulin.feedback.application;

import art.yesulin.feedback.domain.FeedbackPage;
import art.yesulin.feedback.domain.FeedbackType;
import java.util.List;

/** 화면에서 받은 의견과 보낸 사람의 로그인 구분. 비회원은 writer가 GUEST다. 이미지가 없으면 빈 목록이다. */
public record FeedbackSubmission(FeedbackType type, String content, String contact, FeedbackPage page,
                                 Long memberId, FeedbackWriter writer, List<FeedbackImageFile> images) {

    public FeedbackSubmission {
        images = List.copyOf(images);
    }

    public FeedbackSubmission(FeedbackType type, String content, String contact, FeedbackPage page,
                              Long memberId, FeedbackWriter writer) {
        this(type, content, contact, page, memberId, writer, List.of());
    }
}
