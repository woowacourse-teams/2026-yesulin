package art.yesulin.auditionpost.application;

import java.time.Instant;
import java.util.List;

/**
 * 운영자 공연사 화면의 원문 작성자별 보기. 같은 작성자가 올린 공고를 한 공연사로 묶는다.
 *
 * @param authors 원문 공고를 올린 작성자. 공연사로 묶지 않은 작성자를 먼저, 공고가 많은 순서로 둔다.
 * @param missingAuthorIdCount 원문 작성자 번호를 아직 읽지 않은 원문 공고 수. 번호를 읽어야 공연사로 묶을 수 있다.
 */
public record AuditionPostCompanyAuthorOverview(List<Author> authors, long missingAuthorIdCount) {

    /**
     * 원문 작성자 한 명.
     *
     * @param sourceAuthorId 원문 작성자 번호. 번호를 읽기 전에 가져온 공고만 있으면 null이고, 이때는 공연사로 묶을 수 없다.
     * @param authorName 가장 최근 공고의 닉네임
     * @param companylessCount 아직 공연사에 연결되지 않은 공고 수
     * @param linkId 공연사로 묶은 규칙. 묶지 않았으면 null이다.
     * @param companyName 묶은 공연사 이름. 묶지 않았으면 null이다.
     */
    public record Author(
            String source,
            String sourceAuthorId,
            String authorName,
            long postCount,
            long companylessCount,
            Instant latestCreatedAt,
            Long linkId,
            Long companyId,
            String companyName
    ) {
    }
}
