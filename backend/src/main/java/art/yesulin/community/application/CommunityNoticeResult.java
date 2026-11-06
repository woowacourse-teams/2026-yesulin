package art.yesulin.community.application;

import java.time.Instant;

/**
 * 받은 댓글 알림 한 건. 작성자는 글에서 보이는 이름(익명 번호·공개 이름·프로필 비공개)과 같고,
 * 미리보기는 댓글 본문 앞부분을 한 줄로 줄인 것이다.
 */
public record CommunityNoticeResult(long commentId, long postId, String title, Long replyToId, boolean seen,
                                    String author, String preview, Instant createdAt) {
}
