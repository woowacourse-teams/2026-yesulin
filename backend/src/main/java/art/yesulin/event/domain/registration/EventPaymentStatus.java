package art.yesulin.event.domain.registration;

/** 운영자가 수동으로 확인한 입금 상태. 기존 신청도 미확인부터 시작한다. */
public enum EventPaymentStatus {
    PENDING,
    CONFIRMED
}
