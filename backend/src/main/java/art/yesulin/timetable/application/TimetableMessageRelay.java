package art.yesulin.timetable.application;

/**
 * 대기열에 들어온 일정표 문자를 받는 사람에게 전달하는 방법이다. 기획사 화면은 문자가 자동으로 간다고 안내한다.
 *
 * <p>지금 구현은 운영자에게 개인정보 없는 신호만 보내고, 운영자가 관리자 대기열에서 문자를 직접 보낸 뒤 완료로 표시한다.
 * 문자 업체로 바꾸면 이 포트의 구현이 대기 중인 문자를 보내고 발송 완료로 표시하면 된다.
 */
public interface TimetableMessageRelay {

    /** 커밋된 뒤에 호출된다. 실패해도 문자는 대기열에 남으므로 예외를 호출한 쪽으로 던지지 않는다. */
    void relay(TimetableMessagesQueuedEvent event);
}
