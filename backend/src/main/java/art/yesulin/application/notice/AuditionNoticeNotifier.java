package art.yesulin.application.notice;

import java.util.List;

public interface AuditionNoticeNotifier {

    /**
     * 공고 목록을 한 알림으로 전송한다. 성공 응답을 확인한 뒤 반환하며 실패하거나 결과가 불명확하면 예외를 던진다.
     */
    void send(List<AuditionContent> contents);

    /** {@link #send}와 같지만 공고마다 정해 준 주소로 연결한다. */
    void sendAlerts(List<AuditionAlert> alerts);

    void sendError(String message);
}
