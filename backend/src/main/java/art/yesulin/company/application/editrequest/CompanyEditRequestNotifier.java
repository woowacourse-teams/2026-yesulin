package art.yesulin.company.application.editrequest;

/** 새 공연사 정보 수정 요청을 운영자에게 알린다. 커밋된 뒤에 호출되며, 알림이 실패해도 예외를 던지지 않는다. */
public interface CompanyEditRequestNotifier {

    void notifyRequested(CompanyEditRequestedEvent event);
}
