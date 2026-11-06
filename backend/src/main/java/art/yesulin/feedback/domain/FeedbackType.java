package art.yesulin.feedback.domain;

/** 사용자가 고른 의견 종류. 슬랙 알림과 집계에 쓴다. */
public enum FeedbackType {
    INCONVENIENCE("불편해요"),
    BUG("오류예요"),
    SUGGESTION("제안해요");

    private final String label;

    FeedbackType(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
