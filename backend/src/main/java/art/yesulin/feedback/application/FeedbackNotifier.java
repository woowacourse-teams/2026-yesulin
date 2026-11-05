package art.yesulin.feedback.application;

/** 커밋된 의견을 팀에 알린다. 전송 실패는 접수 결과에 영향을 주지 않는다. */
public interface FeedbackNotifier {

    void notifySubmitted(FeedbackSubmittedEvent event);
}
