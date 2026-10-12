package art.yesulin.auditionpost.domain;

import java.time.Instant;

/**
 * 기획사에 연결되지 않은 원문 공고를 원문 작성자별로 센 읽기 모델.
 *
 * @param sourceAuthorId 원문 작성자 번호. 번호를 읽기 전에 가져온 공고는 null이다.
 * @param authorName 원문 닉네임
 */
public record AuditionPostAuthorCount(
        String source,
        String sourceAuthorId,
        String authorName,
        long count,
        Instant latestCreatedAt
) {
}
