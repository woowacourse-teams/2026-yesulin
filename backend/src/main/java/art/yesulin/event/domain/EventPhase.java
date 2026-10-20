package art.yesulin.event.domain;

/**
 * 진행 기간으로 본 이벤트의 단계. 기간을 비운 이벤트는 늘 진행 중이다.
 */
public enum EventPhase {

    UPCOMING,
    ONGOING,
    ENDED
}
