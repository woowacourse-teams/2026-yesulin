package art.yesulin.auditionpost.application;

import java.time.Instant;
import java.util.List;

/**
 * 운영자 공고 관리의 업체별 보기.
 *
 * @param owners 공고나 자동 연결 규칙이 있는 기획사. 최근 등록 순서다.
 * @param unlinkedAuthors 기획사에 연결되지 않은 원문 공고의 작성자. 공고가 많은 순서다. 자동 연결 규칙이 있는 작성자는 뺀다.
 * @param missingAuthorIdCount 원문 작성자 번호를 아직 읽지 않은 원문 공고 수. 원문에 번호가 없는 공고도 포함한다.
 */
public record AuditionPostOwnerOverview(
        List<Owner> owners,
        List<UnlinkedAuthor> unlinkedAuthors,
        long missingAuthorIdCount
) {

    /**
     * 기획사 한 곳.
     *
     * @param companyName 기획사 정보가 없어졌으면 null이다.
     * @param latestCreatedAt 연결된 공고 중 가장 최근에 만든 시각. 공고가 없으면 null이다.
     */
    public record Owner(
            long ownerId,
            String companyName,
            long publishedCount,
            long hiddenCount,
            Instant latestCreatedAt,
            List<AuthorLink> authorLinks
    ) {
    }

    public record AuthorLink(long id, String source, String sourceAuthorId, String sourceAuthorName) {
    }

    /**
     * 기획사에 연결되지 않은 원문 작성자.
     *
     * @param sourceAuthorId 원문 작성자 번호. 번호를 읽기 전에 가져온 공고만 있으면 null이고, 이때는 자동 연결을 걸 수 없다.
     */
    public record UnlinkedAuthor(
            String source,
            String sourceAuthorId,
            String authorName,
            long postCount,
            Instant latestCreatedAt
    ) {
    }
}
