package art.yesulin.timetable.domain.actor;

/** 배우가 링크에서 직접 시간을 바꿀 수 있는지. */
public enum SelfChangeStatus {

    OPEN,
    /** 기획사가 배우 변경을 막았다. */
    LOCKED,
    /** 지금 시간의 시작까지 24시간이 남지 않았다. */
    DEADLINE_PASSED
}
