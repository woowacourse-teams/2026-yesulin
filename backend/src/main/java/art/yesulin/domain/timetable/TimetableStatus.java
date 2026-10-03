package art.yesulin.domain.timetable;

public enum TimetableStatus {

    /** 기획사가 시간대와 배정을 고치는 중이다. 배우에게는 아직 아무것도 안내하지 않는다. */
    DRAFT,
    /** 일정을 확정해 배우에게 안내했다. 배우는 링크로 일정을 보고 바운더리 안에서 직접 바꿀 수 있다. */
    PUBLISHED
}
