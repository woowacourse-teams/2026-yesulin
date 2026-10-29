package art.yesulin.event.domain;

/** 행사 진행 상태와 분리한 참가 신청의 접수 상태. */
public enum EventRegistrationStatus {
    OPEN,
    CLOSED,
    FULL,
    ENDED,
    DISABLED
}
