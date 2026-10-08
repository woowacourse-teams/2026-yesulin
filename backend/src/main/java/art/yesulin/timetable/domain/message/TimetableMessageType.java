package art.yesulin.timetable.domain.message;

public enum TimetableMessageType {

    /** 기획사에게 보내는 일정표 관리 링크. */
    ORGANIZER_LINK,
    /** 기획사에게 보내는 배우의 시간 조정 요청 알림. 처리 전 알림이 있으면 더 쌓지 않는다. */
    ORGANIZER_TIME_REQUEST,
    /** 배우에게 보내는 합격·일정 확인 안내. 배우마다 한 번만 보낸다. */
    ACTOR_INVITATION,
    /** 기획사가 안내한 배우의 시간을 옮겼을 때 보내는 변경 안내. */
    ACTOR_SCHEDULE_CHANGED
}
