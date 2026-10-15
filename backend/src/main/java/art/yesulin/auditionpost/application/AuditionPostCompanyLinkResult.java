package art.yesulin.auditionpost.application;

/**
 * 원문 작성자를 공연사로 묶은 결과.
 *
 * @param connectedPostCount 이번에 공연사에 연결하거나 옮긴 이 작성자의 공고 수
 */
public record AuditionPostCompanyLinkResult(
        long linkId,
        String source,
        String sourceAuthorId,
        String sourceAuthorName,
        long companyId,
        String companyName,
        int connectedPostCount
) {
}
