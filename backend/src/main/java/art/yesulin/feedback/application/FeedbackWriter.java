package art.yesulin.feedback.application;

import art.yesulin.auth.domain.member.MemberType;

/** 알림에서 누가 보냈는지 구분만 한다. 회원 번호나 이름은 알림에 넣지 않는다. */
public enum FeedbackWriter {
    APPLICANT("배우"),
    PRODUCER("공연사"),
    ADMIN("운영자"),
    GUEST("비회원");

    private final String label;

    FeedbackWriter(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    public static FeedbackWriter from(MemberType role) {
        return switch (role) {
            case APPLICANT -> APPLICANT;
            case PRODUCER -> PRODUCER;
            case ADMIN -> ADMIN;
        };
    }
}
