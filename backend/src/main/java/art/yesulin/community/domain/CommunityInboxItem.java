package art.yesulin.community.domain;

public record CommunityInboxItem(long commentId, long postId, String title, Long replyToId, boolean seen) {
}
