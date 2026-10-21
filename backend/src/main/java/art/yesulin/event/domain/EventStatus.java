package art.yesulin.event.domain;

/**
 * 이벤트 글의 공개 상태. 운영자가 공개하기 전에는 이벤트 목록과 메인 배너 어디에도 보이지 않는다.
 */
public enum EventStatus {

    /** 쓰는 중이거나 아직 공개하지 않은 글. 공개 여부를 정한 글을 다시 검토 전으로 돌리지는 않는다. */
    PENDING,
    PUBLISHED,
    /** 공개했다가 내린 글. */
    HIDDEN
}
