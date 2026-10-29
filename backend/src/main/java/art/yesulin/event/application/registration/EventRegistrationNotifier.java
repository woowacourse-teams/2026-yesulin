package art.yesulin.event.application.registration;

/** 커밋된 신청을 운영자에게 알린다. 전송 실패는 접수 결과에 영향을 주지 않는다. */
public interface EventRegistrationNotifier {

    void notifyRegistered(EventRegisteredEvent event);
}
