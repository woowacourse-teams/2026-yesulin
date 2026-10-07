package art.yesulin.application.notice;

import java.util.Optional;

/**
 * 알림 대상 공고를 예술in 공고로 숨긴 채 가져오는 port. 운영 서버의 공고 알림이 Slack 전송 전에 호출한다.
 * 이미 가져온 번호는 다시 가져오지 않으므로 운영자가 공개·숨김을 정한 공고를 덮어쓰지 않는다. 가져오지 못하면 예외를 던진다.
 */
public interface AuditionImporter {

    /**
     * 처음 보는 공고면 숨김으로 가져오고, 이미 있으면 그 공고를 찾는다.
     *
     * @return 상태와 관계없는 예술in 공고 ID. 다른 출처라 가져오지 않았으면 비어 있다.
     */
    Optional<Long> importIfAbsent(String source, String externalId);
}
