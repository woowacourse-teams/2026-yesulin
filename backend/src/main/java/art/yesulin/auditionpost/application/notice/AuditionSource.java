package art.yesulin.auditionpost.application.notice;

import java.util.List;

public interface AuditionSource {

    String getSource();

    /**
     * 최근 공고를 조회한다. 접근 실패와 파싱 실패는 빈 목록으로 숨기지 않고 예외로 전달한다.
     */
    List<AuditionContent> fetchRecent();

    /**
     * 현재 목록에서 사라진 미전송 공고도 재시도할 수 있도록 원문 식별자로 다시 조회한다.
     * 조회할 수 없거나 파싱에 실패하면 예외를 던진다.
     */
    AuditionContent fetchById(String externalId);
}
