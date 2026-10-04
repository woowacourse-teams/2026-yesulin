package art.yesulin.domain.timetable.message;

public enum TimetableMessageStatus {

    /** 아직 받는 사람에게 보내지 않았다. 지금은 운영자가 대기열에서 직접 보낸다. */
    PENDING,
    SENT
}
