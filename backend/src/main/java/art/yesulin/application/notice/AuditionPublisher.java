package art.yesulin.application.notice;

import java.util.Optional;

/**
 * 알림 대상 공고를 예술in 공고로 게시하는 port. 운영 서버의 공고 알림이 Slack 전송 전에 호출한다.
 * 이미 게시한 번호는 건너뛰므로 운영자가 숨기거나 다시 가져온 공고를 덮어쓰지 않는다. 게시하지 못하면 예외를 던진다.
 */
public interface AuditionPublisher {

    /**
     * 공고를 게시하거나 이미 게시한 공고를 찾는다.
     *
     * @return 공개 중인 예술in 공고 ID. 숨겼거나 다른 출처라 게시하지 않았으면 비어 있다.
     */
    Optional<Long> publish(String source, String externalId);
}
