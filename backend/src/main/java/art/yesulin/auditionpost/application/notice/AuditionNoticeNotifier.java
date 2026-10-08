package art.yesulin.auditionpost.application.notice;

import java.util.List;

public interface AuditionNoticeNotifier {

    /**
     * 공고 목록을 공고마다 정해 준 주소와 함께 한 알림으로 전송한다. 성공 응답을 확인한 뒤 반환하며 실패하거나 결과가
     * 불명확하면 예외를 던진다.
     */
    void sendAlerts(List<AuditionAlert> alerts);

    void sendError(String message);
}
