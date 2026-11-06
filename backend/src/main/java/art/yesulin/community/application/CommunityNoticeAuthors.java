package art.yesulin.community.application;

import art.yesulin.community.domain.CommunityAuthorMode;
import art.yesulin.community.domain.CommunityAuthors;
import art.yesulin.community.domain.CommunityEntry;
import art.yesulin.community.domain.CommunityEntryRepository;
import java.util.HashMap;
import java.util.Map;

/**
 * 알림 목록 한 번을 만드는 동안 글별 익명 번호와 회원별 공개 이름을 한 번씩만 읽는다.
 * 익명 댓글은 글 안의 익명 번호, 프로필 공개 댓글은 지금의 공개 이름(비공개면 "프로필 비공개")을 쓴다.
 */
final class CommunityNoticeAuthors {

    private final CommunityEntryRepository entries;
    private final CommunityProfiles profiles;
    private final Map<Long, CommunityAuthors> postAuthors = new HashMap<>();
    private final Map<Long, CommunityProfile> memberProfiles = new HashMap<>();

    CommunityNoticeAuthors(CommunityEntryRepository entries, CommunityProfiles profiles) {
        this.entries = entries;
        this.profiles = profiles;
    }

    String nameOf(CommunityEntry comment) {
        if (comment.getAuthorMode() == CommunityAuthorMode.PROFILE) {
            return memberProfiles.computeIfAbsent(comment.getMemberId(), profiles::find).name();
        }
        return postAuthors.computeIfAbsent(comment.getParentId(),
                postId -> new CommunityAuthors(entries.authors(postId))).nameOf(comment);
    }
}
