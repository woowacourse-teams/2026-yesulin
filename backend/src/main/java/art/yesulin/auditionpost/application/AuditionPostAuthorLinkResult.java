package art.yesulin.auditionpost.application;

/**
 * 원문 작성자를 기획사에 자동 연결한 결과.
 *
 * @param connectedPostCount 이번에 함께 연결한 이 작성자의 기존 공고 수. 이미 다른 기획사에 연결된 공고는 세지 않는다.
 */
public record AuditionPostAuthorLinkResult(
        long id,
        String source,
        String sourceAuthorId,
        String sourceAuthorName,
        long ownerId,
        String ownerName,
        int connectedPostCount
) {
}
