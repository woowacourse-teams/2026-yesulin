package art.yesulin.auditionpost.application;

public enum AuditionPostSort {
    LATEST,
    DEADLINE;

    public static AuditionPostSort from(String value) {
        if ("latest".equals(value)) {
            return LATEST;
        }
        if ("deadline".equals(value)) {
            return DEADLINE;
        }
        throw new IllegalArgumentException("공고 정렬은 latest 또는 deadline이어야 합니다.");
    }
}
