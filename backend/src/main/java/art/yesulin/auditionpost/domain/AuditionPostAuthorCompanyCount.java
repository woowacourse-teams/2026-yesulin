package art.yesulin.auditionpost.domain;

import java.time.Instant;

/**
 * 원문 공고를 원문 작성자별로 센 읽기 모델. 공연사로 묶을 때 쓴다.
 *
 * @param sourceAuthorId 원문 작성자 번호. 번호를 읽기 전에 가져온 공고는 null이다.
 * @param authorName 원문 닉네임
 * @param companylessCount 아직 공연사에 연결되지 않은 공고 수
 */
public record AuditionPostAuthorCompanyCount(
        String source,
        String sourceAuthorId,
        String authorName,
        long count,
        long companylessCount,
        Instant latestCreatedAt
) {
}
